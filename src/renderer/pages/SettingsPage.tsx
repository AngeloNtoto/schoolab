import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Récupération de l'état global de la licence d'utilisation
import { useLicense } from '../context/LicenseContext';
// Importation des icônes SVG pour la barre latérale
import { 
  Sun, 
  Printer, 
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
import ImpressionSettingsTab from '../components/settings/ImpressionSettingsTab';
import DeliberationSettingsTab from '../components/settings/DeliberationSettingsTab';
import LicenceSettingsTab from '../components/settings/LicenceSettingsTab';
import CloudSettingsTab from '../components/settings/CloudSettingsTab';
import AboutSettingsTab from '../components/settings/AboutSettingsTab';

/**
 * Page principale de configuration de Schoolab.
 * Organise les différents onglets de paramétrage (identité, apparence, impression, délibération, licence, cloud, à propos).
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  // Utilisation de la licence pour afficher dynamiquement le statut dans la sidebar
  const { license: licenseStatus } = useLicense();
  
  // Onglet sélectionné par défaut
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'impression' | 'deliberation' | 'licence' | 'cloud' | 'about'>('general');

  // Définition de la liste des onglets (icônes, libellés et descriptions)
  const tabs = [
    { id: 'general' as const, label: 'Établissement', icon: Building2, description: 'Identité locale de l\'école' },
    { id: 'appearance' as const, label: 'Thème', icon: Sun, description: 'Affichage clair ou sombre' },
    { id: 'impression' as const, label: 'Impression', icon: Printer, description: 'Polices et interlignes' },
    { id: 'deliberation' as const, label: 'Délibération', icon: GraduationCap, description: 'Seuils, rachats et mentions' },
    { id: 'licence' as const, label: 'Licence & Droits', icon: ShieldCheck, description: 'Statut du poste de travail' },
    { id: 'cloud' as const, label: 'Cloud & Synchro', icon: RefreshCw, description: 'Sauvegardes collaboratives' },
    { id: 'about' as const, label: 'À propos', icon: Info, description: 'Version et support technique' },
  ];

  // Palette de styles CSS pour l'élément actif de la barre latérale
  const tabColors: Record<string, string> = {
    general: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-l-[3px] border-blue-500 pl-3',
    appearance: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-l-[3px] border-amber-500 pl-3',
    impression: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-l-[3px] border-teal-500 pl-3',
    deliberation: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-l-[3px] border-purple-500 pl-3',
    licence: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-l-[3px] border-emerald-500 pl-3',
    cloud: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-l-[3px] border-indigo-500 pl-3',
    about: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-l-[3px] border-sky-500 pl-3',
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col font-sans transition-colors duration-300">
      
      {/* Spacer pour l'esthétique au lieu du bouton Retour */}
      <div className="h-6 flex-shrink-0"></div>

      {/* Corps principal en colonnes */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar latérale : Panneau de choix des réglages */}
        <div className="w-[280px] flex-shrink-0 px-6 pb-6 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">Paramètres</h1>
          
          <nav className="flex-1 space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:scale-[1.01] ${
                    isActive
                      ? tabColors[tab.id]
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon size={16} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`} />
                  <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Badge du forfait actif en bas de la sidebar */}
          {licenseStatus?.active && (
            <div className="mt-auto pt-6 px-1">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{licenseStatus.plan === 'PLUS' ? 'Schoolab Plus' : 'Schoolab Pro'} — Activé</span>
              </div>
            </div>
          )}
        </div>

        {/* Panneau de configuration actif à droite */}
        <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-[#0c101d] rounded-tl-[2rem] border-t border-l border-slate-200/60 dark:border-white/5 shadow-2xl transition-colors duration-300">
          <div className="max-w-3xl py-10 px-8 md:px-12 pb-24">
            
            {/* Rendu conditionnel de l'onglet actif */}
            {activeTab === 'general' && <GeneralSettingsTab />}
            {activeTab === 'appearance' && <AppearanceSettingsTab />}
            {activeTab === 'impression' && <ImpressionSettingsTab />}
            {activeTab === 'deliberation' && <DeliberationSettingsTab />}
            {activeTab === 'licence' && <LicenceSettingsTab />}
            {activeTab === 'cloud' && <CloudSettingsTab />}
            {activeTab === 'about' && <AboutSettingsTab />}

          </div>
        </div>

      </div>
    </div>
  );
}
