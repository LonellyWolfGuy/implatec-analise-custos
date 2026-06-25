import { getDbPool, sql } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pool = await getDbPool();
    // Light query — only 1 row to ping the database
    await pool.request()
      .query('SELECT TOP 1 id FROM monthly_inventories');

    return res.json({ ok: true, ts: new Date().toISOString() });
  } catch (err) {
    console.error('Keepalive unexpected error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
