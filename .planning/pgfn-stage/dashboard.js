import { db } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro:'Método não permitido.' });
  const { data, error } = await db().from('fornecedores').select('id,ativo,pgfn_consultas(encontrado,irregular,valor_irregular,referencia,consultado_em)');
  if (error) return res.status(500).json({ erro:error.message });
  const latest = data.map(f => [...(f.pgfn_consultas || [])].sort((a,b) => b.consultado_em.localeCompare(a.consultado_em))[0]).filter(Boolean);
  return res.json({ total:data.length, ativos:data.filter(f => f.ativo).length, analisados:latest.length, pendentes:data.length-latest.length, com_ocorrencia:latest.filter(x => x.encontrado).length, irregulares:latest.filter(x => x.irregular).length, valor_irregular:latest.reduce((sum,x) => sum + Number(x.valor_irregular || 0),0), referencia:latest[0]?.referencia || null });
}
