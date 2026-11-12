import { api } from './api.js';

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
      title.textContent = registering ? 'Create account' : 'Sign in';
      submit.textContent = registering ? 'Create account' : 'Sign in';
      displayField.hidden = !registering;
      tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === mode));
      errorEl.textContent = '';
    }

    tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.tab)));

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
  dialog.setAttribute('aria-label', 'Sign in or create an account');
  dialog.innerHTML = `
    <div class="auth-dialog-inner">
      <div class="auth-tabs">
        <button type="button" data-tab="login">Sign in</button>
        <button type="button" data-tab="register">Register</button>
      </div>
      <h2 id="auth-title">Sign in</h2>
      <p class="auth-hint">Sign in to continue — your action resumes right after.</p>
      <form novalidate>
        <label>Email
          <input type="email" name="email" autocomplete="email" required>
        </label>
        <div id="display-name-field" hidden>
          <label>Display name
            <input type="text" name="displayName" maxlength="60" autocomplete="name">
          </label>
        </div>
        <label>Password
          <input type="password" name="password" autocomplete="current-password" required>
        </label>
        <p id="auth-error" class="auth-error" role="alert"></p>
        <button type="submit" id="auth-submit" class="btn btn-primary">Sign in</button>
      </form>
    </div>`;
  return dialog;
}
