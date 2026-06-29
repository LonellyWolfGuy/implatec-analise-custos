import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

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

  const { data: record, error } = await supabase
    .from('analyses')
    .insert({ name: name || null, mes1_name: mes1_name || null, mes2_name: mes2_name || null, data })
    .select('id')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ id: record.id });
}
