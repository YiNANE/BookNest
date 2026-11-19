import { ensureAuthed, getMe, logout } from './auth.js';
import { setLang, t } from './i18n.js';

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

// --- themes & preferences --------------------------------------------------

export const THEMES = {
  coral: { label: 'Coral', accent: '#E4572E', accentDark: '#C63D1B', paper: '#F6F0E3', paper2: '#FBF7EE', stage: '#DA552B', stage2: '#CE5025' },
  teal: { label: 'Teal', accent: '#1F8A9E', accentDark: '#146B7A', paper: '#E7F1F2', paper2: '#F1F9FA', stage: '#1E8396', stage2: '#1C7B8D' },
  ocean: { label: 'Ocean', accent: '#2F6FE4', accentDark: '#1F4FB0', paper: '#E8EFFB', paper2: '#F2F7FF', stage: '#2D6ADB', stage2: '#2A63CC' },
  forest: { label: 'Forest', accent: '#2E8B57', accentDark: '#1F6B40', paper: '#E9F2EB', paper2: '#F3FAF4', stage: '#2C8454', stage2: '#297D4F' },
  berry: { label: 'Berry', accent: '#C94F8A', accentDark: '#9C3468', paper: '#F8EBF2', paper2: '#FDF5F9', stage: '#BE4C83', stage2: '#B6487B' },
};

export const FONT_SIZES = { small: '15px', medium: '16px', large: '18px' };

export function applyPreferences() {
  try {
    const theme = localStorage.getItem('bn_theme') || 'coral';
    const size = localStorage.getItem('bn_font') || 'medium';
    const t = THEMES[theme] || THEMES.coral;
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--accent-dark', t.accentDark);
    root.style.setProperty('--paper', t.paper);
    root.style.setProperty('--paper-2', t.paper2);
    root.style.setProperty('--stage', t.stage);
    root.style.setProperty('--stage-2', t.stage2);
    root.style.fontSize = FONT_SIZES[size] || FONT_SIZES.medium;
    setLang(localStorage.getItem('bn_lang') || 'en');
  } catch {
    /* localStorage unavailable — keep defaults */
  }
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
    el.innerHTML = emptyState(emptyMessage || 'No books found.');
    return;
  }
  el.innerHTML = books.map(bookCard).join('');
}

// --- offline overlay (slumped bird) ----------------------------------------

export function birdSlumpedSvg() {
  return `
<svg viewBox="0 0 240 200" width="210" height="175" class="bird-slumped" role="img"
     aria-label="The BookNest bird slumped on the ground, exhausted">
  <defs>
    <radialGradient id="bnBird" cx="45%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#FF62A6"/>
      <stop offset="100%" stop-color="#D6006E"/>
    </radialGradient>
  </defs>
  <ellipse cx="120" cy="184" rx="76" ry="12" fill="#000" opacity="0.12"/>
  <path d="M68 176 C52 142 68 110 104 108 C142 106 168 126 172 152 C175 168 160 177 140 179 L95 179 C82 179 71 179 68 176 Z"
        fill="url(#bnBird)"/>
  <circle cx="94" cy="120" r="31" fill="url(#bnBird)"/>
  <path d="M67 128 L48 137 L69 143 Z" fill="#F5A623"/>
  <path d="M80 118 q11 6 21 0" stroke="#3A0A22" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M127 96 q-6 12 0 18 q6 -6 0 -18 Z" fill="#7CC7FF"/>
  <g fill="#F5A623">
    <path d="M150 78 l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 Z" opacity=".95"/>
    <path d="M182 100 l2 5 5 1 -4 4 1 5 -4 -2 -4 2 1 -5 -4 -4 5 -1 Z" opacity=".7"/>
    <path d="M118 68 l2 5 5 1 -4 4 1 5 -4 -2 -4 2 1 -5 -4 -4 5 -1 Z" opacity=".6"/>
  </g>
  <ellipse cx="100" cy="181" rx="10" ry="4" fill="#F5A623"/>
  <ellipse cx="132" cy="181" rx="10" ry="4" fill="#F5A623"/>
  <text x="150" y="60" font-size="20" fill="#FF8FC0" font-weight="700">z</text>
  <text x="169" y="47" font-size="14" fill="#FF8FC0" font-weight="700">z</text>
</svg>`;
}

