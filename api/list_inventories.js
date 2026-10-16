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

  // Tentamos consultar selecionando item_count diretamente (sem baixar a coluna pesada data)
  const fields = includeCounts
    ? 'id, month_year, filename, created_at, item_count'
    : 'id, month_year, filename, created_at';

  let { data, error } = await supabase
    .from('monthly_inventories')
    .select(fields)
    .order('month_year', { ascending: false });

  // Se a coluna item_count ainda não existir no Supabase (erro Postgres 42703), fallback seguro
  if (error && error.code === '42703' && includeCounts) {
    const fallback = await supabase
      .from('monthly_inventories')
      .select('id, month_year, filename, created_at, data')
      .order('month_year', { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    console.error('Supabase select error:', error);
    return res.status(500).json({ error: error.message });
  }

  const records = (data || []).map(record => {
    if (!includeCounts) return record;

    // Se veio item_count da coluna no banco
    if (typeof record.item_count === 'number' && !isNaN(record.item_count)) {
      return record;
    }

    // Se veio pelo fallback com o campo data
    if (record.data && Array.isArray(record.data)) {
      const { data: items, ...metadata } = record;
      return { ...metadata, item_count: items.length };
    }

    return { ...record, item_count: record.item_count || 0 };
  });

  res.json(records.sort((a, b) => monthYearSortKey(b.month_year) - monthYearSortKey(a.month_year)));
}