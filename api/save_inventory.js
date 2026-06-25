import { getDbPool, sql } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { month_year, filename, data, overwrite } = req.body;

  if (!month_year || !data || !Array.isArray(data)) {
    return res.status(400).json({ error: 'month_year and data array are required' });
  }

  if (data.length > 5000) {
    return res.status(413).json({ error: 'data array exceeds maximum of 5000 items' });
  }

  try {
    const pool = await getDbPool();
    const result = await pool.request()
      .input('month_year', sql.NVarChar(50), month_year)
      .input('filename', sql.NVarChar(255), filename || null)
      .input('data', sql.NVarChar(sql.MAX), JSON.stringify(data))
      .input('overwrite', sql.Bit, overwrite ? 1 : 0)
      .query(`
        IF @overwrite = 1
        BEGIN
            IF EXISTS (SELECT 1 FROM monthly_inventories WHERE month_year = @month_year)
            BEGIN
                UPDATE monthly_inventories
                SET filename = @filename, data = @data, created_at = SYSDATETIMEOFFSET()
                OUTPUT inserted.id, 1 AS overwritten
                WHERE month_year = @month_year;
            END
            ELSE
            BEGIN
                INSERT INTO monthly_inventories (month_year, filename, data)
                OUTPUT inserted.id, 0 AS overwritten
                VALUES (@month_year, @filename, @data);
            END
        END
        ELSE
        BEGIN
            IF EXISTS (SELECT 1 FROM monthly_inventories WHERE month_year = @month_year)
            BEGIN
                SELECT NULL AS id, -1 AS overwritten;
            END
            ELSE
            BEGIN
                INSERT INTO monthly_inventories (month_year, filename, data)
                OUTPUT inserted.id, 0 AS overwritten
                VALUES (@month_year, @filename, @data);
            END
        END
      `);

    const record = result.recordset[0];

    if (!record) {
      return res.status(500).json({ error: 'Erro ao processar a gravação do inventário' });
    }

    if (record.overwritten === -1) {
      return res.status(409).json({ error: 'Já existe um inventário catalogado para este mês/ano. Use overwrite=true para substituir.' });
    }

    res.json({ id: record.id, overwritten: record.overwritten === 1 });
  } catch (err) {
    console.error('SQL Server upsert error:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
}
