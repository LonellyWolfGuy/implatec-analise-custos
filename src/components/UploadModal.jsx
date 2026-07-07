import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { processFile, analyzeImportedItems } from '../services/parser';
import { saveInventoryData } from '../services/api';

export default function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [monthInput, setMonthInput] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    await loadFile(selectedFile);
  };

  const loadFile = async (selectedFile) => {
    setError(null);
    setLoading(true);
    setProgress('Processando...');
    
    try {
      const result = await processFile(selectedFile, (p, total) => {
        setProgress(`Página ${p} de ${total}...`);
      });
      
      if (result) {
        setFile(result);
        const diag = analyzeImportedItems(result.items);
        setDiagnostics(diag);
        
        // Infer month from name (basic inference logic for now)
        const name = result.name.toLowerCase();
        const m = name.match(/(\d{2})[-_]?(\d{2,4})/);
        if (m && m[1] >= 1 && m[1] <= 12) {
           const y = m[2].length === 2 ? `20${m[2]}` : m[2];
           setMonthInput(`${y}-${m[1].padStart(2, '0')}`);
        }
      } else {
        throw new Error("Formato não suportado ou arquivo vazio.");
      }
    } catch (err) {
      setError(err.message || 'Erro ao processar arquivo.');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const handleSave = async (overwrite = false) => {
    if (!file || !monthInput) return;
    setLoading(true);
    setError(null);
    
    const [yyyy, mm] = monthInput.split('-');
    const month_year = `${mm}/${yyyy}`;
    
    try {
      await saveInventoryData(month_year, file.name, file.items, overwrite);
      onSuccess(month_year);
      onClose();
    } catch (err) {
      if (err.status === 409) {
        if (window.confirm(`Já existe um inventário para ${month_year}. Deseja substituí-lo?`)) {
          handleSave(true);
          return;
        }
      } else {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '2rem', width: '100%', maxWidth: '600px', margin: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Catalogar Inventário</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <p style={{ color: 'var(--text-sec)', marginBottom: '1.5rem' }}>Faça upload de um arquivo PDF (MOD7) ou CSV exportado do ERP TOTVS.</p>

        <div style={{ marginBottom: '1.5rem' }}>
          <span className="label-text">Mês de Referência</span>
          <input type="month" className="input-field" value={monthInput} onChange={(e) => setMonthInput(e.target.value)} />
        </div>

        {!file && !loading && (
          <div 
            style={{ border: '2px dashed var(--accent)', borderRadius: 'var(--radius-md)', padding: '3rem 1rem', textAlign: 'center', cursor: 'pointer', background: 'var(--bg-hover)', transition: 'background 0.2s' }}
            onClick={() => fileInputRef.current.click()}
          >
            <UploadCloud size={48} style={{ color: 'var(--accent)', margin: '0 auto 1rem auto' }} />
            <p><strong>Clique</strong> ou arraste para selecionar o arquivo</p>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,.csv" style={{ display: 'none' }} />

        {loading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-sec)' }}>
            <div className="status-dot" style={{ animation: 'fadeIn 1s infinite alternate' }}></div>
            <p style={{ marginTop: '1rem' }}>{progress || 'Carregando...'}</p>
          </div>
        )}

        {file && !loading && diagnostics && (
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <strong>{file.name}</strong>
                <span style={{ display: 'block', color: 'var(--text-sec)', fontSize: '0.85rem' }}>{diagnostics.total} itens lidos</span>
              </div>
              <button className="icon-btn" style={{ borderColor: 'transparent' }} onClick={() => setFile(null)}><X size={16} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.9rem' }}>
              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.03)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ color: 'var(--text-sec)', display: 'block', fontSize: '0.8rem' }}>Códigos únicos</span>
                <strong>{diagnostics.validCodes}</strong>
              </div>
              <div style={{ padding: '0.75rem', background: diagnostics.hasWarnings ? 'var(--warning-bg)' : 'var(--success-bg)', borderRadius: 'var(--radius-sm)', color: diagnostics.hasWarnings ? 'var(--warning)' : 'var(--success)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  {diagnostics.hasWarnings ? <AlertTriangle size={14} /> : <CheckCircle size={14} />} 
                  Alertas
                </span>
                <strong>{diagnostics.duplicateCodes + diagnostics.missingCode + diagnostics.zeroCost}</strong>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" style={{ flex: 2 }} disabled={!file || !monthInput || loading} onClick={() => handleSave(false)}>
            {loading ? 'Salvando...' : 'Salvar no Catálogo'}
          </button>
        </div>
      </div>
    </div>
  );
}
