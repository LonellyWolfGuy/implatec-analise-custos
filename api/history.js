import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function sortKey(monthYear) {
  const match = String(monthYear || '').match(/^(\d{1,2})\/(\d{4})$/);
  return match ? Number(match[2]) * 100 + Number(match[1]) : 0;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { data, error } = await supabase
    .from('monthly_inventories')
    .select('month_year, data');

  if (error) return res.status(500).json({ error: error.message });

  const history = (data || []).map(record => {
    const items = Array.isArray(record.data) ? record.data : [];
    return {
      month_year: record.month_year,
      item_count: items.length,
      total_cost: items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0)
    };
  }).sort((a, b) => sortKey(a.month_year) - sortKey(b.month_year));

  res.json(history);
}