# Manual Test Table

Test accounts (dummy only): `admin@booknest.demo` (admin),
`alice@booknest.demo` (member), `bob@booknest.demo` (member) — password `password123`.

Status legend: ✅ pass · ⏳ to run at final demo.

| # | Area | Precondition / steps | Expected result | Status |
|---|---|---|---|---|
| 1 | Guest | Open `/` with no session | Landing page renders today's picks + category tiles; header shows **Sign in** | ✅ |
| 2 | Guest | Click a book card | Book page opens with cover, price, description, recommendations & reviews sections | ✅ |
| 3 | Guest | Use header search "algorithm" | Catalogue shows matching book(s); result count updates | ✅ |
| 4 | Guest | Browse `/catalogue.html`, pick a subject | Only that category's books are listed | ✅ |
| 5 | Guest | Filter by format = Digital | Only digital books remain | ✅ |
| 6 | Guest | Sort by price (low→high) | Cheapest book appears first | ✅ |
| 7 | Guest | Set min price above all books | Empty state shows "No books match your filters" | ✅ |
| 8 | Guest | Navigate to page 2 of results | Pagination shows the next page | ✅ |
| 9 | Guest | Open a non-existent book URL (`/book.html?id=99999`) | "Book not found" message, no crash | ✅ |
| 10 | Accounts | Click **Sign in** on a book page | Inline dialog opens without leaving the page | ✅ |
| 11 | Accounts | Register with a short password | Dialog shows validation error | ✅ |
| 12 | Accounts | Register a brand-new account | Account created, header shows display name | ✅ |
| 13 | Accounts | Register an existing email | Error: account already exists | ✅ |
| 14 | Accounts | Log in with wrong password | Generic "Invalid email or password" | ✅ |
| 15 | Accounts | Log in as `alice@booknest.demo` | Header shows **Alice Chan** + Orders + Sign out | ✅ |
| 16 | Accounts | Refresh the page while signed in | Session persists (no re-login) | ✅ |
| 17 | Accounts | Sign out | Header returns to **Sign in**; protected pages re-prompt | ✅ |
| 18 | Content | Guest clicks "Post recommendation" (submit) | Inline sign-in opens; after login the action completes | ✅ |
| 19 | Content | Member posts a recommendation with < 10-char reason | Validation error shown | ✅ |
| 20 | Content | Member posts a valid recommendation | Post appears; author shown; Edit/Delete visible | ✅ |
| 21 | Content | Member edits their own recommendation | Updated text shows | ✅ |
| 22 | Content | Member deletes their own recommendation | Post disappears | ✅ |
| 23 | Content | Member posts a 1–5 star review | Review + updated average appear | ✅ |
| 24 | Content | Member posts a second review on the same book | Error: already reviewed (one per book) | ✅ |
| 25 | Content | Member clicks **👍 useful** on another's post | Count increments; button highlights; cannot double-vote | ✅ |
| 26 | Cart | Signed-out user clicks **Add to cart** | Inline sign-in, then item is added | ✅ |
| 27 | Cart | Add a digital and a used book | Cart shows both + correct subtotal | ✅ |
| 28 | Cart | Change quantity / remove an item | Subtotal recalculates | ✅ |
| 29 | Checkout | Checkout with a used book and no address | Error: delivery address required | ✅ |
| 30 | Checkout | Checkout with an address | Order created; cart clears; used-book stock decreases | ✅ |
| 31 | Checkout | Checkout with an empty cart | Error: cart is empty | ✅ |
| 32 | Orders | Open Orders | Order list shows status + total | ✅ |
| 33 | Orders | Click **Pay now (simulated)** on a pending order | Status becomes `paid` | ✅ |
| 34 | Download | Owned digital book, paid | **Download** link/button appears and downloads the file | ✅ |
| 35 | Download | Member without the purchase | Download returns "purchase first" (403) | ✅ |
| 36 | Download | Guess a direct file URL (`/files/book-3.txt`) | Not served — file lives outside the static root | ✅ |
| 37 | Admin | Member opens `/admin.html` | "Admin access only" | ✅ |
| 38 | Admin | Admin opens `/admin.html` | Books + Orders tabs render | ✅ |
| 39 | Admin | Admin adds a book (with a PNG cover) | Book appears in catalogue; cover renders | ✅ |
| 40 | Admin | Admin uploads a `.txt` as cover | Rejected: must be JPEG/PNG/WebP | ✅ |
| 41 | Admin | Admin deactivates a book | Book hidden from the public catalogue | ✅ |
| 42 | Admin | Admin changes an order status | Status updates and reflects on the user's Orders page | ✅ |
| 43 | A11y | Tab through the header and a book page | Visible focus ring on every control | ✅ |
| 44 | A11y | Resize to 360 px and to desktop | Layout is usable at both widths; no horizontal scroll | ✅ |
| 45 | A11y | Open browser console on each page | No console errors | ✅ |
