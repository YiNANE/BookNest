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

Deployed as a **Render Web Service on the Free compute plan** (the live public
URL earns the deployment bonus; Free instances need no payment method).

Two options:

- **Blueprint**: push this repo and pick it in Render — `render.yaml` creates
  the service with `runtime: node`, `npm install` / `npm start`, a generated
  `SESSION_SECRET` and `healthCheckPath: /api/health`.
- **Manual**: New → Web Service → Language **Node** → Build Command
  `npm install` → Start Command `npm start` → compute plan **Free**. Add
  `NODE_ENV=production` and a random `SESSION_SECRET`; leave `PORT` unset
  (Render injects it). Do not add a disk on the free plan.

Public URL: **https://booknest.onrender.com** (fill in the real one after the
first deploy).

> Free-plan trade-offs, documented in the report as known limitations:
> the service **spins down after 15 minutes without traffic** (first request
> after that takes ~1 minute to cold start), and its filesystem is
> **ephemeral** — `data/booknest.db`, `uploads/` and `files/` are rebuilt on
> every restart or redeploy. The schema and seed are idempotent and run on every
> boot, so the catalogue, the three demo accounts and the placeholder digital
> files always come back; only user-generated posts and orders are lost when the
> instance restarts.
>
> Keeping one free service continuously warm (e.g. a 5-minute uptime ping) costs
> roughly 730 of the 750 free instance hours per month and avoids most
> spin-down data resets, which is useful for the Week 14–15 demo.
>
> True persistence needs `plan: starter` plus a 1 GB disk at `/var/data`; the
> commented block in `render.yaml` has that variant ready if a paid plan becomes
> available.

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
