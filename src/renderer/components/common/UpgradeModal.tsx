import React, { useState } from 'react';
import { Sparkles, X, CheckCircle, ShieldCheck, RefreshCw, User, Check, Building2, Globe, Phone, Mail, ArrowLeft, ArrowRight } from '../iconsSvg';
import { useTheme } from '../../context/ThemeContext';
import { useLicense } from '../../context/LicenseContext';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

type ViewState = 'plans' | 'contact';
type PlanType = 'PRO' | 'PLUS';

/**
 * Modal d'upgrade - Version Compacte, Interactive & Responsive
 * Inclut maintenant une vue de contact pour l'activation.
 */
export default function UpgradeModal({ isOpen, onClose, featureName = 'cette fonctionnalité' }: UpgradeModalProps) {
  const { theme } = useTheme();
  const { license } = useLicense(); // Get license info
  const [view, setView] = useState<ViewState>('plans');
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);

  if (!isOpen) return null;

  const currentPlan = license?.active ? license.plan : 'BASIC';

  const handleSelectPlan = (plan: PlanType) => {
    setSelectedPlan(plan);
    setView('contact');
  };

  const handleBack = () => {
    setView('plans');
    setSelectedPlan(null);
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-[95%] sm:w-full max-w-5xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border border-slate-200 dark:border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation / Close Buttons - Positionnés pour être accessibles sur mobile */}
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 flex items-center gap-2">
           {view === 'contact' && (
             <button 
               onClick={handleBack}
               className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
               title="Retour aux plans"
             >
               <ArrowLeft size={20} />
             </button>
           )}
          <button 
            onClick={onClose}
            className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        {view === 'contact' ? (
          /* --- VUE CONTACT --- */
          <div className="p-6 md:p-12 flex flex-col items-center justify-center min-h-[50vh] md:min-h-[500px] text-center space-y-6 md:space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
            
            <div className={`p-4 md:p-6 rounded-full ${selectedPlan === 'PLUS' ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-500'}`}>
              {selectedPlan === 'PLUS' ? <Sparkles size={32} className="md:w-12 md:h-12" /> : <ShieldCheck size={32} className="md:w-12 md:h-12" />}
            </div>

            <div className="space-y-3 md:space-y-4 max-w-lg">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Activer Schoolab <span className={selectedPlan === 'PLUS' ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'}>{selectedPlan === 'PLUS' ? 'Plus' : 'Pro'}</span>
              </h2>
              <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Pour garantir la sécurité de votre établissement, l'activation des licences se fait directement avec notre équipe.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 w-full max-w-lg">
              <a 
                href={`https://wa.me/243903582030?text=${encodeURIComponent(`Bonjour NartrixSoft, je souhaite activer le plan ${selectedPlan === 'PLUS' ? 'PLUS' : 'PRO'} pour mon école.`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-3 p-4 md:p-5 bg-green-500 hover:bg-green-600 text-white rounded-2xl transition-all shadow-lg hover:shadow-green-500/30 group"
              >
                <Phone size={24} className="group-hover:rotate-12 transition-transform" />
                <div className="text-left">
                  <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-80">WhatsApp</div>
                  <div className="font-bold text-base md:text-lg">+243 903 582 030</div>
                </div>
              </a>

              <a 
                href={`mailto:NartrixSoft@gmail.com?subject=Activation Licence Schoolab ${selectedPlan === 'PLUS' ? 'PLUS' : 'PRO'}&body=Bonjour, je souhaite activer une licence.`}
                className="flex items-center justify-center gap-3 p-4 md:p-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl transition-all border border-slate-200 dark:border-white/5"
              >
                <Mail size={24} className="text-slate-400" />
                 <div className="text-left">
                  <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">Email</div>
                  <div className="font-bold text-xs md:text-sm">NartrixSoft@gmail.com</div>
                </div>
              </a>
            </div>

            <div className="text-[10px] md:text-xs text-slate-400 pt-2">
              Disponibilité : Lundi - Samedi, 8h - 18h (GMT+2)
            </div>

          </div>
        ) : (
          /* --- VUE COMPARATIF (PLANS) --- */
          <div className="flex flex-col lg:flex-row h-full">
            
            {/* Header Section (Mobile) - Plus compact sur mobile */}
            <div className="p-4 md:p-6 text-center space-y-2 lg:hidden">
               <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                 <Sparkles size={10} />
                 Upgrade
               </div>
               <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                 Comparatif des Plans
               </h2>
            </div>

            {/* Main Content: Comparison Grid */}
            <div className="flex-1 p-4 md:p-8 pt-2 md:pt-10 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-stretch pb-8">
              
              {/* GRATUIT (Free) */}
              <div className={`rounded-2xl p-5 border flex flex-col relative z-0 transition-opacity duration-300 ${currentPlan === 'BASIC' || currentPlan === 'TRIAL' ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700' : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                 <div className="space-y-1 mb-4 md:space-y-2 md:mb-6 text-center">
                   <h3 className="text-base md:text-lg font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">Gratuit</h3>
                   <div className="flex items-baseline justify-center gap-1">
                     <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">0$</span>
                   </div>
                   <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Découverte</p>
                 </div>
                 
                 <div className="space-y-2 flex-1">
                   <FeatureItem text="Gestion locale" limited />
                   <FeatureItem text="1 Admin" limited />
                   <FeatureItem text="Bulletins simples" />
                   <FeatureItem text="Pas de Sync" cross />
                 </div>

                 <button 
                  disabled
                  className="w-full mt-4 md:mt-6 py-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold text-[9px] md:text-[10px] uppercase tracking-widest cursor-not-allowed opacity-70"
                 >
                   {currentPlan === 'BASIC' || currentPlan === 'TRIAL' ? 'Choisi' : 'Inclus'}
                 </button>
              </div>

              {/* PRO */}
              <div className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 shadow-lg flex flex-col relative z-10 transition-colors ${currentPlan === 'PRO' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-white/10 hover:border-blue-200 dark:hover:border-blue-900/30'}`}>
                 <div className="space-y-1 mb-4 md:space-y-2 md:mb-6 text-center">
                   <h3 className="text-base md:text-lg font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">Pro</h3>
                   <div className="flex items-baseline justify-center gap-1">
                     <span className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">7$</span>
                     <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">/mois <span className="block text-[8px] text-blue-500 lowercase">(ou 50$/an)</span></span>
                   </div>
                   <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wide">Établissement</p>
                 </div>

                 <div className="space-y-2 flex-1">
                   <FeatureItem text="Élèves illimités" highlight color="text-blue-500" />
                   <FeatureItem text="Bulletins perso." highlight color="text-blue-500" />
                   <FeatureItem text="Excel Export" />
                   <FeatureItem text="Support Email" />
                   <FeatureItem text="Sans Cloud" cross />
                 </div>

                 {currentPlan === 'PRO' ? (
                    <button 
                      disabled
                      className="w-full mt-4 md:mt-6 py-3 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest cursor-default"
                    >
                      Choisi
                    </button>
                 ) : (
                    <button 
                      onClick={() => handleSelectPlan('PRO')}
                      className="w-full mt-4 md:mt-6 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 font-black text-[9px] md:text-[10px] uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors border border-blue-200 dark:border-blue-500/20"
                    >
                      Choisir Pro
                    </button>
                 )}
              </div>

              {/* PLUS (Hero) */}
              <div className={`rounded-2xl p-0.5 shadow-xl relative z-20 top-0 lg:-top-4 lg:-bottom-4 group ${currentPlan === 'PLUS' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                {/* Badge Recommandé */}
                {currentPlan !== 'PLUS' && (
                  <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-3">
                     <div className="bg-amber-400 text-amber-950 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md flex items-center gap-1 min-w-max">
                       <Sparkles size={10} />
                       Recommandé
                     </div>
                  </div>
                )}

                 <div className="bg-white dark:bg-slate-900 h-full w-full rounded-[0.9rem] p-5 md:p-6 flex flex-col relative overflow-hidden">
                   {/* Fond subtil */}
                   <div className={`absolute top-0 right-0 p-8 -mr-8 -mt-8 rounded-full blur-2xl w-32 h-32 pointer-events-none transition-colors duration-500 ${currentPlan === 'PLUS' ? 'bg-emerald-50 dark:bg-emerald-500/5' : 'bg-indigo-50 dark:bg-indigo-500/5 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/10'}`}></div>

                   <div className="space-y-1 mb-4 md:space-y-2 md:mb-6 relative z-10 text-center">
                     <div className={`flex items-center justify-center gap-1.5 mb-1 ${currentPlan === 'PLUS' ? 'text-emerald-500' : 'text-indigo-500'}`}>
                       <Sparkles size={14} fill="currentColor" className="text-amber-400" />
                       <h3 className={`text-lg md:text-xl font-black text-transparent bg-clip-text uppercase tracking-tight ${currentPlan === 'PLUS' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-indigo-600 to-pink-600'}`}>Plus</h3>
                     </div>
                     <div className="flex items-baseline justify-center gap-1">
                       <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white">10$</span>
                       <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">/mois <span className="block text-[8px] text-emerald-200 lowercase">(ou 80$/an)</span></span>
                     </div>
                     <p className="text-[9px] md:text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                       Réseau & Sync
                     </p>
                   </div>

                   <div className="space-y-2 md:space-y-2.5 flex-1 relative z-10">
                     <FeatureItem text="Tout de PRO" highlight bold />
                     <FeatureItem text="Sync Cloud Instant" icon={RefreshCw} highlight bold color={currentPlan === 'PLUS' ? "text-emerald-500" : "text-indigo-500"} />
                     <FeatureItem text="Multi-postes" icon={User} highlight bold color="text-pink-500" />
                     <FeatureItem text="Sauvegarde Auto" icon={ShieldCheck} highlight bold color={currentPlan === 'PLUS' ? "text-emerald-500" : "text-emerald-500"} />
                     <FeatureItem text="Support WhatsApp" highlight />
                   </div>

                   {currentPlan === 'PLUS' ? (
                      <button 
                        disabled
                        className="w-full mt-4 md:mt-6 py-4 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-widest cursor-default relative z-10"
                      >
                        Choisi
                      </button>
                   ) : (
                      <button 
                        onClick={() => handleSelectPlan('PLUS')}
                        className="w-full mt-4 md:mt-6 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all relative z-10"
                      >
                        Passer à Plus
                      </button>
                   )}
                 </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureItem({ text, limited = false, highlight = false, cross = false, bold = false, icon: Icon, color }: { text: string; limited?: boolean; highlight?: boolean; cross?: boolean; bold?: boolean; icon?: any; color?: string }) {
  return (
    <div className={`flex items-start gap-2.5 text-xs ${limited ? 'opacity-60' : ''}`}>
      <div className={`mt-0.5 flex-shrink-0`}>
        {cross ? (
           <div className="text-slate-300 dark:text-slate-600">
             <X size={14} className="md:w-3.5 md:h-3.5 w-3 h-3" />
           </div>
        ) : Icon ? (
           <div className={`p-0.5 rounded-full bg-slate-50 dark:bg-white/5 ${color || 'text-indigo-500'}`}>
             <Icon size={12} className="md:w-3 md:h-3 w-2.5 h-2.5" />
           </div>
        ) : (
          <CheckCircle size={14} className={`${highlight ? (color || 'text-indigo-500') : 'text-slate-300'} md:w-3.5 md:h-3.5 w-3 h-3`} />
        )}
      </div>
      <span className={`${bold ? 'font-bold text-slate-800 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400'} ${cross ? 'text-slate-400 line-through decoration-slate-300' : ''} text-[10px] md:text-xs`}>
        {text}
      </span>
    </div>
  );
}
