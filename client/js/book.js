import { api } from './api.js';
import {
  conditionLabel, cover, escapeHtml, formatDate, formatLabel, initHeader,
  money, refreshHeader, stars, toast,
} from './ui.js';
import { ensureAuthed } from './auth.js';

const id = new URLSearchParams(location.search).get('id');
let data = null;

async function load() {
  if (!id) throw new Error('No book id in the URL.');
  data = await api(`/api/books/${id}`);
  document.title = `${data.book.title} — BookNest`;
  renderBook(data.book, data.rating, data.owned);
  renderRecommendations(data.recommendations);
  renderReviews(data.reviews);
}

// ---------- book info ----------

function renderBook(book, rating, owned) {
  document.getElementById('book-cover').innerHTML = cover(book);
  document.getElementById('book-title').textContent = book.title;
  document.getElementById('book-author').textContent = book.author;
  document.getElementById('book-category').innerHTML =
    `<a href="/catalogue.html?category=${encodeURIComponent(book.category_slug)}">${escapeHtml(book.category_name)}</a>`;
  document.getElementById('book-description').textContent = book.description;
  document.getElementById('book-price').textContent = money(book.price);

  const badges = [formatLabel(book.format)];
  if (book.format === 'used') {
    badges.push(`Condition: ${conditionLabel(book.condition)}`);
    badges.push(`${book.stock} in stock`);
  } else {
    badges.push('Instant download');
  }
  document.getElementById('book-badges').innerHTML =
    badges.map((b) => `<span class="badge">${escapeHtml(b)}</span>`).join('');

  document.getElementById('book-rating').innerHTML =
    `${stars(rating.avg)} <span class="rating-num">${Number(rating.avg) ? Number(rating.avg).toFixed(1) : '—'}</span>
     <span class="muted">(${rating.count} review${rating.count === 1 ? '' : 's'})</span>`;

  const actionEl = document.getElementById('book-action');
  if (book.format === 'digital' && owned) {
    actionEl.innerHTML = `<a class="btn btn-primary" href="/api/books/${book.id}/download">Download</a>`;
  } else {
    actionEl.innerHTML = `<button class="btn btn-primary" type="button" data-action="add-to-cart">Add to cart</button>`;
  }
}

// ---------- recommendations ----------

function renderRecommendations(list) {
  const el = document.getElementById('recommendations');
  el.innerHTML = `
    <form id="rec-form" class="write-form" novalidate>
      <label>Your reason <span class="req">*</span>
        <textarea name="reason" rows="2" minlength="10" maxlength="500" required
          placeholder="Why do you recommend this book? (min 10 characters)"></textarea>
      </label>
      <label>More detail (optional)
        <textarea name="body" rows="3" maxlength="2000" placeholder="What did you learn from it?"></textarea>
      </label>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">Post recommendation</button>
        <button type="button" class="linklike" id="rec-cancel" hidden>Cancel edit</button>
      </div>
    </form>
    ${list.length ? list.map(recCard).join('') : '<p class="empty">No recommendations yet — be the first to explain why this book is worth it.</p>'}`;

  el.querySelector('#rec-form').addEventListener('submit', onRecSubmit);
  el.querySelector('#rec-cancel').addEventListener('click', resetRecForm);
}

function recCard(rec) {
  return `
    <article class="rec-card" data-id="${rec.id}">
      <p class="rec-reason">“${escapeHtml(rec.reason)}”</p>
      ${rec.body ? `<p class="rec-body">${escapeHtml(rec.body)}</p>` : ''}
      <div class="rec-meta">
        <span class="rec-author">${escapeHtml(rec.author_name)}</span>
        <button class="vote-btn${rec.voted ? ' voted' : ''}" type="button" data-action="vote"
          aria-pressed="${rec.voted}">👍 ${rec.useful_count} found useful</button>
        <time datetime="${escapeHtml(rec.created_at)}">${formatDate(rec.created_at)}</time>
        ${rec.is_mine ? `<span class="own-actions">
          <button class="linklike" type="button" data-action="edit-rec">Edit</button>
          <button class="linklike danger" type="button" data-action="delete-rec">Delete</button></span>` : ''}
      </div>
    </article>`;
}

function onRecSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const reason = form.reason.value.trim();
  const body = form.body.value.trim();
  const editingId = form.dataset.editingId;
  submitGuarded(async () => {
    if (editingId) {
      await api(`/api/recommendations/${editingId}`, { method: 'PUT', body: { reason, body } });
      toast('Recommendation updated.');
    } else {
      await api(`/api/books/${id}/recommendations`, { method: 'POST', body: { reason, body } });
      toast('Recommendation posted.');
    }
  });
}

function onRecAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const card = btn.closest('.rec-card');
  const recId = Number(card.dataset.id);
  const rec = data.recommendations.find((r) => r.id === recId);

  if (btn.dataset.action === 'vote') {
    const voted = btn.classList.contains('voted');
    submitGuarded(() => api(`/api/recommendations/${recId}/vote`, { method: voted ? 'DELETE' : 'POST' }));
  } else if (btn.dataset.action === 'edit-rec') {
    beginEditRec(rec);
  } else if (btn.dataset.action === 'delete-rec') {
    if (!window.confirm('Delete this recommendation?')) return;
    submitGuarded(async () => {
      await api(`/api/recommendations/${recId}`, { method: 'DELETE' });
      toast('Recommendation deleted.');
    });
  }
}

function beginEditRec(rec) {
  const form = document.getElementById('rec-form');
  form.reason.value = rec.reason;
  form.body.value = rec.body || '';
  form.dataset.editingId = rec.id;
  form.querySelector('button[type=submit]').textContent = 'Save changes';
  document.getElementById('rec-cancel').hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetRecForm() {
  const form = document.getElementById('rec-form');
  form.reset();
  delete form.dataset.editingId;
  form.querySelector('button[type=submit]').textContent = 'Post recommendation';
  document.getElementById('rec-cancel').hidden = true;
}

// ---------- reviews ----------

function renderReviews(reviews) {
  const el = document.getElementById('reviews');
  const mine = reviews.find((r) => r.is_mine) || null;
  el.innerHTML = reviewFormHtml(mine)
    + (reviews.length ? reviews.map(reviewCard).join('') : '<p class="empty">No scored reviews yet.</p>');

  el.querySelector('#review-form').addEventListener('submit', onReviewSubmit);
}

function reviewFormHtml(mine) {
  const score = mine ? mine.score : 5;
  const body = mine ? mine.body : '';
  const options = [5, 4, 3, 2, 1].map((s) =>
    `<option value="${s}" ${s === score ? 'selected' : ''}>${s} star${s === 1 ? '' : 's'}</option>`).join('');
  return `
    <form id="review-form" class="write-form" novalidate data-editing-id="${mine ? mine.id : ''}">
      <label>Your score
        <select name="score">${options}</select>
      </label>
      <label>Comment (optional)
        <textarea name="body" rows="3" maxlength="2000" placeholder="How did you find it?">${escapeHtml(body)}</textarea>
      </label>
      <button type="submit" class="btn btn-primary">${mine ? 'Update review' : 'Post review'}</button>
    </form>`;
}

function reviewCard(r) {
  return `
    <article class="review-card" data-id="${r.id}">
      <div class="review-head">
        ${stars(r.score)}
        <span class="review-author">${escapeHtml(r.author_name)}</span>
        <time datetime="${escapeHtml(r.created_at)}">${formatDate(r.created_at)}</time>
        ${r.is_mine ? `<span class="own-actions">
          <button class="linklike" type="button" data-action="edit-review">Edit</button>
          <button class="linklike danger" type="button" data-action="delete-review">Delete</button></span>` : ''}
      </div>
      ${r.body ? `<p class="review-body">${escapeHtml(r.body)}</p>` : ''}
    </article>`;
}

function onReviewSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const score = Number(form.score.value);
  const body = form.body.value.trim();
  const editingId = form.dataset.editingId;
  submitGuarded(async () => {
    if (editingId) {
      await api(`/api/reviews/${editingId}`, { method: 'PUT', body: { score, body } });
      toast('Review updated.');
    } else {
      await api(`/api/books/${id}/reviews`, { method: 'POST', body: { score, body } });
      toast('Review posted.');
    }
  });
}

function onReviewAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const reviewId = Number(btn.closest('.review-card').dataset.id);

  if (btn.dataset.action === 'edit-review') {
    document.getElementById('review-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (btn.dataset.action === 'delete-review') {
    if (!window.confirm('Delete your review?')) return;
    submitGuarded(async () => {
      await api(`/api/reviews/${reviewId}`, { method: 'DELETE' });
      toast('Review deleted.');
    });
  }
}

// ---------- shared action guard ----------

// Ensure the visitor is signed in (inline dialog), run the mutation, then
// reload and refresh the header so the interrupted action "resumes".
async function submitGuarded(fn) {
  const user = await ensureAuthed();
  if (!user) return;
  try {
    await fn();
    await load();
    await refreshHeader();
  } catch (err) {
    toast(err.message);
  }
}

// ---------- init ----------

initHeader();

// Static elements — attach listeners once (they survive re-renders).
document.getElementById('book-action').addEventListener('click', async (e) => {
  if (!e.target.closest('[data-action="add-to-cart"]')) return;
  if (!data) return;
  const user = await ensureAuthed();
  if (!user) return;
  try {
    await api('/api/cart', { method: 'POST', body: { bookId: data.book.id, qty: 1 } });
    toast('Added to cart.');
    await refreshHeader();
  } catch (err) {
    toast(err.message);
  }
});
document.getElementById('recommendations').addEventListener('click', onRecAction);
document.getElementById('reviews').addEventListener('click', onReviewAction);

load().catch((err) => {
  document.getElementById('book-title').textContent = 'Book not found';
  document.getElementById('book-description').textContent = err.message;
});
