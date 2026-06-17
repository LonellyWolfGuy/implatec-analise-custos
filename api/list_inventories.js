import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function monthYearSortKey(monthYear) {
  const match = String(monthYear || '').match(/^(\d{1,2})\/(\d{4})$/);
  return match ? Number(match[2]) * 100 + Number(match[1]) : 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data, error } = await supabase
    .from('monthly_inventories')
    .select('id, month_year, filename, created_at')
    .order('month_year', { ascending: false });

  if (error) {
    console.error('Supabase select error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json((data || []).sort((a, b) => monthYearSortKey(b.month_year) - monthYearSortKey(a.month_year)));
}
