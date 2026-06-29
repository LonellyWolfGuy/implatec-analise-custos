import { getDbPool, sql } from './_db.js';

function monthYearSortKey(monthYear) {
  const match = String(monthYear || '').match(/^(\d{1,2})\/(\d{4})$/);
  return match ? Number(match[2]) * 100 + Number(match[1]) : 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .query(`
        SELECT id, month_year, filename, created_at,
          CASE WHEN ISJSON(data) = 1 THEN (SELECT COUNT(*) FROM OPENJSON(data)) ELSE 0 END AS item_count
        FROM monthly_inventories
      `);

    const data = result.recordset || [];

    // Sort in memory by month_year values
    data.sort((a, b) => monthYearSortKey(b.month_year) - monthYearSortKey(a.month_year));

    res.json(data);
  } catch (err) {
    console.error('SQL Server select error:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
}
