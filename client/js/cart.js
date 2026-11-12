import { api } from './api.js';
import { cover, escapeHtml, formatLabel, initHeader, money, refreshHeader, toast } from './ui.js';
import { ensureAuthed } from './auth.js';

async function init() {
  await initHeader();
  const user = await ensureAuthed();
  if (!user) return;
  await load();
}

async function load() {
  const { items, subtotal } = await api('/api/cart');
  render(items, subtotal);
}

function render(items, subtotal) {
  const el = document.getElementById('cart-container');
  if (!items.length) {
    el.innerHTML = `<p class="empty">Your cart is empty.</p>
      <p><a class="btn btn-primary" href="/catalogue.html">Browse books</a></p>`;
    return;
  }
  const hasUsed = items.some((i) => i.format === 'used');
  el.innerHTML = `
    <div class="cart-list">${items.map(itemRow).join('')}</div>
    <div class="cart-summary">
      <p class="cart-subtotal">Subtotal: <strong>${money(subtotal)}</strong></p>
      <form id="checkout-form" novalidate>
        <div id="address-field" ${hasUsed ? '' : 'hidden'}>
          <label>Delivery address (required for used books)
            <textarea name="deliveryAddress" rows="3" minlength="5"
              placeholder="Room, building, campus…"></textarea>
          </label>
        </div>
        <button type="submit" class="btn btn-primary">Place order (simulated)</button>
      </form>
      <p class="muted small">No real payment or card details are used.</p>
    </div>`;

  el.querySelector('.cart-list').addEventListener('change', onQtyChange);
  el.querySelector('.cart-list').addEventListener('click', onRemove);
  el.querySelector('#checkout-form').addEventListener('submit', onCheckout);
}

function itemRow(it) {
  return `
    <article class="cart-item" data-id="${it.id}">
      <div class="cart-cover">${cover(it)}</div>
      <div class="cart-info">
        <a class="cart-title" href="/book.html?id=${it.id}">${escapeHtml(it.title)}</a>
        <p class="muted">${escapeHtml(it.author)} · ${formatLabel(it.format)}</p>
        <p class="cart-unit">${money(it.price)} each</p>
      </div>
      <div class="cart-controls">
        <input type="number" class="qty-input" value="${it.qty}" min="1" max="99"
          aria-label="Quantity for ${escapeHtml(it.title)}">
        <span class="cart-line-total">${money(it.price * it.qty)}</span>
        <button class="linklike danger" type="button" data-action="remove">Remove</button>
      </div>
    </article>`;
}

async function onQtyChange(e) {
  if (!e.target.classList.contains('qty-input')) return;
  const id = Number(e.target.closest('.cart-item').dataset.id);
  const qty = Number(e.target.value);
  if (!Number.isInteger(qty) || qty < 1) {
    e.target.value = 1;
    return;
  }
  try {
    await api(`/api/cart/${id}`, { method: 'PUT', body: { qty } });
    await load();
  } catch (err) {
    toast(err.message);
    await load();
  }
}

async function onRemove(e) {
  const btn = e.target.closest('[data-action="remove"]');
  if (!btn) return;
  const id = Number(btn.closest('.cart-item').dataset.id);
  try {
    await api(`/api/cart/${id}`, { method: 'DELETE' });
    toast('Removed from cart.');
    await load();
  } catch (err) {
    toast(err.message);
  }
}

async function onCheckout(e) {
  e.preventDefault();
  const form = e.target;
  const deliveryAddress = form.deliveryAddress ? form.deliveryAddress.value : '';
  try {
    const { order } = await api('/api/orders', { method: 'POST', body: { deliveryAddress } });
    toast(`Order #${order.id} placed.`);
    await refreshHeader();
    setTimeout(() => { window.location.href = '/orders.html'; }, 700);
  } catch (err) {
    toast(err.message);
  }
}

init();
