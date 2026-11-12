import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { openDb } from '../server/db.js';
import { createApp } from '../server/app.js';

let app;
let db;
let tmp;

before(async () => {
  tmp = mkdtempSync(path.join(tmpdir(), 'booknest-test-'));
  process.env.FILES_DIR = tmp; // keep placeholder digital files out of the repo
  db = openDb(':memory:');
  app = await createApp(db);
});

after(() => {
  db.close();
  rmSync(tmp, { recursive: true, force: true });
});

const ACCOUNTS = {
  admin: { email: 'admin@booknest.demo', password: 'password123' },
  alice: { email: 'alice@booknest.demo', password: 'password123' },
  bob: { email: 'bob@booknest.demo', password: 'password123' },
};

async function login(email, password) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200);
  return agent;
}

// ---------- catalogue ----------

test('catalogue lists all seeded books', async () => {
  const res = await request(app).get('/api/books').query({ limit: 50 });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 30);
  assert.equal(res.body.items.length, 30);
});

test('catalogue filters by category', async () => {
  const res = await request(app).get('/api/books').query({ category: 'computer-science', limit: 50 });
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 6);
});

test('book detail returns structure', async () => {
  const res = await request(app).get('/api/books/1');
  assert.equal(res.status, 200);
  assert.equal(res.body.book.id, 1);
  assert.ok(Array.isArray(res.body.recommendations));
  assert.ok(Array.isArray(res.body.reviews));
  assert.equal(typeof res.body.rating.avg, 'number');
});

test('unknown book 404s', async () => {
  const res = await request(app).get('/api/books/99999');
  assert.equal(res.status, 404);
});

// ---------- auth validation ----------

test('register rejects a short password', async () => {
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'new@booknest.demo', password: '123', displayName: 'New' });
  assert.equal(res.status, 400);
});

test('register rejects an invalid email', async () => {
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'not-an-email', password: 'password123', displayName: 'New' });
  assert.equal(res.status, 400);
});

test('register rejects a duplicate email', async () => {
  const res = await request(app).post('/api/auth/register')
    .send({ email: 'alice@booknest.demo', password: 'password123', displayName: 'X' });
  assert.equal(res.status, 409);
});

test('login rejects a wrong password', async () => {
  const res = await request(app).post('/api/auth/login')
    .send({ email: ACCOUNTS.alice.email, password: 'wrong-password' });
  assert.equal(res.status, 401);
});

// ---------- authorisation & user content ----------

test('guest cannot post a recommendation (401)', async () => {
  const res = await request(app).post('/api/books/1/recommendations')
    .send({ reason: 'A long enough reason here.' });
  assert.equal(res.status, 401);
});

test('member posts a recommendation', async () => {
  const alice = await login(ACCOUNTS.alice.email, ACCOUNTS.alice.password);
  const res = await alice.post('/api/books/1/recommendations')
    .send({ reason: 'Clear proofs and excellent exercises.', body: 'Loved it.' });
  assert.equal(res.status, 201);
  assert.equal(res.body.recommendation.is_mine, true);
});

test('recommendation reason must be at least 10 characters', async () => {
  const alice = await login(ACCOUNTS.alice.email, ACCOUNTS.alice.password);
  const res = await alice.post('/api/books/1/recommendations').send({ reason: 'short' });
  assert.equal(res.status, 400);
});

test('member cannot edit another member\'s recommendation (403)', async () => {
  const alice = await login(ACCOUNTS.alice.email, ACCOUNTS.alice.password);
  const post = await alice.post('/api/books/1/recommendations')
    .send({ reason: 'A genuinely helpful recommendation.' });
  const recId = post.body.recommendation.id;

  const bob = await login(ACCOUNTS.bob.email, ACCOUNTS.bob.password);
  const res = await bob.put(`/api/recommendations/${recId}`)
    .send({ reason: 'Hijacked reason with enough length.', body: '' });
  assert.equal(res.status, 403);
});

test('one review per member per book (409 on duplicate)', async () => {
  const alice = await login(ACCOUNTS.alice.email, ACCOUNTS.alice.password);
  const first = await alice.post('/api/books/1/reviews').send({ score: 4, body: 'Good.' });
  assert.equal(first.status, 201);
  const second = await alice.post('/api/books/1/reviews').send({ score: 2 });
  assert.equal(second.status, 409);
});

test('a member cannot access admin routes (403)', async () => {
  const alice = await login(ACCOUNTS.alice.email, ACCOUNTS.alice.password);
  const res = await alice.get('/api/admin/books');
  assert.equal(res.status, 403);
});

test('an admin can list all books', async () => {
  const admin = await login(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
  const res = await admin.get('/api/admin/books');
  assert.equal(res.status, 200);
  assert.equal(res.body.books.length, 30);
});

// ---------- checkout ----------

test('checkout requires a delivery address for used books', async () => {
  const bob = await login(ACCOUNTS.bob.email, ACCOUNTS.bob.password);
  await bob.post('/api/cart').send({ bookId: 5, qty: 1 }); // used book
  const res = await bob.post('/api/orders').send({ deliveryAddress: '' });
  assert.equal(res.status, 400);
});

// ---------- download guard ----------

test('download requires login (401)', async () => {
  const res = await request(app).get('/api/books/3/download');
  assert.equal(res.status, 401);
});

test('download is forbidden without a paid order (403)', async () => {
  const bob = await login(ACCOUNTS.bob.email, ACCOUNTS.bob.password);
  const res = await bob.get('/api/books/3/download');
  assert.equal(res.status, 403);
});

test('purchase + payment unlocks the download', async () => {
  const alice = await login(ACCOUNTS.alice.email, ACCOUNTS.alice.password);
  await alice.post('/api/cart').send({ bookId: 3, qty: 1 }); // digital book
  const order = await alice.post('/api/orders').send({ deliveryAddress: '' });
  assert.equal(order.status, 201);
  const orderId = order.body.order.id;

  const pending = await alice.get('/api/books/3/download');
  assert.equal(pending.status, 403); // not paid yet

  const pay = await alice.post(`/api/orders/${orderId}/pay`);
  assert.equal(pay.status, 200);

  const unlocked = await alice.get('/api/books/3/download');
  assert.equal(unlocked.status, 200);
});
