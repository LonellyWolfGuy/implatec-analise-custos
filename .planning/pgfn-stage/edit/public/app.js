const $ = selector => document.querySelector(selector);
let suppliers = [];

async function api(url, options) {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.erro || 'Não foi possível concluir a operação.');
  return data;
}

const formatCnpj = value => value?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') || '—';
const formatDate = value => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : 'Nunca';
const statusLabel = value => ({ NEGATIVA:'Regular', POSITIVA:'Irregular', POSITIVA_COM_EFEITO_NEGATIVA:'Com ressalvas', NAO_CONSULTADO:'Pendente' }[value] || value || 'Pendente');

function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }

async function load() {
  try {
    const [data, dashboard] = await Promise.all([api('/api/fornecedores'), api('/api/dashboard')]);
    suppliers = data;
    $('#cards').innerHTML = [
      ['Fornecedores ativos', dashboard.ativos], ['Já consultados', dashboard.consultados],
      ['Pendentes de consulta', dashboard.pendentes], ['Risco crítico', dashboard.criticos, 'danger']
    ].map(([label,value,kind]) => `<article class="card ${kind || ''}"><span>${label}</span><b>${value}</b></article>`).join('');
    render(data);
  } catch (error) {
    $('#cards').innerHTML = `<article class="card danger"><span>Configuração necessária</span><b>Banco</b><small>${escapeHtml(error.message)}</small></article>`;
    render([]);
  }
}

function escapeHtml(text='') { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function render(items) {
  $('#empty').hidden = items.length > 0;
  $('#supplierRows').innerHTML = items.map(item => {
    const check = item.ultima_consulta;
    const risk = (check?.nivel_risco || 'PENDENTE').toLowerCase();
    return `<tr><td><b>${escapeHtml(item.razao_social)}</b><small>${escapeHtml(item.nome_fantasia || item.categoria || '')}</small></td><td>${formatCnpj(item.cnpj)}</td><td>${formatDate(check?.consultado_em)}</td><td><span class="badge ${check?.cnd_federal === 'NEGATIVA' ? 'regular' : check?.cnd_federal === 'POSITIVA' ? 'critico' : 'atencao'}">${statusLabel(check?.cnd_federal)}</span></td><td><span class="badge ${risk}">${check?.nivel_risco || 'PENDENTE'}${check ? ` · ${check.score_risco}` : ''}</span></td><td><button class="row-action" data-assess="${item.id}">Registrar consulta</button></td></tr>`;
  }).join('');
  document.querySelectorAll('[data-assess]').forEach(button => button.onclick = () => openAssessment(button.dataset.assess));
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('O CSV está vazio.');
  const separator = lines[0].includes(';') ? ';' : ',';
  const split = line => line.split(separator).map(v => v.trim().replace(/^"|"$/g, ''));
  const headers = split(lines.shift()).map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'_'));
  if (!headers.includes('cnpj') || !headers.includes('razao_social')) throw new Error('Use as colunas cnpj e razao_social.');
  return lines.map(line => Object.fromEntries(split(line).map((value, index) => [headers[index], value])));
}

function openImport() { $('#importError').textContent = ''; $('#importDialog').showModal(); }
$('#openImport').onclick = openImport;
$('#navImport').onclick = openImport;
$('#saveSupplier').onclick = async () => {
  $('#importError').textContent = '';
  try {
    let rows;
    const file = $('#csvFile').files[0];
    if (file) rows = parseCsv(await file.text());
    else rows = [{ cnpj: $('#manualCnpj').value, razao_social: $('#manualName').value }];
    await api('/api/fornecedores', { method:'POST', body:JSON.stringify(rows) });
    $('#importDialog').close(); toast(`${rows.length} fornecedor(es) processado(s).`); await load();
  } catch (error) { $('#importError').textContent = error.message; }
};

function openAssessment(id) {
  const supplier = suppliers.find(item => item.id === id);
  $('#assessmentId').value = id; $('#assessmentSupplier').textContent = `${supplier.razao_social} · ${formatCnpj(supplier.cnpj)}`;
  $('#assessmentError').textContent = ''; $('#assessmentDialog').showModal();
}
$('#saveAssessment').onclick = async () => {
  const payload = { fornecedor_id:$('#assessmentId').value, situacao_cnpj:$('#cnpjStatus').value, cnd_federal:$('#cnd').value, fgts:$('#fgts').value, cndt:$('#cndt').value, divida_ativa:$('#debt').checked, negativado:$('#negative').checked, valor_divida_ativa:$('#debtValue').value, validade_cnd:$('#validity').value || null, observacoes:$('#notes').value };
  try { await api('/api/consultas', { method:'POST', body:JSON.stringify(payload) }); $('#assessmentDialog').close(); toast('Consulta registrada no histórico.'); await load(); }
  catch (error) { $('#assessmentError').textContent = error.message; }
};
$('#search').oninput = event => { const term = event.target.value.toLowerCase().replace(/\D/g,''); const raw = event.target.value.toLowerCase(); render(suppliers.filter(item => item.cnpj.includes(term) || item.razao_social.toLowerCase().includes(raw))); };

load();
