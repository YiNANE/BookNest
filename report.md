# BookNest: A Campus Bookstore Built on Reasoned Recommendations

**Final Project Report — COMP3421 Web Application Design and Development**

| | |
|---|---|
| Author | Fang Yinan (24101605D) |
| Group type | Solo project |
| Coding route | Vibe coding (declared — see `ai-use.md`) |
| Deployment | Render Web Service + 1 GB persistent disk |
| Date | Semester 1, 2026/27 |

---

## 1. Abstract

University students read across many subjects, but they buy books through
scattered channels: general e-commerce sites ignore course context, and campus
second-hand sales live in chat groups where listings vanish within days. The
gap is not supply but *trust* — students cannot tell which book is worth their
money, and the advice they rely on comes from a peer who explains *why*.

BookNest is a web bookstore for university students that makes the reasoned
recommendation the central object of the application. Visitors browse freely
with no login wall: the landing page shows today's picks, category entry points
and search, and every book page lists peer recommendations that must carry a
written reason and can be marked useful, alongside ordinary scored reviews.
Only write actions — posting a recommendation, reviewing, voting, adding to
cart, checking out — require an account, requested inline at that moment, after
which the interrupted action resumes. Members buy digital materials that unlock
an order-verified download, or order used physical copies needing a delivery
address. An administrator maintains the catalogue and order state.

The result is a small but complete application with guest, member and
administrator roles, real business rules and persistent data — implemented
full-stack without a front-end framework.

## 2. Introduction & Motivation

The project targets a real friction in student life: *trust* when buying study
material. Anonymous star ratings are cheap and gameable; a peer's written
reason ("this carried me through CS231's graph algorithms") is concrete and
persuasive. BookNest therefore separates two kinds of user content:

- **Recommendations** — must carry a written *reason* (validated, minimum
  length) and can be marked *useful* by other members (one vote per person).
- **Reviews** — an ordinary 1–5 score with an optional comment (one per member
  per book), used for a familiar average-rating signal.

The two coexist on the same book page but are visually and functionally
distinct, which is the product's central differentiator.

## 3. Requirements & Feature List

### MVP (implemented — 8/8)

1. **Guest-first browsing** — landing page (today's picks, category tiles,
   search); every read route is public, no login wall.
2. **Catalogue** — category view, keyword search, filters (format, price band,
   minimum rating), sorting (price, rating, newest) and pagination.
3. **Book detail** — cover, description, price, stock/condition; recommendations
   ranked by usefulness; reviews with an average.
4. **Accounts** — register / log in / log out, bcrypt-hashed passwords, HTTP-only
   session cookie, and an **inline sign-in dialog** that resumes the interrupted
   action.
5. **User content** — create/edit/delete own recommendations (reason, minimum
   length) and one review per book; one "useful" vote per member per post,
   enforced in SQL.
6. **Cart & checkout** — server-side cart, simulated checkout (no real payment,
   no card data), orders with frozen unit prices, used-copy stock decremented
   inside a transaction.
7. **Fulfilment** — digital items unlock a download route that re-checks the
   order server-side (no direct file URLs); used copies capture a delivery
   address and move through order statuses.
8. **Admin** — catalogue CRUD with validated cover upload, order status
   updates, listing deactivation.

### Stretch (not started — by design)

Student-to-student used-book listings, spending/reading charts, a report-and-
moderate queue, and usefulness-weighted "hot" ranking. None was started until
every MVP feature was green.

## 4. Architecture

### Stack

| Layer | Technology |
|---|---|
| Client | Semantic HTML5, CSS Grid/Flexbox (mobile-first, 360 px → desktop), vanilla ES modules + `fetch` against a JSON API |
| Server | Node.js + Express: REST JSON API, `express-session`, bcrypt, multer |
| Data | SQLite via `better-sqlite3`; `schema.sql` + `seed.sql` (idempotent) |
| Testing | `node:test` + supertest |

### Component responsibilities

- `server/index.js` — entry point (open DB → build app → listen).
- `server/app.js` — builds the Express app (exposed separately for supertest).
- `server/db.js` — opens SQLite, applies schema, pragmas (foreign keys, WAL).
- `server/seed.js` — idempotent seed: categories/books, bcrypt-hashed demo
  accounts, and placeholder digital files outside the static root.
