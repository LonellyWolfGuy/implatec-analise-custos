import React, { useState, useEffect } from 'react';
import { Sun, Moon, Settings2 } from 'lucide-react';
import UploadModal from './components/UploadModal';
import CompareDashboard from './components/CompareDashboard';
import { listInventories } from './services/api';

export default function App() {
  const [theme, setTheme] = useState('light');
  const [currentScreen, setCurrentScreen] = useState('home');
  const [showUpload, setShowUpload] = useState(false);
  
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem('implatec-theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoadingCatalog(true);
      const list = await listInventories(true);
      setCatalog(list.sort((a, b) => {
        const [mA, yA] = a.month_year.split('/');
        const [mB, yB] = b.month_year.split('/');
        return (Number(yB) * 100 + Number(mB)) - (Number(yA) * 100 + Number(mA));
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('implatec-theme', newTheme);
  };

  const latestInventory = catalog.length > 0 ? catalog[0] : null;

  return (
    <div className="app-container animate-fade-in">
      <header className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} onClick={() => setCurrentScreen('home')}>
          <div style={{ width: 44, height: 44, background: 'var(--accent)', color: 'white', borderRadius: '12px', display: 'grid', placeItems: 'center', fontWeight: 'bold', fontSize: '0.9rem', boxShadow: 'var(--shadow-sm)' }}>
            IMP
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '1.2rem' }}>Implatec</strong>
            <span style={{ color: 'var(--text-sec)', fontSize: '0.85rem' }}>Controle de Custos</span>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="icon-btn" onClick={toggleTheme} title="Alternar tema">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      <main>
        {currentScreen === 'home' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>Análise de custos</h1>
                <p style={{ color: 'var(--text-sec)', fontSize: '1.1rem' }}>Acompanhe referências mensais e identifique oscilações relevantes.</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-sec)', padding: '0.5rem 1rem', background: 'var(--bg-panel)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}>
                <span className="status-dot"></span> Pronto
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <span style={{ display: 'block', color: 'var(--text-sec)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Inventários</span>
                <strong style={{ fontSize: '2rem' }}>{loadingCatalog ? '-' : catalog.length}</strong>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <span style={{ display: 'block', color: 'var(--text-sec)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Itens (Último mês)</span>
                <strong style={{ fontSize: '2rem' }}>{latestInventory ? Number(latestInventory.item_count || 0).toLocaleString('pt-BR') : '-'}</strong>
              </div>
              <div className="glass-card" style={{ padding: '1.5rem' }}>
                <span style={{ display: 'block', color: 'var(--text-sec)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>Última Referência</span>
                <strong style={{ fontSize: '2rem' }}>{latestInventory?.month_year || '-'}</strong>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={() => setCurrentScreen('compare')}>
                Comparar Períodos
              </button>
              <button className="btn btn-ghost" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={() => setShowUpload(true)}>
                Catalogar Novo Mês
              </button>
            </div>
          </div>
        )}

        {currentScreen === 'compare' && (
          <CompareDashboard catalog={catalog} onBack={() => setCurrentScreen('home')} />
        )}
      </main>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSuccess={() => { loadCatalog(); setCurrentScreen('home'); }} />}
    </div>
  );
}

