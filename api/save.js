import { getDbPool, sql } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, mes1_name, mes2_name, data } = req.body;

  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: 'data array is required' });
  }

  if (data.length > 5000) {
    return res.status(413).json({ error: 'data array exceeds maximum of 5000 items' });
  }

  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('name', sql.NVarChar(255), name || null)
      .input('mes1_name', sql.NVarChar(255), mes1_name || null)
      .input('mes2_name', sql.NVarChar(255), mes2_name || null)
      .input('data', sql.NVarChar(sql.MAX), JSON.stringify(data))
      .query(`
        INSERT INTO analyses (name, mes1_name, mes2_name, data)
        OUTPUT inserted.id
        VALUES (@name, @mes1_name, @mes2_name, @data)
      `);

    if (result.recordset.length === 0) {
      return res.status(500).json({ error: 'Erro ao salvar a análise' });
    }

    const record = result.recordset[0];
    res.json({ id: record.id });
  } catch (err) {
    console.error('SQL Server insert error:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
}
