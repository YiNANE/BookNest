-- ============================================================
-- BookNest schema (SQLite)
-- Idempotent: every statement uses IF NOT EXISTS so it is safe
-- to run on every boot without destroying data.
-- ============================================================
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS category (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS book (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES category(id),
  -- format: 'digital' (order-verified download) or 'used' (physical copy)
  format      TEXT NOT NULL CHECK (format IN ('digital', 'used')),
  price       REAL NOT NULL CHECK (price >= 0),
  -- condition applies to used books only
  condition   TEXT CHECK (condition IN ('like-new', 'good', 'acceptable')),
  -- stock: physical count for used books; ignored for digital (0)
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  cover_path  TEXT,
  file_path   TEXT,
  description TEXT NOT NULL DEFAULT '',
  is_active   INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_book_category ON book(category_id);
CREATE INDEX IF NOT EXISTS idx_book_active ON book(is_active);

CREATE TABLE IF NOT EXISTS recommendation (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  book_id      INTEGER NOT NULL REFERENCES book(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  useful_count INTEGER NOT NULL DEFAULT 0 CHECK (useful_count >= 0),
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rec_book ON recommendation(book_id);

-- One review per member per book (enforced here, at the SQL level).
CREATE TABLE IF NOT EXISTS review (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES book(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, book_id)
);

-- One "useful" vote per member per recommendation.
CREATE TABLE IF NOT EXISTS vote (
  user_id           INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  recommendation_id INTEGER NOT NULL REFERENCES recommendation(id) ON DELETE CASCADE,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, recommendation_id)
);

-- "order" is a reserved word in SQL, so it is quoted throughout.
CREATE TABLE IF NOT EXISTS "order" (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id          INTEGER NOT NULL REFERENCES user(id),
  total            REAL NOT NULL CHECK (total >= 0),
  -- status flow: pending -> paid -> (used only) shipped -> delivered ; cancelled anywhere
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  delivery_address TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_order_user ON "order"(user_id);

-- unit_price is frozen at purchase time.
CREATE TABLE IF NOT EXISTS order_item (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES book(id),
  qty        INTEGER NOT NULL CHECK (qty > 0),
  unit_price REAL NOT NULL,
  UNIQUE (order_id, book_id)
);

CREATE TABLE IF NOT EXISTS cart_item (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  book_id    INTEGER NOT NULL REFERENCES book(id) ON DELETE CASCADE,
  qty        INTEGER NOT NULL CHECK (qty > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, book_id)
);
