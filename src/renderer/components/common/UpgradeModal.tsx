import React from 'react';
import { Sparkles, X, CheckCircle } from '../iconsSvg';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

/**
 * Modal qui s'affiche lorsqu'un utilisateur sans le plan PLUS
 * tente d'accéder à une fonctionnalité premium comme la synchronisation.
 */
export default function UpgradeModal({ isOpen, onClose, featureName = 'cette fonctionnalité' }: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Bouton de fermeture */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Header avec gradient */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 text-center text-white">
          <div className="inline-flex p-4 bg-white/20 rounded-3xl mb-6 shadow-lg">
            <Sparkles size={48} />
          </div>
          <h2 className="text-2xl font-black tracking-tight">Passez à Schoolab Plus</h2>
          <p className="text-blue-100 mt-2 font-medium">
            {featureName} nécessite une licence Plus.
          </p>
        </div>

        {/* Contenu */}
        <div className="p-10 space-y-8">
          <div className="space-y-4">
            <h3 className="font-black text-slate-900 dark:text-white">Avantages du plan Plus :</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                <span>Synchronisation bidirectionnelle sur plusieurs postes</span>
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                <span>Historique illimité des modifications</span>
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                <span>Sauvegarde cloud automatique</span>
              </li>
              <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                <span>Support prioritaire</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => window.open('https://schoolab.app/pricing', '_blank')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95"
            >
              Voir les tarifs
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
