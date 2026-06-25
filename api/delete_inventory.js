import { getDbPool, sql } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, all } = req.query;

  try {
    const pool = await getDbPool();

    // Clear all inventories
    if (all === 'true') {
      const result = await pool.request()
        .query('DELETE FROM monthly_inventories OUTPUT deleted.id');

      const deletedCount = result.recordset?.length || 0;
      return res.json({
        ok: true,
        deleted: deletedCount,
        message: `${deletedCount} inventário(s) removido(s).`
      });
    }

    if (!id) {
      return res.status(400).json({ error: 'id query parameter is required' });
    }

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM monthly_inventories OUTPUT deleted.id WHERE id = @id');

    const deletedCount = result.recordset?.length || 0;

    if (deletedCount === 0) {
      return res.status(404).json({
        error: 'Nenhum inventário foi removido. Verifique se o ID informado existe no banco.'
      });
    }

    res.json({ ok: true, deleted: deletedCount });
  } catch (err) {
    console.error('SQL Server delete error:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  }
}
