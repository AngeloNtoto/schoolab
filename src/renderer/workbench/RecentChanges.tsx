import React, { useEffect, useState } from 'react';
import { historyService, OperationLog, Checkpoint } from '../services/historyService';

export default function RecentChanges() {
  const [operations, setOperations] = useState<OperationLog[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCheckpointName, setNewCheckpointName] = useState('');

  const loadData = async () => {
    try {
      const ops = await historyService.getRecentOperations(100);
      setOperations(ops);
      
      const chks = await historyService.getCheckpoints();
      setCheckpoints(chks);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'historique', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleHistoryChanged = () => loadData();
    window.addEventListener('history:changed', handleHistoryChanged);
    window.addEventListener('history:checkpoint_created', handleHistoryChanged);

    return () => {
      window.removeEventListener('history:changed', handleHistoryChanged);
      window.removeEventListener('history:checkpoint_created', handleHistoryChanged);
    };
  }, []);

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckpointName.trim()) return;
    
    await historyService.createCheckpoint(newCheckpointName, 'Point de sauvegarde manuel');
    setNewCheckpointName('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="flex flex-col h-full bg-white p-4">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Moteur d'Historique V1</h2>
      
      <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-semibold text-blue-900 mb-2">Créer un Checkpoint</h3>
        <form onSubmit={handleCreateCheckpoint} className="flex gap-2">
          <input 
            type="text" 
            value={newCheckpointName}
            onChange={(e) => setNewCheckpointName(e.target.value)}
            placeholder="Nom du point de sauvegarde..."
            className="flex-1 px-3 py-2 border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Créer
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-auto">
        <h3 className="font-semibold text-slate-700 mb-3">Opérations Récentes (100 dernières)</h3>
        {loading ? (
          <p className="text-slate-500 text-sm">Chargement...</p>
        ) : operations.length === 0 ? (
          <p className="text-slate-500 text-sm italic">Aucune opération n'a été enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {operations.map((op) => (
              <div key={op.id} className="p-3 border border-slate-200 rounded-lg text-sm bg-slate-50 relative group">
                <div className="flex justify-between items-start mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    op.action_type === 'CREATE' ? 'bg-green-100 text-green-700' :
                    op.action_type === 'UPDATE' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {op.action_type}
                  </span>
                  <span className="text-slate-400 text-xs">{formatDate(op.created_at)}</span>
                </div>
                <div className="font-medium text-slate-800 mb-1">{op.description}</div>
                <div className="text-xs text-slate-500 font-mono">
                  Entité: {op.entity_type} #{op.entity_id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
