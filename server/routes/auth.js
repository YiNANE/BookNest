import { Router } from 'express';
import bcrypt from 'bcrypt';

const router = Router();
const db = (req) => req.app.locals.db;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(u) {
  return { id: u.id, email: u.email, display_name: u.display_name, role: u.role };
}

router.post('/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const displayName = String(req.body.displayName || '').trim();

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }
  if (!displayName || displayName.length > 60) {
    return res.status(400).json({ error: 'Display name is required (max 60 characters).' });
  }

  const existing = db(req).prepare('SELECT id FROM user WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists.' });
  }

  const hash = await bcrypt.hash(password, 10);
  const info = db(req).prepare(
    'INSERT INTO user (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
  ).run(email, hash, displayName, 'member');

  const user = db(req).prepare(
    'SELECT id, email, display_name, role FROM user WHERE id = ?'
  ).get(info.lastInsertRowid);

  req.session.userId = user.id;
  res.status(201).json({ user: publicUser(user) });
});

router.post('/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  const user = db(req).prepare('SELECT * FROM user WHERE email = ?').get(email);
  // Generic message on purpose — never reveal which field was wrong.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});

router.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.json({ user: null });
  const user = db(req).prepare(
    'SELECT id, email, display_name, role FROM user WHERE id = ?'
  ).get(req.session.userId);
  res.json({ user: user ? publicUser(user) : null });
});

export default router;
