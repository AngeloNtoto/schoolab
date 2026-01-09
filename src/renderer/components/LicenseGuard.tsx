import React from 'react';
import { ShieldAlert, Key, Heart, ArrowRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '../context/LicenseContext';

export default function LicenseGuard({ children }: { children: React.ReactNode }) {
  const { license, loading, refreshRemoteLicense } = useLicense();
  const [syncOverdue, setSyncOverdue] = React.useState(false);
  const navigate = useNavigate();

  // Effect to check sync status periodically
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await window.api.db.checkSyncStatus();
        setSyncOverdue(result.overdue);
      } catch (err) {
        console.error('Failed to check sync status:', err);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 1000 * 60 * 5); // Every 5 minutes

    // Listen for database changes to re-check
    const removeListener = window.api.network.onDbChanged(() => {
       checkStatus();
    });

    return () => {
      clearInterval(interval);
      removeListener();
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

  return (
    <>
      {license && !license.isBlocked && license.daysRemaining <= 3 && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 animate-pulse sticky top-0 z-50">
          <ShieldAlert size={16} />
          Votre {license.isTrial ? "essai" : "licence"} expire dans {license.daysRemaining} jours.
          <button 
            onClick={() => navigate('/settings')}
            className="underline hover:text-white/80 ml-2"
          >
            Activer maintenant
          </button>
        </div>
      )}
      {!license?.isBlocked && syncOverdue && (
        <div className="bg-orange-600 text-white px-4 py-2 text-center text-sm font-bold flex items-center justify-center gap-2 sticky top-0 z-40 border-b border-orange-700">
          <RefreshCw size={16} className="animate-spin-slow" />
          Attention : Vous avez des modifications non synchronisées depuis plus de 24h.
          <button 
            onClick={() => window.api.sync.start()}
            className="underline hover:text-white/80 ml-2 bg-white/20 px-2 py-0.5 rounded transition-colors"
          >
            Synchroniser maintenant
          </button>
        </div>
      )}
      {children}
    </>
  );
}