- `server/routes/*` — catalogue, auth, content, cart, download, admin.
- `server/middleware/auth.js` — `requireLogin`, `requireAdmin`, current user.
- `client/*` — pages (home, catalogue, book, cart, orders, admin) + shared
  `js/ui.js`, `js/api.js`, `js/auth.js` and `css/styles.css`.

The client and API share an origin; the server serves the static client and
`/uploads` (covers). Digital material files live **outside** the static root
and are streamed only through the guarded route.

## 5. Data Model & API

### ERD

```
Category ──1:N── Book ──1:N── Recommendation ──N:M── Vote
                     │                    │
                     │ 1:N                │ N:1
                     ▼                    ▼
                   Review ──N:1── User ──1:N── Order ──1:N── OrderItem ──N:1── Book
```

Tables: `user`, `category`, `book`, `recommendation`, `review`, `vote`,
`order`, `order_item`, `cart_item`. Key constraints:

- `review(user_id, book_id)` is **UNIQUE** — one review per member per book.
- `vote(user_id, recommendation_id)` is a composite **PRIMARY KEY** — one vote
  per member per recommendation.
- `order_item.unit_price` freezes the price at purchase.
- `book.format ∈ {digital, used}`; used books carry `condition` and `stock`.

### API endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | — | liveness |
| GET | `/api/categories` | — | categories + counts |
| GET | `/api/catalogue/meta` | — | price bounds for filters |
| GET | `/api/home` | — | today's picks |
| GET | `/api/books` | — | search/filter/sort/paginate |
| GET | `/api/books/:id` | — | detail + recommendations + reviews + `owned` |
| POST | `/api/auth/register` | — | create account (bcrypt) |
| POST | `/api/auth/login` | — | start session |
| POST | `/api/auth/logout` | member | end session |
| GET | `/api/me` | — | current user or `null` |
| POST | `/api/books/:id/recommendations` | member | post a recommendation |
| PUT / DELETE | `/api/recommendations/:id` | owner | edit / delete own post |
| POST / DELETE | `/api/recommendations/:id/vote` | member | mark / unmark useful |
| POST | `/api/books/:id/reviews` | member | post a review (one per book) |
| PUT / DELETE | `/api/reviews/:id` | owner | edit / delete own review |
| GET / POST | `/api/cart` | member | view / add to cart |
| PUT / DELETE | `/api/cart/:bookId` | member | change / remove item |
| POST | `/api/orders` | member | checkout (transaction) |
| GET | `/api/orders` , `/api/orders/:id` | member | order history / detail |
| POST | `/api/orders/:id/pay` | owner | simulated payment |
| GET | `/api/books/:id/download` | buyer | order-verified file download |
| GET / POST / PUT / PATCH / DELETE | `/api/admin/books[/:id]` | admin | catalogue CRUD + deactivate |
| GET / PATCH | `/api/admin/orders[/:id]` | admin | order list / status update |

All write endpoints validate input server-side and return a centralised JSON
error shape (`{ error }`) with appropriate status codes.

## 6. Implementation — key flows & decisions

### 6.1 The inline sign-in that resumes the action

On the client, every write action runs through `ensureAuthed()`: it returns the
current user if already signed in, otherwise checks the session (a fresh page
load may already be valid) and only then opens the inline `<dialog>`. The
action's own `async` handler resumes after the promise resolves, so the
"interrupted action" completes automatically after login — no redirect, no lost
context.

### 6.2 Checkout as a single transaction

Checkout validates the cart (active books, sufficient used-copy stock, a
delivery address when any used item is present), computes the total, then runs
a `better-sqlite3` transaction that inserts the order and its items (freezing
`unit_price`), decrements used-book stock, and clears the cart atomically:

```js
const createOrder = d.transaction(() => {
  const orderId = insertOrder(...);
  for (const i of items) {
    insertItem.run(orderId, i.book_id, i.qty, i.price);   // frozen price
    if (i.format === 'used') decStock.run(i.qty, i.book_id);
  }
  clearCart(userId);
  return orderId;
});
```

### 6.3 The download guard

