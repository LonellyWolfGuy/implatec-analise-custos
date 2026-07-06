import { db } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ erro:'Método não permitido.' });
  const data = [];
  for (let from = 0; ; from += 1000) {
    const page = await db().from('fornecedores').select('id,ativo,pgfn_consultas(encontrado,irregular,valor_irregular,referencia,consultado_em),consultas_fornecedores(cnd_federal,validade_cnd,consultado_em)').range(from, from + 999);
    if (page.error) return res.status(500).json({ erro:page.error.message });
    data.push(...page.data);
    if (page.data.length < 1000) break;
  }
  const pgfn = data.map(f => [...(f.pgfn_consultas || [])].sort((a,b) => b.consultado_em.localeCompare(a.consultado_em))[0]).filter(Boolean);
  const cnds = data.map(f => [...(f.consultas_fornecedores || [])].filter(c => c.cnd_federal !== 'NAO_CONSULTADO').sort((a,b) => b.consultado_em.localeCompare(a.consultado_em))[0]).filter(Boolean);
  const today = new Date(); today.setHours(0,0,0,0);
  const limit = new Date(today); limit.setDate(limit.getDate() + 30);
  const expiring = cnds.filter(c => c.validade_cnd && new Date(`${c.validade_cnd}T12:00:00`) >= today && new Date(`${c.validade_cnd}T12:00:00`) <= limit).length;
  const expired = cnds.filter(c => c.validade_cnd && new Date(`${c.validade_cnd}T12:00:00`) < today).length;
  return res.json({
    total:data.length, ativos:data.filter(f => f.ativo).length, analisados:pgfn.length, pendentes:data.length-pgfn.length,
    com_ocorrencia:pgfn.filter(x => x.encontrado).length, irregulares:pgfn.filter(x => x.irregular).length,
    valor_irregular:pgfn.reduce((sum,x) => sum + Number(x.valor_irregular || 0),0), referencia:pgfn[0]?.referencia || null,
    cnd_verificadas:cnds.length, cnd_vencendo:expiring, cnd_vencidas:expired
  });
}
