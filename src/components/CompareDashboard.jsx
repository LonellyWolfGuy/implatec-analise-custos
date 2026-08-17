import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Printer, FileText } from 'lucide-react';
import { getInventory } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import IMPLATEC_LOGO from '../assets/logo-implatec.png?inline';

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
    if (!filteredData || filteredData.length === 0) {
      window.alert('Não há itens no filtro atual para exportar. Ajuste os filtros e tente novamente.');
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const GREEN = [0, 103, 45];
      const DARK_GREEN = [0, 79, 34];
      const LIGHT_GREEN = [242, 248, 243];
      const RED = [210, 32, 38];
      const DARK = [35, 42, 38];
      const MUTED = [100, 110, 104];
      const BORDER = [210, 222, 213];
      const LOGO_ASPECT_RATIO = 1141 / 224;

      const toNumber = value => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
      };
      const fmtPdf = (value, decimals = 2) => {
        if (value == null || value === '') return '-';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '-';
        return numeric.toLocaleString('pt-BR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
      };
      const fmtSignedPdf = (value, decimals = 2) => {
        if (value == null || value === '') return '-';
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return '-';
        return `${numeric > 0 ? '+' : ''}${fmtPdf(numeric, decimals)}`;
      };
      const fmtPercentPdf = value => {
        if (value == null || !Number.isFinite(Number(value))) return '-';
        return `${fmtSignedPdf(value)}%`;
      };

      // Todos os indicadores gerenciais são calculados sobre o mesmo recorte da tabela.
      const reportMetrics = filteredData.reduce((metrics, row) => {
        metrics.totalReference += toNumber(row.p1);
        metrics.totalCompared += toNumber(row.p2);
        if (toNumber(row.dp) > 0) metrics.increases += 1;
        else if (toNumber(row.dp) < 0) metrics.decreases += 1;
        else metrics.unchanged += 1;
        return metrics;
      }, {
        totalReference: 0,
        totalCompared: 0,
        increases: 0,
        decreases: 0,
        unchanged: 0,
      });
      reportMetrics.variation = reportMetrics.totalCompared - reportMetrics.totalReference;
      reportMetrics.variationPct = reportMetrics.totalReference
        ? (reportMetrics.variation / reportMetrics.totalReference) * 100
        : null;

      const categoryLabel = {
        PA: 'PA - Produto Acabado',
        CO: 'CO - Composto',
        MP: 'MP - Matéria Prima',
      }[filterCat] || (filterCat || 'Todas as categorias');
      const filterParts = [
        `Visão: ${filterLabel}`,
        `Categoria: ${categoryLabel}`,
      ];
      if (search.trim()) filterParts.push(`Busca: "${search.trim()}"`);
      const filterSummary = filterParts.join(' | ');
      const emittedAt = new Date().toLocaleString('pt-BR');

      const drawLogo = (x, y, width) => {
        try {
          doc.addImage(IMPLATEC_LOGO, 'PNG', x, y, width, width / LOGO_ASPECT_RATIO);
        } catch (error) {
          console.warn('Não foi possível inserir a logo no PDF.', error);
        }
      };

      // Cabeçalho executivo da primeira página.
      drawLogo(10, 5, 58);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...DARK_GREEN);
      doc.text('RELATÓRIO GERENCIAL DE CUSTOS', pageW - 10, 9, { align: 'right' });
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(`Comparativo: ${inv1Name} vs ${inv2Name}`, pageW - 10, 16, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.text(`Emitido em ${emittedAt}`, pageW - 10, 21, { align: 'right' });

      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.8);
      doc.line(10, 24, pageW - 10, 24);
      doc.setDrawColor(...RED);
      doc.setLineWidth(1.2);
      doc.line(10, 25.5, 68, 25.5);

      // Faixa com os filtros efetivamente aplicados.
      const filterBlockY = 29;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const filterLines = doc.splitTextToSize(filterSummary, pageW - 64);
      const filterBlockHeight = Math.max(9, 4.5 + filterLines.length * 3.5);
      doc.setFillColor(...LIGHT_GREEN);
      doc.setDrawColor(...BORDER);
      doc.roundedRect(10, filterBlockY, pageW - 20, filterBlockHeight, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...DARK_GREEN);
      doc.text('FILTROS APLICADOS', 14, filterBlockY + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(filterLines, 43, filterBlockY + 5.5);

      // Indicadores do recorte filtrado.
      const kpiY = filterBlockY + filterBlockHeight + 3;
      const kpiHeight = 18;
      const kpiGap = 3;
      const kpiWidth = (pageW - 20 - kpiGap * 3) / 4;
      const variationColor = reportMetrics.variation > 0
        ? RED
        : reportMetrics.variation < 0
          ? GREEN
          : MUTED;
      const kpis = [
        {
          label: `TOTAL ${inv1Name}`,
          value: `R$ ${fmtPdf(reportMetrics.totalReference)}`,
          color: DARK,
        },
        {
          label: `TOTAL ${inv2Name}`,
          value: `R$ ${fmtPdf(reportMetrics.totalCompared)}`,
          color: DARK,
        },
        {
          label: 'VARIAÇÃO DO RECORTE',
          value: `R$ ${fmtSignedPdf(reportMetrics.variation)} (${fmtPercentPdf(reportMetrics.variationPct)})`,
          color: variationColor,
        },
        {
          label: 'ITENS DO RECORTE',
          value: `${filteredData.length} itens`,
          detail: `Altas ${reportMetrics.increases} | Reduções ${reportMetrics.decreases} | Estáveis ${reportMetrics.unchanged}`,
          color: DARK_GREEN,
        },
      ];

      kpis.forEach((item, index) => {
        const x = 10 + index * (kpiWidth + kpiGap);
        doc.setFillColor(250, 252, 250);
        doc.setDrawColor(...(index === 2 ? variationColor : BORDER));
        doc.setLineWidth(index === 2 ? 0.6 : 0.3);
        doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(item.label, x + 4, kpiY + 5);
        doc.setFontSize(10.5);
        doc.setTextColor(...item.color);
        doc.text(item.value, x + 4, kpiY + 11.5);
        if (item.detail) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(...MUTED);
          doc.text(item.detail, x + 4, kpiY + 15.5);
        }
      });

      const headers = [
        'Código', 'Descrição', 'Cat',
        `Qtd\n${inv1Name}`, `Unit.\n${inv1Name}`, `Parc.\n${inv1Name}`,
        `Qtd\n${inv2Name}`, `Unit.\n${inv2Name}`, `Parc.\n${inv2Name}`,
        'Var. Unit.', 'Var. Parc.', 'Var. %',
      ];
      const rows = filteredData.map(row => [
        row.cod,
        row.desc,
        row.cat,
        fmtPdf(row.q1, 3),
        fmtPdf(row.u1, 4),
        fmtPdf(row.p1),
        fmtPdf(row.q2, 3),
        fmtPdf(row.u2, 4),
        fmtPdf(row.p2),
        fmtSignedPdf(row.du, 4),
        fmtSignedPdf(row.dp),
        fmtPercentPdf(row.dpp),
      ]);

      const continuationFilter = filterSummary.length > 145
        ? `${filterSummary.slice(0, 142)}...`
        : filterSummary;
      const drawContinuationHeader = () => {
        drawLogo(10, 5, 40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...DARK_GREEN);
        doc.text('RELATÓRIO GERENCIAL DE CUSTOS', pageW - 10, 8, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text(`${inv1Name} vs ${inv2Name} | ${continuationFilter}`, pageW - 10, 14, { align: 'right' });
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.5);
        doc.line(10, 18, pageW - 10, 18);
      };

      autoTable(doc, {
        startY: kpiY + kpiHeight + 4,
        head: [headers],
        body: rows,
        theme: 'grid',
        margin: { top: 22, right: 10, bottom: 14, left: 10 },
        styles: {
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 1.5,
          valign: 'middle',
          overflow: 'linebreak',
          lineColor: BORDER,
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: GREEN,
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7,
          minCellHeight: 9,
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
        alternateRowStyles: { fillColor: [246, 250, 247] },
        didParseCell: hookData => {
          if (hookData.section !== 'body') return;
          const columnIndex = hookData.column.index;
          const value = hookData.cell.raw;
          if ((columnIndex === 9 || columnIndex === 10 || columnIndex === 11) && typeof value === 'string') {
            if (value.startsWith('+')) hookData.cell.styles.textColor = RED;
            else if (value.startsWith('-')) hookData.cell.styles.textColor = GREEN;
          }
        },
        willDrawPage: hookData => {
          if (hookData.pageNumber > 1) drawContinuationHeader();
        },
      });

      // Rodapé aplicado após a tabela para usar o número total definitivo de páginas.
      const totalPages = doc.internal.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        doc.setPage(pageNumber);
        const pageH = doc.internal.pageSize.getHeight();
        doc.setDrawColor(...GREEN);
        doc.setLineWidth(0.35);
        doc.line(10, pageH - 10, pageW - 10, pageH - 10);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...MUTED);
        doc.text('IMPLATEC | Relatório gerencial - uso interno', 10, pageH - 5.5);
        doc.text(`Página ${pageNumber} de ${totalPages}`, pageW - 10, pageH - 5.5, { align: 'right' });
      }

      const sanitizeFilePart = value => String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
        .replace(/\s+/g, '_');
      doc.save(`Relatorio_Gerencial_${sanitizeFilePart(inv1Name)}_vs_${sanitizeFilePart(inv2Name)}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar o relatório em PDF:', error);
      window.alert('Não foi possível gerar o PDF. Tente novamente ou verifique o console para mais detalhes.');
    }
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
          <button
            className="btn btn-ghost"
            onClick={handleExportPDF}
            disabled={filteredData.length === 0}
            title={filteredData.length === 0 ? 'Não há itens no filtro atual para exportar' : 'Exportar o recorte filtrado em PDF'}
            style={{ color: '#006400', borderColor: '#006400' }}
          >
            <FileText size={16} /> Exportar PDF
          </button>
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
