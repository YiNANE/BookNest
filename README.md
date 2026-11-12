# BookNest: A Campus Bookstore Built on Reasoned Recommendations

A full-stack web application where the unit of trust is a peer's written
reason, not an anonymous star rating.

COMP3421 Web Application Design and Development — final project (Solo, Fang
Yinan 24101605D).

## Stack

- **Client**: semantic HTML5, CSS Grid / Flexbox, mobile-first responsive
  (360 px → desktop), vanilla ES modules + `fetch` against a JSON API.
- **Server**: Node.js 20 + Express, `express-session` + bcrypt, multer
  uploads, server-side validation on every endpoint.
- **Data**: SQLite via `better-sqlite3`; `database/schema.sql` +
  `database/seed.sql`.

## Prerequisites

- Node.js ≥ 20
- npm

## Install

```bash
npm install
cp .env.example .env   # on Windows: copy .env.example .env
```

## Environment variables

See `.env.example`. The important ones:

| Var | Purpose |
|---|---|
| `PORT` | HTTP port (default 3000) |
| `SESSION_SECRET` | session signing secret — change in production |
| `DB_PATH` | SQLite file path (default `./data/booknest.db`) |
| `UPLOAD_DIR` | cover image upload directory |
| `FILES_DIR` | digital material files (kept OUTSIDE the static root) |

## Database setup

The schema and seed run automatically on first boot (idempotent). To seed
manually:

```bash
npm run seed
```

To reset from scratch, delete `data/booknest.db` and re-run.

## Run

```bash
npm run dev     # auto-reload during development
npm start       # production start
```

Open http://localhost:3000.

## Test accounts (dummy only)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@booknest.demo` | `password123` |
| Member | `alice@booknest.demo` | `password123` |
| Member | `bob@booknest.demo` | `password123` |

## Tests

```bash
npm test
```

## Deployment

Deployed on **Railway**:
**https://booknest-production-f8016fa7.up.railway.app** (the live public URL
earns the deployment bonus).

- Railway auto-detects Node from `package.json` (`npm install` + `npm start`)
  and injects `PORT`; no extra config file is required.
- Free plan: a **$5 / 30-day trial** (no credit card), then $1/month of credit.
- The SQLite database sits on the container filesystem and is rebuilt
  idempotently by the seed on every boot; attach a Railway volume to persist
  user posts and orders across redeploys.

## Known limitations

- **In-memory sessions**: sessions use `express-session`'s MemoryStore, so a
  server restart signs everyone out (data itself persists). Acceptable at this
  demo scale; a SQLite session store would be a natural upgrade.
- **Placeholder digital files**: digital books ship with generated `.txt`
  placeholder files (created on first boot) instead of real documents.
- **No real payments**: checkout is fully simulated — no card data, no money.
- **Cover uploads & files are local**: they live on the persistent disk, not a
  CDN/object store.

## Manual test table

See `TESTING.md` for the ~45-case manual test table, and run `npm test` for the
automated API suite (validation, authorisation, download guard).


---

> This project is built with AI assistance under the vibe-coding route.
> See `ai-use.md` for tool/version/usage disclosure.
