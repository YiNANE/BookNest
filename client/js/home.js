import { api } from './api.js';
import { bookCard, escapeHtml, initHeader } from './ui.js';
import { t } from './i18n.js';

async function loadHome() {
  const [home, categories] = await Promise.all([
    api('/api/home'),
    api('/api/categories'),
  ]);
  renderPicks(home.picks);
  renderCategories(categories);
  renderCategorySections(home.categorySections || []);
  renderSubjectRail(categories);
  initRailSpy();
  renderConfetti();
}

function renderPicks(picks) {
  const grid = document.getElementById('picks-grid');
  if (!grid) return;
  grid.className = 'ranking';
  if (!picks.length) {
    grid.innerHTML = '<p class="empty">No books yet.</p>';
    return;
  }
  grid.innerHTML = picks.map((book, i) => `
    <div class="rank-item" data-rank="${i + 1}">
      <div class="rank-card">${bookCard(book)}</div>
      <div class="rank-step" aria-hidden="true">
        <span class="rank-num">${i + 1}</span>
        <div class="rank-bars"><i></i><i></i><i></i></div>
      </div>
    </div>`).join('');
}

function renderCategories(categories) {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = categories.map((c) => `
    <a class="category-tile" href="/catalogue.html?category=${encodeURIComponent(c.slug)}">
      <span class="category-name">${escapeHtml(c.name)}</span>
      <span class="category-count">${c.book_count} book${c.book_count === 1 ? '' : 's'}</span>
    </a>`).join('');
}

// Left rail: subject names → jump to that subject's picks.
function renderSubjectRail(categories) {
  const rail = document.getElementById('subject-rail');
  if (!rail || !categories.length) return;
  rail.innerHTML =
    `<div class="rail-title">${escapeHtml(t('cat.subject'))}</div>` +
    categories.map((c) => `
      <button type="button" class="rail-item" data-slug="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</button>`).join('');
  document.body.classList.add('has-left-rail');

  rail.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-slug]');
    if (!btn) return;
    const section = document.querySelector(`[data-subject="${btn.dataset.slug}"]`);
    if (!section) return;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    section.classList.remove('rail-flash');
    void section.offsetWidth;
    section.classList.add('rail-flash');
    rail.querySelectorAll('.rail-item').forEach((b) => b.classList.toggle('active', b === btn));
  });
}

function renderCategorySections(sections) {
  const el = document.getElementById('category-sections');
  if (!sections.length) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = sections.map((s) => `
    <section class="section-sub" data-subject="${escapeHtml(s.category.slug)}">
      <div class="section-head">
        <h3>${escapeHtml(s.category.name)} ${escapeHtml(t('home.picksFor'))}</h3>
        <a class="section-link"
           href="/catalogue.html?category=${encodeURIComponent(s.category.slug)}&sort=rating">${escapeHtml(t('home.seeAll'))}</a>
      </div>
      <div class="book-grid">${s.books.length ? s.books.map(bookCard).join('') : `<p class="empty">${escapeHtml(t('empty.category'))}</p>`}</div>
    </section>`).join('');
}

// Scroll-spy: highlight the subject whose list is currently in view.
function initRailSpy() {
  const rail = document.getElementById('subject-rail');
  const sections = Array.from(document.querySelectorAll('[data-subject]'));
  if (!rail || !sections.length) return;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const probe = window.scrollY + window.innerHeight * 0.35;
      let current = sections[0];
      for (const s of sections) {
        if (s.offsetTop <= probe) current = s;
      }
      const slug = current.dataset.subject;
      rail.querySelectorAll('.rail-item').forEach((b) => {
        b.classList.toggle('active', b.dataset.slug === slug);
      });
      ticking = false;
    });
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// Party-popper confetti pieces (slow drifting).
function renderConfetti() {
  const box = document.getElementById('confetti');
  if (!box) return;
  const colors = ['#E4572E', '#F5A623', '#1F8A9E', '#C94F8A', '#2E8B57', '#9C6BD6', '#EACB77'];
  let html = '';
  for (let i = 0; i < 26; i += 1) {
    const left = (Math.random() * 100).toFixed(1);
    const delay = (Math.random() * 12).toFixed(2);
    const dur = (9 + Math.random() * 9).toFixed(2);
    const rot = (Math.random() * 360).toFixed(0);
    const color = colors[i % colors.length];
    const w = (5 + Math.random() * 6).toFixed(0);
    const h = (9 + Math.random() * 8).toFixed(0);
    html += `<span class="confetti-piece" style="left:${left}%;--c:${color};--d:${delay}s;--dur:${dur}s;--r:${rot}deg;width:${w}px;height:${h}px"></span>`;
  }
  box.innerHTML = html;
}

initHeader();
loadHome().catch((err) => {
  const grid = document.getElementById('picks-grid');
  grid.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
});
