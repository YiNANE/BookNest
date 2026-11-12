# AI Use Declaration (vibe-coding route)

This project is built under the **vibe-coding** route, declared in the project
outline. This file documents the tools, scope and verification of AI-assisted
code, as required by COMP3421.

## Tooling

| Item | Detail |
|---|---|
| Assistant | DeepSeek coding agent (deepseek-v4-pro) via DeepSeek Harness |
| Runtime | Node.js ≥ 20 (developed and tested on Node.js 24), npm |
| Human author | Fang Yinan (24101605D) — solo project |

## What was AI-assisted

- **Scaffolding**: directory layout, `package.json`, `.gitignore`, `.env.example`.
- **Database**: `schema.sql` (tables, constraints, indexes) and `seed.sql`
  (6 categories, 30 books). Demo accounts are bcrypt-hashed in `server/seed.js`.
- **Server**: all Express routers and middleware — catalogue, auth, content
  (recommendations/reviews/votes), cart/checkout/orders, guarded download, and
  the admin panel with multer cover upload.
- **Client**: the HTML pages, `styles.css`, and the ES-module scripts for every
  page, including the inline sign-in dialog and the resume-after-login pattern.
- **Tests**: the `node:test` + supertest API suite.
- **Documentation**: README, this declaration, TESTING.md and the report draft.

## What was authored by the student

- The concept, requirements, data model and scope — fixed in the outline.
- Every design decision recorded in the handoff document (confirmed before coding).
- Review, adaptation and verification of every AI-generated file.

## How the code was verified

- Every endpoint was exercised end-to-end against a running server:
  register/login/logout, browsing, search/filter/sort/pagination, posting
  recommendations/reviews, voting, cart, checkout (with the stock transaction),
  order state flow, the order-verified download, and admin CRUD including
  cover-upload type rejection.
- The automated suite (`npm test`) covers validation, authorisation and the
  download guard — 19 tests, all passing.
- Manual checks: 360 px mobile and desktop layouts, keyboard focus states,
  labels and alt text, and a clean browser console.

## Third-party libraries

Declared in `package.json`: `express`, `express-session`, `bcrypt`,
`better-sqlite3`, `multer`, `dotenv`, and `supertest` (dev). These are MIT /
BSD-style licensed open-source packages; license specifics are listed in the
report's references section.
