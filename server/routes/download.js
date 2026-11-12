import { Router } from 'express';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireLogin } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();
const db = (req) => req.app.locals.db;

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'download';
}

// Order-verified download. The file lives OUTSIDE the static root and is only
// streamed after the server confirms the session user paid for this digital
// book. No public file URL ever appears in the HTML.
router.get('/books/:id/download', requireLogin, (req, res) => {
  const d = db(req);
  const bookId = Number(req.params.id);
  const book = d.prepare('SELECT id, title, format, is_active, file_path FROM book WHERE id = ?').get(bookId);
  if (!book || !book.is_active || book.format !== 'digital') {
    return res.status(404).json({ error: 'This book is not available for download.' });
  }
  if (!book.file_path) return res.status(404).json({ error: 'No file attached to this book.' });

  const owned = d.prepare(`
    SELECT 1 FROM order_item oi
    JOIN "order" o ON o.id = oi.order_id
    WHERE o.user_id = ? AND oi.book_id = ? AND o.status IN ('paid', 'delivered')
    LIMIT 1
  `).get(req.user.id, bookId);
  if (!owned) return res.status(403).json({ error: 'Purchase this book before downloading.' });

  const filesDir = process.env.FILES_DIR || path.join(__dirname, '..', '..', 'files');
  // path.basename strips any directory component, blocking path traversal.
  const filePath = path.join(filesDir, path.basename(book.file_path));
  if (!existsSync(filePath)) return res.status(404).json({ error: 'File missing on server.' });

  res.download(filePath, `${slugify(book.title)}.txt`);
});

export default router;
