import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { settingsService } from '../services/settingsService';
import { useLicense } from '../context/LicenseContext';
import { Clock,Moon, Sun, School, Info, Building2,Key,ShieldCheck, User, Heart, Sparkles, Settings, ShieldAlert, RefreshCw, Download } from '../components/iconsSvg';
import { useToast } from '../context/ToastContext';
import { seedingService } from '../services/seedingService';
import { licenseService } from '../services/licenseService';
import { syncService } from '../services/syncService';
import pkg from "../../../package.json"
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
  const { license: licenseStatus, refreshLicense, refreshRemoteLicense, syncPull } = useLicense();
  const [hwid, setHwid] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cloudSchoolId, setCloudSchoolId] = useState<string | null>(null);
  const toast = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

    // Load cloud info
    const lastSyncTime = await settingsService.get('last_sync_time');
    const sId = await settingsService.get('school_id');
    setLastSync(lastSyncTime);
    setCloudSchoolId(sId);

    // Load HWID
    try {
      const id = await licenseService.getHWID();
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

  const tabs = [
    { id: 'general' as const, label: 'École', icon: Building2, description: 'Informations de l\'établissement' },
    { id: 'appearance' as const, label: 'Apparence', icon: Sparkles, description: 'Thème et affichage' },
    { id: 'licence' as const, label: 'Licence', icon: Heart, description: 'Activation et statut' },
    { id: 'cloud' as const, label: 'Cloud', icon: RefreshCw, description: 'Synchronisation Cloud' },
    { id: 'about' as const, label: 'À propos', icon: Info, description: 'Informations sur l\'application' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 transition-colors duration-500">
      {/* Header */}
      <div className="bg-blue-600 dark:bg-slate-900/50 border-b border-transparent dark:border-white/5 px-6 py-6 shadow-lg transition-all duration-500 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/20 dark:bg-blue-600/30 rounded-2xl shadow-xl backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
              <Settings size={20} className="text-white dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white dark:text-slate-100 tracking-tight">Paramètres</h1>
              <p className="text-blue-100 dark:text-slate-500 font-bold uppercase tracking-widest text-[8px]">Gestion globale de Schoolab</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation - Plus Grand */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl rounded-[1.5rem] border border-slate-200 dark:border-white/5 p-3 shadow-2xl shadow-slate-200/40 dark:shadow-black/40 sticky top-24 transition-all duration-500">
              {tabs.map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all mb-2 last:mb-0 group ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/30 dark:shadow-blue-600/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-blue-400'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl transition-colors duration-300 ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'}`}>
                    <tab.icon size={22} className={activeTab === tab.id ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600'} />
                  </div>
                  <div className="min-w-0">
                    <div className={`font-bold text-sm tracking-tight truncate ${activeTab === tab.id ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                      {tab.label}
                    </div>
                    <div className={`text-[10px] text-slate-400 truncate ${activeTab === tab.id ? 'text-blue-100/80' : ''}`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area - Plus Compact */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl rounded-[2rem] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden transition-all duration-500">
              
              {/* Général - Informations École */}
              {activeTab === 'general' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                  <div className="px-6 py-5 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-indigo-800 via-blue-900 to-slate-950">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/10 dark:bg-indigo-600/30 rounded-xl text-white shadow-lg">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">Identité Numérique</h2>
                        <p className="text-[10px] text-blue-100/70 font-semibold uppercase tracking-widest">Profil de l'établissement</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Identity Card */}
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                      <div className="relative bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-[1.5rem] p-6 shadow-xl overflow-hidden">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 p-6 text-slate-50 dark:text-white/5 pointer-events-none -rotate-12 translate-x-8 -translate-y-8">
                          <School size={140} />
                        </div>
                        
                        <div className="relative z-10 space-y-6">
                          {/* Nom de l'école */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Nom Officiel</label>
                            <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                              {schoolName || <span className="opacity-30 italic">École non identifiée</span>}
                            </div>
                          </div>

                          {/* Grille d'informations - 4 colonnes */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-slate-100 dark:border-white/5">
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                                <Building2 size={12} className="text-blue-500" /> Ville
                              </div>
                              <div className="text-base font-bold text-slate-700 dark:text-slate-300">
                                {schoolCity || "--"}
                              </div>
                            </div>
                            
                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                                <Key size={12} className="text-indigo-500" /> Boîte Postale
                              </div>
                              <div className="text-base font-bold text-slate-700 dark:text-slate-300">
                                {schoolPoBox || "--"}
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                                <Sparkles size={12} className="text-emerald-500" /> Plan
                              </div>
                              <div className="text-base font-bold text-slate-700 dark:text-slate-300">
                                {licenseStatus?.plan || "Gratuit"}
                              </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                                <ShieldCheck size={12} className="text-amber-500" /> Licence
                              </div>
                              <div className="text-base font-bold text-slate-700 dark:text-slate-300">
                                {licenseStatus?.active ? `${licenseStatus.daysRemaining}j` : "Inactive"}
                              </div>
                            </div>
                          </div>

                          {/* ID Cloud */}
                          {cloudSchoolId && (
                            <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                              <RefreshCw size={16} className="text-blue-500" />
                              <div className="text-xs">
                                <span className="text-slate-500">ID Cloud: </span>
                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{cloudSchoolId}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Note d'information */}
                    <div className="p-5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl flex items-start gap-4">
                      <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow text-blue-600 dark:text-blue-400">
                        <Info size={18} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">Synchronisation Automatique</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                          L'identité de votre école est liée à votre clé de licence et apparaît sur les bulletins.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Apparence */}
              {activeTab === 'appearance' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-8 py-8 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-indigo-800 via-blue-900 to-slate-950 transition-all duration-700">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 dark:bg-indigo-600/30 rounded-2xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <Sparkles size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white dark:text-slate-100 tracking-tight">Expérience Visuelle</h2>
                        <p className="text-[9px] text-blue-100/70 dark:text-blue-400/60 font-black uppercase tracking-[0.2em]">Personnalisation de l'interface</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                      {/* Premium Theme Selector: Light */}
                      <div className="space-y-6">
                        <button 
                          onClick={() => setTheme('light')}
                          className={`group relative w-full aspect-[4/3] rounded-[3rem] p-1 transition-all duration-500 hover:scale-[1.02] ${
                            theme === 'light' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-2xl shadow-blue-500/30 ring-8 ring-blue-500/10' : 'bg-slate-200 dark:bg-white/5 grayscale hovr:grayscale-0'
                          }`}
                        >
                          <div className="w-full h-full bg-slate-50 rounded-[2.8rem] overflow-hidden relative shadow-inner">
                            <div className="absolute inset-0 bg-white p-6 flex flex-col gap-4">
                              <div className="h-4 w-1/3 bg-slate-100 rounded-full"></div>
                              <div className="flex-1 bg-white border border-slate-100 rounded-[1.5rem] p-4 flex gap-3">
                                <div className="w-12 h-full bg-blue-50 rounded-xl"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 bg-slate-100 rounded-full w-full"></div>
                                  <div className="h-3 bg-slate-50 rounded-full w-2/3"></div>
                                </div>
                              </div>
                            </div>
                            {theme === 'light' && (
                              <div className="absolute top-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-lg animate-in zoom-in-50 duration-500">
                                <Sun size={20} />
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="text-center space-y-1">
                          <h4 className={`text-xl font-black tracking-tight transition-colors ${theme === 'light' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>Mode Éclatant</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimisé pour le travail de jour</p>
                        </div>
                      </div>

                      {/* Premium Theme Selector: Dark */}
                      <div className="space-y-6">
                        <button 
                          onClick={() => setTheme('dark')}
                          className={`group relative w-full aspect-[4/3] rounded-[3rem] p-1 transition-all duration-500 hover:scale-[1.02] ${
                            theme === 'dark' ? 'bg-gradient-to-br from-indigo-500 to-slate-900 shadow-2xl shadow-indigo-600/30 ring-8 ring-indigo-500/10' : 'bg-slate-200 dark:bg-white/5 grayscale hover:grayscale-0'
                          }`}
                        >
                          <div className="w-full h-full bg-slate-950 rounded-[2.8rem] overflow-hidden relative shadow-inner">
                            <div className="absolute inset-0 bg-slate-900 p-6 flex flex-col gap-4">
                              <div className="h-4 w-1/3 bg-slate-800 rounded-full"></div>
                              <div className="flex-1 bg-slate-950 border border-white/5 rounded-[1.5rem] p-4 flex gap-3">
                                <div className="w-12 h-full bg-indigo-900/20 rounded-xl border border-white/5"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-3 bg-slate-800 rounded-full w-full"></div>
                                  <div className="h-3 bg-slate-900 rounded-full w-2/3"></div>
                                </div>
                              </div>
                            </div>
                            {theme === 'dark' && (
                              <div className="absolute top-6 right-6 p-3 bg-indigo-600 text-white rounded-full shadow-lg animate-in zoom-in-50 duration-500">
                                <Moon size={20} />
                              </div>
                            )}
                          </div>
                        </button>
                        <div className="text-center space-y-1">
                          <h4 className={`text-xl font-black tracking-tight transition-colors ${theme === 'dark' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>Mode Nocturne</h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élégant et reposant pour les yeux</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Licence */}
              {activeTab === 'licence' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-8 py-8 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 dark:from-indigo-900/40 dark:via-slate-900/40 dark:to-blue-900/40 transition-all duration-500">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 dark:bg-indigo-600/30 rounded-2xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <ShieldCheck size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white dark:text-slate-100 tracking-tight">Licence & Sécurité</h2>
                        <p className="text-[9px] text-indigo-100/70 dark:text-indigo-400/60 font-black uppercase tracking-[0.2em]">Authentification du produit</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    {/* License Card */}
                    <div className="relative group perspective-1000">
                      <div className={`absolute -inset-1 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 ${licenseStatus?.active ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                      
                      <div className="relative bg-white dark:bg-slate-900/80 dark:backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-2xl">
                        {/* Mesh Gradient Background */}
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/5 to-transparent pointer-events-none"></div>
                        
                        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                          {/* Left: Status Icon */}
                          <div className="relative">
                            <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center shadow-2xl transform transition-transform duration-700 group-hover:scale-110 group-hover:rotate-3 ${
                              licenseStatus?.active 
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white' 
                                : 'bg-gradient-to-br from-slate-200 to-slate-400 dark:from-slate-700 dark:to-slate-800 text-white'
                            }`}>
                              {licenseStatus?.plan === 'PLUS' ? <Sparkles size={48} /> : <ShieldCheck size={48} />}
                            </div>
                            {licenseStatus?.active && (
                              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg border-4 border-slate-50 dark:border-slate-800">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                              </div>
                            )}
                          </div>

                          {/* Center: Info */}
                          <div className="flex-1 text-center md:text-left space-y-3">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {licenseStatus?.active ? (licenseStatus.plan === 'PLUS' ? 'Schoolab Plus' : 'Schoolab Pro') : 'Version Gratuite'}
                              </h3>
                              {licenseStatus?.active && (
                                <span className="px-4 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                                  Actif
                                </span>
                              )}
                            </div>
                            
                            <p className="text-slate-500 dark:text-slate-400 font-medium text-base max-w-md">
                              {licenseStatus?.active 
                                ? `Votre licence est valide jusqu'au ${new Date(licenseStatus.expiresAt).toLocaleDateString()}.`
                                : "Débloquez toutes les fonctionnalités premium pour votre établissement."}
                            </p>

                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 pt-2">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <Clock size={14} className="text-indigo-500" />
                                <span>{licenseStatus?.daysRemaining} jours restants</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <Key size={14} className="text-indigo-500" />
                                <span>Key: {licenseStatus?.key?.substring(0, 4)}...</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Refresh Button */}
                          <button 
                            onClick={async () => {
                              setLoading(true);
                              await refreshRemoteLicense();
                              setLoading(false);
                              toast.success('Licence synchronisée');
                            }}
                            disabled={loading}
                            className="p-6 bg-slate-50 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-3xl transition-all border border-slate-100 dark:border-white/5 shadow-inner group/sync"
                          >
                            <RefreshCw size={24} className={`text-slate-400 group-hover/sync:text-indigo-500 transition-all ${loading ? "animate-spin" : "group-hover/sync:rotate-180"}`} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Activation Form */}
                    {(!licenseStatus?.active || licenseStatus?.isTrial) && (
                      <div className="p-10 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[3rem] border border-indigo-100/50 dark:border-indigo-500/10 space-y-8 animate-in slide-in-from-top-4 duration-1000">
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-slate-900 dark:text-slate-200 tracking-tight">Activer une licence</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Saisissez votre clé produit pour lever les restrictions.</p>
                        </div>

                        <form onSubmit={handleActivate} className="space-y-6">
                          <div className="relative">
                            <input 
                              type="text" 
                              value={licenseKey}
                              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                              className="w-full px-10 py-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-[2rem] focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all uppercase font-black text-2xl tracking-[0.3em] text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-800 shadow-2xl dark:shadow-none"
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                            />
                            <div className="absolute top-1/2 right-10 -translate-y-1/2 text-slate-200 dark:text-slate-800">
                              <Key size={32} />
                            </div>
                          </div>

                          {showPasswordPrompt && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                              <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1">Mot de passe de protection</label>
                              <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-8 py-6 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-3xl focus:ring-8 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-xl dark:text-white shadow-xl dark:shadow-none"
                                placeholder="••••••••"
                              />
                            </div>
                          )}

                          {activationError && (
                            <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 text-sm font-black uppercase tracking-widest">
                              <ShieldAlert size={20} />
                              {activationError}
                            </div>
                          )}

                          <button 
                            type="submit"
                            disabled={loading || !licenseKey}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white py-8 rounded-[2rem] font-black text-xl uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all transform active:scale-[0.98] disabled:opacity-50"
                          >
                            {loading ? 'Activation...' : 'Activer Schoolab Premium'}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Hardware Info Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                      <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <User size={16} className="text-indigo-500" />
                          Configuration Poste
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 break-all bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                          ID: {hwid}
                        </div>
                      </div>
                      <div className="p-8 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Building2 size={16} className="text-indigo-500" />
                          Licence Scolaire
                        </div>
                        <div className="font-black text-slate-700 dark:text-slate-300">
                          {schoolName || 'Chargement...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cloud Synchronization */}
              {activeTab === 'cloud' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-8 py-8 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-indigo-800 via-blue-900 to-slate-950 transition-all duration-700">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/10 dark:bg-indigo-600/30 rounded-2xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <RefreshCw size={24} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-white dark:text-slate-100 tracking-tight">
                          {licenseStatus?.plan === 'PLUS' ? 'Schoolab Cloud' : 'Sauvegarde & Sécurité'}
                        </h2>
                        <p className="text-[9px] text-blue-100/70 dark:text-blue-400/60 font-black uppercase tracking-[0.2em]">
                          {licenseStatus?.plan === 'PLUS' ? 'Synchronisation centralisée' : 'Protection de vos données'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-8 group/cloud">
                    {/* Main Status Display */}
                    <div className="relative">
                      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-[3.5rem] blur-xl opacity-50"></div>
                      <div className="relative bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border border-slate-200 dark:border-white/5 rounded-[3rem] p-10 flex flex-col items-center text-center space-y-8 shadow-2xl">
                        
                        <div className="relative">
                          <div className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-1000 transform ${cloudSchoolId ? 'bg-indigo-500 text-white shadow-[0_0_50px_rgba(99,102,241,0.4)] scale-110' : 'bg-slate-100 text-slate-300'}`}>
                            {cloudSchoolId ? <ShieldCheck size={48} /> : <RefreshCw size={48} className="animate-spin-slow" />}
                          </div>
                          {cloudSchoolId && (
                            <div className="absolute top-0 right-0 w-8 h-8 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full"></div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {cloudSchoolId ? (licenseStatus?.plan === 'PLUS' ? 'Cloud Synchronisé' : 'Données Protégées') : 'Configuration Requise'}
                          </h3>
                          <p className="text-slate-500 dark:text-slate-400 max-w-lg font-medium text-base leading-relaxed">
                            {licenseStatus?.plan === 'PLUS' 
                              ? "Votre établissement est parfaitement synchronisé sur tous vos postes de travail."
                              : "Vos données académiques sont sauvegardées en temps réel sur l'infrastructure sécurisée de Schoolab."}
                          </p>
                        </div>

                        {licenseStatus?.plan === 'PLUS' && (
                          <div className="flex items-center gap-12 pt-4">
                            <div className="text-center">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Dernier Pull</div>
                              <div className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                                {lastSync ? new Date(lastSync).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                              </div>
                            </div>
                            <div className="w-px h-10 bg-slate-200 dark:bg-white/5"></div>
                            <div className="text-center">
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">ID Cloud</div>
                              <div className="text-lg font-black text-slate-700 dark:text-slate-300">{cloudSchoolId?.substring(0, 8)}...</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Upsell for Plus */}
                    {licenseStatus?.plan !== 'PLUS' && (
                      <div className="p-10 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 text-white/10 rotate-12 group-hover:scale-125 transition-transform duration-1000">
                          <Sparkles size={160} />
                        </div>
                        <div className="relative z-10 space-y-6">
                          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse">
                            <Sparkles size={14} />
                            Recommandation
                          </div>
                          <h4 className="text-2xl font-black tracking-tight leading-tight">
                            Libérez le plein potentiel <br /> avec Schoolab Plus
                          </h4>
                          <p className="text-blue-100 text-base font-medium max-w-xl leading-relaxed">
                            Passez au niveau supérieur : travaillez simultanément sur plusieurs ordinateurs avec une synchronisation bidirectionnelle instantanée.
                          </p>
                          <button 
                            onClick={() => setShowUpgradeModal(true)}
                            className="bg-white text-blue-900 px-8 py-4 rounded-[1.5rem] font-black text-base uppercase tracking-widest shadow-2xl hover:bg-blue-50 transition-all active:scale-95"
                          >
                            Synchroniser maintenant
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Interactive Controls (Plus Only) */}
                    {licenseStatus?.plan === 'PLUS' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4 animate-in slide-in-from-bottom-4 duration-1000">
                        <button 
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const res = await syncService.start();
                              if (res.success) {
                                toast.success('Upload Cloud réussi');
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
                          className="flex items-center justify-between p-8 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-[2.5rem] hover:border-indigo-500/50 transition-all group/push shadow-xl"
                        >
                          <div className="text-left">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Backup</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Envoyer au Cloud</div>
                          </div>
                          <RefreshCw size={32} className={`text-indigo-500 group-hover/push:rotate-180 transition-all duration-700 ${loading ? "animate-spin" : ""}`} />
                        </button>

                        <button 
                          onClick={async () => {
                            setLoading(true);
                            try {
                              const res = await syncPull();
                              if (res.success) {
                                toast.success('Import Cloud réussi');
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
                          className="flex items-center justify-between p-8 bg-indigo-600 text-white rounded-[2.5rem] hover:bg-indigo-700 shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all group/pull"
                        >
                          <div className="text-left">
                            <div className="text-[10px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-1">Restauration</div>
                            <div className="text-xl font-black tracking-tight">Recevoir du Cloud</div>
                          </div>
                          <Download size={32} className="group-hover/pull:translate-y-1 transition-transform" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* À propos de l'App */}
              {activeTab === 'about' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                  <div className="px-6 py-5 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-white/10 rounded-xl text-white shadow-lg">
                        <Info size={20} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">À propos de Schoolab</h2>
                        <p className="text-[10px] text-blue-100/70 font-semibold uppercase tracking-widest">Version {pkg.version}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {/* Logo & Version */}
                    <div className="flex items-center gap-6 p-6 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                      <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <School size={40} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">Schoolab <span className="text-blue-600">Pro</span></h3>
                        <p className="text-slate-500 text-sm mt-1">Logiciel de gestion scolaire moderne</p>
                        <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold">
                          v{pkg.version}
                        </div>
                      </div>
                    </div>

                    {/* Description de l'application */}
                    <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                      <h4 className="font-bold text-slate-900 dark:text-white mb-3">À propos de l'application</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        <strong>Schoolab</strong> est une solution complète de gestion académique conçue pour les établissements scolaires. 
                        Elle permet de gérer efficacement les classes, les élèves, les notes, les bulletins et la synchronisation cloud 
                        pour un suivi pédagogique optimal.
                      </p>
                      <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Gestion des classes, élèves et matières</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Saisie et calcul automatique des notes et moyennes</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Génération de bulletins personnalisés</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Synchronisation cloud multi-postes (Plan Plus)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-500 mt-0.5">•</span>
                          <span>Interface mobile pour saisie distante des notes</span>
                        </li>
                      </ul>
                    </div>

                    {/* Infos développeur & contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <User size={18} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Développeur</span>
                        </div>
                        <p className="text-lg font-bold text-slate-800 dark:text-white">Angelo Ntoto</p>
                        <p className="text-xs text-slate-500 mt-1">Lead Developer & Designer</p>
                      </div>

                      <div className="p-5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                            <Heart size={18} className="text-green-600 dark:text-green-400" />
                          </div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Contact & Support</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-semibold">Email:</span> <a href="mailto:Angelontoto7@gmail.com" className="text-blue-600 hover:underline">Angelontoto7@gmail.com</a>
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-semibold">WhatsApp:</span> <a href="https://wa.me/243810396812" className="text-green-600 hover:underline">+243 810 396 812</a>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Copyright & System */}
                    <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-white/5 rounded-xl text-xs text-slate-500">
                      <span>© 2026 Angelo Ntoto - Tous droits réservés</span>
                      <span className="font-mono text-[10px]">ID: {hwid?.substring(0, 16)}...</span>
                    </div>

                    {/* Developer Tool */}
                    <div className="text-center pt-4 border-t border-slate-100 dark:border-white/5">
                      <button 
                        onClick={async () => {
                          if (window.confirm("Voulez-vous peupler la base de données avec 15 classes et des données de test ?")) {
                            setLoading(true);
                            try {
                              await seedingService.seedDatabase();
                              toast.success("Base de données peuplée avec succès !");
                            } catch (e) {
                              toast.error("Échec du peuplement");
                              console.error(e);
                            } finally {
                              setLoading(false);
                            }
                          }
                        }}
                        disabled={loading}
                        className="text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        {loading ? "Génération en cours..." : "Données de test (Dev)"}
                      </button>
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
