import React, { useState, useEffect } from 'react';
// Import du service de gestion des configurations locales (SQLite)
import { settingsService } from '../../services/settingsService';
// Import des toasts d'alertes
import { useToast } from '../../context/ToastContext';
// Import des icônes SVG nécessaires
import { Info, Clipboard, Layers, School, RotateCcw, Check } from '../iconsSvg';

/**
 * Composant ImpressionSettingsTab
 * Permet de régler dynamiquement les tailles de polices et hauteurs de lignes 
 * des coupons de notes, palmarès et bulletins de notes imprimés.
 */
export default function ImpressionSettingsTab() {
  const toast = useToast();
  
  // États de chargement
  const [loading, setLoading] = useState(false);

  // Tailles de polices et hauteurs de ligne pour les coupons
  const [couponTitleSize, setCouponTitleSize] = useState('14');
  const [couponBodySize, setCouponBodySize] = useState('10');
  const [couponLineHeight, setCouponLineHeight] = useState('1.2');

  // Tailles de polices et hauteurs de ligne pour les palmarès
  const [palmaresTitleSize, setPalmaresTitleSize] = useState('15');
  const [palmaresBodySize, setPalmaresBodySize] = useState('10');
  const [palmaresLineHeight, setPalmaresLineHeight] = useState('1.2');

  // Tailles de polices et hauteurs de ligne pour les bulletins
  const [bulletinTitleSize, setBulletinTitleSize] = useState('16');
  const [bulletinBodySize, setBulletinBodySize] = useState('10');
  const [bulletinLineHeight, setBulletinLineHeight] = useState('1.3');

  // Au chargement initial, on récupère les configurations d'impression de la BDD
  useEffect(() => {
    async function loadImpressionSettings() {
      try {
        const cTitle = await settingsService.get('coupon_font_size_title') || '14';
        const cBody = await settingsService.get('coupon_font_size_body') || '10';
        const cHeight = await settingsService.get('coupon_line_height') || '1.2';
        setCouponTitleSize(cTitle);
        setCouponBodySize(cBody);
        setCouponLineHeight(cHeight);

        const pTitle = await settingsService.get('palmares_font_size_title') || '15';
        const pBody = await settingsService.get('palmares_font_size_body') || '10';
        const pHeight = await settingsService.get('palmares_line_height') || '1.2';
        setPalmaresTitleSize(pTitle);
        setPalmaresBodySize(pBody);
        setPalmaresLineHeight(pHeight);

        const bTitle = await settingsService.get('bulletin_font_size_title') || '16';
        const bBody = await settingsService.get('bulletin_font_size_body') || '10';
        const bHeight = await settingsService.get('bulletin_line_height') || '1.3';
        setBulletinTitleSize(bTitle);
        setBulletinBodySize(bBody);
        setBulletinLineHeight(bHeight);
      } catch (err) {
        console.error("Erreur lors de la lecture des configurations d'impression :", err);
      }
    }
    loadImpressionSettings();
  }, []);

  // Enregistrement des configurations
  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await settingsService.set('coupon_font_size_title', couponTitleSize);
      await settingsService.set('coupon_font_size_body', couponBodySize);
      await settingsService.set('coupon_line_height', couponLineHeight);

      await settingsService.set('palmares_font_size_title', palmaresTitleSize);
      await settingsService.set('palmares_font_size_body', palmaresBodySize);
      await settingsService.set('palmares_line_height', palmaresLineHeight);

      await settingsService.set('bulletin_font_size_title', bulletinTitleSize);
      await settingsService.set('bulletin_font_size_body', bulletinBodySize);
      await settingsService.set('bulletin_line_height', bulletinLineHeight);

      toast.success("Réglages d'impression enregistrés avec succès !");
      
      // Envoi d'un événement global pour recharger les écrans d'impression ouverts
      try {
        window.dispatchEvent(new CustomEvent('db:changed', { detail: {} }));
      } catch (e) {}
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  // Restauration des configurations par défaut d'usine
  const handleRestoreDefaults = () => {
    setCouponTitleSize('14');
    setCouponBodySize('10');
    setCouponLineHeight('1.2');
    setPalmaresTitleSize('15');
    setPalmaresBodySize('10');
    setPalmaresLineHeight('1.2');
    setBulletinTitleSize('16');
    setBulletinBodySize('10');
    setBulletinLineHeight('1.3');
    toast.success("Valeurs par défaut restaurées. N'oubliez pas d'enregistrer.");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Titre et description */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mise en page d'Impression</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Ajustez finement les tailles de police et hauteurs de ligne pour vos documents de sortie.
        </p>
      </div>
      
      <div className="space-y-8">
        
        {/* Notice d'aide à la mise en page */}
        <div className="p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 rounded-2xl flex items-start gap-3.5 shadow-sm">
          <Info size={18} className="text-indigo-500 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <div className="text-[12px] text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200">Conseil d'ajustement :</span> Si vous constatez qu'un document (comme un bulletin) déborde de quelques lignes sur une page blanche supplémentaire, réduisez légèrement l'interligne ou la taille des textes ci-dessous pour le faire tenir sur une seule page.
          </div>
        </div>

        <div className="space-y-6">
          
          {/* A. Coupons de notes élèves */}
          <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                <Clipboard size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Coupons de notes élèves</h3>
                <p className="text-slate-400 dark:text-slate-500 text-[11px]">Polices et hauteur de ligne des fiches de cotes semestrielles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Taille titre */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Taille Titres</span>
                  <span className="text-blue-600 dark:text-blue-455">{couponTitleSize} px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="24"
                  step="0.5"
                  value={couponTitleSize}
                  onChange={(e) => setCouponTitleSize(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>

              {/* Taille corps */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Taille Textes</span>
                  <span className="text-blue-600 dark:text-blue-455">{couponBodySize} px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="16"
                  step="0.5"
                  value={couponBodySize}
                  onChange={(e) => setCouponBodySize(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>

              {/* Hauteur de ligne */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Interligne (Hauteur)</span>
                  <span className="text-blue-600 dark:text-blue-455">{couponLineHeight}</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="2.0"
                  step="0.05"
                  value={couponLineHeight}
                  onChange={(e) => setCouponLineHeight(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Aperçu simulé interactif */}
            <div className="border border-slate-200/60 dark:border-white/5 rounded-2xl bg-white dark:bg-slate-950 p-4 relative overflow-hidden shadow-sm">
              <span className="absolute top-3 right-3 text-[9px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-550 bg-slate-105 dark:bg-slate-900 px-2 py-1 rounded-md">Aperçu Coupon</span>
              <div className="space-y-2.5 border-2 border-dashed border-slate-300 dark:border-slate-800 p-4 font-serif text-slate-800 dark:text-slate-200 max-w-md bg-slate-50/30 dark:bg-slate-900/10 rounded-xl">
                <div className="uppercase font-bold tracking-tight text-center border-b border-dashed border-slate-350 dark:border-slate-700 pb-1.5" style={{ fontSize: `${couponTitleSize}px`, lineHeight: couponLineHeight }}>
                  COUPON ÉLÈVE : MBALA KADI
                </div>
                <div className="grid grid-cols-2 gap-2 text-left font-medium text-xs" style={{ fontSize: `${couponBodySize}px`, lineHeight: couponLineHeight }}>
                  <p>Mathématiques : 18/20</p>
                  <p>Français : 14/20</p>
                  <p>Science : 16/20</p>
                  <p>Histoire : 12/20</p>
                </div>
              </div>
            </div>
          </div>

          {/* B. Palmarès de classe */}
          <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Palmarès de classe</h3>
                <p className="text-slate-400 dark:text-slate-500 text-[11px]">Polices et interlignes des tableaux de synthèse récapitulative</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Taille titres */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Taille Titres</span>
                  <span className="text-indigo-600 dark:text-indigo-455">{palmaresTitleSize} px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="26"
                  step="0.5"
                  value={palmaresTitleSize}
                  onChange={(e) => setPalmaresTitleSize(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
              </div>

              {/* Taille corps */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Taille Textes</span>
                  <span className="text-indigo-600 dark:text-indigo-455">{palmaresBodySize} px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="18"
                  step="0.5"
                  value={palmaresBodySize}
                  onChange={(e) => setPalmaresBodySize(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
              </div>

              {/* Interligne */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Interligne (Hauteur)</span>
                  <span className="text-indigo-600 dark:text-indigo-455">{palmaresLineHeight}</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="2.0"
                  step="0.05"
                  value={palmaresLineHeight}
                  onChange={(e) => setPalmaresLineHeight(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Aperçu simulé palmarès */}
            <div className="border border-slate-200/60 dark:border-white/5 rounded-2xl bg-white dark:bg-slate-950 p-4 relative overflow-hidden shadow-sm">
              <span className="absolute top-3 right-3 text-[9px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-550 bg-slate-105 dark:bg-slate-900 px-2 py-1 rounded-md">Aperçu Palmarès</span>
              <div className="space-y-3 text-slate-800 dark:text-slate-200 max-w-md">
                <div className="font-extrabold text-center" style={{ fontSize: `${palmaresTitleSize}px`, lineHeight: palmaresLineHeight }}>
                  PALMARÈS DE LA CLASSE DE 1ère A
                </div>
                <table className="w-full border border-slate-350 dark:border-slate-800 border-collapse text-xs" style={{ fontSize: `${palmaresBodySize}px`, lineHeight: palmaresLineHeight }}>
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-350 dark:border-slate-800 font-bold">
                      <th className="border-r border-slate-300 dark:border-slate-800 p-1.5 text-left">Nom de l'élève</th>
                      <th className="border-r border-slate-300 dark:border-slate-800 p-1.5 text-center">%</th>
                      <th className="p-1.5 text-center">Conduite</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 dark:border-slate-900/50">
                      <td className="border-r border-slate-200 dark:border-slate-900 p-1.5 font-medium">KALONJI MBIKAY</td>
                      <td className="border-r border-slate-200 dark:border-slate-900 p-1.5 text-center font-bold">82.5%</td>
                      <td className="p-1.5 text-center text-slate-500 font-medium">Excellente</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* C. Bulletins scolaires */}
          <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 space-y-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                <School size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Bulletins scolaires</h3>
                <p className="text-slate-400 dark:text-slate-500 text-[11px]">Polices et interlignes des bulletins officiels trimestriels et annuels</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Taille titres */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Taille Titres</span>
                  <span className="text-emerald-600 dark:text-emerald-455">{bulletinTitleSize} px</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="26"
                  step="0.5"
                  value={bulletinTitleSize}
                  onChange={(e) => setBulletinTitleSize(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
              </div>

              {/* Taille corps */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Taille Textes</span>
                  <span className="text-emerald-600 dark:text-emerald-455">{bulletinBodySize} px</span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="18"
                  step="0.5"
                  value={bulletinBodySize}
                  onChange={(e) => setBulletinBodySize(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
              </div>

              {/* Interligne */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Interligne (Hauteur)</span>
                  <span className="text-emerald-600 dark:text-emerald-455">{bulletinLineHeight}</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="2.5"
                  step="0.05"
                  value={bulletinLineHeight}
                  onChange={(e) => setBulletinLineHeight(e.target.value)}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-850 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Aperçu simulé bulletin */}
            <div className="border border-slate-200/60 dark:border-white/5 rounded-2xl bg-white dark:bg-slate-950 p-4 relative overflow-hidden shadow-sm">
              <span className="absolute top-3 right-3 text-[9px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-550 bg-slate-105 dark:bg-slate-900 px-2 py-1 rounded-md">Aperçu Bulletin</span>
              <div className="space-y-3 font-serif text-slate-850 dark:text-slate-150 max-w-md">
                <div className="font-bold text-center border-2 border-slate-900 dark:border-slate-100 p-2.5 rounded-lg" style={{ fontSize: `${bulletinTitleSize}px`, lineHeight: bulletinLineHeight }}>
                  BULLETIN D'ÉVALUATION SCOLAIRE
                </div>
                <p className="text-center font-medium" style={{ fontSize: `${bulletinBodySize}px`, lineHeight: bulletinLineHeight }}>
                  Élève : TOKO MANZO | Sexe : M | Province : KINSHASA
                </p>
              </div>
            </div>
          </div>

          {/* Boutons d'actions de bas de page (Restauration et Sauvegarde) */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-6 border-t border-slate-100 dark:border-white/5">
            
            {/* Restaurer par défaut */}
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="flex items-center justify-center gap-2 px-5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white rounded-2xl text-xs font-bold transition-all"
            >
              <RotateCcw size={14} />
              Restaurer les valeurs par défaut
            </button>

            {/* Enregistrer les configurations */}
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-500/10"
            >
              <Check size={14} />
              Enregistrer les réglages
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
