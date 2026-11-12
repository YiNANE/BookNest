import express from 'express';
import session from 'express-session';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySchema } from './db.js';
import { seedDatabase } from './seed.js';
import catalogueRouter from './routes/catalogue.js';
import authRouter from './routes/auth.js';
import contentRouter from './routes/content.js';
import cartRouter from './routes/cart.js';
import downloadRouter from './routes/download.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Build the Express app on top of an already-open SQLite database.
 * Exposed separately from the listener so tests can use supertest
 * against an in-memory database.
 */
export async function createApp(db) {
  applySchema(db);
  await seedDatabase(db); // idempotent

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  app.locals.db = db;

  app.get('/api/health', (_req, res) => res.json({ ok: true, name: 'BookNest' }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'booknest-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use(express.static(path.join(__dirname, '..', 'client')));
  app.use('/uploads', express.static(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')));

  app.use('/api', catalogueRouter);
  app.use('/api', authRouter);
  app.use('/api', contentRouter);
  app.use('/api', cartRouter);
  app.use('/api', downloadRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // Centralised JSON error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    if (err.name === 'MulterError') {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Cover image must be 2 MB or smaller.'
        : 'Invalid file upload.';
      return res.status(400).json({ error: msg });
    }
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
