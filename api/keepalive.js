import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Consulta leve — apenas 1 registro, sem trazer dados pesados
    const pingCount = 3;

    for (let ping = 1; ping <= pingCount; ping += 1) {
      const { error } = await supabase
        .from('monthly_inventories')
        .select('id')
        .limit(1);

      if (error) {
        console.error(`Keepalive ping ${ping} error:`, error);
        return res.status(500).json({ ok: false, ping, error: error.message });
      }
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, pings: pingCount, ts: new Date().toISOString() });
  } catch (err) {
    console.error('Keepalive unexpected error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
