// Authentication / authorisation middleware.

export function getCurrentUser(req) {
  if (!req.session || !req.session.userId) return null;
  return req.app.locals.db.prepare(
    'SELECT id, email, display_name, role, created_at FROM user WHERE id = ?'
  ).get(req.session.userId) || null;
}

export function requireLogin(req, res, next) {
  const user = getCurrentUser(req);
  if (!user) return res.status(401).json({ error: 'Sign in required' });
  req.user = user;
  next();
}

// Must run AFTER requireLogin (relies on req.user).
export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
}
