// Idempotent seed: safe to run on every boot and never duplicates data.
// Usage: `npm run seed`, or it runs automatically on first server boot.
import 'dotenv/config';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcrypt';
import { openDb, applySchema } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedSql = readFileSync(path.join(__dirname, '..', 'database', 'seed.sql'), 'utf8');

// Dummy accounts only — no real people, no real passwords (compliance).
const DEMO_USERS = [
  { email: 'admin@booknest.demo', password: 'password123', displayName: 'Ada Admin', role: 'admin' },
  { email: 'alice@booknest.demo', password: 'password123', displayName: 'Alice Chan', role: 'member' },
  { email: 'bob@booknest.demo',   password: 'password123', displayName: 'Bob Lee',   role: 'member' },
];

// Create placeholder digital files OUTSIDE the static root and point each
// digital book at them. Idempotent — files are written only when missing.
function seedDigitalFiles(db) {
  const filesDir = process.env.FILES_DIR || path.join(__dirname, '..', 'files');
  mkdirSync(filesDir, { recursive: true });
  const digitals = db.prepare("SELECT id, title, author, description FROM book WHERE format = 'digital'").all();
  const update = db.prepare('UPDATE book SET file_path = ? WHERE id = ?');
  for (const b of digitals) {
    const name = `book-${b.id}.txt`;
    const filePath = path.join(filesDir, name);
    if (!existsSync(filePath)) {
      const content = [
        'BookNest digital material',
        `Title: ${b.title}`,
        `Author: ${b.author}`,
        '',
        b.description,
        '',
        'This is a placeholder file for the demo. In a real deployment this would',
        'be the purchased document, served only to verified buyers.',
      ].join('\n');
      writeFileSync(filePath, content, 'utf8');
    }
    update.run(name, b.id);
  }
}

export async function seedDatabase(db) {
  // Static data (categories + books) via INSERT OR IGNORE.
  db.exec(seedSql);

  // Demo users with runtime-hashed bcrypt passwords.
  const upsertUser = db.prepare(
    `INSERT OR IGNORE INTO user (email, password_hash, display_name, role)
     VALUES (@email, @hash, @displayName, @role)`
  );
  for (const u of DEMO_USERS) {
    // Skip the CPU-heavy bcrypt hash when the account already exists — it only
    // needs to be computed once, not on every cold start.
    if (db.prepare('SELECT 1 FROM user WHERE email = ?').get(u.email)) continue;
    const hash = await bcrypt.hash(u.password, 10);
    upsertUser.run({ email: u.email, hash, displayName: u.displayName, role: u.role });
  }

  // Digital files (outside the static root) + file_path back-references.
  seedDigitalFiles(db);

  return {
    users: db.prepare('SELECT COUNT(*) AS n FROM user').get().n,
    categories: db.prepare('SELECT COUNT(*) AS n FROM category').get().n,
    books: db.prepare('SELECT COUNT(*) AS n FROM book').get().n,
  };
}

// Allow `node server/seed.js` as a standalone command.
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  const db = openDb();
  applySchema(db);
  const counts = await seedDatabase(db);
  console.log('Seed complete:', counts);
  db.close();
}
