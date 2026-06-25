import { getDbPool, sql } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT id, created_at, name, mes1_name, mes2_name, data FROM analyses WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    const record = result.recordset[0];

    // Parse JSON string stored in SQL Server data column
    if (record.data) {
      try {
        record.data = JSON.parse(record.data);
      } catch (e) {
        console.error('Error parsing JSON from database:', e);
      }
    }

    res.json(record);
  } catch (err) {
    console.error('SQL Server select error:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
}
