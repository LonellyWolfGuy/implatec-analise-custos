import { db } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro: 'Método não permitido.' });
  if (!req.query.id) return res.status(400).json({ erro: 'Consulta obrigatória.' });
  const supabase = db();
  const { data, error } = await supabase.from('consultas_fornecedores').select('evidencias').eq('id', req.query.id).single();
  if (error || !data?.evidencias?.arquivo_path) return res.status(404).json({ erro: 'Documento não encontrado.' });
  const signed = await supabase.storage.from('cnd-documentos').createSignedUrl(data.evidencias.arquivo_path, 60);
  return signed.error ? res.status(500).json({ erro: signed.error.message }) : res.json({ url: signed.data.signedUrl });
}
