import crypto from 'node:crypto';
import { db, riskLevel, riskScore } from './_db.js';

const BUCKET = 'cnd-documentos';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });
  const input = req.body || {};
  if (!input.fornecedor_id) return res.status(400).json({ erro: 'Fornecedor obrigatório.' });

  const supabase = db();
  let uploadedPath = null;
  let evidencias = input.evidencias || {};
  try {
    if (input.documento_base64) {
      const buffer = Buffer.from(input.documento_base64, 'base64');
      if (buffer.length > 4 * 1024 * 1024) return res.status(413).json({ erro: 'O PDF deve ter no máximo 4 MB.' });
      if (buffer.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ erro: 'O arquivo enviado não é um PDF válido.' });
      const hash = crypto.createHash('sha256').update(buffer).digest('hex');
      uploadedPath = `${input.fornecedor_id}/${Date.now()}-${hash.slice(0, 16)}.pdf`;
      const upload = await supabase.storage.from(BUCKET).upload(uploadedPath, buffer, { contentType: 'application/pdf', upsert: false });
      if (upload.error) throw upload.error;
      evidencias = { ...evidencias, arquivo_path: uploadedPath, arquivo_nome: String(input.arquivo_nome || 'certidao.pdf').slice(0, 180), sha256: hash };
    }

    const score = riskScore(input);
    const row = {
      fornecedor_id: input.fornecedor_id,
      origem: uploadedPath ? 'RECEITA_PDF' : (input.origem || 'MANUAL'),
      situacao_cnpj: input.situacao_cnpj || 'NAO_CONSULTADO',
      cnd_federal: input.cnd_federal || 'NAO_CONSULTADO',
      divida_ativa: Boolean(input.divida_ativa), valor_divida_ativa: Number(input.valor_divida_ativa || 0),
      fgts: input.fgts || 'NAO_CONSULTADO', cndt: input.cndt || 'NAO_CONSULTADO', negativado: Boolean(input.negativado),
      score_risco: score, nivel_risco: riskLevel(score), validade_cnd: input.validade_cnd || null,
      observacoes: input.observacoes || null, evidencias
    };
    const { data, error } = await supabase.from('consultas_fornecedores').insert(row).select().single();
    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    if (uploadedPath) await supabase.storage.from(BUCKET).remove([uploadedPath]);
    return res.status(500).json({ erro: error.message || 'Não foi possível registrar a certidão.' });
  }
}
