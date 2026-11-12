import { api } from './api.js';
import { escapeHtml, formatDate, initHeader, money, toast } from './ui.js';
import { ensureAuthed } from './auth.js';

let categories = [];
let books = [];

async function init() {
  await initHeader();
  const user = await ensureAuthed();
  if (!user) return;
  if (user.role !== 'admin') {
    document.getElementById('admin-root').innerHTML = '<p class="error">Admin access only.</p>';
    return;
  }
  categories = await api('/api/categories');
  bindTabs();
  bindForm();
  bindTables();
  await loadAll();
}

async function loadAll() {
  await Promise.all([loadBooks(), loadOrders()]);
}

// ---------- books ----------

async function loadBooks() {
  const { books: rows } = await api('/api/admin/books');
  books = rows;
  document.getElementById('books-tbody').innerHTML = rows.map(bookRow).join('');
}

function bookRow(b) {
  return `
    <tr data-id="${b.id}">
      <td>${b.id}</td>
      <td>${escapeHtml(b.title)}</td>
      <td>${b.format}</td>
      <td>${money(b.price)}</td>
      <td>${b.format === 'used' ? b.stock : '—'}</td>
      <td>${escapeHtml(b.category_name)}</td>
      <td><span class="tag ${b.is_active ? 'on' : 'off'}">${b.is_active ? 'active' : 'inactive'}</span></td>
      <td>
        <div class="admin-actions">
          <button class="linklike" type="button" data-action="edit">Edit</button>
          <button class="linklike" type="button" data-action="toggle">${b.is_active ? 'Deactivate' : 'Activate'}</button>
          <button class="linklike danger" type="button" data-action="delete">Delete</button>
        </div>
      </td>
    </tr>`;
}

function bindForm() {
  document.getElementById('book-category').innerHTML =
    categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

  document.getElementById('book-form').addEventListener('submit', onSubmitBook);
  document.getElementById('book-reset').addEventListener('click', resetForm);
}

async function onSubmitBook(e) {
  e.preventDefault();
  const form = e.target;
  const id = form.id.value;
  const url = id ? `/api/admin/books/${id}` : '/api/admin/books';
  const errEl = document.getElementById('book-form-error');
  errEl.textContent = '';
  try {
    // multipart (FormData) — use raw fetch, not the JSON helper.
    const res = await fetch(url, { method: id ? 'PUT' : 'POST', body: new FormData(form) });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    toast(id ? 'Book updated.' : 'Book added.');
    resetForm();
    await loadBooks();
  } catch (err) {
    errEl.textContent = err.message;
  }
}

function populateForm(b) {
  const form = document.getElementById('book-form');
  form.id.value = b.id;
  form.title.value = b.title;
  form.author.value = b.author;
  form.category_id.value = b.category_id;
  form.format.value = b.format;
  form.price.value = b.price;
  form.condition.value = b.condition || '';
  form.stock.value = b.stock;
  form.description.value = b.description || '';
  form.is_active.value = b.is_active ? '1' : '0';
  document.getElementById('book-submit').textContent = 'Update book';
}

function resetForm() {
  const form = document.getElementById('book-form');
  form.reset();
  form.id.value = '';
  form.is_active.value = '1';
  document.getElementById('book-submit').textContent = 'Add book';
  document.getElementById('book-form-error').textContent = '';
}

async function onBookAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.closest('tr').dataset.id);
  const book = books.find((b) => b.id === id);

  if (btn.dataset.action === 'edit') {
    populateForm(book);
    document.getElementById('book-form').scrollIntoView({ behavior: 'smooth' });
  } else if (btn.dataset.action === 'toggle') {
    try {
      await api(`/api/admin/books/${id}`, { method: 'PATCH' });
      await loadBooks();
    } catch (err) {
      toast(err.message);
    }
  } else if (btn.dataset.action === 'delete') {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    try {
      await api(`/api/admin/books/${id}`, { method: 'DELETE' });
      toast('Book deleted.');
      await loadBooks();
    } catch (err) {
      toast(err.message);
    }
  }
}

// ---------- orders ----------

async function loadOrders() {
  const { orders } = await api('/api/admin/orders');
  const tbody = document.getElementById('orders-tbody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="muted">No orders yet.</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map((o) => `
    <tr data-id="${o.id}">
      <td>${o.id}</td>
      <td>${escapeHtml(o.user_name)}<br><span class="muted">${escapeHtml(o.user_email)}</span></td>
      <td>${money(o.total)}</td>
      <td><span class="order-status status-${o.status}">${escapeHtml(o.status)}</span></td>
      <td>${escapeHtml(o.delivery_address || '—')}</td>
      <td>${formatDate(o.created_at)}</td>
      <td>
        <select class="status-select" data-id="${o.id}" aria-label="Set status for order ${o.id}">
          ${['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((s) =>
            `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');
}

async function onStatusChange(e) {
  const select = e.target.closest('.status-select');
  if (!select) return;
  const id = Number(select.dataset.id);
  try {
    await api(`/api/admin/orders/${id}`, { method: 'PATCH', body: { status: select.value } });
    toast(`Order #${id} → ${select.value}.`);
    await loadOrders();
  } catch (err) {
    toast(err.message);
    await loadOrders();
  }
}

// ---------- wiring ----------

function bindTabs() {
  document.querySelectorAll('.admin-tabs button').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tabs button').forEach((b) => b.classList.toggle('active', b === btn));
    document.getElementById('books-panel').hidden = btn.dataset.tab !== 'books';
    document.getElementById('orders-panel').hidden = btn.dataset.tab !== 'orders';
  }));
}

function bindTables() {
  document.getElementById('books-tbody').addEventListener('click', onBookAction);
  document.getElementById('orders-tbody').addEventListener('change', onStatusChange);
}

init();
