import { api } from './api.js';
import { formatDate, initHeader } from './ui.js';
import { ensureAuthed } from './auth.js';

async function init() {
  await initHeader();
  const user = await ensureAuthed();
  if (!user) return;
  fill(user);
  try {
    const { orders } = await api('/api/orders');
    document.getElementById('acc-orders').textContent = `${orders.length}`;
  } catch {
    document.getElementById('acc-orders').textContent = '—';
  }
}

function fill(user) {
  document.getElementById('acc-name').textContent = user.display_name;
  document.getElementById('acc-email').textContent = user.email;
  document.getElementById('acc-role').textContent = user.role;
  document.getElementById('acc-since').textContent = user.created_at
    ? formatDate(user.created_at)
    : '—';
}

init();
