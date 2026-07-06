import { db, onlyDigits, validCnpj } from './_db.js';

export default async function handler(req, res) {
  const supabase = db();
  if (req.method === 'GET') {
    let query = supabase.from('fornecedores').select('*, consultas_fornecedores(*), pgfn_consultas(*)').order('razao_social');
    if (req.query.busca) query = query.or(`razao_social.ilike.%${req.query.busca}%,cnpj.ilike.%${onlyDigits(req.query.busca)}%`);
    const { data, error } = await query;
    if (error) return res.status(500).json({ erro: error.message });
    return res.json(data.map(item => ({
      ...item,
      ultima_consulta: [...(item.consultas_fornecedores || [])].sort((a,b) => b.consultado_em.localeCompare(a.consultado_em))[0] || null,
      pgfn: [...(item.pgfn_consultas || [])].sort((a,b) => b.consultado_em.localeCompare(a.consultado_em))[0] || null,
      consultas_fornecedores: undefined, pgfn_consultas: undefined
    })));
  }
  if (req.method === 'POST') {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    if (!items.length || items.length > 1000) return res.status(400).json({ erro: 'Envie entre 1 e 1.000 fornecedores.' });
    const invalidos = [];
    const rows = items.map((item, index) => {
      const cnpj = onlyDigits(item.cnpj);
      if (!validCnpj(cnpj) || !String(item.razao_social || '').trim()) invalidos.push(index + 1);
      return { cnpj, razao_social:String(item.razao_social || '').trim(), nome_fantasia:item.nome_fantasia || null, categoria:item.categoria || null, email_contato:item.email_contato || null, ativo:item.ativo !== false };
    });
    if (invalidos.length) return res.status(400).json({ erro:`Linhas inválidas: ${invalidos.join(', ')}.` });
    const { data, error } = await supabase.from('fornecedores').upsert(rows, { onConflict:'cnpj' }).select();
    return error ? res.status(500).json({ erro:error.message }) : res.status(201).json(data);
  }
  if (req.method === 'DELETE') {
    if (!req.query.id) return res.status(400).json({ erro:'ID obrigatório.' });
    const { error } = await supabase.from('fornecedores').delete().eq('id', req.query.id);
    return error ? res.status(500).json({ erro:error.message }) : res.status(204).json(null);
  }
  return res.status(405).json({ erro:'Método não permitido.' });
}
