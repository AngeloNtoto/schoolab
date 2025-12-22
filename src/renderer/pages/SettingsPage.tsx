import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { settingsService } from '../services/settingsService';
import { Save, Moon, Sun, School, Info, Building2, MapPin, Mail, User, ExternalLink, Heart, Sparkles, Settings } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useTutorial } from '../context/TutorialContext';
import pkg from "../../../package.json"

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'about'>('general');
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const tutorial = useTutorial();

  useEffect(() => {
    loadSettings();
    // Show tutorial for current settings section on first visit
    tutorial.showTutorial(`settings.${activeTab}`);
  }, []);

  // When the user switches tabs, show the tutorial for that section (if not seen)
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
  };

  const saveGeneralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await settingsService.set('school_name', schoolName);
      await settingsService.set('school_city', schoolCity);
      await settingsService.set('school_pobox', schoolPoBox);
      toast.success('Paramètres enregistrés avec succès');
    } catch (error) {
       toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'general' as const, label: 'École', icon: Building2, description: 'Informations de l\'établissement' },
    { id: 'appearance' as const, label: 'Apparence', icon: Sparkles, description: 'Thème et affichage' },
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
              <p className="text-sm text-slate-500 dark:text-slate-400">Configurez votre application Ecole</p>
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
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              
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
                        <p className="text-sm text-slate-500 dark:text-slate-400">Ces informations apparaissent sur les bulletins et documents officiels</p>
                      </div>
                    </div>
                  </div>
                  
                  <form onSubmit={saveGeneralSettings} className="p-8 space-y-6">
                    {/* Nom de l'école */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <School size={16} className="text-blue-500" />
                        Nom de l'établissement
                      </label>
                      <input 
                        type="text" 
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                        placeholder="Ex: Institut Technique de Kinshasa"
                      />
                    </div>

                    {/* Ville */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <MapPin size={16} className="text-green-500" />
                        Ville / Commune
                      </label>
                      <input 
                        type="text" 
                        value={schoolCity}
                        onChange={(e) => setSchoolCity(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                        placeholder="Ex: Kinshasa / Lingwala"
                      />
                    </div>

                    {/* Boîte postale */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <Mail size={16} className="text-purple-500" />
                        Boîte Postale (optionnel)
                      </label>
                      <input 
                        type="text" 
                        value={schoolPoBox}
                        onChange={(e) => setSchoolPoBox(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-slate-800 dark:text-white placeholder-slate-400"
                        placeholder="Ex: B.P. 1234"
                      />
                    </div>

                    {/* Bouton de sauvegarde */}
                    <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-800">
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={18} />
                        {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                      </button>
                    </div>
                  </form>
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Interface lumineuse pour les environnements bien éclairés</p>
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
                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">Réduit la fatigue oculaire en faible luminosité</p>
                      </button>
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
                    {/* Logo et infos principales */}
                    <div className="text-center mb-8">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-3xl mx-auto flex items-center justify-center mb-6 text-white shadow-2xl shadow-blue-500/30 transform hover:scale-105 transition-transform">
                        <School size={48} />
                      </div>
                      <h3 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{pkg.displayName || 'Ecole'}</h3>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-semibold mb-4">
                        <Sparkles size={14} />
                        Version {pkg.version}
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                        {pkg.description || 'Application de gestion scolaire moderne et intuitive.'}
                      </p>
                    </div>

                    {/* Infos détaillées */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                          <User size={18} className="text-blue-500" />
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Développeur</span>
                        </div>
                        <a className="text-slate-600 dark:text-slate-400">{pkg.author?.name || 'Angelo'}</a>
                        <br />
                        <a href={pkg.author?.email} className="text-xs text-slate-400 dark:text-slate-500">{pkg.author?.email}</a>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Licence</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{pkg.license || 'Propriétaire'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">Usage éducatif</p>
                      </div>
                    </div>

                    {/* Copyright */}
                    <div className="text-center pt-6 border-t border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        © {pkg.year || new Date().getFullYear()} <span className="font-semibold">{pkg.displayName || 'Ecole'}</span>. Tous droits réservés.
                      </p>
                      
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
