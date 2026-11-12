import { Router } from 'express';

const router = Router();
const db = (req) => req.app.locals.db;

function toBool(row) {
  if ('is_mine' in row) row.is_mine = !!row.is_mine;
  if ('voted' in row) row.voted = !!row.voted;
  return row;
}

const LIST_SELECT = `
  b.id, b.title, b.author, b.format, b.price, b.condition, b.stock,
  b.cover_path, b.description, b.created_at,
  c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
  COALESCE(ROUND(AVG(r.score), 1), 0) AS avg_rating,
  COUNT(DISTINCT r.id) AS review_count,
  COUNT(DISTINCT rec.id) AS recommendation_count
`;

const BASE = `
  FROM book b
  JOIN category c ON c.id = b.category_id
  LEFT JOIN review r ON r.book_id = b.id
  LEFT JOIN recommendation rec ON rec.book_id = b.id
`;

function buildFilter(query) {
  const where = ['b.is_active = 1'];
  const params = [];

  const { category, q, format, minPrice, maxPrice } = query;
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (q) {
    const like = `%${q}%`;
    where.push('(b.title LIKE ? COLLATE NOCASE OR b.author LIKE ? COLLATE NOCASE)');
    params.push(like, like);
  }
  if (format === 'digital' || format === 'used') {
    where.push('b.format = ?');
    params.push(format);
  }
  if (minPrice !== undefined && minPrice !== '') {
    where.push('b.price >= ?');
    params.push(Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '') {
    where.push('b.price <= ?');
    params.push(Number(maxPrice));
  }

  let having = '';
  const { minRating } = query;
  if (minRating !== undefined && minRating !== '') {
    having = 'HAVING COALESCE(ROUND(AVG(r.score), 1), 0) >= ?';
    params.push(Number(minRating));
  }

  return { whereSql: where.join(' AND '), having, params };
}

router.get('/categories', (req, res) => {
  const rows = db(req).prepare(`
    SELECT c.id, c.name, c.slug, COUNT(b.id) AS book_count
    FROM category c
    LEFT JOIN book b ON b.category_id = c.id AND b.is_active = 1
    GROUP BY c.id
    ORDER BY c.name
  `).all();
  res.json(rows);
});

router.get('/catalogue/meta', (req, res) => {
  const bounds = db(req).prepare(
    'SELECT MIN(price) AS min, MAX(price) AS max FROM book WHERE is_active = 1'
  ).get();
  res.json({ priceMin: bounds.min ?? 0, priceMax: bounds.max ?? 0 });
});

router.get('/home', (req, res) => {
  const picks = db(req).prepare(`
    SELECT ${LIST_SELECT}
    ${BASE}
    WHERE b.is_active = 1
    GROUP BY b.id
    ORDER BY avg_rating DESC, recommendation_count DESC, b.created_at DESC
    LIMIT 8
  `).all();
  res.json({ picks });
});

router.get('/books', (req, res) => {
  const { whereSql, having, params } = buildFilter(req.query);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));

  const orderMap = {
    price: 'b.price ASC, b.id ASC',
    'price-desc': 'b.price DESC, b.id ASC',
    rating: 'avg_rating DESC, b.id ASC',
    newest: 'b.created_at DESC, b.id DESC',
  };
  const orderBy = orderMap[req.query.sort] || orderMap.newest;

  const totalRow = db(req).prepare(
    `SELECT COUNT(*) AS n FROM (SELECT b.id ${BASE} WHERE ${whereSql} GROUP BY b.id ${having})`
  ).get(...params);

  const items = db(req).prepare(
    `SELECT ${LIST_SELECT} ${BASE} WHERE ${whereSql} GROUP BY b.id ${having}
     ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, limit, (page - 1) * limit);

  res.json({
    items,
    total: totalRow.n,
    page,
    limit,
    pageCount: Math.max(1, Math.ceil(totalRow.n / limit)),
  });
});

router.get('/books/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid book id' });

  const uid = (req.session && req.session.userId) || null;

  const book = db(req).prepare(
    `SELECT ${LIST_SELECT} ${BASE} WHERE b.id = ? GROUP BY b.id`
  ).get(id);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const recommendations = db(req).prepare(`
    SELECT rec.id, rec.user_id, rec.reason, rec.body, rec.useful_count,
           rec.created_at, rec.updated_at, u.display_name AS author_name,
           (rec.user_id = ?) AS is_mine,
           EXISTS(SELECT 1 FROM vote v WHERE v.recommendation_id = rec.id AND v.user_id = ?) AS voted
    FROM recommendation rec
    JOIN user u ON u.id = rec.user_id
    WHERE rec.book_id = ?
    ORDER BY rec.useful_count DESC, rec.created_at DESC
  `).all(uid, uid, id).map(toBool);

  const reviews = db(req).prepare(`
    SELECT r.id, r.user_id, r.score, r.body, r.created_at, u.display_name AS author_name,
           (r.user_id = ?) AS is_mine
    FROM review r
    JOIN user u ON u.id = r.user_id
    WHERE r.book_id = ?
    ORDER BY r.created_at DESC
  `).all(uid, id).map(toBool);

  const rating = db(req).prepare(
    'SELECT COALESCE(ROUND(AVG(score), 1), 0) AS avg, COUNT(*) AS count FROM review WHERE book_id = ?'
  ).get(id);

  // Whether the current user owns a paid copy (drives the download button).
  const owned = uid ? !!db(req).prepare(`
    SELECT 1 FROM order_item oi
    JOIN "order" o ON o.id = oi.order_id
    WHERE o.user_id = ? AND oi.book_id = ? AND o.status IN ('paid', 'delivered')
    LIMIT 1
  `).get(uid, id) : false;

  res.json({ book, recommendations, reviews, rating, owned });
});

export default router;
