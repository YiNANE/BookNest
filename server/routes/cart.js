import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';

const router = Router();
const db = (req) => req.app.locals.db;

// ---------- cart ----------

router.get('/cart', requireLogin, (req, res) => {
  const d = db(req);
  const items = d.prepare(`
    SELECT ci.book_id AS id, ci.qty, b.title, b.author, b.format, b.price,
           b.condition, b.stock, b.cover_path
    FROM cart_item ci
    JOIN book b ON b.id = ci.book_id
    WHERE ci.user_id = ?
    ORDER BY ci.created_at DESC
  `).all(req.user.id);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  res.json({ items, subtotal });
});

router.post('/cart', requireLogin, (req, res) => {
  const d = db(req);
  const bookId = Number(req.body.bookId);
  const qty = Number(req.body.qty) || 1;
  const book = d.prepare('SELECT id, is_active, format, stock FROM book WHERE id = ?').get(bookId);
  if (!book || !book.is_active) return res.status(404).json({ error: 'Book not found' });
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
    return res.status(400).json({ error: 'Quantity must be between 1 and 99.' });
  }
  if (book.format === 'used' && qty > book.stock) {
    return res.status(400).json({ error: 'Not enough stock.' });
  }

  const existing = d.prepare('SELECT id, qty FROM cart_item WHERE user_id = ? AND book_id = ?').get(req.user.id, bookId);
  if (existing) {
    let newQty = existing.qty + qty;
    if (book.format === 'used' && newQty > book.stock) newQty = book.stock;
    d.prepare('UPDATE cart_item SET qty = ? WHERE id = ?').run(newQty, existing.id);
  } else {
    d.prepare('INSERT INTO cart_item (user_id, book_id, qty) VALUES (?, ?, ?)').run(req.user.id, bookId, qty);
  }
  res.status(201).json({ ok: true });
});

router.put('/cart/:bookId', requireLogin, (req, res) => {
  const d = db(req);
  const bookId = Number(req.params.bookId);
  const qty = Number(req.body.qty);
  const row = d.prepare('SELECT id FROM cart_item WHERE user_id = ? AND book_id = ?').get(req.user.id, bookId);
  if (!row) return res.status(404).json({ error: 'Item not in cart.' });
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
    return res.status(400).json({ error: 'Quantity must be between 1 and 99.' });
  }
  const book = d.prepare('SELECT format, stock FROM book WHERE id = ?').get(bookId);
  if (book.format === 'used' && qty > book.stock) {
    return res.status(400).json({ error: 'Not enough stock.' });
  }
  d.prepare('UPDATE cart_item SET qty = ? WHERE id = ?').run(qty, row.id);
  res.json({ ok: true });
});

router.delete('/cart/:bookId', requireLogin, (req, res) => {
  db(req).prepare('DELETE FROM cart_item WHERE user_id = ? AND book_id = ?').run(req.user.id, Number(req.params.bookId));
  res.status(204).end();
});

// ---------- checkout & orders ----------

router.post('/orders', requireLogin, (req, res) => {
  const d = db(req);
  const address = String(req.body.deliveryAddress || '').trim();

  const items = d.prepare(`
    SELECT ci.book_id, ci.qty, b.title, b.format, b.price, b.stock, b.is_active
    FROM cart_item ci
    JOIN book b ON b.id = ci.book_id
    WHERE ci.user_id = ?
  `).all(req.user.id);

  if (!items.length) return res.status(400).json({ error: 'Your cart is empty.' });

  const hasUsed = items.some((i) => i.format === 'used');
  if (hasUsed && address.length < 5) {
    return res.status(400).json({ error: 'A delivery address (min 5 characters) is required for used books.' });
  }

  for (const i of items) {
    if (!i.is_active) return res.status(400).json({ error: `"${i.title}" is no longer available.` });
    if (i.format === 'used' && i.stock < i.qty) {
      return res.status(400).json({ error: `Not enough stock for "${i.title}" (${i.stock} left).` });
    }
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Single transaction: freeze prices, decrement used stock, clear the cart.
  const createOrder = d.transaction(() => {
    const info = d.prepare(
      'INSERT INTO "order" (user_id, total, status, delivery_address) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, total, 'pending', hasUsed ? address : null);
    const orderId = info.lastInsertRowid;

    const insertItem = d.prepare(
      'INSERT INTO order_item (order_id, book_id, qty, unit_price) VALUES (?, ?, ?, ?)'
    );
    const decStock = d.prepare("UPDATE book SET stock = stock - ? WHERE id = ? AND format = 'used'");
    for (const i of items) {
      insertItem.run(orderId, i.book_id, i.qty, i.price);
      if (i.format === 'used') decStock.run(i.qty, i.book_id);
    }
    d.prepare('DELETE FROM cart_item WHERE user_id = ?').run(req.user.id);
    return orderId;
  });

  const orderId = createOrder();
  const order = d.prepare('SELECT * FROM "order" WHERE id = ?').get(orderId);
  res.status(201).json({ order });
});

router.get('/orders', requireLogin, (req, res) => {
  const orders = db(req).prepare(`
    SELECT o.id, o.total, o.status, o.created_at,
           (SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.id) AS item_count
    FROM "order" o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);
  res.json({ orders });
});

router.get('/orders/:id', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const d = db(req);
  const order = d.prepare('SELECT * FROM "order" WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = d.prepare(`
    SELECT oi.book_id, oi.qty, oi.unit_price, b.title, b.author, b.format, b.cover_path
    FROM order_item oi
    JOIN book b ON b.id = oi.book_id
    WHERE oi.order_id = ?
  `).all(id);
  res.json({ order, items });
});

// Simulated payment — no real money, no card data (compliance).
router.post('/orders/:id/pay', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const d = db(req);
  const order = d.prepare('SELECT id, user_id, status FROM "order" WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'pending') return res.status(400).json({ error: 'Order is not pending payment.' });
  d.prepare("UPDATE \"order\" SET status = 'paid' WHERE id = ?").run(id);
  res.json({ ok: true, status: 'paid' });
});

export default router;
