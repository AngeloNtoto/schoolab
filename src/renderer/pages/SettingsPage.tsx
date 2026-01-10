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
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 transition-colors duration-500">
      {/* Header */}
      <div className="bg-blue-600 dark:bg-slate-900/50 border-b border-transparent dark:border-white/5 px-8 py-10 shadow-lg transition-all duration-500 sticky top-0 z-30 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-white/20 dark:bg-blue-600/30 rounded-[2rem] shadow-xl backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
              <Settings size={32} className="text-white dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white dark:text-slate-100 tracking-tight">Paramètres</h1>
              <p className="text-blue-100 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">Gestion globale de Schoolab</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8">
        <div className="flex flex-col lg:flex-row gap-10">
          {/* Sidebar Navigation */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900/50 dark:backdrop-blur-xl rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-3 shadow-2xl shadow-slate-200/40 dark:shadow-black/40 sticky top-40 transition-all duration-500">
              {tabs.map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-3xl text-left transition-all mb-2 last:mb-0 group ${
                    activeTab === tab.id 
                      ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/30 dark:shadow-blue-600/20 ring-4 ring-blue-500/10' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-blue-400'
                  }`}
                >
                  <div className={`p-3 rounded-2xl transition-colors duration-300 ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'}`}>
                    <tab.icon size={22} className={activeTab === tab.id ? 'text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600'} />
                  </div>
                  <div>
                    <div className={`font-black text-sm tracking-tight ${activeTab === tab.id ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                      {tab.label}
                    </div>
                    <div className={`text-[10px] uppercase tracking-widest font-black transition-opacity ${activeTab === tab.id ? 'text-blue-100/70' : 'text-slate-500 dark:text-slate-500'}`}>
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <div className="bg-white dark:bg-slate-900/40 dark:backdrop-blur-xl rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl shadow-slate-300/40 dark:shadow-black/60 overflow-hidden transition-all duration-500 min-h-[600px]">
              
              {/* Général - Informations École */}
              {activeTab === 'general' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-10 py-12 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 dark:from-blue-900/40 dark:via-slate-900/40 dark:to-indigo-900/40 transition-all duration-500">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/10 dark:bg-blue-600/30 rounded-3xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <Building2 size={32} />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">Établissement</h2>
                        <p className="text-[10px] text-blue-100/70 dark:text-blue-400/60 font-black uppercase tracking-[0.2em]">Identité numérique Schoolab</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10 space-y-10">
                    <div className="grid grid-cols-1 gap-8">
                      {/* Nom de l'école */}
                      <div className="space-y-4">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
                          Nom de l'établissement
                        </label>
                        <div className="w-full px-8 py-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-[2rem] text-slate-900 dark:text-white font-black text-2xl tracking-tight shadow-inner-lg">
                          {schoolName || <span className="text-slate-300 dark:text-slate-700 italic">Non défini</span>}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Ville */}
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
                            Ville / Commune
                          </label>
                          <div className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl text-slate-700 dark:text-slate-300 font-bold shadow-inner transition-colors">
                            {schoolCity || <span className="text-slate-300 dark:text-slate-700 italic">Non défini</span>}
                          </div>
                        </div>

                        {/* Boîte postale */}
                        <div className="space-y-3">
                          <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
                            Boîte Postale
                          </label>
                          <div className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 rounded-2xl text-slate-700 dark:text-slate-300 font-bold shadow-inner transition-colors">
                            {schoolPoBox || <span className="text-slate-300 dark:text-slate-700 italic font-normal">Non définie</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 flex items-start gap-5 transition-colors">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 shadow-sm">
                        <Info size={24} />
                      </div>
                      <p className="text-sm text-blue-700/80 dark:text-blue-300/60 font-medium leading-relaxed">
                        Ces informations sont récupérées automatiquement lors de la synchronisation de votre licence. Pour toute modification, contactez le support technique Schoolab.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Apparence */}
              {activeTab === 'appearance' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-10 py-12 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 dark:from-blue-900/40 dark:via-slate-900/40 dark:to-indigo-900/40 transition-all duration-500">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/10 dark:bg-blue-600/30 rounded-3xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <Sparkles size={32} />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">Personnalisation</h2>
                        <p className="text-[10px] text-blue-100/70 dark:text-blue-400/60 font-black uppercase tracking-[0.2em]">Ajustez l'ambiance visuelle</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10">
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-8 px-1">Choix du thème global</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      {/* Thème Clair */}
                      <button 
                        onClick={() => setTheme('light')}
                        className={`relative p-1 border-2 rounded-[2.5rem] transition-all group overflow-hidden ${
                          theme === 'light' 
                            ? 'border-blue-500 shadow-2xl shadow-blue-500/20 translate-y-[-4px]' 
                            : 'border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="p-8 flex flex-col items-center gap-6">
                          <div className="w-full h-36 bg-white border border-slate-200 rounded-2xl shadow-inner-lg overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-500">
                            <div className="h-7 bg-slate-50 border-b border-slate-100 flex items-center gap-2 px-4">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                            </div>
                            <div className="p-4 flex gap-3">
                              <div className="w-12 h-full bg-blue-50 rounded-xl"></div>
                              <div className="flex-1 space-y-3">
                                <div className="h-4 bg-slate-100 rounded-lg w-3/4"></div>
                                <div className="h-4 bg-slate-100 rounded-lg w-1/2"></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Sun size={24} className={theme === 'light' ? 'text-amber-500' : 'text-slate-400'} />
                            <span className={`text-lg font-black tracking-tight ${theme === 'light' ? 'text-slate-900' : 'text-slate-500'}`}>Mode Éclatant</span>
                          </div>
                        </div>
                      </button>

                      {/* Thème Sombre */}
                      <button 
                        onClick={() => setTheme('dark')}
                        className={`relative p-1 border-2 rounded-[2.5rem] transition-all group overflow-hidden ${
                          theme === 'dark' 
                            ? 'border-indigo-500 shadow-2xl shadow-indigo-600/30 translate-y-[-4px]' 
                            : 'border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="p-8 flex flex-col items-center gap-6">
                          <div className="w-full h-36 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden transform group-hover:scale-[1.02] transition-transform duration-500">
                            <div className="h-7 bg-slate-900 border-b border-slate-800 flex items-center gap-2 px-4 text-slate-700">
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                            </div>
                            <div className="p-4 flex gap-3">
                              <div className="w-12 h-full bg-slate-900 rounded-xl border border-slate-800"></div>
                              <div className="flex-1 space-y-3">
                                <div className="h-4 bg-slate-900 rounded-lg w-3/4"></div>
                                <div className="h-4 bg-slate-900 rounded-lg w-1/2"></div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Moon size={24} className={theme === 'dark' ? 'text-indigo-400' : 'text-slate-400'} />
                            <span className={`text-lg font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-500'}`}>Mode Nocturne</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Licence */}
              {activeTab === 'licence' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-10 py-12 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 dark:from-blue-900/40 dark:via-slate-900/40 dark:to-indigo-900/40 transition-all duration-500">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/10 dark:bg-blue-600/30 rounded-3xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <Heart size={32} />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">Licence</h2>
                        <p className="text-[10px] text-blue-100/70 dark:text-blue-400/60 font-black uppercase tracking-[0.2em]">Statut & Activation sécurisée</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-10 space-y-10 text-slate-900">
                    <div className="p-10 bg-slate-50/80 dark:bg-slate-800/20 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-inner-lg transition-colors">
                      <div className="flex flex-col sm:flex-row items-center gap-10 mb-10">
                        <div className={`p-8 rounded-[2rem] shadow-2xl ${licenseStatus?.active ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-500/40' : 'bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-amber-500/40'}`}>
                          {licenseStatus?.isExpired ? <ShieldAlert size={48} /> : <Sparkles size={48} />}
                        </div>
                        <div className="text-center sm:text-left space-y-2">
                          <div className="flex items-center justify-center sm:justify-start gap-4">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                              {licenseStatus?.isTrial ? 'Période d\'Essai' : (licenseStatus?.active ? 'Licence Activée' : 'Licence Expirée')}
                            </h3>
                            <button 
                              onClick={async () => {
                                setLoading(true);
                                await refreshRemoteLicense();
                                setLoading(false);
                                toast.success('Licence actualisée');
                              }}
                              disabled={loading}
                              className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl transition-all text-slate-400 hover:text-blue-600 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-white/5"
                              title="Synchroniser avec le serveur"
                            >
                              <RefreshCw size={22} className={loading ? "animate-spin" : ""} />
                            </button>
                          </div>
                          <p className="text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center sm:justify-start gap-3">
                            <span>Expire le : {licenseStatus?.expiresAt ? new Date(licenseStatus.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                            <span className="text-blue-600 dark:text-blue-400 font-black">{licenseStatus?.daysRemaining} jours restants</span>
                          </p>
                        </div>
                      </div>

                      {(!licenseStatus?.active || licenseStatus?.isTrial) && (
                        <form onSubmit={handleActivate} className="space-y-6">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Clé d'activation</label>
                            <input 
                              type="text" 
                              value={licenseKey}
                              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                              className="w-full px-8 py-6 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-3xl focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase font-black text-2xl tracking-[0.2em] text-slate-900 dark:text-white placeholder-slate-200 dark:placeholder-slate-800 shadow-inner-lg"
                              placeholder="XXXX-XXXX-XXXX-XXXX"
                            />
                          </div>

                          {showPasswordPrompt && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">
                                {activationType === 'REGISTER' ? 'Définir un mot de passe Admin' : 'Mot de passe sécurisé'}
                              </label>
                              <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-8 py-6 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-3xl focus:ring-8 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xl dark:text-white shadow-inner-lg"
                                placeholder="••••••••"
                                autoFocus
                              />
                            </div>
                          )}

                          {activationError && (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                              <ShieldAlert size={20} className="text-red-500 shrink-0" />
                              <p className="text-sm text-red-700 font-medium">{activationError}</p>
                            </div>
                          )}

                          <button 
                            type="submit"
                            disabled={loading || !licenseKey}
                            className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white py-6 rounded-3xl font-black text-xl uppercase tracking-widest shadow-2xl shadow-slate-900/20 dark:shadow-blue-600/20 transition-all disabled:opacity-50 active:scale-[0.98]"
                          >
                            {loading ? 'Traitement Schoolab...' : 'Débloquer la version complète'}
                          </button>
                        </form>
                      ) || licenseStatus?.active && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Clé produit active</label>
                            <div className="px-6 py-4 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl font-black text-slate-800 dark:text-blue-400 tracking-widest shadow-inner-lg">
                              {licenseStatus.key?.replace(/.(?=.{4})/g, '*')}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Empreinte Machine (HWID)</label>
                            <div className="px-6 py-4 bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-2xl font-black text-[10px] text-slate-400 dark:text-slate-500 truncate shadow-inner-lg uppercase tracking-wider">
                              {hwid}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Cloud Synchronization */}
              {activeTab === 'cloud' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-10 py-12 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 dark:from-blue-900/40 dark:via-slate-900/40 dark:to-indigo-900/40 transition-all duration-500">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/10 dark:bg-blue-600/30 rounded-3xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <RefreshCw size={32} />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">Schoolab Cloud</h2>
                        <p className="text-[10px] text-blue-100/70 dark:text-blue-400/60 font-black uppercase tracking-[0.2em]">Synchronisation centralisée</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-10">
                    {/* Status Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 bg-slate-50/80 dark:bg-slate-800/20 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-inner-lg transition-colors">
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">État du serveur</div>
                        <div className="flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full ${cloudSchoolId ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                          <span className="text-2xl font-black text-slate-800 dark:text-white">
                            {cloudSchoolId ? 'Connecté' : 'Hors ligne'}
                          </span>
                        </div>
                        {cloudSchoolId && (
                          <div className="mt-3 text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 inline-block px-3 py-1 rounded-full">
                            Liaison établie
                          </div>
                        )}
                      </div>

                      <div className="p-8 bg-slate-50/80 dark:bg-slate-800/20 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-inner-lg transition-colors">
                        <div className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Dernière mise à jour</div>
                        <div className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                          {lastSync ? new Date(lastSync).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Aucune'}
                        </div>
                        <div className="mt-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Sync auto active (5 min)
                        </div>
                      </div>
                    </div>

                    {/* Pro-Active Sync Card */}
                    <div className="p-10 bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-slate-900/40 rounded-[3rem] text-white shadow-2xl shadow-blue-900/30 dark:shadow-black/60 relative overflow-hidden group border border-white/5 dark:backdrop-blur-xl">
                      <div className="absolute top-0 right-0 p-12 text-white/5 group-hover:scale-110 transition-transform duration-1000 rotate-12">
                        <RefreshCw size={180} />
                      </div>
                      
                      <div className="relative z-10">
                        <div className="flex items-center gap-5 mb-4">
                          <div className="p-4 bg-white/10 dark:bg-white/5 backdrop-blur-md rounded-2xl shadow-xl">
                            <Sparkles size={28} className="text-blue-200" />
                          </div>
                          <h3 className="text-3xl font-black tracking-tight">Force Sync</h3>
                        </div>
                        <p className="text-blue-100/70 dark:text-blue-400/60 text-lg mb-10 max-w-md font-medium leading-relaxed">
                          Forcez l'envoi de vos modifications ou récupérez les données fraîches du serveur.
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <button 
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await (window as any).api.sync.start();
                                if (res.success) {
                                  toast.success('Synchronisation Push réussie');
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
                            className="flex items-center justify-between px-8 py-6 bg-white/10 hover:bg-white/20 dark:bg-white/5 dark:hover:bg-white/10 border border-white/10 rounded-3xl transition-all disabled:opacity-50 group/btn"
                          >
                            <div className="text-left">
                              <div className="font-black text-lg">📤 Envoyer</div>
                              <div className="text-[10px] opacity-50 font-black uppercase tracking-widest">Push Cloud</div>
                            </div>
                            <RefreshCw size={28} className={`transition-transform duration-500 ${loading ? "animate-spin" : "group-hover/btn:rotate-180"}`} />
                          </button>

                          <button 
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const res = await syncPull();
                                if (res.success) {
                                  toast.success('Importation Pull réussie');
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
                            className="flex items-center justify-between px-8 py-6 bg-white dark:bg-blue-600 text-blue-900 dark:text-white hover:bg-blue-50 dark:hover:bg-blue-500 rounded-3xl shadow-2xl transition-all disabled:opacity-50 active:scale-[0.98] group/btn"
                          >
                            <div className="text-left">
                              <div className="font-black text-lg">📥 Recevoir</div>
                              <div className="text-[10px] text-blue-600 dark:text-blue-200 font-black uppercase tracking-widest">Pull Cloud</div>
                            </div>
                            <Download size={28} className="group-hover/btn:translate-y-1 transition-transform" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* À propos de l'App */}
              {activeTab === 'about' && (
                <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                  <div className="px-10 py-12 border-b border-transparent dark:border-white/5 bg-gradient-to-br from-blue-600 via-indigo-700 to-blue-800 dark:from-blue-900/40 dark:via-slate-900/40 dark:to-indigo-900/40 transition-all duration-500">
                    <div className="flex items-center gap-6">
                      <div className="p-4 bg-white/10 dark:bg-blue-600/30 rounded-3xl text-white shadow-2xl backdrop-blur-md transition-all">
                        <Info size={32} />
                      </div>
                      <div>
                        <h2 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">À propos</h2>
                        <p className="text-[10px] text-blue-100/70 dark:text-blue-400/60 font-black uppercase tracking-[0.2em]">Informations sur Schoolab</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-10 py-16 bg-white dark:bg-transparent transition-all duration-500">
                    <div className="max-w-3xl mx-auto space-y-12">
                      {/* Logo & Version Centered Header */}
                      <div className="flex flex-col items-center text-center space-y-6">
                        <div className="relative group">
                          <div className="absolute -inset-4 bg-blue-600/20 dark:bg-blue-600/10 rounded-[3rem] blur-2xl group-hover:bg-blue-600/30 dark:group-hover:bg-blue-600/20 transition-all duration-700"></div>
                          <div className="relative w-32 h-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-2xl flex items-center justify-center transform group-hover:scale-105 group-hover:-rotate-2 transition-all duration-500">
                            <School size={64} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-2xl shadow-xl shadow-blue-500/30 border-4 border-white dark:border-slate-900 transform rotate-12">
                            <Sparkles size={16} />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Schoolab <span className="text-blue-600">Pro</span></h3>
                          <div className="inline-flex items-center gap-2 mt-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100 dark:border-blue-800/50">
                            Version {pkg.version}
                          </div>
                        </div>
                      </div>

                      {/* Info Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-50 dark:bg-slate-800/20 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:scale-[1.02] hover:bg-white dark:hover:bg-white/5 group shadow-sm hover:shadow-xl">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg transition-all group-hover:scale-110">
                              <User size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Conception</span>
                          </div>
                          <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">{pkg.author?.name || 'Angelo'}</p>
                          <p className="text-[10px] text-slate-500 mt-1">Lead Developer</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/20 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:scale-[1.02] hover:bg-white dark:hover:bg-white/5 group shadow-sm hover:shadow-xl">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg transition-all group-hover:scale-110">
                              <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Propriété</span>
                          </div>
                          <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight">TechLab © 2026</p>
                          <p className="text-[10px] text-slate-500 mt-1">All Rights Reserved</p>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/20 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:scale-[1.02] hover:bg-white dark:hover:bg-white/5 group shadow-sm hover:shadow-xl">
                          <div className="flex items-center gap-4 mb-4">
                            <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg transition-all group-hover:scale-110">
                              <Settings size={20} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Système</span>
                          </div>
                          <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight truncate">{hwid?.substring(0, 12)}...</p>
                          <p className="text-[10px] text-slate-500 mt-1">Device Identity</p>
                        </div>
                      </div>

                      <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-900/20 text-center">
                        <p className="text-xs text-blue-700/60 dark:text-blue-300/40 font-medium leading-relaxed">
                          Schoolab est conçu pour offrir une gestion académique fluide et moderne. <br />
                          Pour tout support, contactez votre administrateur système.
                        </p>
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
