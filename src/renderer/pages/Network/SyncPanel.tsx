import React, { useState, useEffect } from 'react';
import { Wifi, Download, Loader2 } from '../../components/iconsSvg';
import { useToast } from '../../context/ToastContext';
import { networkService } from '../../services/networkService';

export default function SyncPanel() {
  const [peers, setPeers] = useState<any[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const toast = useToast();

  useEffect(() => {
    loadPeers();
    const removeListener = networkService.onPeersUpdated((_event, updatedPeers) => {
      setPeers(updatedPeers);
    });
    return () => removeListener();
  }, []);

  const loadPeers = async () => {
    try {
      const p = await networkService.getPeers();
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
      const identity = await networkService.getIdentity();
      await networkService.sendFile(selectedPeer, {
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
