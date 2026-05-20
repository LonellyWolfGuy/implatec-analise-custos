import { useState, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import { LayoutDashboard, Download } from 'lucide-react';

const CAT_PILL: Record<string, string> = {
  PA: "bg-[#10b981]/15 text-[#10b981] border-[#10b981]/20",
  CO: "bg-[#3b82f6]/15 text-[#3b82f6] border-[#3b82f6]/20",
  MP: "bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/20",
  EM: "bg-gray-500/15 text-gray-500 border-gray-500/20",
  AG: "bg-purple-500/15 text-purple-500 border-purple-500/20",
  RE: "bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/20"
};

function fmtR(v: number | null, dec = 2) {
  if (v == null || isNaN(v)) return "–";
  let s = v.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return v > 0 ? "+" + s : s;
}

function pct(a: number, b: number) {
  if (!a || a === 0) return null;
  return ((b - a) / a) * 100;
}

export default function Dashboard({ data, onBack }: { data: any[], onBack: () => void }) {
  const [filterCat, _setFilterCat] = useState("");
  const [filterVar, _setFilterVar] = useState("");
  const [filterView, _setFilterView] = useState("changed");
  const [filterSearch, _setFilterSearch] = useState("");
  
  const [sortKey, setSortKey] = useState<string>("dp");
  const [sortDir, setSortDir] = useState<number>(-1);
  const [page, setPage] = useState(0);
  const PER = 25;

  const processedData = useMemo(() => {
    return data.map(r => {
      const dq = r.qMai - r.qAbr;
      const du = r.uMai - r.uAbr;
      const dp = r.pMai - r.pAbr;
      const dqp = pct(r.qAbr, r.qMai);
      const dup = pct(r.uAbr, r.uMai);
      const dpp = pct(r.pAbr, r.pMai);
      return { ...r, dq, du, dp, dqp, dup, dpp };
    });
  }, [data]);

  const filtered = useMemo(() => {
    let f = processedData.filter(r => {
      if (filterView === "changed" && r.dq === 0 && r.du === 0 && r.dp === 0) return false;
      if (filterCat && r.cat !== filterCat) return false;
      if (filterVar === "alta" && r.du <= 0) return false;
      if (filterVar === "baixa" && r.du >= 0) return false;
      if (filterVar === "zero" && r.du !== 0) return false;
      if (filterSearch) {
        const term = filterSearch.toLowerCase();
        if (!r.cod.toLowerCase().includes(term) && !r.desc.toLowerCase().includes(term)) return false;
      }
      return true;
    });
    
    f.sort((a: any, b: any) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (av == null) av = -Infinity;
      if (bv == null) bv = -Infinity;
      return typeof av === "string" ? av.localeCompare(bv) * sortDir : (av - bv) * sortDir;
    });
    
    return f;
  }, [processedData, filterCat, filterVar, filterView, filterSearch, sortKey, sortDir]);

  const total = filtered.length;
  const pages = Math.ceil(total / PER) || 1;
  const currPage = Math.min(page, pages - 1);
  const slice = filtered.slice(currPage * PER, (currPage + 1) * PER);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d * -1);
    else { setSortKey(k); setSortDir(1); }
  };

  const metrics = useMemo(() => {
    const totalM1 = processedData.reduce((s, r) => s + (r.pAbr || 0), 0);
    const totalM2 = processedData.reduce((s, r) => s + (r.pMai || 0), 0);
    const delta = totalM2 - totalM1;
    const deltaPct = pct(totalM1, totalM2);
    const aumentaram = processedData.filter(r => r.du > 0).length;
    const reduziram = processedData.filter(r => r.du < 0).length;
    const novos = processedData.filter(r => r.qAbr === 0 && r.qMai > 0).length;
    const removidos = processedData.filter(r => r.qMai === 0 && r.qAbr > 0).length;
    return { totalM1, totalM2, delta, deltaPct, aumentaram, reduziram, novos, removidos, total: processedData.length };
  }, [processedData]);

  const fmtMon = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const Card = ({ label, value, color, delta, deltaPct }: { label: string; value: string; color: string; delta?: number; deltaPct?: number | null }) => (
    <div className="bg-white/80 border border-black/5 rounded-xl p-4 shadow-sm min-w-[160px] flex-1">
      <p className="text-xs text-slate-400 uppercase font-semibold mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {delta != null && (
        <p className={`text-xs mt-0.5 ${delta >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'}`}>
          {delta >= 0 ? '↑' : '↓'} {fmtMon(Math.abs(delta))}
          {deltaPct != null ? ` (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)` : ''}
        </p>
      )}
    </div>
  );

  const deltaColor = (v: number | null, isQty = false) => {
    if (v == null || v === 0) return "text-[#94a3b8]"; // muted
    if (isQty) return v > 0 ? "text-[#10b981]" : "text-[#ef4444]";
    return v > 0 ? "text-[#ef4444]" : "text-[#10b981]";
  };

  // Export current dashboard view as PDF
  const downloadPdf = () => {
    const element = document.getElementById('dashboard-root');
    if (!element) {
      alert('Elemento do dashboard não encontrado para exportar.');
      return;
    }
    html2pdf()
      .set({
        margin: 0.5,
        filename: 'inventario_comparativo.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      })
      .from(element)
      .save();
  };


  return (
    <div id="dashboard-root" className="max-w-[1440px] mx-auto p-8 animate-in fade-in duration-500 text-[#0f172a]">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 p-6 bg-white/80 backdrop-blur-xl border border-black/5 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold mb-1 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-500" />
            Comparativo de Inventário (Modo Claro)
          </h1>
          <p className="text-sm text-slate-500">Mês 1 vs Mês 2 &nbsp;·&nbsp; Custo Médio</p>
        </div>
        <div className="flex gap-4">
          <button onClick={onBack} className="text-sm bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg font-medium transition">
            Voltar
          </button>
          <span className="text-xs px-3 py-1.5 rounded-full font-bold uppercase bg-blue-500/10 text-blue-600 border border-blue-500/20 shadow-sm">
            Modelo P7
          </span>
          <button onClick={downloadPdf} className="flex items-center gap-1 text-sm bg-green-100 hover:bg-green-200 px-3 py-1 rounded-lg font-medium transition">
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>
      
      {/* Cards de métricas */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Card label="Total de Itens" value={String(metrics.total)} color="text-slate-700" />
        <Card label="Total Mês 1" value={`R$ ${fmtMon(metrics.totalM1)}`} color="text-slate-700" />
        <Card label="Total Mês 2" value={`R$ ${fmtMon(metrics.totalM2)}`} color="text-slate-700" />
        <Card label="Variação Total" value={`R$ ${fmtMon(Math.abs(metrics.delta))}`} color={metrics.delta >= 0 ? 'text-[#ef4444]' : 'text-[#10b981]'} delta={metrics.delta} deltaPct={metrics.deltaPct} />
        <Card label={`↑ Aumentaram (${metrics.aumentaram})`} value={String(metrics.aumentaram)} color="text-[#ef4444]" />
        <Card label={`↓ Reduziram (${metrics.reduziram})`} value={String(metrics.reduziram)} color="text-[#10b981]" />
        <Card label={`Novos (${metrics.novos})`} value={String(metrics.novos)} color="text-[#3b82f6]" />
        <Card label={`Removidos (${metrics.removidos})`} value={String(metrics.removidos)} color="text-[#94a3b8]" />
      </div>

      {/* Tabela de itens */}
      <div className="w-full overflow-x-auto bg-white/80 border border-black/5 rounded-xl shadow-lg">
        <table className="w-full text-xs text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
            <tr>
              <th className="p-3 cursor-pointer hover:text-slate-800" onClick={() => handleSort('cod')}>Código</th>
              <th className="p-3 cursor-pointer hover:text-slate-800" onClick={() => handleSort('desc')}>Descrição</th>
              <th className="p-3 cursor-pointer hover:text-slate-800" onClick={() => handleSort('cat')}>Categoria</th>
              <th className="p-3 cursor-pointer hover:text-slate-800 text-right" onClick={() => handleSort('dq')}>Δ Qtd</th>
              <th className="p-3 cursor-pointer hover:text-slate-800 text-right" onClick={() => handleSort('du')}>Δ Unit</th>
              <th className="p-3 cursor-pointer hover:text-slate-800 text-right" onClick={() => handleSort('dp')}>Δ Parcial</th>
              <th className="p-3 cursor-pointer hover:text-slate-800 text-right" onClick={() => handleSort('dpp')}>Δ% Parc</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {slice.map(r => (
              <tr key={r.cod} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 font-mono text-slate-500">{r.cod}</td>
                <td className="p-3 font-medium text-slate-700">{r.desc}</td>
                <td className="p-3">
                  <span className={`text-[10px] px-2 py-1 rounded-full font-bold border ${CAT_PILL[r.cat] || ''}`}>
                    {r.cat}
                  </span>
                </td>
                <td className={`p-3 text-right font-semibold ${deltaColor(r.dq, true)}`}>{fmtR(r.dq, 3)}</td>
                <td className={`p-3 text-right font-semibold ${deltaColor(r.du)}`}>{fmtR(r.du)}</td>
                <td className={`p-3 text-right font-semibold ${deltaColor(r.dp)}`}>{fmtR(r.dp)}</td>
                <td className={`p-3 text-right font-semibold ${deltaColor(r.dpp)}`}>{r.dpp != null ? fmtR(r.dpp, 1) + '%' : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center mt-6 text-sm text-slate-500">
        <span>{total} registros encontrados</span>
        <div className="flex items-center gap-2">
          <button 
            disabled={currPage === 0} 
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="px-4 py-1.5 bg-slate-100 rounded-md font-medium">Página {currPage + 1} de {pages}</span>
          <button 
            disabled={currPage >= pages - 1} 
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Próxima →
          </button>
        </div>
      </div>
    </div>
  );
}
