import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Share2, Download, Printer, FileText } from 'lucide-react';
import { getInventory } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import IMPLATEC_LOGO from '../assets/logo.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function computeDeltas(r) {
  const dq = r.q2 - r.q1;
  const du = r.u2 - r.u1;
  const dp = r.p2 - r.p1;
  const dqp = r.q1 ? ((r.q2 - r.q1) / r.q1) * 100 : null;
  const dup = r.u1 ? ((r.u2 - r.u1) / r.u1) * 100 : null;
  const dpp = r.p1 ? ((r.p2 - r.p1) / r.p1) * 100 : null;
  return { dq, du, dp, dqp, dup, dpp };
}

function crossFiles(m1Data, m2Data) {
  const map1 = new Map(m1Data.map(i => [i.cod, i]));
  const map2 = new Map(m2Data.map(i => [i.cod, i]));
  const all = new Set([...map1.keys(), ...map2.keys()]);
  const merged = [];
  
  for (const cod of all) {
    if (!cod) continue;
    const a = map1.get(cod) || { qty: 0, unitCost: 0, totalCost: 0, cat: '', desc: '' };
    const b = map2.get(cod) || { qty: 0, unitCost: 0, totalCost: 0, cat: '', desc: '' };
    merged.push({
      cod,
      desc: a.desc || b.desc,
      cat: a.cat || b.cat,
      q1: a.qty, u1: a.unitCost, p1: a.totalCost,
      q2: b.qty, u2: b.unitCost, p2: b.totalCost
    });
  }
  return merged;
}

