import { api } from './api.js';
import { applyI18n, applyPreferences, escapeHtml, initHeader, refreshHeader, THEMES, toast } from './ui.js';
import { setLang } from './i18n.js';
import { ensureAuthed } from './auth.js';

let current = null;

async function init() {
  await initHeader();
  const user = await ensureAuthed();
  if (!user) return;
  const { settings } = await api('/api/me/settings');
  render(settings);
  bind();
}

function render(s) {
  current = s;

  const sw = document.getElementById('theme-swatches');
  sw.innerHTML = Object.entries(THEMES).map(([key, t]) => `
    <button type="button" class="theme-swatch${key === s.theme ? ' active' : ''}"
      data-theme="${key}" style="background:${t.accent}"
      aria-label="${t.label} theme" title="${escapeHtml(t.label)}"></button>`).join('');

  document.querySelectorAll('[data-font]').forEach((b) => {
    b.classList.toggle('active', b.dataset.font === s.font_size);
  });
  document.querySelectorAll('[data-lang]').forEach((b) => {
    b.classList.toggle('active', b.dataset.lang === s.language);
  });
  document.getElementById('payment-method').value = s.payment_method;
  document.getElementById('privacy-name').checked = s.privacy_show_name;
  document.getElementById('privacy-email').checked = s.privacy_show_email;
}

async function save(partial) {
  try {
    const { settings } = await api('/api/me/settings', { method: 'PUT', body: partial });
    current = settings;
    try {
      localStorage.setItem('bn_theme', settings.theme);
      localStorage.setItem('bn_font', settings.font_size);
      localStorage.setItem('bn_lang', settings.language);
    } catch { /* ignore */ }
    setLang(settings.language);
    applyPreferences();
    applyI18n();
    render(settings);
    refreshHeader();
    toast('Settings saved.');
  } catch (err) {
    toast(err.message);
  }
}

function bind() {
  document.getElementById('theme-swatches').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-theme]');
    if (btn) save({ theme: btn.dataset.theme });
  });
  document.getElementById('font-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-font]');
    if (btn) save({ font_size: btn.dataset.font });
  });
  document.getElementById('lang-group').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lang]');
    if (btn) save({ language: btn.dataset.lang });
  });
  document.getElementById('payment-method').addEventListener('change', (e) => {
    save({ payment_method: e.target.value });
  });
  document.getElementById('privacy-name').addEventListener('change', (e) => {
    save({ privacy_show_name: e.target.checked });
  });
  document.getElementById('privacy-email').addEventListener('change', (e) => {
    save({ privacy_show_email: e.target.checked });
  });
}

init().catch((err) => {
  document.getElementById('settings-root').innerHTML =
    `<p class="error">${escapeHtml(err.message)}</p>`;
});
