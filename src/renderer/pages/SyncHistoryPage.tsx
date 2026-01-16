import React, { useEffect, useState } from 'react';
import { historyService, ChangeRecord, SyncLog } from '../services/historyService';
import { syncService } from '../services/syncService';
import { useLicense } from '../context/LicenseContext';
import { Clock, RefreshCw, CheckCircle, AlertCircle, Plus, Edit, Trash2, ArrowRight, GitCommit, GitBranch, ChevronDown, ChevronUp, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { useToast } from '../context/ToastContext';




export default function SyncHistoryPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [pendingChanges, setPendingChanges] = useState<ChangeRecord[]>([]);
  const [historyLogs, setHistoryLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const toast = useToast();

  const { license } = useLicense();

  useEffect(() => {
    if (license?.plan === 'PLUS') {
      loadData();
      // Auto-refresh every 30s
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [license]);

  const loadData = async () => {
    try {
      const changes = await historyService.getPendingChanges();
      const logs = await historyService.getSyncHistory();
      setPendingChanges(changes);
      setHistoryLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedChange = pendingChanges.find(c => c.id === selectedChangeId);

  // Premium Barrier
  if (license?.plan !== 'PLUS') {
    return (
      <div className="min-h-[600px] flex flex-col items-center justify-center text-center p-8 animate-in fade-in zoom-in duration-500">
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-6 rounded-full shadow-2xl mb-8">
           <GitBranch className="text-white w-16 h-16" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-4">Fonctionnalité Premium</h2>
        <p className="text-slate-500 dark:text-slate-300 max-w-lg mb-8 text-lg">
          L'historique détaillé des synchronisations et le comparateur de modifications (Git-like) sont réservés aux utilisateurs du plan <span className="font-bold text-blue-600">PLUS</span>.
        </p>
        
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 max-w-md w-full mb-8">
          <ul className="space-y-3 text-left">
            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <span>Historique illimité des synchronisations</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
               <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
               <span>Visualisation des changements (Avant/Après)</span>
            </li>
            <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
               <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
               <span>Sécurité renforcée des données</span>
            </li>
          </ul>
        </div>

        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30">
          Mettre à niveau mon plan
        </button>
      </div>
    );
  }

  const handleClearHistory = async () => {
    if (confirm('Voulez-vous vraiment effacer tout l\'historique de synchronisation ?')) {
      await historyService.clearHistory();
      toast.success('Historique effacé avec succès');
      loadData();
    }
  };

  const handleIgnoreChange = async (id: string) => {
    if (confirm("Voulez-vous vraiment ignorer ce changement ? Il ne sera plus synchronisé mais restera dans votre base locale (sauf si supprimé).")) {
      try {
        await historyService.ignoreChange(id);
        toast.success("Changement ignoré");
        loadData();
        setSelectedChangeId(null);
      } catch (e: any) {
        toast.error("Erreur: " + e.message);
      }
    }
  };

  const handleRevertChange = async (id: string) => {
    if (confirm("Voulez-vous vraiment annuler ce changement et revenir à l'état précédent ? Cette action est irréversible.")) {
      try {
        await historyService.revertChange(id);
        toast.success("Changements annulés avec succès");
        loadData();
        setSelectedChangeId(null);
      } catch (e: any) {
        toast.error("Erreur: " + e.message);
      }
    }
  };


  const handleSyncAll = async () => {
    setLoading(true);
    try {
      await syncService.start();
      toast.success("Synchronisation forcée lancée");
      loadData();
    } catch (e: any) {
      toast.error("Erreur de synchronisation: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIgnoreAll = async () => {
    if (confirm("ATTENTION : Voulez-vous vraiment ignorer TOUS les changements en attente ?\n\nIls ne seront pas envoyés sur le cloud mais resteront dans votre base locale.")) {
      try {
        await historyService.ignoreAllChanges();
        toast.success("Tous les changements ont été ignorés");
        loadData();
      } catch (e: any) {
        toast.error("Erreur: " + e.message);
      }
    }
  };

  const handleRevertAll = async () => {
    if (confirm("DANGER : Voulez-vous vraiment ANNULER TOUS les changements ?\n\nCette action est irréversible et rétablira l'état précédent pour toutes les données modifiées.")) {
      try {
        setLoading(true);
        await historyService.revertAllChanges();
        toast.success("Tous les changements ont été annulés");
        loadData();
      } catch (e: any) {
        toast.error("Erreur: " + e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-3">
             <GitBranch className="text-blue-600" size={32} />
             Historique & Changements
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Visualisez les changements en attente et l'historique des synchronisations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === 'pending' && pendingChanges.length > 0 && (
            <>
              <button 
                onClick={handleSyncAll}
                className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider shadow-lg transition-all active:scale-95"
                title="Forcer la synchronisation immédiate"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Tout Synchroniser</span>
              </button>
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <button 
                onClick={handleIgnoreAll}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
                title="Tout ignorer (ne rien envoyer)"
              >
                <Trash2 size={16} />
                <span className="hidden sm:inline">Tout Ignorer</span>
              </button>
              <button 
                onClick={handleRevertAll}
                className="p-2 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 text-red-500 rounded-lg flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all"
                title="Tout annuler (Reset)"
              >
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Tout Annuler</span>
              </button>
            </>
          )}

          {activeTab === 'history' && historyLogs.length > 0 && (
            <button 
              onClick={handleClearHistory}
              className="p-2 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 text-slate-400 transition-colors rounded-lg flex items-center gap-2 text-sm font-bold"
              title="Effacer l'historique"
            >
              <Trash2 size={20} />
              <span className="hidden sm:inline">Effacer</span>
            </button>
          )}
          
          <button 
            onClick={() => { setLoading(true); loadData(); }} 
            className="p-2 ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400"
            title="Rafraîchir"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 transition-all relative ${
            activeTab === 'pending' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <GitCommit size={18} />
          Modifications en attente
          {pendingChanges.length > 0 && (
             <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs px-2 py-0.5 rounded-full ml-1">
               {pendingChanges.length}
             </span>
          )}
          {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-4 px-6 text-sm font-bold flex items-center gap-2 transition-all relative ${
            activeTab === 'history' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock size={18} />
          Historique
          {activeTab === 'history' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400"></div>}
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-12rem)] items-start">
        
        {/* Left List */}
        <div className="lg:col-span-1 border-r border-slate-200 dark:border-slate-800 pr-8 h-full overflow-y-auto custom-scrollbar">
          {activeTab === 'pending' && (
            <div className="space-y-2 pb-4">
              {pendingChanges.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CheckCircle size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Tout est synchronisé !</p>
                </div>
              ) : (
                pendingChanges.slice(0, 500).map(change => (
                  <div 
                    key={change.id}
                    onClick={() => setSelectedChangeId(change.id)}
                    className={`group p-3 rounded-xl border cursor-pointer transition-all ${
                       selectedChangeId === change.id 
                       ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
                       : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                       <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">{change.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5 capitalize">{change.table}</p>
                       </div>
                       <TypeBadge type={change.type} />
                    </div>
                  </div>
                ))
              )}
              {pendingChanges.length > 500 && (
                <p className="text-xs text-center text-slate-400 py-4">
                  + {pendingChanges.length - 500} autres changements...
                </p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
             <div className="space-y-4 pb-4">
               {historyLogs.map(log => {
                 const isExpanded = expandedLogId === log.id;
                 return (
                   <div 
                     key={log.id} 
                     onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                     className={`p-4 rounded-xl border transition-all cursor-pointer ${
                       isExpanded 
                         ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' 
                         : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                     }`}
                   >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                            log.status === 'SUCCESS' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'
                          }`}>
                            {log.status === 'SUCCESS' ? 'SUCCÈS' : 'ERREUR'}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(log.timestamp).toLocaleString('fr-FR', { 
                              day: '2-digit', 
                              month: 'short', 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {log.type === 'FULL_SYNC' ? 'Synchronisation Complète' : 'Synchronisation Delta'}
                        </p>
                        <span className="text-xs text-slate-400">{log.duration_ms}ms</span>
                      </div>

                      {log.error_message && (
                        <div className="mt-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30 flex items-start gap-3">
                           <AlertCircle className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" size={20} />
                           <div className="overflow-hidden">
                             <p className="font-bold text-red-700 dark:text-red-400 text-sm mb-1">Erreur de synchronisation</p>
                             <p className="text-sm text-red-600 dark:text-red-300 break-words font-medium">
                               {getFriendlyErrorMessage(log.error_message)}
                             </p>
                           </div>
                        </div>
                      )}

                      {/* Detailed Stats View */}
                      {isExpanded && log.records_synced && (
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50 animate-in fade-in slide-in-from-top-1">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Détails des opérations</h4>
                          <div className="space-y-2">
                             {Object.entries(JSON.parse(log.records_synced || '{}') as Record<string, { pushed: number, pulled: number }>)
                               .filter(([_, stats]) => stats.pushed > 0 || stats.pulled > 0)
                               .map(([table, stats]) => (
                                 <div key={table} className="flex items-center justify-between text-sm">
                                   <span className="text-slate-600 dark:text-slate-400 capitalize">{table}</span>
                                   <div className="flex gap-3">
                                      {stats.pushed > 0 && (
                                        <span className="flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                          <ArrowUp size={10} /> {stats.pushed}
                                        </span>
                                      )}
                                      {stats.pulled > 0 && (
                                        <span className="flex items-center gap-1 text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1.5 py-0.5 rounded">
                                          <ArrowDown size={10} /> {stats.pulled}
                                        </span>
                                      )}
                                   </div>
                                 </div>
                               ))
                             }
                             {Object.values(JSON.parse(log.records_synced || '{}') as Record<string, { pushed: number, pulled: number }>)
                               .every(s => s.pushed === 0 && s.pulled === 0) && (
                                 <p className="text-xs text-slate-400 italic">Aucune donnée transférée.</p>
                             )}
                          </div>
                        </div>
                      )}
                   </div>
                 );
               })}
             </div>
          )}
        </div>

        {/* Right Detail / Diff View */}
        <div className="lg:col-span-2 h-full overflow-y-auto custom-scrollbar">
           {activeTab === 'pending' && selectedChange ? (
             <DiffViewer 
               change={selectedChange} 
               onIgnore={handleIgnoreChange} 
               onRevert={handleRevertChange}
             />
           ) : activeTab === 'pending' && pendingChanges.length > 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <GitCommit size={48} className="mb-4 opacity-20" />
                <p>Sélectionnez un changement pour voir les détails</p>
             </div>
           ) : activeTab === 'history' ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <Clock size={48} className="mb-4 opacity-20" />
                <p>Historique des actions</p>
             </div>
           ) : null}
        </div>

      </div>
    </div>
  );
}

function getFriendlyErrorMessage(error: string): string {
  if (!error) return "Une erreur inconnue est survenue.";
  
  const err = error.toLowerCase();
  if (err.includes('fetch') || err.includes('network') || err.includes('connection')) {
    return "Impossible de contacter le serveur. Veuillez vérifier votre connexion internet.";
  }
  if (err.includes('not_linked')) {
    return "L'application n'est pas correctement liée au cloud.";
  }
  if (err.includes('plus_or_pro')) {
    return "Cette fonctionnalité nécessite une licence valide.";
  }
  if (err.includes('unauthorized') || err.includes('401') || err.includes('403')) {
    return "Accès refusé par le serveur. Vérifiez votre licence ou contactez le support.";
  }
  if (err.includes('timeout')) {
    return "Le serveur a mis trop de temps à répondre.";
  }

  return "Une erreur technique est survenue lors du traitement des données. Si le problème persiste, contactez le support technique.";
}

function TypeBadge({ type }: { type: 'NEW' | 'MODIFIED' | 'DELETED' }) {
  if (type === 'NEW') return <span className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-1 rounded"><Plus size={14} /></span>;
  if (type === 'MODIFIED') return <span className="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-1 rounded"><Edit size={14} /></span>;
  return <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-1 rounded"><Trash2 size={14} /></span>;
}

interface DiffViewerProps {
  change: ChangeRecord;
  onIgnore: (id: string) => void;
  onRevert: (id: string) => void;
}

function DiffViewer({ change, onIgnore, onRevert }: DiffViewerProps) {
  const oldDataResults = change.snapshotData || {};
  const newDataResults = change.currentData || {};

  // Filter out meta keys
  const ignoreKeys = ['id', 'updated_at', 'created_at', 'server_id', 'is_dirty', 'last_modified_at'];
  
  // Get all unique keys
  const allKeys = Array.from(new Set([...Object.keys(oldDataResults), ...Object.keys(newDataResults)]))
    .filter(k => !ignoreKeys.includes(k));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
       {/* Metadata Header */}
       <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <TypeBadge type={change.type} />
               <h3 className="text-lg font-bold text-slate-800 dark:text-white">{change.label}</h3>
            </div>
            <p className="text-sm font-mono text-slate-500">{change.table} #{change.localId}</p>
          </div>
          <div className="flex gap-2">
            <button
               onClick={() => onRevert(change.id)}
               className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
               title="Réinitialiser à l'état précédent (Annuler les changements)"
            >
               <RefreshCw size={16} /> <span className="hidden xl:inline">Annuler</span>
            </button>
            <button
               onClick={() => onIgnore(change.id)}
               className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
               title="Ignorer cette modification (ne pas synchroniser)"
            >
               <Trash2 size={16} /> <span className="hidden xl:inline">Ignorer</span>
            </button>
          </div>
       </div>

       {/* Diff Content */}
       <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {change.type === 'NEW' && (
            <div className="p-8 text-center bg-green-50/30 dark:bg-green-900/10">
               <p className="text-green-600 dark:text-green-400 font-medium">Nouvel enregistrement</p>
               <div className="mt-4 text-left max-w-md mx-auto space-y-2">
                  {allKeys.map(key => (
                     <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-500">{key}:</span>
                        <span className="font-mono text-slate-800 dark:text-slate-200">{String(newDataResults[key] || '-')}</span>
                     </div>
                  ))}
               </div>
            </div>
          )}

          {change.type === 'DELETED' && (
            <div className="p-8 text-center bg-red-50/30 dark:bg-red-900/10">
               <p className="text-red-600 dark:text-red-400 font-medium">Enregistrement supprimé</p>
               <p className="text-sm text-slate-500 mt-2">Cet élément sera retiré du cloud lors de la prochaine synchronisation.</p>
            </div>
          )}

          {change.type === 'MODIFIED' && allKeys.map(key => {
             const oldValue = oldDataResults[key];
             const newValue = newDataResults[key];
             
             // Simple equality check
             const isChanged = String(oldValue) !== String(newValue);

             if (!isChanged) return null;

             return (
               <div key={key} className="p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="w-1/3">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{key}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-4">
                     <div className="flex-1 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg font-mono text-sm border border-red-100 dark:border-red-900/20">
                        {String(oldValue === undefined || oldValue === null ? '' : oldValue)}
                     </div>
                     <ArrowRight size={16} className="text-slate-300" />
                     <div className="flex-1 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg font-mono text-sm border border-green-100 dark:border-green-900/20">
                        {String(newValue === undefined || newValue === null ? '' : newValue)}
                     </div>
                  </div>
               </div>
             );
          })}
          
          {change.type === 'MODIFIED' && allKeys.every(k => String(oldDataResults[k]) === String(newDataResults[k])) && (
             <div className="p-12 text-center text-slate-400">
               <p>Aucun changement visible détecté sur les champs suivis.</p>
               <p className="text-xs mt-2">(La modification concerne peut-être des métadonnées internes)</p>
             </div>
          )}
       </div>
    </div>
  );
}
