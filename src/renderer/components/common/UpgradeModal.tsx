import React from 'react';
import { Sparkles, X, CheckCircle, ShieldCheck, RefreshCw, User, Check, Building2, Globe } from '../iconsSvg';
import { useTheme } from '../../context/ThemeContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function UpgradeModal({ isOpen, onClose, featureName = 'cette fonctionnalité' }: UpgradeModalProps) {
  const { theme } = useTheme();

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors z-20 hover:rotate-90 duration-300"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col lg:flex-row h-full">
          
          {/* Header Section (Mobile only or Top) */}
          <div className="p-8 lg:p-12 text-center space-y-4 lg:hidden">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest">
               <Sparkles size={12} />
               Upgrade
             </div>
             <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
               Libérez tout le potentiel <br/> de Schoolab
             </h2>
             <p className="text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto">
               Comparez nos plans et choisissez la solution idéale pour votre établissement.
             </p>
          </div>

          {/* Main Content: Comparison Grid */}
          <div className="flex-1 p-6 lg:p-10 lg:pt-16 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-0 items-stretch">
            
            {/* FREE PLAN */}
            <div className="lg:scale-90 lg:origin-right bg-slate-50 dark:bg-white/5 rounded-3xl lg:rounded-r-none lg:rounded-l-3xl p-8 border border-slate-200 dark:border-white/5 flex flex-col relative z-0 opacity-80 hover:opacity-100 transition-all duration-300">
               <div className="space-y-4 mb-8">
                 <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Gratuit</h3>
                 <div className="flex items-baseline gap-1">
                   <span className="text-4xl font-black text-slate-900 dark:text-white">0$</span>
                   <span className="text-sm font-bold text-slate-400 uppercase">/ mois</span>
                 </div>
                 <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                   Pour les petits établissements débutants.
                 </p>
               </div>
               
               <div className="space-y-4 flex-1">
                 <FeatureItem text="Gestion locale uniquement" limited />
                 <FeatureItem text="1 Utilisateur (Admin)" limited />
                 <FeatureItem text="Bulletins standards" />
                 <FeatureItem text="Exports PDF basiques" />
                 <FeatureItem text="Pas de synchronisation" cross />
                 <FeatureItem text="Pas de support dédié" cross />
               </div>

               <button className="w-full mt-8 py-4 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                 Votre plan actuel
               </button>
            </div>

            {/* PRO PLAN */}
            <div className="lg:scale-95 lg:z-10 bg-white dark:bg-slate-900 rounded-3xl p-8 border-2 border-slate-200 dark:border-white/10 shadow-2xl flex flex-col relative">
               <div className="space-y-4 mb-8 text-center lg:text-left">
                 <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">Pro</h3>
                 <div className="flex items-baseline gap-1 lg:justify-start justify-center">
                   <span className="text-4xl font-black text-slate-900 dark:text-white">15$</span>
                   <span className="text-sm font-bold text-slate-400 uppercase">/ mois</span>
                 </div>
                 <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-wide">
                   Pour les écoles en croissance.
                 </p>
               </div>

               <div className="space-y-4 flex-1">
                 <FeatureItem text="Gestion élèves illimitée" highlight />
                 <FeatureItem text="Bulletins personnalisables" highlight />
                 <FeatureItem text="Import/Export Excel" highlight />
                 <FeatureItem text="Statistiques avancées" />
                 <FeatureItem text="Support par Email" />
                 <FeatureItem text="Licence à vie par machine" highlight />
                 <FeatureItem text="Pas de Cloud Sync" cross />
               </div>

               <button className="w-full mt-8 py-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors border border-indigo-200 dark:border-indigo-500/20">
                 Passer à Pro
               </button>
            </div>

            {/* PLUS PLAN */}
            <div className="lg:scale-110 lg:z-20 p-1 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-2xl shadow-indigo-500/20 relative lg:-ml-4">
              <div className="absolute top-0 right-0 left-0 -mt-4 flex justify-center">
                 <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg flex items-center gap-2">
                   <Sparkles size={12} className="animate-pulse" />
                   Recommandé
                 </div>
              </div>

               <div className="bg-white dark:bg-slate-900 h-full w-full rounded-[1.3rem] p-8 flex flex-col relative overflow-hidden">
                 {/* Background decoration */}
                 <div className="absolute top-0 right-0 p-12 -mr-12 -mt-12 bg-indigo-50 dark:bg-indigo-500/5 rounded-full blur-3xl w-48 h-48 pointer-events-none"></div>

                 <div className="space-y-4 mb-8 relative z-10 text-center lg:text-left">
                   <div className="flex items-center gap-2 lg:justify-start justify-center text-indigo-500">
                     <Sparkles size={20} fill="currentColor" className="text-amber-400" />
                     <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600 uppercase tracking-tight">Plus</h3>
                   </div>
                   <div className="flex items-baseline gap-1 lg:justify-start justify-center">
                     <span className="text-5xl font-black text-slate-900 dark:text-white">50$</span>
                     <span className="text-sm font-bold text-slate-400 uppercase">/ mois</span>
                   </div>
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wide">
                     La solution ultime pour réseaux d'écoles.
                   </p>
                 </div>

                 <div className="space-y-4 flex-1 relative z-10">
                   <FeatureItem text="Tout ce qu'il y a dans PRO" highlight bold />
                   <FeatureItem text="Synchronisation Cloud Instantanée" icon={RefreshCw} highlight bold color="text-indigo-500" />
                   <FeatureItem text="Multi-postes / Multi-utilisateurs" icon={User} highlight bold color="text-pink-500" />
                   <FeatureItem text="Sauvegarde Automatique Sécurisée" icon={ShieldCheck} highlight bold color="text-emerald-500" />
                   <FeatureItem text="Accès Directeur & Secrétaire" icon={Building2} />
                   <FeatureItem text="Support Prioritaire WhatsApp" highlight />
                 </div>

                 <button 
                  onClick={() => window.open('https://schoolab.app/pricing', '_blank')}
                  className="w-full mt-8 py-5 rounded-2xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all relative z-10 group"
                 >
                   <span className="flex items-center justify-center gap-2">
                     Choisir Schoolab Plus <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                   </span>
                 </button>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text, limited = false, highlight = false, cross = false, bold = false, icon: Icon, color }: { text: string; limited?: boolean; highlight?: boolean; cross?: boolean; bold?: boolean; icon?: any; color?: string }) {
  return (
    <div className={`flex items-start gap-3 text-sm ${limited ? 'opacity-60' : ''}`}>
      <div className={`mt-0.5 flex-shrink-0 ${highlight ? 'scale-110' : ''}`}>
        {cross ? (
           <div className="p-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
             <X size={12} strokeWidth={3} />
           </div>
        ) : Icon ? (
           <div className={`p-1 rounded-full bg-slate-50 dark:bg-white/5 ${color || 'text-indigo-500'}`}>
             <Icon size={14} />
           </div>
        ) : (
          <CheckCircle size={18} className={highlight ? 'text-indigo-500' : 'text-slate-400'} />
        )}
      </div>
      <span className={`${bold ? 'font-black text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-300'} ${cross ? 'text-slate-400 decoration-slate-300 line-through decoration-2' : ''}`}>
        {text}
      </span>
    </div>
  );
}
