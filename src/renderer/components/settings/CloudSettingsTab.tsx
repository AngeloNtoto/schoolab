import React, { useState, useEffect } from 'react';
// Importation des icônes SVG nécessaires
import { RefreshCw, Upload, Download, AlertTriangle, Sparkles } from '../iconsSvg';
// Contexte de licence (contenant les actions de synchronisation push/pull)
import { useLicense } from '../../context/LicenseContext';
// Contexte de toasts d'information
import { useToast } from '../../context/ToastContext';
// Services d'accès SQLite et base de données
import { settingsService } from '../../services/settingsService';
import { dbService } from '../../services/databaseService';
// Modale de mise à niveau vers premium Schoolab Plus
import UpgradeModal from '../common/UpgradeModal';

/**
 * Composant CloudSettingsTab
 * Permet de synchroniser les données locales vers le cloud (sauvegarde)
 * ou d'importer les données réseau fusionnées.
 */
export default function CloudSettingsTab() {
  const { license: licenseStatus, syncPull, syncPush } = useLicense();
  const toast = useToast();

  // États locaux de chargement et d'informations cloud
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cloudSchoolId, setCloudSchoolId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Chargement des informations cloud
  useEffect(() => {
    async function loadCloudInfo() {
      try {
        const lastSyncTime = await settingsService.get('last_sync_time');
        const schoolId = await settingsService.get('school_id');
        setLastSync(lastSyncTime);
        setCloudSchoolId(schoolId);
      } catch (err) {
        console.error("Erreur lors de la lecture des infos de synchro :", err);
      }
    }
    loadCloudInfo();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* En-tête de section */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Synchronisation Cloud</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Sauvegardez vos données scolaires en ligne ou synchronisez vos encodages avec d'autres terminaux.
        </p>
      </div>
      
      <div className="space-y-8">
        
        {/* Statut du couplage Cloud actuel */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl border shadow-sm ${
              cloudSchoolId 
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10' 
                : 'bg-slate-100 dark:bg-slate-900 text-slate-455 border-slate-200/50 dark:border-white/5'
            }`}>
              <RefreshCw size={22} className={!cloudSchoolId ? 'animate-spin text-slate-400' : 'text-indigo-550 dark:text-indigo-400'} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {cloudSchoolId ? 'Base de Données Connectée au Cloud' : 'En attente de couplage Cloud'}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal font-medium">
                {cloudSchoolId 
                  ? `ID Réseau de votre Établissement : ${cloudSchoolId}` 
                  : 'Veuillez activer une licence compatible Schoolab Plus pour débloquer la réplication Cloud.'}
              </p>
              {lastSync && (
                <span className="inline-block text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-2.5 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 px-2.5 py-1 rounded-lg">
                  Dernier échange : {new Date(lastSync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Commandes Cloud réservées aux formules Schoolab Plus */}
        {licenseStatus?.plan === 'PLUS' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Export vers le Cloud */}
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await syncPush();
                    if (res.success) {
                      toast.success(res.summary || 'Modifications sauvegardées sur le Cloud !');
                      const lastSyncTime = await settingsService.get('last_sync_time');
                      setLastSync(lastSyncTime);
                    } else {
                      toast.error('Échec de la sauvegarde : ' + res.error);
                    }
                  } catch (e) {
                    toast.error('Erreur lors de l\'exportation des modifications.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !cloudSchoolId}
                className="flex items-center justify-between p-6 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg rounded-3xl transition-all duration-300 group text-left shadow-sm"
              >
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest">Local → Réseau</span>
                  <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">Sauvegarder dans le Cloud</div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-normal pr-4 font-medium">Exportez vos encodages de notes récents vers le serveur central</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-500 group-hover:bg-blue-650 group-hover:text-white rounded-xl transition-all duration-300 shadow-sm">
                  <Upload size={18} className={loading ? 'animate-spin' : ''} />
                </div>
              </button>

              {/* Import depuis le Cloud */}
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await syncPull();
                    if (res.success) {
                      toast.success(res.summary || 'Données synchronisées avec succès !');
                      const lastSyncTime = await settingsService.get('last_sync_time');
                      setLastSync(lastSyncTime);
                    } else {
                      toast.error('Échec du chargement : ' + res.error);
                    }
                  } catch (e) {
                    toast.error('Erreur lors du téléchargement des modifications.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading || !cloudSchoolId}
                className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.01] text-white rounded-3xl shadow-md shadow-blue-500/10 text-left transition-all group"
              >
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-black text-blue-200 tracking-widest">Réseau → Local</span>
                  <div className="text-sm font-bold mt-1">Fusionner avec le Cloud</div>
                  <p className="text-[10px] text-blue-100 mt-1 leading-normal pr-4 font-medium">Récupérez les cotes encodées par vos collègues sur d'autres postes</p>
                </div>
                <div className="p-3 bg-white/10 text-white group-hover:bg-white/20 rounded-xl transition-all duration-300">
                  <Download size={18} />
                </div>
              </button>
            </div>

            {/* Maintenance et forçage */}
            <div className="p-6 border border-amber-200/50 dark:border-amber-900/40 bg-amber-500/5 rounded-3xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                <div>
                  <h5 className="text-sm font-bold text-amber-800 dark:text-amber-455">Action de maintenance réseau</h5>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal font-medium">
                    En cas d'incompatibilité de données locales, vous pouvez forcer le marquage de toutes vos tables comme "modifiées localement" pour renvoyer une copie intègre sur le Cloud.
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={async () => {
                  const confirmed = await toast.confirm({
                    title: 'Réinitialiser & Renvoyer ?',
                    message: 'Cette action marquera toutes vos données locales comme nécessitant d\'écraser la version du serveur Cloud.',
                    confirmLabel: 'Forcer l\'envoi complet',
                    cancelLabel: 'Annuler',
                    variant: 'warning'
                  });

                  if (confirmed) {
                    setLoading(true);
                    try {
                      const tables = ["academic_years", "classes", "students", "subjects", "grades", "notes", "domains", "repechages"];
                      for (const table of tables) {
                        await dbService.execute(`UPDATE ${table} SET is_dirty = 1, server_id = NULL`);
                      }
                      toast.success("Tables marquées à synchroniser. Lancement de la sauvegarde...");
                      
                      const res = await syncPush();
                      if (res.success) {
                        toast.success(res.summary || 'Exportation complète effectuée avec succès !');
                        const lastSyncTime = await settingsService.get('last_sync_time');
                        setLastSync(lastSyncTime);
                      } else {
                        toast.error('Erreur lors de la sauvegarde forcée : ' + res.error);
                      }
                    } catch (e) {
                      toast.error('Erreur technique lors de la commande SQL de marquage.');
                      console.error(e);
                    } finally {
                      setLoading(false);
                    }
                  }
                }}
                disabled={loading || !cloudSchoolId}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
              >
                Réinitialiser & Renvoyer
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl space-y-4 shadow-sm">
            {/* Invitation esthétique de mise à niveau */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-indigo-500/10 text-indigo-500 rounded-2xl">
                <Sparkles size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Collaborez avec Schoolab Plus</h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-1.5 font-medium">
                  Saisissez vos bulletins et notes de manière collaborative. Plusieurs ordinateurs isolés peuvent encoder simultanément, puis fusionner d'un clic sur Internet sans aucun conflit ni écrasement involontaire.
                </p>
              </div>
            </div>
            
            <div className="flex justify-start">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
              >
                En savoir plus sur Schoolab Plus
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Modale de surclassement Premium Plus */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName="la synchronisation cloud"
      />
    </div>
  );
}
