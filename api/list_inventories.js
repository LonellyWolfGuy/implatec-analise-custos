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

  const includeCounts = req.query?.include_counts === 'true';
  const fields = includeCounts
    ? 'id, month_year, filename, created_at, data'
    : 'id, month_year, filename, created_at';

  const { data, error } = await supabase
    .from('monthly_inventories')
    .select(fields)
    .order('month_year', { ascending: false });

  if (error) {
    console.error('Supabase select error:', error);
    return res.status(500).json({ error: error.message });
  }

  const records = (data || []).map(record => {
    if (!includeCounts) return record;
    const { data: items, ...metadata } = record;
    return { ...metadata, item_count: Array.isArray(items) ? items.length : 0 };
  });

  res.json(records.sort((a, b) => monthYearSortKey(b.month_year) - monthYearSortKey(a.month_year)));
}