import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { settingsService } from '../services/settingsService';
import { useLicense } from '../context/LicenseContext';
import { 
  Clock, 
  Moon, 
  Sun, 
  School, 
  Info, 
  Building2, 
  Key, 
  ShieldCheck, 
  User, 
  Heart, 
  Sparkles, 
  Settings, 
  ShieldAlert, 
  RefreshCw, 
  Download, 
  Copy, 
  Check, 
  Mail, 
  Phone 
} from '../components/iconsSvg';
import { useToast } from '../context/ToastContext';
import { seedingService } from '../services/seedingService';
import { licenseService } from '../services/licenseService';
import { syncService } from '../services/syncService';
import { dbService } from '../services/databaseService'; // Import du service de base de données locale
import pkg from "../../../package.json";
import UpgradeModal from '../components/common/UpgradeModal';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'licence' | 'cloud' | 'about'>('general');
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');
  const [loading, setLoading] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [activationType, setActivationType] = useState<'ACTIVATE' | 'REGISTER'>('ACTIVATE');
  const [activationError, setActivationError] = useState('');
  const { license: licenseStatus, refreshLicense, refreshRemoteLicense, syncPull, syncPush } = useLicense();
  const [hwid, setHwid] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cloudSchoolId, setCloudSchoolId] = useState<string | null>(null);
  const toast = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copied, setCopied] = useState(false); // État pour indiquer si l'ID Machine a été copié avec succès

  // Chargement initial des paramètres stockés localement
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const name = await settingsService.get('school_name');
    const city = await settingsService.get('school_city');
    const pobox = await settingsService.get('school_pobox');
    if (name) setSchoolName(name);
    if (city) setSchoolCity(city);
    if (pobox) setSchoolPoBox(pobox);

    // Charge la date de dernière synchro et l'ID d'établissement lié au Cloud
    const lastSyncTime = await settingsService.get('last_sync_time');
    const sId = await settingsService.get('school_id');
    setLastSync(lastSyncTime);
    setCloudSchoolId(sId);

    // Récupération de l'identifiant matériel unique (HWID)
    try {
      const id = await licenseService.getHWID();
      setHwid(id);
    } catch (e) {
      console.error("Failed to load HWID", e);
    }
  };

  // Copie de l'ID machine unique pour simplifier l'activation
  const handleCopyHWID = () => {
    if (!hwid) return;
    navigator.clipboard.writeText(hwid);
    setCopied(true);
    toast.success('ID Machine copié avec succès !');
    setTimeout(() => setCopied(false), 2000);
  };

  // Gestionnaire d'activation de licence
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey) return;

    if (showPasswordPrompt && !password) {
      toast.error('Veuillez entrer le mot de passe administrateur.');
      return;
    }

    setLoading(true);
    setActivationError('');
    try {
      const result = await licenseService.activate(licenseKey, password);
      if (result.success) {
        await refreshLicense();
        toast.success('Licence activée avec succès !');
        setLicenseKey('');
        setPassword('');
        setShowPasswordPrompt(false);
      } else {
        const errorMsg = result.error || 'Erreur inconnue';

        if (errorMsg === 'PASSWORD_REQUIRED') {
          setActivationError('Cette licence est protégée. Veuillez entrer le mot de passe administrateur.');
          setShowPasswordPrompt(true);
          setActivationType('ACTIVATE');
        } else if (errorMsg === 'PASSWORD_REQUIRED_FOR_SETUP') {
          setActivationError('Nouvelle licence détectée. Veuillez définir un mot de passe administrateur pour la protéger.');
          setShowPasswordPrompt(true);
          setActivationType('REGISTER');
        } else if (errorMsg.includes('Invalid license key')) {
          setActivationError('Clé de licence invalide.');
          setShowPasswordPrompt(false);
        } else if (errorMsg.includes('Incorrect password')) {
          setActivationError('Mot de passe incorrect.');
        } else {
          setActivationError(`Échec: ${errorMsg}`);
        }
        toast.error('Échec de l\'activation');
      }
    } catch (err: any) {
      setActivationError('Erreur technique lors de l\'activation.');
      toast.error('Erreur technique');
    } finally {
      setLoading(false);
    }
  };

  // Liste des onglets de configuration
  const tabs = [
    { id: 'general' as const, label: 'Établissement', icon: Building2, description: 'Fiche d\'identité' },
    { id: 'appearance' as const, label: 'Thème', icon: Sun, description: 'Affichage et couleurs' },
    { id: 'licence' as const, label: 'Licence & Droits', icon: ShieldCheck, description: 'Statut et clé produit' },
    { id: 'cloud' as const, label: 'Cloud & Synchro', icon: RefreshCw, description: 'Sauvegardes centralisées' },
    { id: 'about' as const, label: 'À propos', icon: Info, description: 'Version et assistance' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* Barre d'en-tête professionnelle et sobre */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-5 sticky top-0 z-30 shadow-sm backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
              <Settings size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Paramètres Système</h1>
              <p className="text-slate-400 dark:text-slate-500 text-xs">Configuration globale et administration de l'application</p>
            </div>
          </div>
          {licenseStatus?.active && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold tracking-wide">
              {licenseStatus.plan === 'PLUS' ? 'Plan Schoolab Plus' : 'Plan Schoolab Pro'}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Navigation latérale structurée et claire */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <tab.icon size={18} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm truncate">{tab.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zone de contenu principale, sobre et bien aérée */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

              {/* SECTION GÉNÉRALE : Fiche d'identité de l'établissement */}
              {activeTab === 'general' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Identité Numérique de l'Établissement</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Ces informations officielles sont directement extraites de votre clé d'enregistrement.</p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Fiche d'identité formelle et épurée */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                          <School size={24} />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nom de l'Établissement</span>
                            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                              {schoolName || <span className="opacity-30 italic">Aucune école identifiée</span>}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ville</span>
                              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                {schoolCity || '--'}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Boîte Postale</span>
                              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                {schoolPoBox || '--'}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Plan Actuel</span>
                              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                {licenseStatus?.plan || 'Gratuit'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Encadré d'information utile */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-lg flex items-start gap-3">
                      <Info size={16} className="text-blue-500 mt-0.5" />
                      <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Note de sécurité :</span> L'identité de votre établissement est cryptée et liée de manière unique à votre clé de licence. Elle apparaît de manière officielle sur tous les palmarès, bulletins et fiches d'élèves générés pour empêcher l'usage non autorisé de votre copie de Schoolab.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION APPARENCE : Thème et personnalisation visuelle */}
              {activeTab === 'appearance' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Thème et Affichage</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Ajustez l'ambiance visuelle du logiciel pour un confort de travail optimal.</p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Choix Mode Jour */}
                      <button
                        onClick={() => setTheme('light')}
                        className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between aspect-[3/2] ${
                          theme === 'light'
                            ? 'border-blue-600 bg-blue-50/20 dark:bg-blue-900/10 ring-2 ring-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">Clair / Jour</span>
                          <div className={`p-1.5 rounded-full ${theme === 'light' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <Sun size={14} />
                          </div>
                        </div>
                        
                        {/* Mini aperçu symbolisant le mode clair */}
                        <div className="w-full h-16 bg-slate-50 rounded-lg border border-slate-200/60 p-2 flex flex-col gap-1.5 opacity-80">
                          <div className="h-2 w-1/3 bg-slate-300 rounded-full"></div>
                          <div className="flex-1 bg-white border border-slate-200/40 rounded p-1.5 flex gap-2">
                            <div className="w-4 h-full bg-blue-100 rounded-sm"></div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1 bg-slate-200 rounded-full w-full"></div>
                              <div className="h-1 bg-slate-100 rounded-full w-2/3"></div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Choix Mode Sombre */}
                      <button
                        onClick={() => setTheme('dark')}
                        className={`text-left p-4 rounded-xl border transition-all flex flex-col justify-between aspect-[3/2] ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-blue-950/10 ring-2 ring-blue-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">Sombre / Nuit</span>
                          <div className={`p-1.5 rounded-full ${theme === 'dark' ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                            <Moon size={14} />
                          </div>
                        </div>
                        
                        {/* Mini aperçu symbolisant le mode sombre */}
                        <div className="w-full h-16 bg-slate-950 rounded-lg border border-slate-800 p-2 flex flex-col gap-1.5 opacity-80">
                          <div className="h-2 w-1/3 bg-slate-800 rounded-full"></div>
                          <div className="flex-1 bg-slate-900 border border-slate-800 rounded p-1.5 flex gap-2">
                            <div className="w-4 h-full bg-indigo-950/40 rounded-sm border border-slate-800"></div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1 bg-slate-800 rounded-full w-full"></div>
                              <div className="h-1 bg-slate-900 rounded-full w-2/3"></div>
                            </div>
                          </div>
                        </div>
                      </button>

                    </div>
                  </div>
                </div>
              )}

              {/* SECTION LICENCE : Enregistrement du produit et restrictions */}
              {activeTab === 'licence' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Licence d'Utilisation</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Consultez les droits actifs sur ce poste de travail et saisissez vos clés d'activation.</p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Fiche d'état de la licence */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${licenseStatus?.active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                          <ShieldCheck size={28} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {licenseStatus?.active 
                              ? (licenseStatus.plan === 'PLUS' ? 'Schoolab Plus (Multi-Postes)' : 'Schoolab Pro (Monoposte)') 
                              : 'Version Gratuite / Démo'}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {licenseStatus?.active 
                              ? `Abonnement actif jusqu'au ${new Date(licenseStatus.expiresAt).toLocaleDateString('fr-FR')}`
                              : 'Aucune licence détectée. Activez une clé pour débloquer les limites.'}
                          </p>
                          {licenseStatus?.active && (
                            <div className="flex gap-4 mt-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                              <span>Clé : {licenseStatus.key?.substring(0, 8)}...</span>
                              <span>•</span>
                              <span>Restant : {licenseStatus.daysRemaining} jour(s)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {licenseStatus?.active && (
                        <button
                          onClick={async () => {
                            setLoading(true);
                            await refreshRemoteLicense();
                            setLoading(false);
                            toast.success('Licence actualisée depuis le serveur.');
                          }}
                          disabled={loading}
                          className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                        >
                          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                          Actualiser
                        </button>
                      )}
                    </div>

                    {/* Saisie de Clé de Licence si non actif */}
                    {(!licenseStatus?.active || licenseStatus?.isTrial) && (
                      <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enregistrer une clé produit</h4>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">Veuillez renseigner le code d'enregistrement reçu lors de votre achat.</p>
                        </div>
                        
                        <form onSubmit={handleActivate} className="space-y-4">
                          <div className="relative">
                            <input
                              type="text"
                              value={licenseKey}
                              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all uppercase font-mono font-bold text-lg tracking-wider text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-800"
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                            />
                            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-300 dark:text-slate-700">
                              <Key size={20} />
                            </div>
                          </div>

                          {showPasswordPrompt && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Mot de passe de protection administrateur</label>
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-white"
                                placeholder="Définir un mot de passe"
                              />
                            </div>
                          )}

                          {activationError && (
                            <div className="p-3.5 bg-red-500/5 border border-red-500/20 rounded-lg flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold">
                              <ShieldAlert size={16} />
                              {activationError}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={loading || !licenseKey}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                          >
                            {loading ? 'Validation en cours...' : 'Activer Schoolab Premium'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Bloc ID Unique de l'Ordinateur (HWID) */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/30 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <User size={14} className="text-slate-400" />
                          <span>Identifiant Matériel du Poste (HWID)</span>
                        </div>
                        <button
                          onClick={handleCopyHWID}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {copied ? (
                            <>
                              <Check size={12} className="text-emerald-500" />
                              <span className="text-emerald-500">Copié !</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copier l'identifiant</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 font-mono text-[11px] text-slate-600 dark:text-slate-400 break-all select-all">
                        {hwid || 'Génération de l\'identifiant matériel unique...'}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                        Fournissez cet identifiant machine unique à votre administrateur pour générer une clé produit spécifiquement valide pour cet ordinateur.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* SECTION CLOUD : Synchronisation cloud et résilience des données */}
              {activeTab === 'cloud' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Sauvegarde & Synchronisation Cloud</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Conservez vos données à l'abri ou synchronisez vos différents postes en temps réel.</p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Statut actuel de la liaison Cloud */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${cloudSchoolId ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <RefreshCw size={24} className={!cloudSchoolId ? 'animate-spin-slow' : ''} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {cloudSchoolId ? 'Base de Données Liée au Cloud' : 'En Attente de Configuration'}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                            {cloudSchoolId 
                              ? `ID Cloud : ${cloudSchoolId}` 
                              : 'Veuillez activer une licence compatible PLUS pour configurer la synchronisation.'}
                          </p>
                          {lastSync && (
                            <span className="inline-block text-[10px] text-slate-400 mt-1">
                              Dernière synchronisation : {new Date(lastSync).toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contrôles interactifs si Plan PLUS */}
                    {licenseStatus?.plan === 'PLUS' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Push local -> serveur */}
                          <button
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await syncPush();
                                if (res.success) {
                                  toast.success(res.summary || 'Envoyé au Cloud avec succès');
                                  loadSettings();
                                } else {
                                  toast.error('Échec : ' + res.error);
                                }
                              } catch (e) {
                                toast.error('Erreur technique');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading || !cloudSchoolId}
                            className="flex items-center justify-between p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-600 rounded-lg transition-all group text-left"
                          >
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mettre à jour le Cloud</span>
                              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Envoyer au Cloud</div>
                            </div>
                            <RefreshCw size={20} className={`text-blue-500 group-hover:rotate-180 transition-all duration-500 ${loading ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Pull serveur -> local */}
                          <button
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await syncPull();
                                if (res.success) {
                                  toast.success(res.summary || 'Données importées avec succès');
                                  loadSettings();
                                } else {
                                  toast.error('Échec : ' + res.error);
                                }
                              } catch (e) {
                                toast.error('Erreur technique');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading || !cloudSchoolId}
                            className="flex items-center justify-between p-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all text-left shadow-sm"
                          >
                            <div>
                              <span className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Importer les dernières saisies</span>
                              <div className="text-sm font-bold mt-0.5">Recevoir du Cloud</div>
                            </div>
                            <Download size={20} className="text-white" />
                          </button>
                        </div>

                        {/* Section de Dépannage forcé */}
                        <div className="p-5 border border-amber-200 dark:border-amber-900/50 bg-amber-500/5 rounded-lg space-y-3">
                          <div>
                            <h5 className="text-sm font-bold text-amber-800 dark:text-amber-400">Forcer une resynchronisation complète</h5>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                              Utilisez cette option si vous avez réinitialisé votre base de données distante, ou s'il y a des incohérences de relations sur vos postes.
                            </p>
                          </div>
                          
                          <button
                            onClick={async () => {
                              const confirmed = await toast.confirm({
                                title: 'Réinitialiser & Renvoyer ?',
                                message: 'Cette action réinitialisera l\'état local de vos données et les renverra en intégralité au serveur.',
                                confirmLabel: 'Renvoyer les données',
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
                                  toast.success("État local réinitialisé. Envoi des données...");
                                  
                                  const res = await syncPush();
                                  if (res.success) {
                                    toast.success(res.summary || 'Données renvoyées avec succès !');
                                    loadSettings();
                                  } else {
                                    toast.error('Échec de l\'envoi : ' + res.error);
                                  }
                                } catch (e) {
                                  toast.error('Erreur technique lors du forçage');
                                  console.error(e);
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            disabled={loading || !cloudSchoolId}
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all"
                          >
                            Réinitialiser & Renvoyer
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Invitation de mise à niveau */
                      <div className="p-6 bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
                        <div className="flex items-start gap-3">
                          <Sparkles size={18} className="text-amber-500 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Activez Schoolab Plus</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mt-0.5">
                              Le forfait Plus vous permet de faire travailler simultanément plusieurs enseignants, gestionnaires ou encodeurs sur des ordinateurs séparés avec une fusion et synchronisation bidirectionnelle intelligente de toutes vos saisies.
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                        >
                          En savoir plus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION À PROPOS : Support technique et assistance */}
              {activeTab === 'about' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">À Propos de Schoolab</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">Informations relatives à votre version installée et contacts d'assistance technique.</p>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Présentation du produit */}
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200 dark:border-slate-800 p-5">
                      <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
                        <School size={32} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Schoolab Pro</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Logiciel moderne et performant de gestion académique</p>
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 bg-slate-200 dark:bg-slate-800 text-[10px] font-bold rounded-full">
                          Version {pkg.version}
                        </span>
                      </div>
                    </div>

                    {/* Liste des fonctionnalités supportées */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fonctionnalités Incluses</h4>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
                        <li className="flex items-center gap-2">• Saisie et calcul automatisé des examens</li>
                        <li className="flex items-center gap-2">• Génération et impression des palmarès scolaires</li>
                        <li className="flex items-center gap-2">• Gestion intelligente des repêchages</li>
                        <li className="flex items-center gap-2">• Suivi et comportement (Conduite) des élèves</li>
                        <li className="flex items-center gap-2">• Sauvegardes automatisées en base de données</li>
                        <li className="flex items-center gap-2">• Synchronisation Cloud sécurisée (Plan Plus)</li>
                      </ul>
                    </div>

                    {/* Contacts du Support Client */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Support technique & Assistance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Mail support */}
                        <a
                          href="mailto:NartrixSoft@gmail.com"
                          className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors group"
                        >
                          <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Mail size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-400 uppercase">Par Courriel</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">NartrixSoft@gmail.com</div>
                          </div>
                        </a>

                        {/* WhatsApp support */}
                        <a
                          href="https://wa.me/243903582030"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors group"
                        >
                          <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-all">
                            <Phone size={16} />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-400 uppercase">Par WhatsApp</div>
                            <div className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5">+243 903 582 030</div>
                          </div>
                        </a>

                      </div>
                    </div>

                    {/* Bloc Informations Légales */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                      <span>© 2026 NartrixSoft - Tous droits réservés</span>
                      <span>Licence individuelle concédée à l'établissement</span>
                    </div>

                    {/* Outils de développement discrets */}
                    <div className="text-center pt-2">
                      <button
                        onClick={async () => {
                          const confirmed = await toast.confirm({
                            title: 'Mode Développeur',
                            message: 'Voulez-vous peupler la base de données locale avec des données de simulation de test ?',
                            confirmLabel: 'Générer',
                            cancelLabel: 'Annuler',
                            variant: 'warning'
                          });

                          if (confirmed) {
                            setLoading(true);
                            try {
                              await seedingService.seedDatabase();
                              toast.success("Base de données alimentée avec succès !");
                            } catch (e) {
                              toast.error("Échec de l'alimentation");
                              console.error(e);
                            } finally {
                              setLoading(false);
                            }
                          }
                        }}
                        disabled={loading}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {loading ? "Génération des données de simulation..." : "Données de simulation (Dev)"}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Fenêtre modale de mise à niveau */}
              <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                featureName="la synchronisation cloud"
              />

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
