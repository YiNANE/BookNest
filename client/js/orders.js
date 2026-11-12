import { api } from './api.js';
import { escapeHtml, formatDate, initHeader, money, toast } from './ui.js';
import { ensureAuthed } from './auth.js';

async function init() {
  await initHeader();
  const user = await ensureAuthed();
  if (!user) return;
  await load();
}

async function load() {
  const { orders } = await api('/api/orders');
  render(orders);
}

function render(orders) {
  const el = document.getElementById('orders-list');
  if (!orders.length) {
    el.innerHTML = '<p class="empty">No orders yet.</p>';
    return;
  }
  el.innerHTML = orders.map(orderCard).join('');
}

function orderCard(o) {
  return `
    <article class="order-card" data-id="${o.id}" data-status="${o.status}">
      <div class="order-head">
        <span class="order-id">Order #${o.id}</span>
        <span class="order-status status-${o.status}">${escapeHtml(o.status)}</span>
        <span class="order-total">${money(o.total)}</span>
        <time>${formatDate(o.created_at)}</time>
      </div>
      <div class="order-actions">
        ${o.status === 'pending'
          ? '<button class="btn btn-primary" type="button" data-action="pay">Pay now (simulated)</button>'
          : ''}
        <button class="linklike" type="button" data-action="view">View items</button>
      </div>
      <div class="order-items" hidden></div>
    </article>`;
}

async function onAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('.order-card');
  const id = Number(card.dataset.id);

  if (btn.dataset.action === 'pay') {
    try {
      await api(`/api/orders/${id}/pay`, { method: 'POST' });
      toast('Payment recorded (simulated).');
      await load();
    } catch (err) {
      toast(err.message);
    }
  } else if (btn.dataset.action === 'view') {
    const box = card.querySelector('.order-items');
    if (!box.hidden) {
      box.hidden = true;
      return;
    }
    try {
      const { items } = await api(`/api/orders/${id}`);
      const canDownload = card.dataset.status === 'paid' || card.dataset.status === 'delivered';
      box.innerHTML = items.map((it) => `
        <div class="order-item">
          <span>${escapeHtml(it.title)}</span>
          <span class="muted">${it.qty} × ${money(it.unit_price)}</span>
          <span>${money(it.unit_price * it.qty)}</span>
          ${canDownload && it.format === 'digital'
            ? `<a class="linklike" href="/api/books/${it.book_id}/download">Download</a>`
            : ''}
        </div>`).join('');
      box.hidden = false;
    } catch (err) {
      toast(err.message);
    }
  }
}

document.getElementById('orders-list').addEventListener('click', onAction);
init();
