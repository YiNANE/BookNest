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
 * Apply the idempotent schema (CREATE TABLE IF NOT EXISTS ...).
 */
export function applySchema(db) {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  db.exec(readFileSync(schemaPath, 'utf8'));
}
