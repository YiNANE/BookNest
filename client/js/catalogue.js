import { api, qs } from './api.js';
import { escapeHtml, initHeader, renderBookGrid } from './ui.js';

const state = {
  category: '',
  q: '',
  format: '',
  minPrice: '',
  maxPrice: '',
  minRating: '',
  sort: 'newest',
  page: 1,
};

async function init() {
  const url = new URLSearchParams(location.search);
  state.category = url.get('category') || '';
  state.q = url.get('q') || '';
  state.sort = url.get('sort') || 'newest';
  if (url.get('q')) {
    const input = document.querySelector('.header-search input');
    if (input) input.value = state.q;
  }

  const [categories, meta] = await Promise.all([
    api('/api/categories'),
    api('/api/catalogue/meta'),
  ]);

  renderCategoryFilter(categories);
  state.minPrice = meta.priceMin;
  state.maxPrice = meta.priceMax;
  document.getElementById('min-price').value = meta.priceMin;
  document.getElementById('max-price').value = meta.priceMax;
  document.getElementById('min-price').min = meta.priceMin;
  document.getElementById('max-price').max = meta.priceMax;
  document.getElementById('sort').value = state.sort;

  bindControls();
  await load();
}

function renderCategoryFilter(categories) {
  const el = document.getElementById('category-filter');
  const all = `<label class="filter-row">
      <input type="radio" name="category" value="" ${!state.category ? 'checked' : ''}>
      <span>All subjects</span></label>`;
  const rows = categories.map((c) => `
    <label class="filter-row">
      <input type="radio" name="category" value="${escapeHtml(c.slug)}" ${state.category === c.slug ? 'checked' : ''}>
      <span>${escapeHtml(c.name)}</span>
      <span class="filter-count">${c.book_count}</span>
    </label>`).join('');
  el.innerHTML = all + rows;
}

function bindControls() {
  document.querySelectorAll('input[name="category"]').forEach((r) => r.addEventListener('change', () => {
    state.category = r.value;
    state.page = 1;
    load();
  }));
  document.querySelectorAll('input[name="format"]').forEach((r) => r.addEventListener('change', () => {
    state.format = r.value;
    state.page = 1;
    load();
  }));
  document.getElementById('min-price').addEventListener('change', (e) => {
    state.minPrice = e.target.value;
    state.page = 1;
    load();
  });
  document.getElementById('max-price').addEventListener('change', (e) => {
    state.maxPrice = e.target.value;
    state.page = 1;
    load();
  });
  document.getElementById('min-rating').addEventListener('change', (e) => {
    state.minRating = e.target.value;
    state.page = 1;
    load();
  });
  document.getElementById('sort').addEventListener('change', (e) => {
    state.sort = e.target.value;
    load();
  });
  document.getElementById('clear-filters').addEventListener('click', () => {
    Object.assign(state, {
      category: '', format: '', minRating: '', page: 1,
    });
    const meta = {
      min: document.getElementById('min-price').min,
      max: document.getElementById('max-price').max,
    };
    state.minPrice = meta.min;
    state.maxPrice = meta.max;
    document.querySelectorAll('input[name="category"]').forEach((r) => {
      r.checked = r.value === '';
    });
    document.querySelectorAll('input[name="format"]').forEach((r) => {
      r.checked = r.value === '';
    });
    document.getElementById('min-price').value = meta.min;
    document.getElementById('max-price').value = meta.max;
    document.getElementById('min-rating').value = '';
    document.getElementById('sort').value = 'newest';
    load();
  });
}

async function load() {
  const grid = document.getElementById('book-grid');
  grid.innerHTML = '<p class="empty">Loading…</p>';
  try {
    const data = await api('/api/books' + qs({
      category: state.category,
      q: state.q,
      format: state.format,
      minPrice: state.minPrice,
      maxPrice: state.maxPrice,
      minRating: state.minRating,
      sort: state.sort,
      page: state.page,
    }));
    renderBookGrid(grid, data.items, 'No books match your filters.');
    renderResultCount(data);
    renderPagination(data);
  } catch (err) {
    grid.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function renderResultCount(data) {
  const el = document.getElementById('result-count');
  const start = data.total === 0 ? 0 : (data.page - 1) * data.limit + 1;
  const end = Math.min(data.page * data.limit, data.total);
  el.textContent = `${start}–${end} of ${data.total} books`;
}

function renderPagination(data) {
  const el = document.getElementById('pagination');
  if (data.pageCount <= 1) {
    el.innerHTML = '';
    return;
  }
  const pages = [];
  for (let p = 1; p <= data.pageCount; p += 1) {
    pages.push(`<button class="page-btn${p === data.page ? ' current' : ''}"
      type="button" data-page="${p}" ${p === data.page ? 'aria-current="page"' : ''}>${p}</button>`);
  }
  el.innerHTML = pages.join('');
  el.querySelectorAll('.page-btn').forEach((btn) => btn.addEventListener('click', () => {
    state.page = Number(btn.dataset.page);
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }));
}

initHeader();
init().catch((err) => {
  document.getElementById('book-grid').innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
});