Digital files live in `FILES_DIR`, outside `express.static`. The download route
(1) requires login, (2) requires the book to be digital and active, (3) verifies
the session user has a `paid`/`delivered` order item for it, and only then
streams `path.basename(file_path)` (blocking traversal). No public file URL ever
appears in the HTML.

### 6.4 Other non-trivial choices

- **`better-sqlite3`** (synchronous, transactional) instead of an ORM — small
  surface, easy to reason about, and transactions read cleanly.
- **SQL-level constraints** for the "one review" / "one vote" rules, so the
  guarantees hold even if a route misbehaves.
- **Ownership checks** on every edit/delete: rows are fetched and their
  `user_id` compared to the session user, returning 403 otherwise.
- **Generic login error** ("Invalid email or password") so the API never leaks
  whether an account exists.

## 7. UI / UX

- **Guest-first**: the landing page is a working storefront before login.
- **Reason first**: recommendations are visually distinct (left-accent card with
  the quoted reason and a "👍 N found useful" pill); reviews show a star row.
- **Inline auth**: a modal `<dialog>` with Sign-in / Register tabs, no page
  navigation.
- **Responsive**: single-column at 360 px; the catalogue becomes a two-column
  filter+results layout and the book grid grows to four columns at ≥ 900 px.
- **Accessibility**: semantic landmarks, labels and alt text, `aria-live` on
  dynamic regions, visible `:focus-visible` outlines.

*(Insert screenshots here for the final PDF: home, catalogue, book detail,
inline sign-in, cart, orders, admin — at 360 px and desktop widths.)*

## 8. Testing

- **Automated** (`npm test`, `node:test` + supertest): 19 tests covering
  catalogue listing/filtering, auth validation, authorisation (guest 401, owner
  403, admin 403), the one-review and one-vote rules, checkout address
  validation, and the download guard (401 → 403 → paid → 200). **All pass.**
- **Manual** (`TESTING.md`): a ~45-case table across guest/member/admin and
  responsive/accessibility checks.
- **Known issues**: none blocking. Sessions are in-memory (see limitations).

## 9. Deployment & Operations

Deployed on **Railway** at
`https://booknest-production-f8016fa7.up.railway.app`. Railway auto-detects
Node from `package.json` (build `npm install`, start `npm start`) and injects
`PORT`. The free plan gives a $5 / 30-day trial (no credit card), then $1/month
of credit. The schema and seed run idempotently on every boot and regenerate
the catalogue, demo accounts and placeholder digital files; the SQLite database
lives on the container filesystem, so a Railway volume is the persistence
upgrade.

## 10. Limitations & Future Work

- Sessions use MemoryStore (a restart logs users out; data persists).
- Digital "files" are generated text placeholders, not real documents.
- No real payment integration (by design, for compliance).
- Cover files and digital files live on the local disk, not object storage.

Future work: SQLite-backed sessions, real PDF documents, student-to-student
used listings, spending charts, and a moderation queue (the declared stretch
list).

## 11. Individual Contribution

Solo project — Fang Yinan (24101605D) is responsible for 100%: requirements,
data model, all front-end views and responsive CSS, the Express API and
middleware, the SQLite schema and seed data, the automated tests, this report
and the deployment.

## 12. References

- Express — https://expressjs.com (MIT)
- better-sqlite3 — https://github.com/WiseLibs/better-sqlite3 (MIT)
- bcrypt (npm) — https://github.com/kelektiv/node.bcrypt.js (MIT)
- multer — https://github.com/expressjs/multer (MIT)
- express-session — https://github.com/expressjs/session (MIT)
- supertest — https://github.com/ladjs/supertest (MIT)
- Node.js `node:test` — https://nodejs.org/api/test.html
- Render — https://render.com

## 13. Appendix

- **User manual**: install → `npm install`, copy `.env.example` → `.env`,
  `npm start`, open http://localhost:3000. Test accounts in `README.md`.
- **AI use**: see `ai-use.md`.
- **Third-party assets**: no images/fonts/templates used beyond system fonts;
  all libraries are declared in `package.json` with licenses above. Placeholder
  covers are generated CSS gradients; seed book descriptions are original.
