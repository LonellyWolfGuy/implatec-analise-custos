import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowUp, ArrowDown, Share2, Download, Printer } from 'lucide-react';
import { getInventory } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

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

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Comparativo {inv1Name} vs {inv2Name}</h2>
          <span style={{ color: 'var(--text-sec)', fontSize: '0.9rem' }}>Custo Médio · Filtro Ativo: {filteredData.length} itens</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-ghost" onClick={() => setData(null)}><ArrowLeft size={16} /> Voltar</button>
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
        <select className="input-field" style={{ width: 'auto' }} value={filterView} onChange={e => setFilterView(e.target.value)}>
          <option value="changed">Só Alterados</option>
          <option value="all">Todos</option>
        </select>
        <select className="input-field" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Todas Categorias</option>
          <option value="PA">PA - Produto Acabado</option>
          <option value="CO">CO - Composto</option>
          <option value="MP">MP - Matéria Prima</option>
        </select>
        <input type="text" className="input-field" placeholder="Buscar por código ou descrição..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-container" style={{ height: '600px', overflowY: 'auto' }}>
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
