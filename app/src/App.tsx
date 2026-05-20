import { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import Papa from 'papaparse';
import Dashboard from './components/Dashboard';
import { extractInventoryFromPdf } from './lib/pdfParser';

function App() {
  const [data, setData] = useState<any[]>([]);
  const [view, setView] = useState<'upload' | 'dashboard'>('upload');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length < 2 && data.length === 0) {
        alert("Por favor, selecione 2 arquivos (Mês 1 e Mês 2) segurando a tecla CTRL ou SHIFT, ou arraste ambos de uma vez.");
        return;
    }

    try {
        alert("Processando os arquivos... Isso pode levar alguns segundos dependendo do tamanho do PDF.");
        
        let allProcessedFiles = [];
        
        for (const file of files) {
            if (file.name.endsWith('.pdf')) {
                const items = await extractInventoryFromPdf(file);
                allProcessedFiles.push({ name: file.name, items });
            } else if (file.name.endsWith('.csv')) {
                // Implementação síncrona/promificada do PapaParse
                const items = await new Promise<any[]>((resolve) => {
                    Papa.parse(file, {
                        header: true,
                        complete: (results) => resolve(results.data as any[])
                    });
                });
                allProcessedFiles.push({ name: file.name, items });
            }
        }

        // Se houver 2 arquivos, fazemos o cruzamento simulando Abril x Maio
        if (allProcessedFiles.length >= 2) {
            // Ordenar por nome para garantir que Abril vem antes de Maio (ordem alfabética ou data)
            // Em produção você perguntaria qual é o mês 1 e qual é o 2.
            allProcessedFiles.sort((a,b) => a.name.localeCompare(b.name));
            
            const [mes1, mes2] = allProcessedFiles;
            
            // Map Mês 1
            const map1 = new Map();
            mes1.items.forEach(i => map1.set(i.cod, i));
            
            // Map Mês 2
            const map2 = new Map();
            mes2.items.forEach(i => map2.set(i.cod, i));

            // Cruzamento
            const merged = [];
            const allCodes = new Set([...map1.keys(), ...map2.keys()]);
            
            for (const cod of allCodes) {
                if (!cod) continue;
                const m1 = map1.get(cod) || { qty: 0, unitCost: 0, totalCost: 0, cat: 'PA', desc: '' };
                const m2 = map2.get(cod) || { qty: 0, unitCost: 0, totalCost: 0, cat: 'PA', desc: '' };
                
                merged.push({
                    cod,
                    desc: m2.desc || m1.desc || "Item Desconhecido",
                    cat: m2.cat || m1.cat,
                    qAbr: m1.qty || 0,
                    uAbr: m1.unitCost || 0,
                    pAbr: m1.totalCost || 0,
                    qMai: m2.qty || 0,
                    uMai: m2.unitCost || 0,
                    pMai: m2.totalCost || 0
                });
            }

            setData(merged);
            setView('dashboard');
        } else {
            alert("Apenas 1 arquivo lido com sucesso (ou mesmo arquivo processado 2 vezes). Tente selecionar os dois ao mesmo tempo.");
        }

    } catch (err) {
        console.error(err);
        alert("Houve um erro ao processar os arquivos. Verifique o console.");
    }
  };

  if (view === 'dashboard') {
    return <Dashboard data={data} onBack={() => setView('upload')} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-[#0f172a] p-4 relative overflow-hidden">
      {/* Subtle background gradients for light mode */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at top left, rgba(59, 130, 246, 0.08), transparent 40%), radial-gradient(ellipse at bottom right, rgba(16, 185, 129, 0.05), transparent 40%)'
      }}></div>

      <div className="w-full max-w-xl bg-[rgba(255,255,255,0.8)] backdrop-blur-md border border-[rgba(0,0,0,0.08)] rounded-2xl p-8 shadow-xl text-center relative z-10">
        <h1 className="text-3xl font-bold font-['Outfit'] mb-2">Importar Inventário</h1>
        <p className="text-[#475569] mb-8">Faça o upload do Mês 1 e Mês 2 (PDF ou CSV) para gerar o relatório consolidado MOD7.</p>
        
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#3b82f6] bg-[rgba(255,255,255,0.5)] rounded-xl cursor-pointer hover:bg-[rgba(59,130,246,0.05)] transition-colors shadow-sm">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-12 h-12 text-[#3b82f6] mb-4" />
            <p className="mb-2 text-sm text-[#475569]"><span className="font-semibold">Clique para enviar</span> ou arraste os arquivos</p>
            <p className="text-xs text-[#94a3b8]">PDF, CSV, ou Excel (MAX. 10MB)</p>
          </div>
          <input type="file" className="hidden" multiple accept=".pdf,.csv,.xlsx" onChange={handleFileUpload} />
        </label>

        <button 
          onClick={() => {
            // Mock data structure
            setData([
              { cod: "0300092A", desc: "COMPOSTO DE PVC FLEXIVEL", cat: "CO", qAbr: 0, uAbr: 0, pAbr: 0, qMai: 49.8, uMai: 7.049, pMai: 351.04 },
              { cod: "0400080A", desc: "MASTER DE PVC PTO 001", cat: "MP", qAbr: 265.197, uAbr: 23.5486, pAbr: 6245.01, qMai: 153.52, uMai: 23.5483, pMai: 3615.13 },
              { cod: "1100060A", desc: "REFUGO PVC RIGIDO CRI", cat: "RE", qAbr: 662.48, uAbr: 0.7042, pAbr: 466.49, qMai: 313.3, uMai: 29.5462, pMai: 9256.82 }
            ]);
            setView('dashboard');
          }}
          className="mt-6 w-full py-3 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
        >
          Teste Rápido (Gerar Dados de Exemplo)
        </button>
      </div>
    </div>
  );
}

export default App;
