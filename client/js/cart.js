import { api } from './api.js';
import { cover, emptyState, escapeHtml, formatLabel, guardSubmit, initHeader, money, refreshHeader, toast } from './ui.js';
import { t } from './i18n.js';
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
    el.innerHTML = emptyState(t('empty.cart'), {
      cta: { href: '/catalogue.html', label: t('btn.browse') },
    });
    return;
  }
  const hasUsed = items.some((i) => i.format === 'used');
  el.innerHTML = `
    <div class="cart-list">${items.map(itemRow).join('')}</div>
    <div class="cart-summary">
      <p class="cart-subtotal">${t('cart.subtotal')}: <strong>${money(subtotal)}</strong></p>
      <form id="checkout-form" novalidate>
        <div id="address-field" ${hasUsed ? '' : 'hidden'}>
          <label>${t('cart.delivery')}
            <textarea name="deliveryAddress" rows="3" minlength="5"
              placeholder="${t('cart.deliveryPh')}"></textarea>
          </label>
        </div>
        <button type="submit" class="btn btn-primary">${t('cart.placeOrder')}</button>
      </form>
      <p class="muted small">${t('cart.paymentNote')}</p>
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
        <p class="cart-unit">${money(it.price)} ${t('cart.each')}</p>
      </div>
      <div class="cart-controls">
        <input type="number" class="qty-input" value="${it.qty}" min="1" max="99"
          aria-label="Quantity for ${escapeHtml(it.title)}">
        <span class="cart-line-total">${money(it.price * it.qty)}</span>
        <button class="linklike danger" type="button" data-action="remove">${t('cart.remove')}</button>
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
    toast(t('cart.removed'));
    await load();
  } catch (err) {
    toast(err.message);
  }
}

async function onCheckout(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const deliveryAddress = form.deliveryAddress ? form.deliveryAddress.value : '';
  await guardSubmit(submitBtn, async () => {
    try {
      const { order } = await api('/api/orders', { method: 'POST', body: { deliveryAddress } });
      toast(`Order #${order.id} placed.`);
      await refreshHeader();
      setTimeout(() => { window.location.href = '/orders.html'; }, 700);
    } catch (err) {
      toast(err.message);
    }
  });
}

init();
