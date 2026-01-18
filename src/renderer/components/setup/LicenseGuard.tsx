import React from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { ShieldAlert, RefreshCw, Heart } from '../iconsSvg';
import { useLicense } from '../../context/LicenseContext';
import UpgradeModal from '../common/UpgradeModal';

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const { license, loading, refreshRemoteLicense } = useLicense();
  const [syncOverdue, setSyncOverdue] = React.useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const navigate = useNavigate();

  // Effect to check sync status periodically
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await invoke<any>('check_sync_status');
        setSyncOverdue(result.overdue);
      } catch (err) {
        console.error('Failed to check sync status:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000 * 60 * 5); // Every 5 minutes

    // Listen for database changes to re-check (Tauri version)
    let unlisten: any;
    const setupListener = async () => {
       unlisten = await listen('db-changed', () => {
         checkStatus();
       });
    };
    setupListener();

    return () => {
      clearInterval(interval);
      if (unlisten) unlisten();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Vérification de la licence...</p>
      </div>
    );
  }

  if (license?.isBlocked) {
    const isClockError = license.clockTampered;

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
        {/* Abstract Background Decor */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -ml-48 -mb-48"></div>

        <div className="max-w-md w-full bg-slate-900/50 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10 text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
            <ShieldAlert size={40} />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-2">
            {isClockError ? "Conflit d'Horloge" : "Accès Interrompu"}
          </h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            {isClockError 
              ? "Une manipulation de la date système a été détectée. Veuillez remettre votre ordinateur à l'heure correcte pour continuer."
              : `Votre ${license.isTrial ? "période d'essai" : "licence"} a expiré le ${new Date(license.expiresAt).toLocaleDateString()}. Veuillez activer une clé pour continuer à utiliser Schoolab.`
            }
          </p>

          <div className="space-y-3">
            {!isClockError && (
              <>
                <button 
                  onClick={async () => {
                     try {
                       await refreshRemoteLicense();
                     } catch(e) {
                       console.error(e);
                     }
                  }}
                  className="w-full bg-white hover:bg-slate-100 text-slate-950 px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                  {loading ? "Vérification..." : "Activer Mes Droits"}
                </button>
                
                <button 
                  onClick={() => navigate('/settings')}
                  className="w-full text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Saisir une clé de licence manuellement
                </button>
              </>
            )}
            
            <button 
              onClick={() => {
                if (isClockError) {
                  window.location.reload();
                } else {
                  window.open('https://Schoolab.vercel.app/pricing', '_blank');
                }
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold transition-all"
            >
              <Heart size={18} className="text-red-500" />
              {isClockError ? "Réessayer après correction" : "S'abonner maintenant"}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <p className="text-xs text-slate-500">
            ID Machine : <code className="bg-slate-800 px-2 py-1 rounded text-slate-400">{license.hwid || 'Récupération...'}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Handler for the sync button that checks license
  const handleSyncClick = async () => {
    // If user doesn't have PLUS plan, show upgrade modal
    if (license?.plan !== 'PLUS') {
      setShowUpgradeModal(true);
      return;
    }

    // User has PLUS plan, proceed with sync
    try {
      const res = await invoke<any>('sync_start');
      if (res.success) {
        const status = await invoke<any>('check_sync_status');
        setSyncOverdue(status.overdue);
      }
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <>
      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        featureName="La synchronisation cloud"
      />

      <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none flex flex-col items-center p-4 gap-3">
        {license && !license.isBlocked && license.daysRemaining <= 3 && (
          <div className="pointer-events-auto bg-amber-500 text-white px-5 py-2 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top duration-500 border border-amber-400/50 backdrop-blur-md">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <ShieldAlert size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Expiration Proche</span>
              <span className="text-xs font-bold whitespace-nowrap">Licence expire dans {license.daysRemaining} jours.</span>
            </div>
            <button 
              onClick={() => navigate('/settings')}
              className="bg-white text-amber-600 px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg active:scale-95"
            >
              Activer
            </button>
          </div>
        )}
        
        {!license?.isBlocked && syncOverdue && false && (
          <div className="pointer-events-auto bg-orange-600/95 dark:bg-slate-900 border border-orange-500/30 dark:border-white/10 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top duration-700 backdrop-blur-xl transition-all">
            <div className="p-2 bg-orange-500 dark:bg-blue-600 rounded-xl shadow-lg">
              <RefreshCw size={18} className="animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60">Synchronisation</span>
              <span className="text-xs font-bold text-white tracking-tight white-space-nowrap">Modifications en attente (+24h).</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSyncClick}
                className="bg-white text-orange-600 dark:bg-blue-600 dark:text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-xl transition-all active:scale-95 whitespace-nowrap"
              >
                Synchroniser
              </button>
            </div>
          </div>
        )}
      </div>
      {children}
    </>
  );
}

