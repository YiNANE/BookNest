import { ensureAuthed, getMe, logout } from './auth.js';

// --- formatting / escaping -------------------------------------------------

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function money(n) {
  const v = Number(n) || 0;
  return `HK$${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

export function stars(rating) {
  const r = Math.round(Number(rating) || 0);
  let out = '';
  for (let i = 1; i <= 5; i += 1) {
    out += `<span class="star${i <= r ? ' on' : ''}" aria-hidden="true">★</span>`;
  }
  return `<span class="stars" title="${r} / 5">${out}</span>`;
}

export function formatLabel(format) {
  return format === 'digital' ? 'Digital' : 'Used copy';
}

export function conditionLabel(condition) {
  if (!condition) return '';
  const map = { 'like-new': 'Like new', good: 'Good', acceptable: 'Acceptable' };
  return map[condition] || condition;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function toast(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2600);
}

// --- cover / card rendering ------------------------------------------------

const COVER_GRADIENTS = [
  'linear-gradient(160deg, #16343C 0%, #0E252B 100%)',
  'linear-gradient(160deg, #E4572E 0%, #C63D1B 100%)',
  'linear-gradient(160deg, #7A4A2B 0%, #4E2E18 100%)',
  'linear-gradient(160deg, #2E5A4A 0%, #1C3A2F 100%)',
  'linear-gradient(160deg, #3B2E5E 0%, #241C3A 100%)',
  'linear-gradient(160deg, #8A3A3A 0%, #5A2020 100%)',
  'linear-gradient(160deg, #2E4A6B 0%, #1A2E45 100%)',
  'linear-gradient(160deg, #A86A2E 0%, #6B4118 100%)',
];

export function cover(book) {
  if (book.cover_path) {
    return `<img class="cover-img" src="${escapeHtml(book.cover_path)}" alt="Cover of ${escapeHtml(book.title)}" loading="lazy">`;
  }
  const g = COVER_GRADIENTS[Number(book.id) % COVER_GRADIENTS.length];
  return `<div class="cover-ph" style="background:${g}" aria-hidden="true">
      <span class="cover-spine"></span>
      <span class="cover-title">${escapeHtml(book.title || 'Untitled')}</span>
      <span class="cover-author">${escapeHtml(book.author || '')}</span>
    </div>`;
}

export function bookCard(book) {
  return `
    <a class="book-card" href="/book.html?id=${book.id}">
      <div class="book-cover">${cover(book)}</div>
      <div class="book-card-body">
        <div class="book-tags">
          <span class="tag-pill format-${book.format}">${formatLabel(book.format)}</span>
          <span class="tag-pill tag-cat">${escapeHtml(book.category_name)}</span>
        </div>
        <h3 class="book-title">${escapeHtml(book.title)}</h3>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <div class="book-meta">
          <span class="book-rating">${stars(book.avg_rating)}
            <span class="rating-num">${Number(book.avg_rating) ? Number(book.avg_rating).toFixed(1) : '—'}</span>
          </span>
          <span class="book-price">${money(book.price)}</span>
        </div>
      </div>
    </a>`;
}

export function renderBookGrid(el, books, emptyMessage) {
  if (!books.length) {
    el.innerHTML = `<p class="empty">${escapeHtml(emptyMessage || 'No books found.')}</p>`;
    return;
  }
  el.innerHTML = books.map(bookCard).join('');
}

// --- shared header ---------------------------------------------------------

export async function initHeader() {
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;
  renderAuthArea(authArea, await getMe());
}

export async function refreshHeader() {
  const authArea = document.getElementById('auth-area');
  if (!authArea) return;
  renderAuthArea(authArea, await getMe());
}

export function renderAuthArea(authArea, user) {
  if (user) {
    authArea.innerHTML = `
      <span class="auth-user">${escapeHtml(user.display_name)}</span>
      <a class="auth-link" href="/orders.html">Orders</a>
      <button class="btn btn-ghost" id="signout-btn" type="button">Sign out</button>`;
    authArea.querySelector('#signout-btn').addEventListener('click', async () => {
      await logout();
      renderAuthArea(authArea, null);
      toast('Signed out.');
    });
  } else {
    authArea.innerHTML = `<button class="btn btn-light" id="signin-btn" type="button">Sign in</button>`;
    authArea.querySelector('#signin-btn').addEventListener('click', async () => {
      const user = await ensureAuthed();
      if (user) {
        renderAuthArea(authArea, user);
        toast(`Welcome, ${escapeHtml(user.display_name)}!`);
      }
    });
  }
}
