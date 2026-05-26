import React, { useState, useEffect } from 'react';
// Import du contexte de thème global (Clair/Sombre)
import { useTheme } from '../context/ThemeContext';
// Import du service de gestion des configurations locales (SQLite sous Tauri)
import { settingsService } from '../services/settingsService';
// Import du contexte de gestion des licences
import { useLicense } from '../context/LicenseContext';
// Sélection d'icônes modernes et adaptées pour une interface desktop professionnelle
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
  Phone,
  Upload,
  Lock,
  Unlock,
  AlertTriangle,
  Layers,
  MapPin,
  Clipboard,
  Printer,
  RotateCcw
} from '../components/iconsSvg';
// Import du service de notifications éphémères (toasts)
import { useToast } from '../context/ToastContext';
// Services utilitaires pour l'initialisation de test, les licences et la synchronisation
import { seedingService } from '../services/seedingService';
import { licenseService } from '../services/licenseService';
import { syncService } from '../services/syncService';
import { dbService } from '../services/databaseService';
// Chargement du fichier package.json pour afficher la version exacte de l'application
import pkg from "../../../package.json";
// Fenêtre modale invitant l'utilisateur à passer au forfait supérieur (Schoolab Plus)
import UpgradeModal from '../components/common/UpgradeModal';

export default function SettingsPage() {
  // Récupération de l'état du thème système
  const { theme, setTheme } = useTheme();
  
  // Navigation par onglets (style macOS/iPadOS Preferences)
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'impression' | 'licence' | 'cloud' | 'about'>('general');
  
  // États locaux stockant les informations d'identité de l'établissement scolaire
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');

  // États locaux pour les paramètres d'impression personnalisés
  const [couponTitleSize, setCouponTitleSize] = useState('14');
  const [couponBodySize, setCouponBodySize] = useState('10');
  const [couponLineHeight, setCouponLineHeight] = useState('1.2');

  const [palmaresTitleSize, setPalmaresTitleSize] = useState('15');
  const [palmaresBodySize, setPalmaresBodySize] = useState('10');
  const [palmaresLineHeight, setPalmaresLineHeight] = useState('1.2');

  const [bulletinTitleSize, setBulletinTitleSize] = useState('16');
  const [bulletinBodySize, setBulletinBodySize] = useState('10');
  const [bulletinLineHeight, setBulletinLineHeight] = useState('1.3');
  
  // États de chargement et d'interactions utilisateur
  const [loading, setLoading] = useState(false);
  const [savingSchool, setSavingSchool] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Gestion de l'activation des clés de licence
  const [licenseKey, setLicenseKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [activationType, setActivationType] = useState<'ACTIVATE' | 'REGISTER'>('ACTIVATE');
  const [activationError, setActivationError] = useState('');
  
  // Consommation du LicenseContext (statut global, rafraîchissement et synchronisation cloud)
  const { license: licenseStatus, refreshLicense, refreshRemoteLicense, syncPull, syncPush } = useLicense();
  
  // Identifiant matériel unique (HWID) et infos de synchronisation cloud
  const [hwid, setHwid] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cloudSchoolId, setCloudSchoolId] = useState<string | null>(null);
  
  // Gestionnaire de toasts pour afficher de jolies alertes non intrusives
  const toast = useToast();
  
  // Contrôle de l'affichage de la boîte de dialogue premium Schoolab Plus
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Au chargement initial, on récupère les données de configuration depuis SQLite
  useEffect(() => {
    loadSettings();
  }, []);

  // Détermine s'il faut afficher le formulaire d'enregistrement de licence
  useEffect(() => {
    if (!licenseStatus?.active) {
      setShowLicenseForm(true);
    }
  }, [licenseStatus]);

  /**
   * Charge les paramètres depuis le service de base de données locale (SQLite sous Tauri)
   */
  const loadSettings = async () => {
    try {
      const name = await settingsService.get('school_name');
      const city = await settingsService.get('school_city');
      const pobox = await settingsService.get('school_pobox');
      
      if (name) setSchoolName(name);
      if (city) setSchoolCity(city);
      if (pobox) setSchoolPoBox(pobox);

      // Récupération et application des tailles d'impression enregistrées
      const cTitle = await settingsService.get('coupon_font_size_title') || '14';
      const cBody = await settingsService.get('coupon_font_size_body') || '10';
      const cHeight = await settingsService.get('coupon_line_height') || '1.2';
      setCouponTitleSize(cTitle);
      setCouponBodySize(cBody);
      setCouponLineHeight(cHeight);

      const pTitle = await settingsService.get('palmares_font_size_title') || '15';
      const pBody = await settingsService.get('palmares_font_size_body') || '10';
      const pHeight = await settingsService.get('palmares_line_height') || '1.2';
      setPalmaresTitleSize(pTitle);
      setPalmaresBodySize(pBody);
      setPalmaresLineHeight(pHeight);

      const bTitle = await settingsService.get('bulletin_font_size_title') || '16';
      const bBody = await settingsService.get('bulletin_font_size_body') || '10';
      const bHeight = await settingsService.get('bulletin_line_height') || '1.3';
      setBulletinTitleSize(bTitle);
      setBulletinBodySize(bBody);
      setBulletinLineHeight(bHeight);

      // Récupère l'horodatage de la dernière sauvegarde réussie et l'identifiant Cloud de l'établissement
      const lastSyncTime = await settingsService.get('last_sync_time');
      const sId = await settingsService.get('school_id');
      setLastSync(lastSyncTime);
      setCloudSchoolId(sId);

      // Récupération de l'identifiant machine unique (HWID)
      const id = await licenseService.getHWID();
      setHwid(id);
    } catch (e) {
      console.error("Impossible de charger les paramètres ou le HWID :", e);
    }
  };

  /**
   * Sauvegarde les informations d'identité de l'établissement modifiées par l'utilisateur
   */
  const handleSaveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolCity.trim()) {
      toast.warning('Le nom de l\'école et la ville sont obligatoires.');
      return;
    }

    setSavingSchool(true);
    try {
      // Écriture persistante des paramètres locaux dans la table SQLite
      await settingsService.set('school_name', schoolName.trim());
      await settingsService.set('school_city', schoolCity.trim());
      await settingsService.set('school_pobox', schoolPoBox.trim());
      
      toast.success('Fiche d\'identité mise à jour avec succès !');
      
      // On déclenche un événement système global pour forcer les autres vues (comme les bulletins) à se rafraîchir
      try {
        window.dispatchEvent(new CustomEvent('db:changed', { detail: {} }));
      } catch (e) {}
    } catch (error) {
      console.error("Échec de la sauvegarde des informations scolaires :", error);
      toast.error('Erreur technique lors de la sauvegarde.');
    } finally {
      setSavingSchool(false);
    }
  };

  /**
   * Copie l'identifiant matériel de la machine dans le presse-papiers pour l'envoyer au support
   */
  const handleCopyHWID = () => {
    if (!hwid) return;
    navigator.clipboard.writeText(hwid);
    setCopied(true);
    toast.success('ID Machine copié dans le presse-papiers !');
    setTimeout(() => setCopied(false), 2505);
  };

  /**
   * Traite l'envoi de la clé de licence pour l'activation locale / en ligne
   */
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey) return;

    if (showPasswordPrompt && !password) {
      toast.error('Le mot de passe administrateur est requis.');
      return;
    }

    setLoading(true);
    setActivationError('');
    try {
      const result = await licenseService.activate(licenseKey, password);
      if (result.success) {
        // Rafraîchit les droits de licence de l'application
        await refreshLicense();
        // Recharge les configurations (puisqu'elles ont pu être réinitialisées/chargées du cloud)
        await loadSettings();
        toast.success('Licence Schoolab activée avec succès !');
        setLicenseKey('');
        setPassword('');
        setShowPasswordPrompt(false);
        setShowLicenseForm(false);
      } else {
        const errorMsg = result.error || 'Erreur inconnue';

        // Scénarios d'erreurs de protection de clé (mot de passe requis)
        if (errorMsg === 'PASSWORD_REQUIRED') {
          setActivationError('Cette clé de licence est cryptée et sécurisée. Saisissez le mot de passe administrateur associé.');
          setShowPasswordPrompt(true);
          setActivationType('ACTIVATE');
        } else if (errorMsg === 'PASSWORD_REQUIRED_FOR_SETUP') {
          setActivationError('Nouvel enregistrement : définissez un mot de passe administrateur robuste pour sécuriser cette licence.');
          setShowPasswordPrompt(true);
          setActivationType('REGISTER');
        } else if (errorMsg.includes('Invalid license key')) {
          setActivationError('Cette clé de licence n\'existe pas ou a été saisie de manière incorrecte.');
          setShowPasswordPrompt(false);
        } else if (errorMsg.includes('Incorrect password')) {
          setActivationError('Le mot de passe administrateur fourni est incorrect.');
        } else {
          setActivationError(`Échec de validation : ${errorMsg}`);
        }
        toast.error('Échec de l\'activation');
      }
    } catch (err: any) {
      setActivationError('Le serveur de licence est injoignable ou une erreur technique est survenue.');
      toast.error('Erreur de communication serveur');
    } finally {
      setLoading(false);
    }
  };

  // Configuration des onglets avec libellés, icônes et descriptions
  const tabs = [
    { id: 'general' as const, label: 'Établissement', icon: Building2, description: 'Identité locale de l\'école' },
    { id: 'appearance' as const, label: 'Thème', icon: Sun, description: 'Affichage clair ou sombre' },
    { id: 'impression' as const, label: 'Impression', icon: Printer, description: 'Polices et interlignes' },
    { id: 'licence' as const, label: 'Licence & Droits', icon: ShieldCheck, description: 'Statut du poste de travail' },
    { id: 'cloud' as const, label: 'Cloud & Synchro', icon: RefreshCw, description: 'Sauvegardes collaboratives' },
    { id: 'about' as const, label: 'À propos', icon: Info, description: 'Version et support technique' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-colors duration-300">
      
      {/* 
        En-tête principal : Style barre de titre desktop épurée
        Affiche un en-tête sobre avec effet de flou pour s'intégrer harmonieusement
      */}
      <div className="bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800/80 px-8 py-6 sticky top-0 z-30 shadow-sm backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100/50 dark:border-blue-800/20 shadow-sm">
              <Settings size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Préférences Système</h1>
              <p className="text-slate-505 dark:text-slate-400 text-xs mt-0.5">Personnalisez votre espace de travail et gérez vos données académiques</p>
            </div>
          </div>
          
          {/* Badge indiquant le plan ou forfait Premium actuellement actif */}
          {licenseStatus?.active && (
            <span className="relative flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500/10 dark:to-indigo-500/10 text-white dark:text-blue-400 border border-blue-500/20 rounded-full text-xs font-bold tracking-wide shadow-sm shadow-blue-500/10 dark:shadow-none">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              {licenseStatus.plan === 'PLUS' ? 'Schoolab Plus (Réseau Cloud)' : 'Schoolab Pro (Monoposte)'}
            </span>
          )}
        </div>
      </div>

      {/* Structure Principale en Grille Desktop à Deux Colonnes */}
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Colonne Gauche : Navigation latérale fixe de type macOS Preferences Panel */}
          <div className="w-full lg:w-72 flex-shrink-0 lg:sticky lg:top-6 lg:self-start">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-3 shadow-sm space-y-1.5">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-left transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {/* Icône du bouton avec coloration active dynamique */}
                    <div className={`p-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-white/10 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-white dark:group-hover:bg-slate-900'
                    }`}>
                      <tab.icon size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-semibold tracking-wide">{tab.label}</div>
                      <div className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Colonne Droite : Panneau de contenu principal dynamique */}
          <div className="flex-1 w-full">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md overflow-hidden min-h-[500px]">

              {/* 
                ==========================================================
                SECTION 1 : ÉTABLISSEMENT (Fiche d'identité formelle modifiable)
                ==========================================================
              */}
              {activeTab === 'general' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Titre et préambule */}
                  <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                      Fiche d'Identité de l'Établissement
                    </h2>
                    <p className="text-slate-555 dark:text-slate-400 text-xs mt-1">
                      Configurez les données officielles de l'école. Ces informations figureront sur l'en-tête de vos bulletins, palmarès scolaires et documents d'impression.
                    </p>
                  </div>
                  
                  {/* Formulaire d'édition interactive */}
                  <div className="p-6 md:p-8">
                    <form onSubmit={handleSaveSchoolInfo} className="space-y-6">
                      
                      {/* Notice sur l'origine des données */}
                      <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-3">
                        <Info size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">Personnalisation des En-têtes :</span> Les valeurs ci-dessous sont enregistrées localement dans votre base de données. Vous pouvez corriger une coquille ou rajouter votre code postal pour ajuster précisément le format d'impression de vos documents.
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Champ : Nom officiel de l'école */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <School size={12} /> Nom de l'Établissement <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={schoolName}
                              onChange={(e) => setSchoolName(e.target.value)}
                              className="w-full pl-3.5 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                              placeholder="Ex: Institut Scientifique Mosala"
                            />
                            {licenseStatus?.active && (
                              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" title="Renseigné via la licence">
                                <Lock size={13} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Champ : Ville */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <MapPin size={12} /> Ville de Résidence <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={schoolCity}
                            onChange={(e) => setSchoolCity(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                            placeholder="Ex: Kinshasa / Gombe"
                          />
                        </div>

                        {/* Champ : Boîte Postale */}
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <Clipboard size={12} /> Boîte Postale (B.P.)
                          </label>
                          <input
                            type="text"
                            value={schoolPoBox}
                            onChange={(e) => setSchoolPoBox(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                            placeholder="Ex: B.P. 1045 Kinshasa I"
                          />
                        </div>
                      </div>

                      {/* Bouton de soumission élégant positionné à droite */}
                      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="submit"
                          disabled={savingSchool}
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-500/10"
                        >
                          {savingSchool ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          Sauvegarder la Fiche
                        </button>
                      </div>

                    </form>
                  </div>
                </div>
              )}

              {/* 
                ==========================================================
                SECTION 2 : THÈME (Personnalisation graphique haut de gamme)
                ==========================================================
              */}
              {activeTab === 'appearance' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
                  <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sun size={20} className="text-amber-500" />
                      Apparence de l'Espace de Travail
                    </h2>
                    <p className="text-slate-555 dark:text-slate-400 text-xs mt-1">
                      Configurez l'affichage visuel global pour l'adapter au confort de votre écran et à la lumière ambiante.
                    </p>
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Carte sélective : Thème Clair */}
                      <button
                        onClick={() => setTheme('light')}
                        className={`text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between aspect-[16/10] hover:scale-[1.01] hover:shadow-md ${
                          theme === 'light'
                            ? 'border-blue-600 bg-blue-50/10 dark:bg-blue-900/10 ring-2 ring-blue-500/15 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white block">Thème Lumineux / Jour</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">Recommandé pour un usage de jour</span>
                          </div>
                          <div className={`p-2 rounded-xl transition-all ${
                            theme === 'light' 
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <Sun size={15} />
                          </div>
                        </div>
                        
                        {/* Mini-maquette stylisée simulant l'affichage clair */}
                        <div className="w-full h-24 bg-slate-100 rounded-xl border border-slate-200/50 p-2.5 flex flex-col gap-2 mt-4 opacity-90 transition-opacity">
                          <div className="h-2.5 w-1/3 bg-slate-300 rounded-full"></div>
                          <div className="flex-1 bg-white border border-slate-200/40 rounded-lg p-2 flex gap-2">
                            <div className="w-5 h-full bg-blue-100 rounded-md"></div>
                            <div className="flex-1 space-y-1.5">
                              <div className="h-1.5 bg-slate-200 rounded-full w-full"></div>
                              <div className="h-1.5 bg-slate-100 rounded-full w-2/3"></div>
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Carte sélective : Thème Sombre */}
                      <button
                        onClick={() => setTheme('dark')}
                        className={`text-left p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between aspect-[16/10] hover:scale-[1.01] hover:shadow-md ${
                          theme === 'dark'
                            ? 'border-blue-500 bg-blue-950/15 ring-2 ring-blue-500/15 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/20'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div>
                            <span className="text-sm font-bold text-slate-900 dark:text-white block">Thème Obscur / Nuit</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">Idéal pour reposer les yeux</span>
                          </div>
                          <div className={`p-2 rounded-xl transition-all ${
                            theme === 'dark' 
                              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            <Moon size={15} />
                          </div>
                        </div>
                        
                        {/* Mini-maquette stylisée simulant l'affichage sombre */}
                        <div className="w-full h-24 bg-slate-950 rounded-xl border border-slate-800 p-2.5 flex flex-col gap-2 mt-4 opacity-90 transition-opacity">
                          <div className="h-2.5 w-1/3 bg-slate-800 rounded-full"></div>
                          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2 flex gap-2">
                            <div className="w-5 h-full bg-blue-950/50 border border-blue-900/30 rounded-md"></div>
                            <div className="flex-1 space-y-1.5">
                              <div className="h-1.5 bg-slate-800 rounded-full w-full"></div>
                              <div className="h-1.5 bg-slate-900 rounded-full w-2/3"></div>
                            </div>
                          </div>
                        </div>
                      </button>

                    </div>
                  </div>
                </div>
              )}

              {/* 
                ==========================================================
                SECTION 3 : CONFIGURATION DES POLICES & IMPRESSION
                ==========================================================
              */}
              {activeTab === 'impression' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 animate-fade-in">
                  <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Printer size={20} className="text-blue-600 dark:text-blue-400" />
                      Mise en Page & Impression
                    </h2>
                    <p className="text-slate-555 dark:text-slate-400 text-xs mt-1">
                      Ajustez finement les tailles de police (titres, corps) et les interlignes de vos coupons, palmarès et bulletins pour qu'ils s'adaptent parfaitement à vos supports d'impression.
                    </p>
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-8">
                    
                    {/* Explications et conseils d'impression */}
                    <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-start gap-3">
                      <Info size={18} className="text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Conseil d'ajustement :</span> Si vous constatez qu'un document (par exemple un bulletin) déborde sur une page blanche supplémentaire, réduisez légèrement l'interligne ou la taille des textes ci-dessous. Le rendu s'ajustera instantanément à vos sorties physiques.
                      </div>
                    </div>

                    <div className="space-y-6">
                      
                      {/* Configuration Coupons de Notes */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Clipboard size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Coupons de notes élèves</h3>
                            <p className="text-slate-400 text-[10px]">Polices et hauteur de ligne des fiches de cotes semestrielles</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Taille Titres</span>
                              <span className="text-blue-600 font-bold">{couponTitleSize} px</span>
                            </div>
                            <input
                              type="range"
                              min="8"
                              max="24"
                              step="0.5"
                              value={couponTitleSize}
                              onChange={(e) => setCouponTitleSize(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Taille Textes</span>
                              <span className="text-blue-600 font-bold">{couponBodySize} px</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="16"
                              step="0.5"
                              value={couponBodySize}
                              onChange={(e) => setCouponBodySize(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Interligne (Hauteur)</span>
                              <span className="text-blue-600 font-bold">{couponLineHeight}</span>
                            </div>
                            <input
                              type="range"
                              min="0.7"
                              max="2.0"
                              step="0.05"
                              value={couponLineHeight}
                              onChange={(e) => setCouponLineHeight(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>
                        </div>

                        {/* Preview Coupon */}
                        <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-950 p-4 relative overflow-hidden">
                          <span className="absolute top-2 right-2.5 text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Aperçu Coupon</span>
                          <div className="space-y-2 border-2 border-black p-2 font-serif text-black dark:text-white max-w-sm">
                            <div className="uppercase font-bold tracking-tight text-center border-b border-black" style={{ fontSize: `${couponTitleSize}px`, lineHeight: couponLineHeight }}>
                              COUPON ÉLÈVE : MBALA KADI
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-left" style={{ fontSize: `${couponBodySize}px`, lineHeight: couponLineHeight }}>
                              <p>Mathématiques : 18/20</p>
                              <p>Français : 14/20</p>
                              <p>Science : 16/20</p>
                              <p>Histoire : 12/20</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Configuration Palmarès de classe */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <Layers size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Palmarès de classe</h3>
                            <p className="text-slate-400 text-[10px]">Polices et interlignes des tableaux de synthèse récapitulative</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Taille Titres</span>
                              <span className="text-indigo-600 font-bold">{palmaresTitleSize} px</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="26"
                              step="0.5"
                              value={palmaresTitleSize}
                              onChange={(e) => setPalmaresTitleSize(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Taille Textes</span>
                              <span className="text-indigo-600 font-bold">{palmaresBodySize} px</span>
                            </div>
                            <input
                              type="range"
                              min="6"
                              max="18"
                              step="0.5"
                              value={palmaresBodySize}
                              onChange={(e) => setPalmaresBodySize(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Interligne (Hauteur)</span>
                              <span className="text-indigo-600 font-bold">{palmaresLineHeight}</span>
                            </div>
                            <input
                              type="range"
                              min="0.7"
                              max="2.0"
                              step="0.05"
                              value={palmaresLineHeight}
                              onChange={(e) => setPalmaresLineHeight(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Preview Palmarès */}
                        <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-950 p-4 relative overflow-hidden">
                          <span className="absolute top-2 right-2.5 text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Aperçu Palmarès</span>
                          <div className="space-y-2 text-black dark:text-white max-w-sm">
                            <div className="font-black text-center" style={{ fontSize: `${palmaresTitleSize}px`, lineHeight: palmaresLineHeight }}>
                              PALMARÈS DE LA CLASSE DE 1ère A
                            </div>
                            <table className="w-full border-2 border-black border-collapse text-[10px]" style={{ fontSize: `${palmaresBodySize}px`, lineHeight: palmaresLineHeight }}>
                              <thead>
                                <tr className="bg-slate-100 border border-black font-bold">
                                  <th className="border border-black p-1">Nom</th>
                                  <th className="border border-black p-1">%</th>
                                  <th className="border border-black p-1">Conduite</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-black p-1">KALONJI MBIKAY</td>
                                  <td className="border border-black p-1 text-center">82.5%</td>
                                  <td className="border border-black p-1 text-center">Excellente</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Configuration Bulletins Scolaires */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-6">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <School size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bulletins scolaires</h3>
                            <p className="text-slate-400 text-[10px]">Polices et interlignes des bulletins officiels trimestriels et annuels</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Taille Titres</span>
                              <span className="text-emerald-600 font-bold">{bulletinTitleSize} px</span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="26"
                              step="0.5"
                              value={bulletinTitleSize}
                              onChange={(e) => setBulletinTitleSize(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Taille Textes</span>
                              <span className="text-emerald-600 font-bold">{bulletinBodySize} px</span>
                            </div>
                            <input
                              type="range"
                              min="6"
                              max="18"
                              step="0.5"
                              value={bulletinBodySize}
                              onChange={(e) => setBulletinBodySize(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                              <span>Interligne (Hauteur)</span>
                              <span className="text-emerald-600 font-bold">{bulletinLineHeight}</span>
                            </div>
                            <input
                              type="range"
                              min="0.7"
                              max="2.5"
                              step="0.05"
                              value={bulletinLineHeight}
                              onChange={(e) => setBulletinLineHeight(e.target.value)}
                              className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                            />
                          </div>
                        </div>

                        {/* Preview Bulletin */}
                        <div className="border border-slate-200 dark:border-slate-800/80 rounded-xl bg-white dark:bg-slate-950 p-4 relative overflow-hidden">
                          <span className="absolute top-2 right-2.5 text-[9px] uppercase font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Aperçu Bulletin</span>
                          <div className="space-y-2 font-serif text-black dark:text-white max-w-sm">
                            <div className="font-bold text-center border border-black p-1" style={{ fontSize: `${bulletinTitleSize}px`, lineHeight: bulletinLineHeight }}>
                              BULLETIN D'ÉVALUATION DE L'ÉDUCATION DE BASE
                            </div>
                            <p className="text-center" style={{ fontSize: `${bulletinBodySize}px`, lineHeight: bulletinLineHeight }}>
                              Élève : TOKO MANZO | Sexe : M | Province : KINSHASA
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Boutons de sauvegarde et restauration */}
                      <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                        {/* Bouton pour remettre toutes les valeurs à zéro (défauts d'usine) */}
                        <button
                          onClick={() => {
                            // Valeurs par défaut d'origine pour chaque document
                            setCouponTitleSize('14');
                            setCouponBodySize('10');
                            setCouponLineHeight('1.2');
                            setPalmaresTitleSize('15');
                            setPalmaresBodySize('10');
                            setPalmaresLineHeight('1.2');
                            setBulletinTitleSize('16');
                            setBulletinBodySize('10');
                            setBulletinLineHeight('1.3');
                            toast.success('Valeurs par défaut restaurées. Cliquez sur "Enregistrer" pour appliquer.');
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold transition-all"
                        >
                          <RotateCcw size={14} />
                          Restaurer les valeurs par défaut
                        </button>

                        {/* Bouton de sauvegarde global */}
                        <button
                          onClick={async () => {
                            setLoading(true);
                            try {
                              // Enregistrement des configurations dans SQLite
                              await settingsService.set('coupon_font_size_title', couponTitleSize);
                              await settingsService.set('coupon_font_size_body', couponBodySize);
                              await settingsService.set('coupon_line_height', couponLineHeight);

                              await settingsService.set('palmares_font_size_title', palmaresTitleSize);
                              await settingsService.set('palmares_font_size_body', palmaresBodySize);
                              await settingsService.set('palmares_line_height', palmaresLineHeight);

                              await settingsService.set('bulletin_font_size_title', bulletinTitleSize);
                              await settingsService.set('bulletin_font_size_body', bulletinBodySize);
                              await settingsService.set('bulletin_line_height', bulletinLineHeight);

                              toast.success('Réglages d\'impression enregistrés avec succès !');
                            } catch (e) {
                              toast.error('Erreur technique lors de la sauvegarde des réglages.');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading}
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-500/10"
                        >
                          <Check size={14} />
                          Enregistrer les réglages
                        </button>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* 
                ==========================================================
                SECTION 4 : LICENCE & DROITS (Enregistrement et sécurité)
                ==========================================================
              */}
              {activeTab === 'licence' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck size={20} className="text-emerald-500" />
                      Gestion de la Licence Client
                    </h2>
                    <p className="text-slate-505 dark:text-slate-400 text-xs mt-1">
                      Assurez-vous que votre poste de travail est enregistré. Les licences garantissent la maintenance logicielle et activent les modules réseau.
                    </p>
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-8">
                    
                    {/* État actuel de la licence représenté sous forme de widget premium */}
                    <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all ${
                      licenseStatus?.active
                        ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/5 border-emerald-500/20'
                        : 'bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5 border-amber-500/20'
                    }`}>
                      <div className="flex items-start gap-4">
                        <div className={`p-3.5 rounded-xl border shadow-sm ${
                          licenseStatus?.active 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10'
                        }`}>
                          {licenseStatus?.active ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                            {licenseStatus?.active 
                              ? (licenseStatus.plan === 'PLUS' ? 'Schoolab Premium Plus' : 'Schoolab Premium Pro') 
                              : 'Version Gratuite / Évaluation'}
                          </h3>
                          <p className="text-slate-555 dark:text-slate-400 text-xs mt-1 leading-normal">
                            {licenseStatus?.active 
                              ? `Enregistrement valide. Expiration le ${new Date(licenseStatus.expiresAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}.`
                              : 'Aucune clé d\'activation détectée sur ce poste. Accès en lecture seule aux modules Cloud.'}
                          </p>
                          
                          {/* Barre de progression des jours restants de licence */}
                          {licenseStatus?.active && licenseStatus.daysRemaining !== undefined && (
                            <div className="mt-3.5 space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                <span>Durée de validité</span>
                                <span>{licenseStatus.daysRemaining} Jour(s) Restant(s)</span>
                              </div>
                              <div className="w-64 h-2 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all rounded-full"
                                  style={{ width: `${Math.min(100, (licenseStatus.daysRemaining / 365) * 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions associées à la licence active */}
                      {licenseStatus?.active && (
                        <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
                          <button
                            onClick={async () => {
                              setLoading(true);
                              try {
                                await refreshRemoteLicense();
                                toast.success('Synchronisation de la licence réussie !');
                              } catch (e) {
                                toast.error('Erreur technique lors de la resynchronisation.');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
                          >
                            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                            Resynchroniser
                          </button>
                          <button
                            onClick={() => setShowLicenseForm(!showLicenseForm)}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all"
                          >
                            <Key size={13} />
                            {showLicenseForm ? 'Masquer Clé' : 'Changer Clé'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Formulaire d'enregistrement et d'activation de clé */}
                    {showLicenseForm && (
                      <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 space-y-5 animate-slide-up">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Key size={16} className="text-blue-500" />
                            Enregistrer une Clé de Licence
                          </h4>
                          <p className="text-slate-505 dark:text-slate-400 text-xs mt-1">
                            Saisissez le code d'enregistrement reçu lors de la souscription à votre forfait Schoolab.
                          </p>
                        </div>
                        
                        <form onSubmit={handleActivate} className="space-y-4">
                          <div className="relative">
                            <input
                              type="text"
                              value={licenseKey}
                              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                              className="w-full px-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all uppercase font-mono font-bold text-base tracking-widest text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-800"
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                            />
                            <div className="absolute top-1/2 right-4.5 -translate-y-1/2 text-slate-400">
                              <Key size={18} />
                            </div>
                          </div>

                          {/* Demande de mot de passe administrateur sécurisé (facultatif ou forcé par serveur) */}
                          {showPasswordPrompt && (
                            <div className="space-y-1.5 animate-slide-up">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {activationType === 'REGISTER' ? 'Définir le mot de passe de protection' : 'Mot de passe administrateur'}
                              </label>
                              <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-white"
                                placeholder="••••••••"
                              />
                            </div>
                          )}

                          {/* Message d'erreur formaté */}
                          {activationError && (
                            <div className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-xl flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-semibold">
                              <ShieldAlert size={15} />
                              {activationError}
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={loading || !licenseKey}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-500/10"
                          >
                            {loading ? 'Validation de sécurité...' : 'Activer Schoolab Premium'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Bloc d'identité matériel unique (HWID) */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6 space-y-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <User size={14} className="text-slate-400" />
                          <span>Identifiant Matériel du Poste (HWID)</span>
                        </div>
                        <button
                          onClick={handleCopyHWID}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all"
                        >
                          {copied ? (
                            <>
                              <Check size={12} className="text-emerald-500 animate-bounce" />
                              <span className="text-emerald-500">Copié avec succès !</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copier l'identifiant</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800/60 font-mono text-xs text-slate-700 dark:text-slate-400 break-all select-all shadow-inner tracking-wide">
                        {hwid || 'Calcul cryptographique de l\'identifiant matériel...'}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                        Ce code unique identifie ce poste de travail. Fournissez-le à votre conseiller client Schoolab pour obtenir des clés de licence adaptées à cette machine.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* 
                ==========================================================
                SECTION 5 : CLOUD & SYNCHRO (Sécurité globale et réseau)
                ==========================================================
              */}
              {activeTab === 'cloud' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <RefreshCw size={20} className="text-indigo-600 dark:text-indigo-400" />
                      Synchronisation Cloud & Collaboration
                    </h2>
                    <p className="text-slate-555 dark:text-slate-400 text-xs mt-1">
                      Sauvegardez vos données en lieu sûr dans le Cloud ou partagez instantanément vos modifications avec vos collègues.
                    </p>
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-8">
                    
                    {/* Statut de liaison Cloud actuel */}
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3.5 rounded-xl border shadow-sm ${
                          cloudSchoolId 
                            ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/10' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-800'
                        }`}>
                          <RefreshCw size={22} className={!cloudSchoolId ? 'animate-spin-slow text-slate-400' : 'text-indigo-500'} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {cloudSchoolId ? 'Base de Données Couplée au Cloud' : 'Attente d\'Enregistrement Cloud'}
                          </h3>
                          <p className="text-slate-505 dark:text-slate-400 text-xs mt-1 leading-normal">
                            {cloudSchoolId 
                              ? `Identifiant ID Cloud de l'école : ${cloudSchoolId}` 
                              : 'Veuillez activer une licence Premium Schoolab Plus pour déverrouiller la synchronisation réseau.'}
                          </p>
                          {lastSync && (
                            <span className="inline-block text-[10px] font-bold text-slate-400 mt-2 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                              Dernière synchro : {new Date(lastSync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Commandes de synchronisation interactives (réservées au plan PLUS) */}
                    {licenseStatus?.plan === 'PLUS' ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Bouton : Mettre à jour le cloud (Local -> Cloud) */}
                          <button
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await syncPush();
                                if (res.success) {
                                  toast.success(res.summary || 'Données sauvegardées en ligne avec succès !');
                                  await loadSettings();
                                } else {
                                  toast.error('Échec de l\'envoi : ' + res.error);
                                }
                              } catch (e) {
                                toast.error('Erreur technique lors de la sauvegarde.');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading || !cloudSchoolId}
                            className="flex items-center justify-between p-5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 hover:border-blue-500 dark:hover:border-blue-600 rounded-2xl shadow-sm transition-all group text-left"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sauvegarder mes modifications</span>
                              <div className="text-sm font-bold text-slate-900 dark:text-white">Envoyer vers le Cloud</div>
                              <p className="text-[10px] text-slate-400 pr-4 leading-normal">Téléverser vos modifications locales vers le serveur central</p>
                            </div>
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-500 group-hover:bg-blue-600 group-hover:text-white rounded-xl transition-all duration-300">
                              <Upload size={18} className={loading ? 'animate-spin' : ''} />
                            </div>
                          </button>

                          {/* Bouton : Importer du cloud (Cloud -> Local) */}
                          <button
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await syncPull();
                                if (res.success) {
                                  toast.success(res.summary || 'Dernières saisies importées avec succès !');
                                  await loadSettings();
                                } else {
                                  toast.error('Échec de la récupération : ' + res.error);
                                }
                              } catch (e) {
                                toast.error('Erreur technique lors de la récupération.');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            disabled={loading || !cloudSchoolId}
                            className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl shadow-md shadow-blue-500/10 text-left transition-all group"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-bold text-blue-100 tracking-wider">Fusionner les données de l'école</span>
                              <div className="text-sm font-bold">Récupérer du Cloud</div>
                              <p className="text-[10px] text-blue-100/80 pr-4 leading-normal">Télécharger les bulletins et notes encodés par d'autres enseignants</p>
                            </div>
                            <div className="p-3 bg-white/10 text-white group-hover:bg-white/20 rounded-xl transition-all duration-300">
                              <Download size={18} />
                            </div>
                          </button>
                        </div>

                        {/* Section : Forcer la Resynchronisation complète */}
                        <div className="p-6 border border-amber-200/60 dark:border-amber-900/50 bg-amber-500/5 rounded-2xl space-y-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" size={18} />
                            <div>
                              <h5 className="text-sm font-bold text-amber-800 dark:text-amber-400">Forcer une resynchronisation intégrale</h5>
                              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-normal">
                                En cas d'incohérence de données ou d'écriture orpheline sur vos différents postes locaux, vous pouvez forcer le logiciel à marquer toutes vos données comme devant être écrasées et renvoyées au Cloud.
                              </p>
                            </div>
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
                                  toast.success("État local marqué comme modifié. Envoi vers le Cloud...");
                                  
                                  const res = await syncPush();
                                  if (res.success) {
                                    toast.success(res.summary || 'Base de données renvoyée avec succès !');
                                    await loadSettings();
                                  } else {
                                    toast.error('Échec de l\'envoi complet : ' + res.error);
                                  }
                                } catch (e) {
                                  toast.error('Erreur technique lors du traitement de réinitialisation');
                                  console.error(e);
                                } finally {
                                  setLoading(false);
                                }
                              }
                            }}
                            disabled={loading || !cloudSchoolId}
                            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                          >
                            Réinitialiser & Renvoyer
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Invitation esthétique de mise à niveau premium */
                      <div className="p-6 bg-gradient-to-tr from-slate-50 to-zinc-50 dark:from-slate-950/40 dark:to-slate-900/10 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-4">
                        <div className="flex items-start gap-3.5">
                          <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Passez au Forfait Schoolab Plus</h4>
                            <p className="text-slate-505 dark:text-slate-400 text-xs leading-relaxed mt-1.5">
                              Travaillez simultanément en équipe ! Avec le Forfait Réseau Cloud Plus, plusieurs enseignants ou gestionnaires peuvent saisir les notes en temps réel sur des ordinateurs autonomes. Schoolab s'occupe de fusionner intelligemment et de sauvegarder toutes les modifications en toute sécurité.
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex justify-start">
                          <button
                            onClick={() => setShowUpgradeModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                          >
                            Découvrir Schoolab Plus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 
                ==========================================================
                SECTION 6 : À PROPOS (Informations légales et support technique)
                ==========================================================
              */}
              {activeTab === 'about' && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Info size={20} className="text-blue-600 dark:text-blue-400" />
                      À Propos de Schoolab
                    </h2>
                    <p className="text-slate-555 dark:text-slate-400 text-xs mt-1">
                      Consultez la version de l'application et accédez directement aux outils d'assistance client.
                    </p>
                  </div>
                  
                  <div className="p-6 md:p-8 space-y-8">
                    
                    {/* Carte descriptive avec logo Schoolab et Version */}
                    <div className="flex flex-col sm:flex-row items-center gap-5 bg-slate-50/60 dark:bg-slate-950/30 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-6">
                      <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                        <School size={36} />
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">Schoolab Pro & Plus</h3>
                        <p className="text-slate-505 dark:text-slate-400 text-xs mt-1 leading-normal">
                          Système moderne et unifié de gestion académique pour établissements scolaires primaires et secondaires.
                        </p>
                        
                        <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-3">
                          <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold rounded-full text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50">
                            Version {pkg.version}
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-[10px] font-bold rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                            <span className="w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full"></span>
                            Logiciel à jour
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Liste des fonctionnalités supportées sous forme de badges */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fonctionnalités Clés Incluses</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Calcul automatisé des bulletins scolaires</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Impression haute définition des palmarès</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Gestion automatisée des examens de repêchage</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Suivi de la conduite et discipline des élèves</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Base de données SQLite cryptée locale</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Fusion bidirectionnelle intelligente Cloud</span>
                        </div>
                      </div>
                    </div>

                    {/* Contacts du Support Client */}
                    <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Support Technique & Assistance Client</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* Mail support */}
                        <a
                          href="mailto:NartrixSoft@gmail.com"
                          className="flex items-center gap-4 p-4.5 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 rounded-2xl transition-all group"
                        >
                          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                            <Mail size={16} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Par Courriel</div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">NartrixSoft@gmail.com</div>
                          </div>
                        </a>

                        {/* WhatsApp support */}
                        <a
                          href="https://wa.me/243903582030"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4.5 bg-slate-50 dark:bg-slate-950/20 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/60 rounded-2xl transition-all group"
                        >
                          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                            <Phone size={16} />
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Conseiller WhatsApp</div>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">+243 903 582 030</div>
                          </div>
                        </a>

                      </div>
                    </div>

                    {/* Bloc Informations Légales */}
                    <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex flex-wrap items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 gap-2">
                      <span>© 2026 NartrixSoft - Tous droits réservés</span>
                      <span>Licence individuelle concédée à l'établissement</span>
                    </div>

                    {/* Outils de développement discrets (seeding simulation) */}
                    <div className="text-center pt-3">
                      <button
                        onClick={async () => {
                          const confirmed = await toast.confirm({
                            title: 'Mode Développeur',
                            message: 'Voulez-vous peupler la base de données locale avec des données de simulation de test ?',
                            confirmLabel: 'Générer les données',
                            cancelLabel: 'Annuler',
                            variant: 'warning'
                          });

                          if (confirmed) {
                            setLoading(true);
                            try {
                              await seedingService.seedDatabase();
                              toast.success("Base de données de simulation alimentée avec succès !");
                            } catch (e) {
                              toast.error("Échec de l'alimentation locale");
                              console.error(e);
                            } finally {
                              setLoading(false);
                            }
                          }
                        }}
                        disabled={loading}
                        className="text-[9px] font-bold uppercase tracking-widest text-slate-400/60 hover:text-blue-500 hover:underline transition-all"
                      >
                        {loading ? "Génération des données de simulation..." : "Données de simulation (Mode Dev)"}
                      </button>
                    </div>

                  </div>
                </div>
              )}

              {/* Fenêtre modale de mise à niveau vers Schoolab Plus */}
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
