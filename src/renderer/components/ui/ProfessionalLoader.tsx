import React from 'react';

/**
 * ProfessionalLoader component
 * Un chargeur élégant qui s'affiche sous forme de barre de progression en haut de l'écran.
 * L'animation commence au centre et s'étend vers les bords.
 */
interface ProfessionalLoaderProps {
  message?: string;
  subMessage?: string;
  fullScreen?: boolean;
}

export default function ProfessionalLoader({ 
  message, 
  fullScreen = true 
}: ProfessionalLoaderProps) {
  return (
    <div className={`${fullScreen ? 'fixed' : 'absolute'} top-0 left-0 right-0 z-[100] pointer-events-none`}>
       {/* Barre de progression principale */}
       <div className="h-1 w-full bg-blue-500/10 overflow-hidden backdrop-blur-sm">
          <div className="h-full bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-load-center" />
       </div>
       
       {/* Indicateur de message intelligent - s'affiche discrètement si un message est fourni */}
       {message && (
         <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-5 py-2 rounded-2xl border border-blue-500/20 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="relative flex">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping absolute opacity-75" />
              <div className="w-2 h-2 bg-blue-600 rounded-full relative" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 dark:text-blue-400">
              {message}
            </span>
         </div>
       )}

      <style>{`
        @keyframes load-center {
          0% { 
            transform: scaleX(0);
            opacity: 0;
            filter: blur(4px);
          }
          15% {
            opacity: 1;
            filter: blur(0px);
          }
          50% { 
            transform: scaleX(1); 
            opacity: 0.8;
          }
          85% {
            opacity: 1;
            filter: blur(0px);
          }
          100% { 
            transform: scaleX(0);
            opacity: 0;
            filter: blur(4px);
          }
        }
        .animate-load-center {
          animation: load-center 2.5s cubic-bezier(0.85, 0, 0.15, 1) infinite;
          transform-origin: center;
        }
      `}</style>
    </div>
  );
}
