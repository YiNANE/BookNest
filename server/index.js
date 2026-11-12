import 'dotenv/config';
import { openDb } from './db.js';
import { createApp } from './app.js';

const db = openDb();
const app = await createApp(db);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BookNest running at http://localhost:${PORT}`);
});
