import React from 'react';
import { Loader2 } from '../iconsSvg';

interface ProfessionalLoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export default function ProfessionalLoader({ 
  message = "Chargement en cours...", 
  subMessage = "Veuillez patienter quelques instants",
  fullScreen = true
}: ProfessionalLoaderProps) {
  return (
    <div className={`${fullScreen ? 'fixed inset-0 z-50' : 'relative w-full py-20'} flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-md transition-all duration-500 rounded-[2.5rem]`}>
      <div className="relative flex flex-col items-center">
        {/* Logo Container with Pulse Effect */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
          <div className="relative bg-white dark:bg-slate-900 p-5 rounded-full shadow-2xl border border-blue-100 dark:border-blue-500/20">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2 animate-pulse">
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {message}
          </h3>
          <p className="text-sm text-slate-500 dark:text-blue-500/60 font-black uppercase tracking-widest">
            {subMessage}
          </p>
        </div>

        {/* Progress Bar Animation */}
        <div className="mt-8 w-48 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-blue-400 animate-[loading_1.5s_ease-in-out_infinite] w-1/2 rounded-full"></div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
