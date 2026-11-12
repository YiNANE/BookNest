import { api } from './api.js';
import { bookCard, escapeHtml, initHeader } from './ui.js';

async function loadHome() {
  const [home, categories] = await Promise.all([
    api('/api/home'),
    api('/api/categories'),
  ]);
  renderPicks(home.picks);
  renderCategories(categories);
}

function renderPicks(picks) {
  const grid = document.getElementById('picks-grid');
  if (!picks.length) {
    grid.innerHTML = '<p class="empty">No books yet.</p>';
    return;
  }
  grid.innerHTML = picks.map(bookCard).join('');
}

function renderCategories(categories) {
  const grid = document.getElementById('category-grid');
  grid.innerHTML = categories.map((c) => `
    <a class="category-tile" href="/catalogue.html?category=${encodeURIComponent(c.slug)}">
      <span class="category-name">${escapeHtml(c.name)}</span>
      <span class="category-count">${c.book_count} book${c.book_count === 1 ? '' : 's'}</span>
    </a>`).join('');
}

initHeader();
loadHome().catch((err) => {
  const grid = document.getElementById('picks-grid');
  grid.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
});
