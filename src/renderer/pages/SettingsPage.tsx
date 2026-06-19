import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Récupération de l'état global de la licence d'utilisation
import { useLicense } from '../context/LicenseContext';
// Importation des icônes SVG pour la barre latérale
import { 
  Sun, 
  Building2, 
  ShieldCheck, 
  RefreshCw, 
  Info, 
  GraduationCap, 
  ChevronLeft 
} from '../components/iconsSvg';

// Importation des sous-panneaux modulaires de configuration
import GeneralSettingsTab from '../components/settings/GeneralSettingsTab';
import AppearanceSettingsTab from '../components/settings/AppearanceSettingsTab';
import DeliberationSettingsTab from '../components/settings/DeliberationSettingsTab';
import LicenceSettingsTab from '../components/settings/LicenceSettingsTab';
import CloudSettingsTab from '../components/settings/CloudSettingsTab';
import AboutSettingsTab from '../components/settings/AboutSettingsTab';

/**
 * Page principale de configuration de Schoolab.
 * Organise les différents onglets de paramétrage (identité, apparence, délibération, licence, cloud, à propos).
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  // Utilisation de la licence pour afficher dynamiquement le statut dans la sidebar
  const { license: licenseStatus } = useLicense();
  
  // Onglet sélectionné par défaut
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'deliberation' | 'licence' | 'cloud' | 'about'>('general');

  // Définition de la liste des onglets (icônes, libellés et descriptions)
  const tabs = [
    { id: 'general' as const, label: 'Établissement', icon: Building2, description: 'Identité locale de l\'école' },
    { id: 'appearance' as const, label: 'Thème', icon: Sun, description: 'Affichage clair ou sombre' },
    { id: 'deliberation' as const, label: 'Délibération', icon: GraduationCap, description: 'Seuils, rachats et mentions' },
    { id: 'licence' as const, label: 'Licence & Droits', icon: ShieldCheck, description: 'Statut du poste de travail' },
    { id: 'cloud' as const, label: 'Cloud & Synchro', icon: RefreshCw, description: 'Sauvegardes collaboratives' },
    { id: 'about' as const, label: 'À propos', icon: Info, description: 'Version et support technique' },
  ];

  // Palette de styles CSS pour l'élément actif en horizontal
  const tabColors: Record<string, string> = {
    general: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
    appearance: 'bg-amber-500 text-white shadow-md shadow-amber-500/20',
    deliberation: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
    licence: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20',
    cloud: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20',
    about: 'bg-sky-500 text-white shadow-md shadow-sky-500/20',
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col font-sans transition-colors duration-300">
      
      {/* En-tête horizontal : Titre et Onglets */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0 bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Paramètres</h1>
          {licenseStatus?.active && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold shadow-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{licenseStatus.plan === 'PLUS' ? 'Schoolab Plus' : 'Schoolab Pro'} — Activé</span>
            </div>
          )}
        </div>
        
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap text-sm ${
                  isActive
                    ? tabColors[tab.id] + ' font-bold'
                    : 'text-slate-600 dark:text-slate-400 font-semibold hover:bg-slate-200/50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <tab.icon size={16} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Corps principal : Conteneur blanc arrondi */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <div className="h-full overflow-y-auto bg-white dark:bg-[#0c101d] rounded-[2rem] border border-slate-200/60 dark:border-white/5 shadow-xl transition-colors duration-300">
          <div className="max-w-3xl mx-auto py-10 px-8 md:px-12 pb-24">
            
            {/* Rendu conditionnel de l'onglet actif */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {activeTab === 'general' && <GeneralSettingsTab />}
              {activeTab === 'appearance' && <AppearanceSettingsTab />}
              {activeTab === 'deliberation' && <DeliberationSettingsTab />}
              {activeTab === 'licence' && <LicenceSettingsTab />}
              {activeTab === 'cloud' && <CloudSettingsTab />}
              {activeTab === 'about' && <AboutSettingsTab />}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
