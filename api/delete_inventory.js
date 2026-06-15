import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, all } = req.query;

  // Clear all inventories
  if (all === 'true') {
    const { error } = await supabase
      .from('monthly_inventories')
      .delete()
      .gte('created_at', '1970-01-01');

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ ok: true, message: 'Todos os inventários foram removidos.' });
  }

  if (!id) {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  const { error } = await supabase
    .from('monthly_inventories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase delete error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ ok: true });
}