export function showOffline() {
  if (document.getElementById('offline-overlay')) return;
  const el = document.createElement('div');
  el.id = 'offline-overlay';
  el.className = 'offline-overlay';
  el.setAttribute('role', 'alertdialog');
  el.setAttribute('aria-label', 'Network connection lost');
  el.innerHTML = `
    <div class="offline-card">
      ${birdSlumpedSvg()}
      <h2>网络开小差了</h2>
      <p>你好像断网了，或者服务器暂时没响应。小鸟也累瘫了……</p>
      <button type="button" class="btn btn-primary" id="offline-retry">再试一次</button>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#offline-retry').addEventListener('click', () => {
    el.remove();
    window.location.reload();
  });
}

export function hideOffline() {
  const el = document.getElementById('offline-overlay');
  if (el) el.remove();
}

function initOffline() {
  if (window.__bnOfflineInit) return;
  window.__bnOfflineInit = true;
  window.addEventListener('offline', showOffline);
  window.addEventListener('bn:net-error', showOffline);
  window.addEventListener('online', hideOffline);
}

// --- empty states (curious bird) -------------------------------------------

export function birdEmptySvg() {
  return `
<svg viewBox="0 0 200 180" width="120" height="108" class="bird-empty" role="img" aria-hidden="true">
  <defs>
    <radialGradient id="bnBirdEmpty" cx="45%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#FF62A6"/>
      <stop offset="100%" stop-color="#D6006E"/>
    </radialGradient>
  </defs>
  <ellipse cx="100" cy="164" rx="52" ry="8" fill="#000" opacity="0.1"/>
  <path d="M58 160 C48 128 62 96 100 94 C138 92 156 118 152 146 C150 160 136 164 118 165 L80 165 C68 165 60 164 58 160 Z"
        fill="url(#bnBirdEmpty)"/>
  <circle cx="128" cy="82" r="30" fill="url(#bnBirdEmpty)"/>
  <path d="M156 78 L176 86 L156 94 Z" fill="#F5A623"/>
  <circle cx="138" cy="78" r="8" fill="#fff"/>
  <circle cx="140" cy="78" r="4" fill="#2A0A1A"/>
  <circle cx="141" cy="76" r="1.5" fill="#fff"/>
  <path d="M58 118 L36 108 L44 126 Z" fill="#C4006A"/>
  <ellipse cx="86" cy="166" rx="9" ry="4" fill="#F5A623"/>
  <ellipse cx="116" cy="166" rx="9" ry="4" fill="#F5A623"/>
  <text x="150" y="44" font-size="24" font-weight="700" fill="#F5A623">?</text>
</svg>`;
}

export function emptyState(message, { cta } = {}) {
  const ctaHtml = cta
    ? `<a class="btn btn-primary" href="${escapeHtml(cta.href)}">${escapeHtml(cta.label)}</a>`
    : '';
  return `
    <div class="empty-state">
      ${birdEmptySvg()}
      <p>${escapeHtml(message)}</p>
      ${ctaHtml}
    </div>`;
}

// --- double-submit guard ---------------------------------------------------

export async function guardSubmit(button, fn) {
  if (!button) return fn();
  if (button.dataset.busy === '1') return undefined;
  button.dataset.busy = '1';
  button.disabled = true;
  button.classList.add('is-busy');
  try {
    return await fn();
  } finally {
    button.disabled = false;
    button.classList.remove('is-busy');
    delete button.dataset.busy;
  }
}

// --- i18n application ------------------------------------------------------

export function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.dataset.i18nHtml;
    if (key) el.innerHTML = t(key);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
    const key = el.dataset.i18nPh;
    if (key) el.setAttribute('placeholder', t(key));
  });

  const nav = document.querySelector('.main-nav');
  if (nav) {
    const links = nav.querySelectorAll('a');
    if (links[0]) links[0].textContent = t('nav.home');
    if (links[1]) links[1].textContent = t('nav.browse');
  }
  const searchInput = document.querySelector('.header-search input');
  if (searchInput) searchInput.setAttribute('placeholder', t('search.placeholder'));
  const searchBtn = document.querySelector('.header-search button');
  if (searchBtn) searchBtn.textContent = t('search.button');
  const cartLink = document.querySelector('.cart-link');
  if (cartLink) cartLink.setAttribute('aria-label', t('cart.aria'));
  const footerP = document.querySelector('.site-footer p');
  if (footerP) footerP.textContent = t('footer.text');
}

// --- right-hand draggable scrollbar ---------------------------------------

function initScrollbar() {
  if (document.getElementById('bn-scrollbar')) return;
  const el = document.createElement('div');
  el.id = 'bn-scrollbar';
  el.className = 'bn-scrollbar';
  el.innerHTML = '<div class="bn-scrollbar-thumb" id="bn-scrollbar-thumb" role="slider" aria-label="Scroll page"></div>';
  document.body.appendChild(el);

  const thumb = el.querySelector('#bn-scrollbar-thumb');

  function update() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    const trackH = el.clientHeight;
    if (trackH <= 0) return;
    const thumbH = Math.max(36, Math.min(trackH, (window.innerHeight / doc.scrollHeight) * trackH));
    thumb.style.height = `${thumbH}px`;
    const ratio = max > 0 ? window.scrollY / max : 0;
    const top = ratio * (trackH - thumbH);
    thumb.style.transform = `translateY(${top}px)`;
  }

  let dragging = false;
  let startY = 0;
  let startScroll = 0;
  thumb.addEventListener('pointerdown', (e) => {
    dragging = true;
    startY = e.clientY;
    startScroll = window.scrollY;
    try { thumb.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    thumb.classList.add('dragging');
    e.preventDefault();
  });
  thumb.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const trackH = el.clientHeight;
    const thumbH = thumb.offsetHeight;
    const maxTrack = Math.max(1, trackH - thumbH);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, startScroll + ((e.clientY - startY) / maxTrack) * maxScroll);
  });
  const stop = () => { dragging = false; thumb.classList.remove('dragging'); };
  thumb.addEventListener('pointerup', stop);
  thumb.addEventListener('pointercancel', stop);
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

// --- add-to-cart flying book ----------------------------------------------

export function flyToCart(fromEl) {
  const cart = document.querySelector('.cart-link');
  if (!cart || !fromEl) return;
  const from = fromEl.getBoundingClientRect();
  const to = cart.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly-book';
  el.textContent = '📕';
  el.style.left = `${from.left + from.width / 2}px`;
  el.style.top = `${from.top + from.height / 2}px`;
  document.body.appendChild(el);

  const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
  const dy = (to.top + to.height / 2) - (from.top + from.height / 2);

  const anim = el.animate([
    { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
    {
      transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 80}px)) scale(1.3) rotate(-15deg)`,
      opacity: 1,
      offset: 0.5,
    },
    {
      transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.15) rotate(25deg)`,
      opacity: 0.2,
    },
  ], { duration: 700, easing: 'ease-in-out' });

  anim.onfinish = () => {
    el.remove();
    cart.classList.add('cart-bump');
    setTimeout(() => cart.classList.remove('cart-bump'), 520);
  };
}

// --- celebration burst behind a button ------------------------------------

export function burst(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const colors = ['#E4572E', '#F5A623', '#1F8A9E', '#C94F8A', '#2E8B57', '#9C6BD6'];
  for (let i = 0; i < 16; i += 1) {
    const p = document.createElement('span');
    p.className = 'burst-particle';
    p.style.background = colors[i % colors.length];
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.5;
    const dist = 55 + Math.random() * 75;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const dur = 550 + Math.random() * 350;
    p.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0 },
    ], { duration: dur, easing: 'cubic-bezier(.2,.8,.3,1)' });
    document.body.appendChild(p);
    setTimeout(() => p.remove(), dur + 60);
  }
}

// --- shared header ---------------------------------------------------------

export async function initHeader() {
  applyPreferences();
  applyI18n();
  initOffline();
  initScrollbar();
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
      <a class="auth-link" href="/account.html">👤 ${escapeHtml(user.display_name)}</a>
      <a class="auth-link" href="/orders.html">📦 ${t('auth.orders')}</a>
      <a class="auth-link" href="/settings.html">⚙️ ${t('auth.settings')}</a>
      <button class="btn btn-ghost" id="signout-btn" type="button">${t('auth.signout')}</button>`;
    authArea.querySelector('#signout-btn').addEventListener('click', async () => {
      await logout();
      renderAuthArea(authArea, null);
      toast(t('auth.signout'));
    });
  } else {
    authArea.innerHTML = `<button class="btn btn-light" id="signin-btn" type="button">${t('auth.signin')}</button>`;
    authArea.querySelector('#signin-btn').addEventListener('click', async () => {
      const user = await ensureAuthed();
      if (user) {
        renderAuthArea(authArea, user);
        toast(`Welcome, ${escapeHtml(user.display_name)}!`);
      }
    });
  }
}