export default function CompareDashboard({ catalog, onBack }) {
  const [m1Id, setM1Id] = useState('');
  const [m2Id, setM2Id] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [inv1Name, setInv1Name] = useState('');
  const [inv2Name, setInv2Name] = useState('');

  // Filters
  const [filterView, setFilterView] = useState('changed');
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (catalog && catalog.length > 1) {
      setM1Id(catalog[1].id);
      setM2Id(catalog[0].id);
    } else if (catalog && catalog.length === 1) {
      setM1Id(catalog[0].id);
      setM2Id(catalog[0].id);
    }
  }, [catalog]);

  const handleCompare = async () => {
    if (!m1Id || !m2Id) return;
    setLoading(true);
    
    try {
      const inv1 = await getInventory(m1Id);
      const inv2 = await getInventory(m2Id);
      
      setInv1Name(inv1.month_year);
      setInv2Name(inv2.month_year);
      
      const merged = crossFiles(inv1.data, inv2.data);
      const withDeltas = merged.map(r => ({ ...r, ...computeDeltas(r) }));
      
      setData(withDeltas);
    } catch (e) {
      alert("Erro ao buscar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(r => {
      if (filterView === 'changed' && r.dp === 0 && r.dq === 0) return false;
      if (filterView === 'increased' && r.dp <= 0) return false;
      if (filterView === 'decreased' && r.dp >= 0) return false;
      if (filterCat && r.cat !== filterCat) return false;
      if (search && !r.desc.toLowerCase().includes(search.toLowerCase()) && !r.cod.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => Math.abs(b.dp) - Math.abs(a.dp)); // Sort by largest absolute partial diff by default
  }, [data, filterView, filterCat, search]);

  const fmt = (v, dec=2) => (v == null || isNaN(v)) ? '–' : v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const fmtR = (v, dec=2) => {
    if (v == null || isNaN(v) || v === 0) return '–';
    const s = v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return v > 0 ? '+' + s : s;
  };

  if (catalog.length < 2) {
    return (
      <div className="animate-fade-in" style={{ textAlign: 'center', padding: '4rem 0' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Catalogar mais meses</h2>
        <p style={{ color: 'var(--text-sec)', marginBottom: '2rem' }}>Você precisa de pelo menos 2 inventários catalogados para gerar a comparação de oscilação.</p>
        <button className="btn btn-ghost" onClick={onBack}><ArrowLeft size={16}/> Voltar</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="animate-fade-in" style={{ maxWidth: 600, margin: '4rem auto' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>Selecionar Períodos</h2>
        <p style={{ color: 'var(--text-sec)', marginBottom: '2rem', textAlign: 'center' }}>Defina quais meses catalogados deseja comparar.</p>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
          <div style={{ flex: 1 }}>
            <span className="label-text">Mês 1 (Referência)</span>
            <select className="input-field" value={m1Id} onChange={e => setM1Id(e.target.value)}>
              {catalog.map(c => <option key={c.id} value={c.id}>{c.month_year}</option>)}
            </select>
          </div>
          <div style={{ paddingBottom: '0.75rem', color: 'var(--text-muted)' }}>→</div>
          <div style={{ flex: 1 }}>
            <span className="label-text">Mês 2 (Comparado)</span>
            <select className="input-field" value={m2Id} onChange={e => setM2Id(e.target.value)}>
              {catalog.map(c => <option key={c.id} value={c.id}>{c.month_year}</option>)}
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onBack}>Voltar</button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleCompare} disabled={loading}>
            {loading ? 'Gerando...' : 'Gerar Comparativo'}
          </button>
        </div>
      </div>
    );
  }

  // Dashboard Metrics
  const tot1 = data.reduce((acc, r) => acc + r.p1, 0);
  const tot2 = data.reduce((acc, r) => acc + r.p2, 0);
  const delta = tot2 - tot1;
  const deltaPct = tot1 ? (delta / tot1) * 100 : 0;
  
  const upCount = data.filter(r => r.p1 > 0 && r.p2 > 0 && r.dp > 0).length;
  const downCount = data.filter(r => r.p1 > 0 && r.p2 > 0 && r.dp < 0).length;
  
  const chartData = {
    labels: [inv1Name, inv2Name],
    datasets: [{
      label: 'Valor Total (R$)',
      data: [tot1, tot2],
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgb(59, 130, 246)',
      borderWidth: 1
    }]
  };

  const filterLabel = {
    changed: 'Itens Alterados',
    all: 'Todos os Itens',
    increased: 'Somente Aumentos',
    decreased: 'Somente Reduções',
  }[filterView] || '';

  const handleExportPDF = () => {
    if (!filteredData || filteredData.length === 0) return;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    // --- HEADER ---
    // Logo
    try {
      doc.addImage(IMPLATEC_LOGO, 'PNG', 10, 6, 50, 18);
    } catch(e) { /* ignora se falhar */ }

    // Linha verde separadora
    doc.setDrawColor(0, 120, 0);
    doc.setLineWidth(0.8);
    doc.line(10, 27, pageW - 10, 27);

    // Título do relatório
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 100, 0);
    doc.text('Relatório de Análise de Custos', pageW / 2, 14, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Comparativo: ${inv1Name} vs ${inv2Name}`, pageW / 2, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.text(`Filtro: ${filterLabel}${filterCat ? ' | Categoria: ' + filterCat : ''}${search ? ' | Busca: "' + search + '"' : ''}`, pageW / 2, 25, { align: 'center' });

    // Data de emissão
    const now = new Date().toLocaleString('pt-BR');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Emitido em: ${now}`, pageW - 12, 14, { align: 'right' });

    // --- SUMMÁRIO ---
    const tot1 = data.reduce((a, r) => a + r.p1, 0);
    const tot2 = data.reduce((a, r) => a + r.p2, 0);
    const delta = tot2 - tot1;
    const deltaPct = tot1 ? (delta / tot1) * 100 : 0;
    const fmtPdf = (v, d=2) => (v == null || isNaN(v)) ? '-' : v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
    const fmtRPdf = (v, d=2) => { if (!v || v === 0) return '-'; return (v > 0 ? '+' : '') + fmtPdf(v, d); };

    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const summaryY = 32;
    const colW = (pageW - 20) / 4;
    const summaryItems = [
      { label: `Total ${inv1Name}`, value: `R$ ${fmtPdf(tot1)}` },
      { label: `Total ${inv2Name}`, value: `R$ ${fmtPdf(tot2)}` },
      { label: 'Flutuação Geral', value: `R$ ${fmtRPdf(delta)} (${fmtRPdf(deltaPct)}%)` },
      { label: 'Itens no Relatório', value: `${filteredData.length} itens` },
    ];
    summaryItems.forEach((item, i) => {
      const x = 10 + i * colW;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(item.label.toUpperCase(), x + colW / 2, summaryY, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const color = item.label.includes('Flutua') && delta > 0 ? [200, 0, 0] : item.label.includes('Flutua') && delta < 0 ? [0, 140, 0] : [30, 30, 30];
      doc.setTextColor(...color);
      doc.text(item.value, x + colW / 2, summaryY + 6, { align: 'center' });
    });

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(10, summaryY + 10, pageW - 10, summaryY + 10);

    // --- TABELA ---
    const headers = [
      'Código', 'Descrição', 'Cat',
      `Qtd\n${inv1Name}`, `Unit\n${inv1Name}`, `Parc\n${inv1Name}`,
      `Qtd\n${inv2Name}`, `Unit\n${inv2Name}`, `Parc\n${inv2Name}`,
      'Δ Unit', 'Δ Parc', 'Δ Parc %'
    ];

    const rows = filteredData.map(r => [
      r.cod,
      r.desc,
      r.cat,
      fmtPdf(r.q1, 3),
      fmtPdf(r.u1, 4),
      fmtPdf(r.p1),
      fmtPdf(r.q2, 3),
      fmtPdf(r.u2, 4),
      fmtPdf(r.p2),
      fmtRPdf(r.du, 4),
      fmtRPdf(r.dp),
      fmtRPdf(r.dpp) + '%',
    ]);

    autoTable(doc, {
      startY: summaryY + 13,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: 1.5,
        valign: 'middle',
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [0, 100, 0],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7,
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'left' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 12, halign: 'center' },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 18, halign: 'right' },
        8: { cellWidth: 22, halign: 'right' },
        9: { cellWidth: 18, halign: 'right' },
        10: { cellWidth: 20, halign: 'right' },
        11: { cellWidth: 16, halign: 'right' },
      },
      alternateRowStyles: { fillColor: [245, 250, 245] },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const colIdx = data.column.index;
          const val = data.cell.raw;
          if ((colIdx === 9 || colIdx === 10 || colIdx === 11) && typeof val === 'string') {
            if (val.startsWith('+')) data.cell.styles.textColor = [180, 0, 0];
            else if (val.startsWith('-')) data.cell.styles.textColor = [0, 130, 0];
          }
        }
      },
      // Footer com número de página
      didDrawPage: (d) => {
        const pageCount = doc.internal.getNumberOfPages();
        const pY = doc.internal.pageSize.getHeight() - 5;
        doc.setFontSize(7);
        doc.setTextColor(160, 160, 160);
        doc.text('IMPLATEC – Perfis Plásticos', 10, pY);
        doc.text(`Página ${d.pageNumber} de ${pageCount}`, pageW - 10, pY, { align: 'right' });
        // Linha verde no rodapé
        doc.setDrawColor(0, 120, 0);
        doc.setLineWidth(0.4);
        doc.line(10, pY - 2, pageW - 10, pY - 2);
      },
    });

    doc.save(`Relatorio_Comparativo_${inv1Name}_vs_${inv2Name}.pdf`);
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Comparativo {inv1Name} vs {inv2Name}</h2>
          <span style={{ color: 'var(--text-sec)', fontSize: '0.9rem' }}>Custo Médio · Filtro Ativo: {filteredData.length} itens</span>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => setData(null)}><ArrowLeft size={16} /> Voltar</button>
          <button className="btn btn-ghost" onClick={handleExportPDF} style={{ color: '#006400', borderColor: '#006400' }}><FileText size={16} /> Exportar PDF</button>
          <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} /> Imprimir</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span className="label-text" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>Total {inv1Name}</span>
          <strong style={{ fontSize: '1.5rem', display: 'block' }}>R$ {fmt(tot1)}</strong>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span className="label-text" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>Total {inv2Name}</span>
          <strong style={{ fontSize: '1.5rem', display: 'block' }}>R$ {fmt(tot2)}</strong>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span className="label-text" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>Flutuação Geral</span>
          <strong style={{ fontSize: '1.5rem', display: 'block', color: delta > 0 ? 'var(--danger)' : (delta < 0 ? 'var(--success)' : 'var(--text)') }}>
            R$ {fmtR(delta)}
          </strong>
          <span style={{ fontSize: '0.85rem', color: delta > 0 ? 'var(--danger)' : (delta < 0 ? 'var(--success)' : 'var(--text-sec)') }}>
            {fmtR(deltaPct)}%
          </span>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <span className="label-text" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>Itens Subiram/Baixaram</span>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowUp size={16}/> {upCount}</span>
            <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><ArrowDown size={16}/> {downCount}</span>
          </div>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <select className="input-field" style={{ width: 'auto' }} value={filterView} onChange={e => setFilterView(e.target.value)}>
          <option value="changed">Só Alterados</option>
          <option value="all">Todos</option>
          <option value="increased">Só Aumentos (Maior)</option>
          <option value="decreased">Só Reduções (Menor)</option>
        </select>
        <select className="input-field" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas Categorias</option>
          <option value="PA">PA - Produto Acabado</option>
          <option value="CO">CO - Composto</option>
          <option value="MP">MP - Matéria Prima</option>
        </select>
        <input type="text" className="input-field" placeholder="Buscar por código ou descrição..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-container" style={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descrição</th>
              <th>Cat</th>
              <th className="text-right">Qtd {inv1Name}</th>
              <th className="text-right">Unit {inv1Name}</th>
              <th className="text-right">Parc {inv1Name}</th>
              <th className="text-right">Qtd {inv2Name}</th>
              <th className="text-right">Unit {inv2Name}</th>
              <th className="text-right">Parc {inv2Name}</th>
              <th className="text-right">Δ Unit</th>
              <th className="text-right">Δ Parc</th>
              <th className="text-right">Δ Parc %</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map(r => (
              <tr key={r.cod}>
                <td className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-sec)' }}>{r.cod}</td>
                <td style={{ fontWeight: 500 }}>{r.desc}</td>
                <td><span className="badge">{r.cat}</span></td>
                <td className="text-right">{fmt(r.q1, 3)}</td>
                <td className="text-right">{fmt(r.u1, 4)}</td>
                <td className="text-right">{fmt(r.p1)}</td>
                <td className="text-right">{fmt(r.q2, 3)}</td>
                <td className="text-right">{fmt(r.u2, 4)}</td>
                <td className="text-right">{fmt(r.p2)}</td>
                <td className="text-right" style={{ color: r.du > 0 ? 'var(--danger)' : (r.du < 0 ? 'var(--success)' : 'inherit') }}>{fmtR(r.du, 4)}</td>
                <td className="text-right" style={{ color: r.dp > 0 ? 'var(--danger)' : (r.dp < 0 ? 'var(--success)' : 'inherit'), fontWeight: 600 }}>{fmtR(r.dp)}</td>
                <td className="text-right" style={{ color: r.dpp > 0 ? 'var(--danger)' : (r.dpp < 0 ? 'var(--success)' : 'inherit') }}>{fmtR(r.dpp)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
