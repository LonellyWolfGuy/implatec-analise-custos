import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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

  // If overwrite is requested, delete existing record first
  if (overwrite) {
    await supabase
      .from('monthly_inventories')
      .delete()
      .eq('month_year', month_year);
  }

  const { data: record, error } = await supabase
    .from('monthly_inventories')
    .insert({ month_year, filename: filename || null, data })
    .select('id')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Já existe um inventário catalogado para este mês/ano. Use overwrite=true para substituir.' });
    }
    return res.status(500).json({ error: error.message });
  }

  res.json({ id: record.id, overwritten: !!overwrite });
}
