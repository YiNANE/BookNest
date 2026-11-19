import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.join(__dirname, '..', 'data', 'booknest.db');

/**
 * Open (and create if needed) the SQLite database.
 * Enables foreign keys and WAL mode so writes are safe and survive restarts.
 */
export function openDb(dbPath = process.env.DB_PATH || defaultDbPath) {
  if (dbPath !== ':memory:') {
    mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

/**
 * Apply the idempotent schema (CREATE TABLE IF NOT EXISTS ...) plus a few
 * idempotent column migrations for databases created by older versions.
 */
export function applySchema(db) {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  db.exec(readFileSync(schemaPath, 'utf8'));
  migrate(db);
}

function migrate(db) {
  try {
    const cols = db.prepare('PRAGMA table_info(user_settings)').all().map((c) => c.name);
    if (cols.length && !cols.includes('language')) {
      db.exec("ALTER TABLE user_settings ADD COLUMN language TEXT NOT NULL DEFAULT 'en'");
    }
  } catch {
    /* table not present yet — nothing to migrate */
  }
}
