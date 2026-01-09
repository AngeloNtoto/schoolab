import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { settingsService } from '../services/settingsService';
import { useLicense } from '../context/LicenseContext';
import { Save, Moon, Sun, School, Info, Building2, MapPin, Mail, User, Heart, Sparkles, Settings, ShieldAlert, RefreshCw, Download } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTutorial } from '../context/TutorialContext';
import pkg from "../../../package.json"

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
  const { license: licenseStatus, refreshLicense, refreshRemoteLicense, syncPull } = useLicense();
  const [hwid, setHwid] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cloudSchoolId, setCloudSchoolId] = useState<string | null>(null);
  const toast = useToast();
  const tutorial = useTutorial();

  useEffect(() => {
    loadSettings();
    tutorial.showTutorial(`settings.${activeTab}`);
  }, []);

  useEffect(() => {
    tutorial.showTutorial(`settings.${activeTab}`);
  }, [activeTab]);

  const loadSettings = async () => {
    const name = await settingsService.get('school_name');
    const city = await settingsService.get('school_city');
    const pobox = await settingsService.get('school_pobox');
    if (name) setSchoolName(name);
    if (city) setSchoolCity(city);
    if (pobox) setSchoolPoBox(pobox);

    // Load cloud info
    const lastSyncTime = await settingsService.get('last_sync_time');
    const sId = await settingsService.get('school_id');
    setLastSync(lastSyncTime);
    setCloudSchoolId(sId);

    // Load HWID
    try {
      const id = await (window as any).api.license.getHWID();
      setHwid(id);
    } catch (e) {
      console.error("Failed to load HWID", e);
    }
  };

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
      const result = await (window as any).api.license.activate(licenseKey, password);
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

  const tabs = [
    { id: 'general' as const, label: 'École', icon: Building2, description: 'Informations de l\'établissement' },
    { id: 'appearance' as const, label: 'Apparence', icon: Sparkles, description: 'Thème et affichage' },
    { id: 'licence' as const, label: 'Licence', icon: Heart, description: 'Activation et statut' },
    { id: 'cloud' as const, label: 'Cloud', icon: RefreshCw, description: 'Synchronisation Cloud' },
    { id: 'about' as const, label: 'À propos', icon: Info, description: 'Informations sur l\'application' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Settings size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Paramètres</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Configurez votre application Schoolab</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm">
              {tabs.map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all mb-1 last:mb-0 ${
                    activeTab === tab.id 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                  </div>
                  <div>
                    <div className={`font-semibold ${activeTab === tab.id ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                      {tab.label}
                    </div>
                    <div className={`text-xs ${activeTab === tab.id ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden text-slate-800 dark:text-white">
              
              {/* Général - Informations École */}
              {activeTab === 'general' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Informations de l'école</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Ces informations sont définies par le serveur</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-6 text-slate-800 dark:text-white">
                    {/* Nom de l'école */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <School size={16} className="text-blue-500" />
                        Nom de l'établissement
                      </label>
                      <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300">
                        {schoolName || <span className="text-slate-400 italic">Non défini</span>}
                      </div>
                    </div>

                    {/* Ville */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin size={16} className="text-green-500" />
                        Ville / Commune
                      </label>
                      <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300">
                        {schoolCity || <span className="text-slate-400 italic">Non défini</span>}
                      </div>
                    </div>

                    {/* Boîte postale */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <Mail size={16} className="text-purple-500" />
                        Boîte Postale
                      </label>
                      <div className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300">
                        {schoolPoBox || <span className="text-slate-400 italic">Non défini</span>}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Pour modifier ces informations, veuillez contacter l'administrateur du serveur Schoolab Cloud.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Apparence */}
              {activeTab === 'appearance' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white shadow-lg">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Apparence</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Personnalisez l'affichage de l'application</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Thème de l'interface</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Thème Clair */}
                      <button 
                        onClick={() => setTheme('light')}
                        className={`relative p-6 border-2 rounded-2xl flex flex-col items-center gap-4 transition-all group ${
                          theme === 'light' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {theme === 'light' && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                        <div className="w-full h-24 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          <div className="h-6 bg-slate-100 border-b border-slate-200 flex items-center gap-1 px-2">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          </div>
                          <div className="p-2 flex gap-1">
                            <div className="w-8 h-full bg-slate-100 rounded"></div>
                            <div className="flex-1 space-y-1">
                              <div className="h-2 bg-slate-200 rounded w-3/4"></div>
                              <div className="h-2 bg-slate-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Sun size={20} className="text-amber-500" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Mode Clair</span>
                        </div>
                      </button>

                      {/* Thème Sombre */}
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`relative p-6 border-2 rounded-2xl flex flex-col items-center gap-4 transition-all group ${
                          theme === 'dark' 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-4 ring-blue-500/20' 
                            : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {theme === 'dark' && (
                          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                              <path d="M5 13l4 4L19 7"></path>
                            </svg>
                          </div>
                        )}
                        <div className="w-full h-24 bg-slate-800 border border-slate-700 rounded-xl shadow-sm overflow-hidden">
                          <div className="h-6 bg-slate-900 border-b border-slate-700 flex items-center gap-1 px-2">
                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          </div>
                          <div className="p-2 flex gap-1">
                            <div className="w-8 h-full bg-slate-700 rounded"></div>
                            <div className="flex-1 space-y-1">
                              <div className="h-2 bg-slate-600 rounded w-3/4"></div>
                              <div className="h-2 bg-slate-600 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Moon size={20} className="text-blue-400" />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Mode Sombre</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Licence */}
              {activeTab === 'licence' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-red-600 rounded-xl text-white shadow-lg">
                        <Heart size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Licence Logicielle</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Gérez l'activation de votre application</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-full ${licenseStatus?.active ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                            {licenseStatus?.isExpired ? <ShieldAlert size={32} /> : <Heart size={32} />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold text-slate-800 dark:text-white">
                                {licenseStatus?.isTrial ? 'Version d\'essai' : (licenseStatus?.active ? 'Version Activée' : 'Licence Expirée')}
                              </div>
                              <button 
                                onClick={async () => {
                                  setLoading(true);
                                  await refreshRemoteLicense();
                                  setLoading(false);
                                  toast.success('Licence actualisée');
                                }}
                                disabled={loading}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                                title="Vérifier sur le serveur"
                              >
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                              </button>
                            </div>
                            <div className="text-sm text-slate-500">
                              Expire le {licenseStatus?.expiresAt ? new Date(licenseStatus.expiresAt).toLocaleDateString() : 'N/A'} 
                              <span className="ml-2 font-bold text-blue-600">{licenseStatus?.daysRemaining} jours restants</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {(!licenseStatus?.active || licenseStatus?.isTrial) && (
                        <form onSubmit={handleActivate} className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clé de licence</label>
                            <input 
                              type="text" 
                              value={licenseKey}
                              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                              className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all uppercase placeholder-slate-400"
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                            />
                          </div>

                          {showPasswordPrompt && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                {activationType === 'REGISTER' ? 'Définir un mot de passe' : 'Mot de passe administrateur'}
                              </label>
                              <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-400"
                                placeholder="••••••••"
                                autoFocus
                              />
                            </div>
                          )}

                          {activationError && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                              <ShieldAlert size={18} className="text-red-500 mt-0.5" />
                              <p className="text-xs text-red-700 dark:text-red-300">{activationError}</p>
                            </div>
                          )}

                          <button 
                            type="submit"
                            disabled={loading || !licenseKey}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                          >
                            {loading ? 'Activation en cours...' : 'Activer maintenant'}
                          </button>
                        </form>
                      ) || licenseStatus?.active && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-400">Votre clé active</label>
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-600 dark:text-slate-300">
                              {licenseStatus.key?.replace(/.(?=.{4})/g, '*')}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-400">Identifiant Unique (HWID)</label>
                            <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-xs text-slate-500 truncate">
                              {hwid}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cloud */}
              {activeTab === 'cloud' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600 rounded-xl text-white shadow-lg">
                        <RefreshCw size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Eco Cloud Sync</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Synchronisation des données avec le cloud</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    {/* Status Card */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Connexion Cloud</div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${cloudSchoolId ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></div>
                          <span className="text-lg font-bold text-slate-800 dark:text-white">
                            {cloudSchoolId ? 'Connecté' : 'Non lié'}
                          </span>
                        </div>
                        {cloudSchoolId && (
                          <div className="mt-2 text-xs text-slate-500 font-mono truncate">
                            ID: {cloudSchoolId}
                          </div>
                        )}
                      </div>

                      <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Dernière Sync</div>
                        <div className="text-lg font-bold text-slate-800 dark:text-white">
                          {lastSync ? new Date(lastSync).toLocaleString() : 'Jamais'}
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          La sync auto se fait toutes les 5 min
                        </div>
                      </div>
                    </div>

                    {/* Action Card */}
                    <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl shadow-blue-500/20">
                      <div className="flex items-center gap-4 mb-4">
                        <Sparkles size={24} />
                        <h3 className="text-lg font-bold">Synchronisation Manuelle</h3>
                      </div>
                      <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                        Besoin d'une synchronisation immédiate ? Utilisez les boutons ci-dessous pour forcer l'envoi ou la réception des données.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button 
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const res = await (window as any).api.sync.start();
                              if (res.success) {
                                toast.success('Données envoyées avec succès');
                                loadSettings(); // Reload sync time
                              } else {
                                toast.error('Erreur: ' + res.error);
                              }
                            } catch (e) {
                              toast.error('Erreur technique');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading || !cloudSchoolId}
                          className="w-full bg-white/20 hover:bg-white/30 text-white py-4 rounded-xl font-bold backdrop-blur-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                          <div className="text-left">
                            <div className="text-sm">Push</div>
                            <div className="text-[10px] font-normal opacity-80">Envoyer vers Cloud</div>
                          </div>
                        </button>
                        <button 
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const res = await syncPull();
                              if (res.success) {
                                toast.success('Données importées avec succès');
                                loadSettings(); // Reload sync time
                              } else {
                                toast.error('Erreur: ' + res.error);
                              }
                            } catch (e) {
                              toast.error('Erreur technique');
                            } finally {
                              setLoading(false);
                            }
                          }}
                          disabled={loading || !cloudSchoolId}
                          className="w-full bg-white text-blue-700 hover:bg-blue-50 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg"
                        >
                          <Download size={20} />
                          <div className="text-left">
                            <div className="text-sm">Pull</div>
                            <div className="text-[10px] font-normal opacity-60">Importer du Cloud</div>
                          </div>
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
                      <ShieldAlert size={18} className="text-amber-500 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Important:</strong> La synchronisation Cloud nécessite une licence active. Si vous rencontrez des erreurs, vérifiez d'abord votre connexion internet et l'état de votre licence.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* À propos */}
              {activeTab === 'about' && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg">
                        <Info size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">À propos</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Informations sur l'application</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8">
                    <div className="text-center mb-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center mb-6 text-white shadow-2xl shadow-blue-500/30">
                        <School size={48} />
                      </div>
                      <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{pkg.displayName || 'Schoolab'}</h3>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-4">
                        <Sparkles size={14} />
                        Version {pkg.version}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                          <User size={18} className="text-blue-500" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Développeur</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{pkg.author?.name || 'Angelo'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                          <Info size={18} className="text-blue-500" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Licence</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{pkg.license || 'Propriétaire'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
