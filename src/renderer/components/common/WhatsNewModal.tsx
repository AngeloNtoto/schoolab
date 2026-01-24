import React, { useEffect, useState } from 'react';
import { X, Sparkles, ArrowRight, Check, Rocket } from '../iconsSvg';
import { changelog, ReleaseNote } from '../../data/changelog';
import pkg from '../../../../package.json'
interface WhatsNewModalProps {
  onClose?: () => void;
}

export default function WhatsNewModal({ onClose }: WhatsNewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState<ReleaseNote | null>(null);

  useEffect(() => {
    // Check version
    const currentVersion = pkg.version;
    const lastSeenVersion = localStorage.getItem('last_seen_version');

    // Find the note for the current version (or the latest one if we want to show latest)
    // Here we show the note MATCHING the current package.json version
    const currentNote = changelog.find(n => n.version === currentVersion);

    if (currentNote && currentVersion !== lastSeenVersion) {
      setNote(currentNote);
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (note) {
      localStorage.setItem('last_seen_version', note.version);
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen || !note) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-slate-200 dark:border-white/10 relative">
        
        {/* Header Image / Gradient */}
        <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-600 relative overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-white/10 rounded-full blur-2xl w-48 h-48 pointer-events-none"></div>
          
          <div className="text-center relative z-10 p-6">
            <div className="inline-flex items-center justify-center p-3 bg-white/20 backdrop-blur-md rounded-2xl mb-3 shadow-lg ring-1 ring-white/30">
              <Rocket size={32} className="text-white drop-shadow-md" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight drop-shadow-md">
              Quoi de neuf ?
            </h2>
          </div>

          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex items-baseline justify-between mb-6 border-b border-slate-100 dark:border-white/5 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Version</span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{note.version}</h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</span>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{note.date}</p>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{note.title}</h4>
            {note.description && <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{note.description}</p>}
          </div>

          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
            {note.features.map((feature, idx) => (
              <div key={idx} className="flex gap-3 items-start group">
                <div className={`mt-1 p-1.5 rounded-lg shrink-0 ${
                  feature.tag === 'Nouveau' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  feature.tag === 'Amélioration' ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' :
                  feature.tag === 'Correctif' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {feature.tag === 'Nouveau' ? <Sparkles size={14} /> : <Check size={14} />}
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-widest mb-0.5 block ${
                     feature.tag === 'Nouveau' ? 'text-emerald-600 dark:text-emerald-400' :
                     feature.tag === 'Amélioration' ? 'text-blue-600 dark:text-blue-400' :
                     feature.tag === 'Correctif' ? 'text-amber-600 dark:text-amber-400' :
                     'text-slate-500'
                  }`}>
                    {feature.tag}
                  </span>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-snug">
                    {feature.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={handleClose}
            className="w-full mt-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
          >
            Génial, j'ai compris !
          </button>
        </div>
      </div>
    </div>
  );
}
