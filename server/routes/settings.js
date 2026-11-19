import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';

const router = Router();
const db = (req) => req.app.locals.db;

const ALLOWED = {
  theme: ['coral', 'teal', 'ocean', 'forest', 'berry'],
  font_size: ['small', 'medium', 'large'],
  language: ['en', 'zh'],
  payment_method: ['cash', 'campus_card', 'card'],
};

function shape(row) {
  return {
    theme: row.theme,
    font_size: row.font_size,
    language: row.language,
    payment_method: row.payment_method,
    privacy_show_name: !!row.privacy_show_name,
    privacy_show_email: !!row.privacy_show_email,
  };
}

function ensureRow(d, userId) {
  d.prepare('INSERT OR IGNORE INTO user_settings (user_id) VALUES (?)').run(userId);
}

router.get('/me/settings', requireLogin, (req, res) => {
  const d = db(req);
  ensureRow(d, req.user.id);
  const row = d.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  res.json({ settings: shape(row) });
});

router.put('/me/settings', requireLogin, (req, res) => {
  const d = db(req);
  ensureRow(d, req.user.id);
  const cur = d.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  const b = req.body;

  const next = {
    theme: cur.theme,
    font_size: cur.font_size,
    language: cur.language,
    payment_method: cur.payment_method,
    privacy_show_name: cur.privacy_show_name,
    privacy_show_email: cur.privacy_show_email,
  };

  if (b.theme !== undefined) {
    if (!ALLOWED.theme.includes(b.theme)) return res.status(400).json({ error: 'Invalid theme.' });
    next.theme = b.theme;
  }
  if (b.font_size !== undefined) {
    if (!ALLOWED.font_size.includes(b.font_size)) return res.status(400).json({ error: 'Invalid font size.' });
    next.font_size = b.font_size;
  }
  if (b.language !== undefined) {
    if (!ALLOWED.language.includes(b.language)) return res.status(400).json({ error: 'Invalid language.' });
    next.language = b.language;
  }
  if (b.payment_method !== undefined) {
    if (!ALLOWED.payment_method.includes(b.payment_method)) return res.status(400).json({ error: 'Invalid payment method.' });
    next.payment_method = b.payment_method;
  }
  if (b.privacy_show_name !== undefined) next.privacy_show_name = b.privacy_show_name ? 1 : 0;
  if (b.privacy_show_email !== undefined) next.privacy_show_email = b.privacy_show_email ? 1 : 0;

  d.prepare(`
    UPDATE user_settings
    SET theme = @theme, font_size = @font_size, language = @language,
        payment_method = @payment_method,
        privacy_show_name = @privacy_show_name, privacy_show_email = @privacy_show_email,
        updated_at = datetime('now')
    WHERE user_id = @uid
  `).run({ ...next, uid: req.user.id });

  const row = d.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(req.user.id);
  res.json({ settings: shape(row) });
});

export default router;
