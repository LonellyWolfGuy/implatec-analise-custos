import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, all } = req.query;

  // Clear all inventories
  if (all === 'true') {
    const { data, error } = await supabase
      .from('monthly_inventories')
      .delete()
      .gte('created_at', '1970-01-01')
      .select('id');

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({
      ok: true,
      deleted: data?.length || 0,
      message: `${data?.length || 0} inventário(s) removido(s).`
    });
  }

  if (!id) {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  const { data, error } = await supabase
    .from('monthly_inventories')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    console.error('Supabase delete error:', error);
    return res.status(500).json({ error: error.message });
  }

  if (!data?.length) {
    return res.status(404).json({
      error: 'Nenhum inventário foi removido. Verifique as policies de DELETE no Supabase ou configure SUPABASE_SERVICE_ROLE_KEY.'
    });
  }

  res.json({ ok: true, deleted: data.length });
}
