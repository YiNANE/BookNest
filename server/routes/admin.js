import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireLogin, requireAdmin } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const db = (req) => req.app.locals.db;

const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// Cover uploads: JPEG/PNG/WebP only, 2 MB max.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `cover-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    const err = new Error('Cover must be a JPEG, PNG or WebP image.');
    err.status = 400;
    cb(err, false);
  },
});

// Every admin route requires an admin account.
router.use(requireLogin, requireAdmin);

function parseBookInput(req) {
  const b = req.body;
  return {
    title: String(b.title || '').trim(),
    author: String(b.author || '').trim(),
    categoryId: Number(b.category_id),
    format: b.format,
    price: Number(b.price),
    condition: b.format === 'used' ? (String(b.condition || '').trim() || null) : null,
    stock: Number.isFinite(Number(b.stock)) ? Number(b.stock) : 0,
    description: String(b.description || '').trim(),
    isActive: b.is_active === '0' || b.is_active === 'false' ? 0 : 1,
  };
}

function validateBook(p) {
  if (!p.title || p.title.length > 200) return 'Title is required (max 200 characters).';
  if (!p.author || p.author.length > 200) return 'Author is required (max 200 characters).';
  if (p.format !== 'digital' && p.format !== 'used') return 'Format must be "digital" or "used".';
  if (!Number.isFinite(p.price) || p.price < 0) return 'Price must be a non-negative number.';
  if (p.format === 'used') {
    if (!['like-new', 'good', 'acceptable'].includes(p.condition)) {
      return 'Condition must be like-new, good or acceptable.';
    }
    if (!Number.isInteger(p.stock) || p.stock < 0) return 'Stock must be a non-negative integer.';
  }
  if (p.description.length > 2000) return 'Description must be at most 2000 characters.';
  return null;
}

router.get('/books', (req, res) => {
  const books = db(req).prepare(`
    SELECT b.*, c.name AS category_name, c.slug AS category_slug
    FROM book b
    JOIN category c ON c.id = b.category_id
    ORDER BY b.id DESC
  `).all();
  res.json({ books });
});

router.post('/books', upload.single('cover'), (req, res) => {
  const d = db(req);
  const p = parseBookInput(req);
  const err = validateBook(p);
  if (err) return res.status(400).json({ error: err });
  if (!Number.isInteger(p.categoryId) || !d.prepare('SELECT id FROM category WHERE id = ?').get(p.categoryId)) {
    return res.status(400).json({ error: 'Choose a valid category.' });
  }
  const coverPath = req.file ? `/uploads/${req.file.filename}` : null;
  const info = d.prepare(`
    INSERT INTO book (title, author, category_id, format, price, condition, stock, description, cover_path, is_active)
    VALUES (@title, @author, @categoryId, @format, @price, @condition, @stock, @description, @cover, @isActive)
  `).run({ ...p, cover: coverPath });
  res.status(201).json({ book: d.prepare('SELECT * FROM book WHERE id = ?').get(info.lastInsertRowid) });
});

router.put('/books/:id', upload.single('cover'), (req, res) => {
  const d = db(req);
  const id = Number(req.params.id);
  const existing = d.prepare('SELECT * FROM book WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Book not found' });

  const p = parseBookInput(req);
  const err = validateBook(p);
  if (err) return res.status(400).json({ error: err });
  if (!Number.isInteger(p.categoryId) || !d.prepare('SELECT id FROM category WHERE id = ?').get(p.categoryId)) {
    return res.status(400).json({ error: 'Choose a valid category.' });
  }
  const coverPath = req.file ? `/uploads/${req.file.filename}` : existing.cover_path;

  d.prepare(`
    UPDATE book SET title = @title, author = @author, category_id = @categoryId,
      format = @format, price = @price, condition = @condition, stock = @stock,
      description = @description, cover_path = @cover, is_active = @isActive
    WHERE id = @id
  `).run({ ...p, cover: coverPath, id });
  res.json({ book: d.prepare('SELECT * FROM book WHERE id = ?').get(id) });
});

// Toggle listing active/inactive ("下架/上架").
router.patch('/books/:id', (req, res) => {
  const d = db(req);
  const id = Number(req.params.id);
  const book = d.prepare('SELECT id, is_active FROM book WHERE id = ?').get(id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const next = book.is_active ? 0 : 1;
  d.prepare('UPDATE book SET is_active = ? WHERE id = ?').run(next, id);
  res.json({ id, is_active: next });
});

router.delete('/books/:id', (req, res) => {
  const d = db(req);
  const id = Number(req.params.id);
  const book = d.prepare('SELECT id FROM book WHERE id = ?').get(id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  const refs = d.prepare('SELECT COUNT(*) AS n FROM order_item WHERE book_id = ?').get(id).n;
  if (refs > 0) {
    return res.status(409).json({ error: 'This book appears in orders — deactivate it instead of deleting.' });
  }
  d.prepare('DELETE FROM book WHERE id = ?').run(id);
  res.status(204).end();
});

// ---------- orders ----------

router.get('/orders', (req, res) => {
  const orders = db(req).prepare(`
    SELECT o.id, o.user_id, o.total, o.status, o.delivery_address, o.created_at,
           u.email AS user_email, u.display_name AS user_name
    FROM "order" o
    JOIN user u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all();
  res.json({ orders });
});

router.patch('/orders/:id', (req, res) => {
  const d = db(req);
  const id = Number(req.params.id);
  const status = String(req.body.status || '');
  const allowed = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const order = d.prepare('SELECT id FROM "order" WHERE id = ?').get(id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  d.prepare('UPDATE "order" SET status = ? WHERE id = ?').run(status, id);
  res.json({ id, status });
});

export default router;
