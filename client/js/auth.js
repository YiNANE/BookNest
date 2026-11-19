import { api } from './api.js';
import { t } from './i18n.js';

let currentUser = null;

export function me() {
  return currentUser;
}

export async function getMe() {
  try {
    const { user } = await api('/api/me');
    currentUser = user;
    return user;
  } catch {
    currentUser = null;
    return null;
  }
}

// Resolve with the signed-in user, or null if the user cancels the dialog.
// Write actions call this first so the interrupted action resumes after login.
export async function ensureAuthed() {
  if (currentUser) return currentUser;
  const user = await getMe(); // the session may already be valid on a fresh page load
  if (user) return user;
  return openAuthDialog();
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    // ignore — session may already be gone
  }
  currentUser = null;
}

function openAuthDialog() {
  return new Promise((resolve) => {
    const dialog = buildDialog();
    document.body.appendChild(dialog);
    dialog.showModal();

    const tabs = dialog.querySelectorAll('[data-tab]');
    const form = dialog.querySelector('form');
    const title = dialog.querySelector('#auth-title');
    const submit = dialog.querySelector('#auth-submit');
    const displayField = dialog.querySelector('#display-name-field');
    const errorEl = dialog.querySelector('#auth-error');

    function setMode(mode) {
      form.dataset.mode = mode;
      const registering = mode === 'register';
      title.textContent = registering ? t('auth.title.register') : t('auth.title.signin');
      submit.textContent = registering ? t('auth.submit.register') : t('auth.submit.signin');
      displayField.hidden = !registering;
      tabs.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === mode));
      errorEl.textContent = '';
    }

    tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.tab)));

    // Close (fixes the "stuck on sign-in" case).
    dialog.querySelector('#auth-close').addEventListener('click', () => dialog.close('cancel'));

    // Clicking the dark backdrop also closes the dialog.
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close('cancel');
    });

    // Show / hide password.
    const pw = form.password;
    const pwBtn = dialog.querySelector('#pw-toggle');
    pwBtn.addEventListener('click', () => {
      const showing = pw.type === 'text';
      pw.type = showing ? 'password' : 'text';
      pwBtn.textContent = showing ? '👁' : '🙈';
      pwBtn.setAttribute('aria-label', showing ? t('auth.showPw') : t('auth.hidePw'));
      pwBtn.setAttribute('aria-pressed', String(!showing));
      pw.focus();
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const mode = form.dataset.mode;
      submit.disabled = true;
      errorEl.textContent = '';
      try {
        if (mode === 'register') {
          await api('/api/auth/register', {
            method: 'POST',
            body: {
              email: form.email.value,
              password: form.password.value,
              displayName: form.displayName.value,
            },
          });
        } else {
          await api('/api/auth/login', {
            method: 'POST',
            body: { email: form.email.value, password: form.password.value },
          });
        }
        await getMe();
        dialog.close('ok');
      } catch (err) {
        errorEl.textContent = err.message;
        submit.disabled = false;
      }
    });

    dialog.addEventListener('close', () => {
      dialog.remove();
      resolve(currentUser);
    });

    setMode('login');
  });
}

function buildDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'auth-dialog';
  dialog.setAttribute('aria-label', t('auth.hint'));
  dialog.innerHTML = `
    <div class="auth-dialog-inner">
      <button type="button" class="auth-close" id="auth-close" aria-label="${t('auth.close')}">✕</button>
      <div class="auth-tabs">
        <button type="button" data-tab="login">${t('auth.signin')}</button>
        <button type="button" data-tab="register">${t('auth.register')}</button>
      </div>
      <h2 id="auth-title">${t('auth.title.signin')}</h2>
      <p class="auth-hint">${t('auth.hint')}</p>
      <form novalidate>
        <label>${t('auth.email')}
          <input type="email" name="email" autocomplete="email" required>
        </label>
        <div id="display-name-field" hidden>
          <label>${t('auth.displayName')}
            <input type="text" name="displayName" maxlength="60" autocomplete="name">
          </label>
        </div>
        <label>${t('auth.password')}
          <span class="pw-wrap">
            <input type="password" name="password" autocomplete="current-password" required>
            <button type="button" class="pw-toggle" id="pw-toggle"
              aria-label="${t('auth.showPw')}" aria-pressed="false">👁</button>
          </span>
        </label>
        <p id="auth-error" class="auth-error" role="alert"></p>
        <button type="submit" id="auth-submit" class="btn btn-primary">${t('auth.submit.signin')}</button>
      </form>
    </div>`;
  return dialog;
}
