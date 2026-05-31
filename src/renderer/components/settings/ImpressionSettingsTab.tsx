import React, { useState, useEffect } from 'react';
// Import du service de gestion des configurations locales (SQLite)
import { settingsService } from '../../services/settingsService';
// Import des toasts d'alertes
import { useToast } from '../../context/ToastContext';
// Import des icônes SVG nécessaires
import { Info, Clipboard, Layers, School, RotateCcw, Check, Sparkles } from '../iconsSvg';

/**
 * Composant ImpressionSettingsTab
 * Permet de régler dynamiquement les tailles de polices et hauteurs de lignes 
 * des coupons de notes, palmarès et bulletins de notes imprimés.
 * Structuré en bi-colonne avec un visualiseur live interactif sur le côté droit.
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

  // État de l'onglet actif dans le panneau de prévisualisation live
  const [previewMode, setPreviewMode] = useState<'coupon' | 'palmares' | 'bulletin'>('bulletin');

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

  // Enregistrement des configurations dans SQLite
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
      
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mise en page & Typographie d'Impression</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Ajustez finement les tailles de police et hauteurs de ligne pour vos documents de sortie physiques ou PDF.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Colonne Gauche : Formulaire de réglage (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Note explicative */}
          <div className="p-4 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/10 dark:border-teal-500/20 rounded-2xl flex items-start gap-3 shadow-sm">
            <Info size={16} className="text-teal-500 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-slate-650 dark:text-slate-400 leading-relaxed font-semibold">
              <span className="font-bold text-slate-800 dark:text-slate-200">Règle de page unique :</span> Si vos bulletins débordent d'une ligne sur une page supplémentaire vierge, réduisez légèrement l'interligne ou la taille des textes ci-dessous pour forcer une parfaite mise en page sur un seul feuillet.
            </div>
          </div>

          <div className="space-y-6">
            
            {/* A. Coupons de notes élèves */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm">
              <button 
                type="button" 
                onClick={() => setPreviewMode('coupon')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Clipboard size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Coupons de notes élèves</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] font-medium">Fiches de cotes périodiques des enseignants</p>
                  </div>
                </div>
                {previewMode === 'coupon' && <span className="text-[8px] bg-blue-500/10 text-blue-600 font-bold px-2 py-0.5 rounded-full">Actif</span>}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/20">
                {/* Taille titre */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Titres</span>
                    <span className="text-blue-500">{couponTitleSize}px</span>
                  </div>
                  <input
                    type="range" min="8" max="22" step="0.5"
                    value={couponTitleSize}
                    onChange={(e) => { setCouponTitleSize(e.target.value); setPreviewMode('coupon'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Taille corps */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Textes</span>
                    <span className="text-blue-500">{couponBodySize}px</span>
                  </div>
                  <input
                    type="range" min="5" max="15" step="0.5"
                    value={couponBodySize}
                    onChange={(e) => { setCouponBodySize(e.target.value); setPreviewMode('coupon'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Interligne */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Interligne</span>
                    <span className="text-blue-500">{couponLineHeight}</span>
                  </div>
                  <input
                    type="range" min="0.7" max="2.0" step="0.05"
                    value={couponLineHeight}
                    onChange={(e) => { setCouponLineHeight(e.target.value); setPreviewMode('coupon'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* B. Palmarès de classe */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm">
              <button 
                type="button" 
                onClick={() => setPreviewMode('palmares')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Layers size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Palmarès de classe</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] font-medium">Tableaux de synthèse générale et délibération</p>
                  </div>
                </div>
                {previewMode === 'palmares' && <span className="text-[8px] bg-indigo-500/10 text-indigo-600 font-bold px-2 py-0.5 rounded-full">Actif</span>}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/20">
                {/* Taille titre */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Titres</span>
                    <span className="text-indigo-500">{palmaresTitleSize}px</span>
                  </div>
                  <input
                    type="range" min="10" max="24" step="0.5"
                    value={palmaresTitleSize}
                    onChange={(e) => { setPalmaresTitleSize(e.target.value); setPreviewMode('palmares'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Taille corps */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Textes</span>
                    <span className="text-indigo-500">{palmaresBodySize}px</span>
                  </div>
                  <input
                    type="range" min="6" max="16" step="0.5"
                    value={palmaresBodySize}
                    onChange={(e) => { setPalmaresBodySize(e.target.value); setPreviewMode('palmares'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Interligne */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Interligne</span>
                    <span className="text-indigo-500">{palmaresLineHeight}</span>
                  </div>
                  <input
                    type="range" min="0.7" max="2.0" step="0.05"
                    value={palmaresLineHeight}
                    onChange={(e) => { setPalmaresLineHeight(e.target.value); setPreviewMode('palmares'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* C. Bulletins scolaires */}
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-5 space-y-4 shadow-sm">
              <button 
                type="button" 
                onClick={() => setPreviewMode('bulletin')}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <School size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">Bulletins officiels</h3>
                    <p className="text-slate-400 dark:text-slate-500 text-[9px] font-medium">Relevés de fin de trimestre et fiches de réussite</p>
                  </div>
                </div>
                {previewMode === 'bulletin' && <span className="text-[8px] bg-emerald-500/10 text-emerald-600 font-bold px-2 py-0.5 rounded-full">Actif</span>}
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/20">
                {/* Taille titre */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Titres</span>
                    <span className="text-emerald-500">{bulletinTitleSize}px</span>
                  </div>
                  <input
                    type="range" min="10" max="26" step="0.5"
                    value={bulletinTitleSize}
                    onChange={(e) => { setBulletinTitleSize(e.target.value); setPreviewMode('bulletin'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Taille corps */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Textes</span>
                    <span className="text-emerald-500">{bulletinBodySize}px</span>
                  </div>
                  <input
                    type="range" min="6" max="16" step="0.5"
                    value={bulletinBodySize}
                    onChange={(e) => { setBulletinBodySize(e.target.value); setPreviewMode('bulletin'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                {/* Interligne */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Interligne</span>
                    <span className="text-emerald-500">{bulletinLineHeight}</span>
                  </div>
                  <input
                    type="range" min="0.7" max="2.5" step="0.05"
                    value={bulletinLineHeight}
                    onChange={(e) => { setBulletinLineHeight(e.target.value); setPreviewMode('bulletin'); }}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Boutons d'actions */}
          <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="flex items-center gap-2 px-4 py-2 border border-slate-250 dark:border-slate-800 text-slate-650 dark:text-slate-455 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl text-xs font-semibold transition-all"
            >
              <RotateCcw size={13} />
              Valeurs d'usine
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-650 hover:from-teal-700 hover:to-emerald-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-teal-500/10"
            >
              <Check size={13} />
              Appliquer les dimensions
            </button>
          </div>

        </div>

        {/* Colonne Droite : Visualiseur live interactif de mise en page (5/12) */}
        <div className="lg:col-span-5 sticky top-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Visualiseur typographique live</div>
            
            {/* Toggles de sélection rapide */}
            <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5">
              {(['coupon', 'palmares', 'bulletin'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`px-2 py-1 text-[8px] font-extrabold uppercase rounded-md transition-all ${
                    previewMode === mode
                      ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm border border-slate-200/20'
                      : 'text-slate-400 dark:text-slate-550'
                  }`}
                >
                  {mode === 'coupon' ? 'Coupon' : mode === 'palmares' ? 'Palmarès' : 'Bulletin'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-md relative overflow-hidden font-serif">
            
            {/* Rendu dynamique : Coupon */}
            {previewMode === 'coupon' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div 
                  className="font-bold uppercase tracking-tight text-center border-b border-dashed border-slate-300 dark:border-slate-800 pb-2 text-slate-900 dark:text-white"
                  style={{ fontSize: `${couponTitleSize}px`, lineHeight: couponLineHeight }}
                >
                  COUPON : KADIMA NGOY
                </div>
                <div 
                  className="space-y-1 font-sans text-slate-700 dark:text-slate-350 text-[10px] font-medium"
                  style={{ fontSize: `${couponBodySize}px`, lineHeight: couponLineHeight }}
                >
                  <div className="flex justify-between"><span>Mathématiques</span> <span className="font-bold">17.5 / 20</span></div>
                  <div className="flex justify-between"><span>Langue Française</span> <span className="font-bold">14.0 / 20</span></div>
                  <div className="flex justify-between"><span>Physique</span> <span className="font-bold">16.0 / 20</span></div>
                </div>
                <div className="text-[7px] font-mono text-center text-slate-400 border-t border-dashed border-slate-200 dark:border-slate-900 pt-2">
                  Généré par Schoolab Pro • DRC EPST
                </div>
              </div>
            )}

            {/* Rendu dynamique : Palmarès */}
            {previewMode === 'palmares' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div 
                  className="font-extrabold uppercase tracking-tight text-center text-slate-900 dark:text-white"
                  style={{ fontSize: `${palmaresTitleSize}px`, lineHeight: palmaresLineHeight }}
                >
                  PALMARÈS : 8ème RÉSIDENCE A
                </div>
                <div className="overflow-x-auto">
                  <table 
                    className="w-full border border-slate-300 dark:border-slate-800 border-collapse text-left font-sans text-[10px]"
                    style={{ fontSize: `${palmaresBodySize}px`, lineHeight: palmaresLineHeight }}
                  >
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-350 dark:border-slate-800 font-bold text-slate-500">
                        <th className="p-1 border-r border-slate-300 dark:border-slate-800">Élève</th>
                        <th className="p-1 text-center">%</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-800 dark:text-slate-300 font-medium">
                      <tr className="border-b border-slate-250 dark:border-slate-850">
                        <td className="p-1 border-r border-slate-250 dark:border-slate-850 font-bold text-slate-900 dark:text-white">MUTOMBO ILUNGA</td>
                        <td className="p-1 text-center font-bold text-emerald-650">84.2%</td>
                      </tr>
                      <tr>
                        <td className="p-1 border-r border-slate-250 dark:border-slate-850 font-bold text-slate-900 dark:text-white">KABANGE MPUNGU</td>
                        <td className="p-1 text-center font-bold text-emerald-650">76.8%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rendu dynamique : Bulletin */}
            {previewMode === 'bulletin' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div 
                  className="font-black uppercase tracking-tight text-center border-2 border-slate-900 dark:border-white p-2 text-slate-900 dark:text-white"
                  style={{ fontSize: `${bulletinTitleSize}px`, lineHeight: bulletinLineHeight }}
                >
                  BULLETIN D'ÉVALUATION
                </div>
                <div 
                  className="space-y-1.5 text-center font-sans text-slate-700 dark:text-slate-350 text-[10px] font-semibold"
                  style={{ fontSize: `${bulletinBodySize}px`, lineHeight: bulletinLineHeight }}
                >
                  <p>Nom complet : <span className="font-bold text-slate-900 dark:text-white">TSEKEDI WA TSEKEDI</span></p>
                  <p>Classe : <span className="font-bold text-slate-900 dark:text-white">7ème Année Enseignement de Base</span></p>
                  <p>Moyenne Générale : <span className="font-extrabold text-emerald-655">81.4% (Application)</span></p>
                </div>
                <div className="h-6"></div>
              </div>
            )}

          </div>

          {/* Sceau de calibrage */}
          <div className="p-5 bg-teal-500/5 dark:bg-teal-500/10 border border-teal-500/10 dark:border-teal-500/20 rounded-2xl space-y-1.5 shadow-sm">
            <h5 className="text-[10px] font-bold text-teal-600 dark:text-teal-455 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" /> Calibrage Typographique
            </h5>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
              Notre module d'édition dynamique calcule automatiquement la densité des cotes en fonction de vos curseurs de taille afin d'équilibrer l'impression. Il évite intelligemment les retours à la ligne indésirables sur les imprimantes de bureau.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
