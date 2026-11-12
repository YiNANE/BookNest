import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';

const router = Router();
const db = (req) => req.app.locals.db;

function toBool(row) {
  if (!row) return row;
  if ('is_mine' in row) row.is_mine = !!row.is_mine;
  if ('voted' in row) row.voted = !!row.voted;
  return row;
}

function findBook(req, bookId) {
  return db(req).prepare('SELECT id, is_active FROM book WHERE id = ?').get(bookId);
}

function getRecommendation(req, recId, uid) {
  return toBool(db(req).prepare(`
    SELECT rec.id, rec.user_id, rec.book_id, rec.reason, rec.body, rec.useful_count,
           rec.created_at, rec.updated_at, u.display_name AS author_name,
           (rec.user_id = ?) AS is_mine,
           EXISTS(SELECT 1 FROM vote v WHERE v.recommendation_id = rec.id AND v.user_id = ?) AS voted
    FROM recommendation rec
    JOIN user u ON u.id = rec.user_id
    WHERE rec.id = ?
  `).get(uid, uid, recId));
}

function validateReason(reason, body) {
  if (reason.length < 10) return 'The reason must be at least 10 characters.';
  if (reason.length > 500) return 'The reason must be at most 500 characters.';
  if (body.length > 2000) return 'The body must be at most 2000 characters.';
  return null;
}

// ---------- recommendations ----------

router.post('/books/:id/recommendations', requireLogin, (req, res) => {
  const bookId = Number(req.params.id);
  const book = Number.isInteger(bookId) ? findBook(req, bookId) : null;
  if (!book || !book.is_active) return res.status(404).json({ error: 'Book not found' });

  const reason = String(req.body.reason || '').trim();
  const body = String(req.body.body || '').trim();
  const err = validateReason(reason, body);
  if (err) return res.status(400).json({ error: err });

  const info = db(req).prepare(
    'INSERT INTO recommendation (user_id, book_id, reason, body) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, bookId, reason, body);

  res.status(201).json({ recommendation: getRecommendation(req, info.lastInsertRowid, req.user.id) });
});

router.put('/recommendations/:id', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const rec = db(req).prepare('SELECT id, user_id FROM recommendation WHERE id = ?').get(id);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
  if (rec.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own recommendation.' });

  const reason = String(req.body.reason || '').trim();
  const body = String(req.body.body || '').trim();
  const err = validateReason(reason, body);
  if (err) return res.status(400).json({ error: err });

  db(req).prepare(
    "UPDATE recommendation SET reason = ?, body = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(reason, body, id);
  res.json({ recommendation: getRecommendation(req, id, req.user.id) });
});

router.delete('/recommendations/:id', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const rec = db(req).prepare('SELECT id, user_id FROM recommendation WHERE id = ?').get(id);
  if (!rec) return res.status(404).json({ error: 'Recommendation not found' });
  if (rec.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own recommendation.' });
  db(req).prepare('DELETE FROM recommendation WHERE id = ?').run(id);
  res.status(204).end();
});

router.post('/recommendations/:id/vote', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  if (!db(req).prepare('SELECT id FROM recommendation WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }
  const added = db(req).prepare(
    'INSERT OR IGNORE INTO vote (user_id, recommendation_id) VALUES (?, ?)'
  ).run(req.user.id, id).changes > 0;
  if (added) {
    db(req).prepare('UPDATE recommendation SET useful_count = useful_count + 1 WHERE id = ?').run(id);
  }
  const { useful_count } = db(req).prepare('SELECT useful_count FROM recommendation WHERE id = ?').get(id);
  res.json({ voted: true, useful_count });
});

router.delete('/recommendations/:id/vote', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const removed = db(req).prepare(
    'DELETE FROM vote WHERE user_id = ? AND recommendation_id = ?'
  ).run(req.user.id, id).changes > 0;
  if (removed) {
    db(req).prepare('UPDATE recommendation SET useful_count = MAX(useful_count - 1, 0) WHERE id = ?').run(id);
  }
  const row = db(req).prepare('SELECT useful_count FROM recommendation WHERE id = ?').get(id);
  res.json({ voted: false, useful_count: row ? row.useful_count : 0 });
});

// ---------- reviews ----------

function getReview(req, reviewId, uid) {
  return toBool(db(req).prepare(`
    SELECT r.id, r.user_id, r.book_id, r.score, r.body, r.created_at, r.updated_at,
           u.display_name AS author_name, (r.user_id = ?) AS is_mine
    FROM review r
    JOIN user u ON u.id = r.user_id
    WHERE r.id = ?
  `).get(uid, reviewId));
}

router.post('/books/:id/reviews', requireLogin, (req, res) => {
  const bookId = Number(req.params.id);
  const book = Number.isInteger(bookId) ? findBook(req, bookId) : null;
  if (!book || !book.is_active) return res.status(404).json({ error: 'Book not found' });

  const score = Number(req.body.score);
  const body = String(req.body.body || '').trim();
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Score must be an integer from 1 to 5.' });
  }
  if (body.length > 2000) return res.status(400).json({ error: 'The review must be at most 2000 characters.' });

  const existing = db(req).prepare('SELECT id FROM review WHERE user_id = ? AND book_id = ?').get(req.user.id, bookId);
  if (existing) return res.status(409).json({ error: 'You already reviewed this book — edit your review instead.' });

  const info = db(req).prepare(
    'INSERT INTO review (user_id, book_id, score, body) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, bookId, score, body);
  res.status(201).json({ review: getReview(req, info.lastInsertRowid, req.user.id) });
});

router.put('/reviews/:id', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const r = db(req).prepare('SELECT id, user_id FROM review WHERE id = ?').get(id);
  if (!r) return res.status(404).json({ error: 'Review not found' });
  if (r.user_id !== req.user.id) return res.status(403).json({ error: 'You can only edit your own review.' });

  const score = Number(req.body.score);
  const body = String(req.body.body || '').trim();
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Score must be an integer from 1 to 5.' });
  }
  if (body.length > 2000) return res.status(400).json({ error: 'The review must be at most 2000 characters.' });

  db(req).prepare(
    "UPDATE review SET score = ?, body = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(score, body, id);
  res.json({ review: getReview(req, id, req.user.id) });
});

router.delete('/reviews/:id', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const r = db(req).prepare('SELECT id, user_id FROM review WHERE id = ?').get(id);
  if (!r) return res.status(404).json({ error: 'Review not found' });
  if (r.user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own review.' });
  db(req).prepare('DELETE FROM review WHERE id = ?').run(id);
  res.status(204).end();
});

export default router;
