import React, { useState, useEffect } from 'react';
import { Wifi, Download, Loader2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function SyncPanel() {
  const [peers, setPeers] = useState<any[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    loadPeers();
    const removeListener = window.api.network.onPeersUpdated((_event, updatedPeers) => {
      setPeers(updatedPeers);
    });
    return () => removeListener();
  }, []);

  const loadPeers = async () => {
    try {
      const p = await window.api.network.getPeers();
      setPeers(p || []);
    } catch (e) {
      console.error('Failed to load peers:', e);
    }
  };

  const handleSyncFromPeer = async () => {
    if (!selectedPeer) return;
    
    setSyncing(true);
    setSyncStatus('Demande de synchronisation en cours...');
    
    try {
      const identity = await window.api.network.getIdentity();
      await window.api.network.sendFile(selectedPeer, {
        sender: identity,
        type: 'SYNC_REQUEST',
        timestamp: Date.now(),
        data: {},
        description: `Demande de synchronisation de ${identity}`
      });
      
      setSyncStatus('Demande envoyée ! Attendez l\'approbation sur l\'hôte.');
      toast.info('Demande envoyée ! Vérifiez votre boîte de réception une fois approuvée.');
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncStatus('Erreur: ' + err.message);
      toast.error('Erreur lors de la demande de synchronisation.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Clonage de données</h2>
          <p className="text-sm text-slate-500">Récupérez toutes les données d'un autre ordinateur Ecole sur votre réseau.</p>
        </div>
        <button onClick={loadPeers} className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 font-medium bg-blue-50 px-3 py-1 rounded-full">
          <Wifi size={14} /> Actualiser les machines
        </button>
      </div>
      
      {peers.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Wifi size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">Aucune machine détectée.</p>
          <p className="text-sm">Vérifiez que l'ordinateur source est sur le même WiFi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {peers.map((peer, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPeer(peer)}
              className={`p-5 rounded-2xl border text-left transition-all group ${
                selectedPeer === peer
                  ? 'border-green-500 bg-green-50 ring-4 ring-green-100'
                  : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors ${
                  selectedPeer === peer ? 'bg-green-100 border-green-200 text-green-600' : 'bg-white border-slate-100 text-slate-400 group-hover:text-green-500'
                }`}>
                  <Wifi size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{peer.name}</div>
                  <div className="text-xs text-slate-400 font-mono tracking-tight">{peer.ip}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {syncStatus && (
        <div className={`mb-6 p-4 rounded-xl text-center font-medium animate-in fade-in slide-in-from-top-2 ${
           syncStatus.startsWith('Erreur') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
        }`}>
          {syncing && <Loader2 size={18} className="animate-spin inline mr-2" />}
          {syncStatus}
        </div>
      )}

      <div className="border-t border-slate-100 pt-6">
        <button
          onClick={handleSyncFromPeer}
          disabled={!selectedPeer || syncing}
          className={`w-full flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all shadow-lg ${
            !selectedPeer || syncing
              ? 'bg-slate-300 cursor-not-allowed shadow-none'
              : 'bg-green-600 hover:bg-green-700 hover:scale-[1.01] active:scale-95'
          }`}
        >
          {syncing ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
          Demander la synchronisation complète
        </button>
        <p className="text-center text-xs text-slate-400 mt-4">
          Attention : Cette action enverra une demande à l'autre machine pour copier sa base de données.
        </p>
      </div>
    </div>
  );
}
