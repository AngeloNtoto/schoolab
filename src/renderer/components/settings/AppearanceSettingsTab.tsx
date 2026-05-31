import React from 'react';
// Import du contexte du thème global (Clair/Sombre)
import { useTheme } from '../../context/ThemeContext';
// Import des icônes de thème
import { Sun, Moon } from '../iconsSvg';

/**
 * Composant AppearanceSettingsTab
 * Permet à l'utilisateur de choisir entre le thème lumineux (clair) et obscur (sombre).
 */
export default function AppearanceSettingsTab() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* En-tête de la section d'apparence */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Apparence</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Configurez l'affichage visuel global pour l'adapter au confort de vos yeux.
        </p>
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Choix du Thème Clair */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`text-left p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between aspect-[16/10] hover:scale-[1.01] hover:shadow-lg ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/10 ring-4 ring-blue-500/10 shadow-md'
                : 'border-slate-200/80 dark:border-white/5 hover:border-slate-350 dark:hover:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">Thème Lumineux</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Recommandé pour un usage de jour</span>
              </div>
              <div className={`p-2.5 rounded-2xl transition-all ${
                theme === 'light' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-550 dark:text-slate-400 shadow-sm'
              }`}>
                <Sun size={16} />
              </div>
            </div>
            
            {/* Maquette simulée Thème Clair */}
            <div className="w-full h-24 bg-slate-150/50 rounded-2xl border border-slate-200/50 p-3 flex flex-col gap-2 mt-4 opacity-95">
              <div className="h-3 w-1/3 bg-slate-300 rounded-full"></div>
              <div className="flex-1 bg-white border border-slate-200/40 rounded-xl p-2.5 flex gap-2.5 shadow-sm">
                <div className="w-5 h-full bg-blue-100 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-slate-200 rounded-full w-full"></div>
                  <div className="h-2 bg-slate-100 rounded-full w-2/3"></div>
                </div>
              </div>
            </div>
          </button>

          {/* Choix du Thème Sombre */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`text-left p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between aspect-[16/10] hover:scale-[1.01] hover:shadow-lg ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-950/15 ring-4 ring-blue-500/10 shadow-md'
                : 'border-slate-200/80 dark:border-white/5 hover:border-slate-350 dark:hover:border-slate-850 bg-slate-50/50 dark:bg-slate-900/10'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block">Thème Obscur</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">Idéal pour reposer vos yeux</span>
              </div>
              <div className={`p-2.5 rounded-2xl transition-all ${
                theme === 'dark' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-550 dark:text-slate-400 shadow-sm'
              }`}>
                <Moon size={16} />
              </div>
            </div>
            
            {/* Maquette simulée Thème Sombre */}
            <div className="w-full h-24 bg-slate-950 rounded-2xl border border-slate-850 p-3 flex flex-col gap-2 mt-4 opacity-95">
              <div className="h-3 w-1/3 bg-slate-800 rounded-full"></div>
              <div className="flex-1 bg-slate-900 border border-slate-850 rounded-xl p-2.5 flex gap-2.5 shadow-sm">
                <div className="w-5 h-full bg-blue-950/50 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-2 bg-slate-800 rounded-full w-full"></div>
                  <div className="h-2 bg-slate-900 rounded-full w-2/3"></div>
                </div>
              </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
}
