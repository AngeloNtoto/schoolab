import React, { useEffect, useState } from 'react';
import { dbService } from '../../services/databaseService';
import { AppIcon } from '../ui/Logo';

export default function Dashboard() {
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    const loadSchoolName = async () => {
      try {
        const schoolData = await dbService.query<{ value: string }>("SELECT value FROM settings WHERE key = 'school_name'");
        setSchoolName(schoolData[0]?.value || 'SchooLab');
      } catch (err) {
        console.error(err);
      }
    };
    loadSchoolName();
  }, []);

  return (
    <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-[#020617] relative overflow-hidden select-none">
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/watermark.png)',
          backgroundSize: '400px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      
      <div className="z-10 flex flex-col items-center opacity-80 hover:opacity-100 transition-opacity duration-500">
        <AppIcon size={120} bg="white" className="mb-6 grayscale opacity-50 drop-shadow-xl" />
        
        <h1 className="text-3xl font-black text-slate-800 dark:text-slate-200 tracking-tighter mb-2">
          Bienvenue sur {schoolName || 'SchooLab'}
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-widest uppercase mb-10">
          Sélectionnez une classe dans l'explorateur pour commencer
        </p>

        <div className="flex flex-col gap-4 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <div className="flex items-center justify-between gap-16 px-6 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
            <span>Ouvrir la palette de commandes</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10">K</kbd>
            </div>
          </div>
          <div className="flex items-center justify-between gap-16 px-6 py-3 rounded-xl bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
            <span>Synchroniser les données</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-2 py-1 rounded bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10">S</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
