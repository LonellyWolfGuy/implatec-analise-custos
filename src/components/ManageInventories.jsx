import React, { useState } from 'react';
import { Trash2, FileText, ChevronLeft, AlertCircle } from 'lucide-react';
import { deleteInventoryApi } from '../services/api';

export default function ManageInventories({ catalog, onBack, onUpdate }) {
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  const handleDelete = async (id, month_year) => {
    if (!window.confirm(`Tem certeza que deseja excluir o inventário de ${month_year}?`)) {
      return;
    }
    
    try {
      setDeletingId(id);
      setError(null);
      await deleteInventoryApi(id);
      onUpdate(); // Reload catalog in App.jsx
    } catch (err) {
      setError(err.message || 'Erro ao excluir inventário');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="animate-fade-in glass-panel" style={{ padding: '2rem', minHeight: '60vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="icon-btn" onClick={onBack} title="Voltar">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Gerenciar Arquivos</h2>
          <p style={{ color: 'var(--text-sec)', margin: 0 }}>Visualize e exclua inventários catalogados.</p>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {catalog.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-sec)' }}>
          <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p>Nenhum inventário catalogado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {catalog.map((item) => (
            <div key={item.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1.2rem', marginBottom: '0.25rem' }}>{item.month_year}</strong>
                <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-sec)', fontSize: '0.9rem' }}>
                  <span><FileText size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }}/> {item.filename || 'Sem nome de arquivo'}</span>
                  <span>{item.item_count ? `${item.item_count} itens` : '0 itens'}</span>
                </div>
              </div>
              <button 
                className="btn" 
                style={{ background: '#fee2e2', color: '#b91c1c', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-md)' }}
                onClick={() => handleDelete(item.id, item.month_year)}
                disabled={deletingId === item.id}
              >
                {deletingId === item.id ? 'Excluindo...' : (
                  <>
                    <Trash2 size={18} />
                    Excluir
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
