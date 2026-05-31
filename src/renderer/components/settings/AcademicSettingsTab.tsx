import React, { useState, useEffect } from 'react';
// Icônes SVG modernes
import { 
  Check, 
  RefreshCw, 
  Info, 
  GraduationCap, 
  Clock, 
  User, 
  RotateCcw,
  Sparkles
} from '../iconsSvg';
// Service de persistence des réglages locaux (SQLite)
import { settingsService } from '../../services/settingsService';
// Toast context pour notifications esthétiques
import { useToast } from '../../context/ToastContext';

/**
 * Composant AcademicSettingsTab
 * Permet de définir les cycles d'évaluation (trimestres/semestres),
 * les maximaux par défaut des épreuves et l'identité des signataires officiels des bulletins.
 * Dispose d'une interface bi-colonne avec aperçu de signature officiel sur la droite.
 */
export default function AcademicSettingsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // États locaux des configurations académiques
  const [academicDivision, setAcademicDivision] = useState('TRIMESTRE');
  const [periodsPerTerm, setPeriodsPerTerm] = useState('2');
  
  // États locaux des maximaux par défaut
  const [maxInterro, setMaxInterro] = useState('20');
  const [maxExamen, setMaxExamen] = useState('40');
  const [maxConduite, setMaxConduite] = useState('20');

  // États locaux des signataires officiels
  const [signatoryTitle, setSignatoryTitle] = useState('Le Préfet des Études');
  const [signatoryName, setSignatoryName] = useState('M. Masolo Kabasele');
  const [signatorySecTitle, setSignatorySecTitle] = useState('Le Titulaire de la Classe');
  const [schoolCity, setSchoolCity] = useState('Kinshasa');

  // Chargement des données au montage du composant
  useEffect(() => {
    async function loadAcademicSettings() {
      try {
        const division = await settingsService.get('academic_division') || 'TRIMESTRE';
        const periods = await settingsService.get('periods_per_term') || '2';
        const interro = await settingsService.get('max_interro') || '20';
        const examen = await settingsService.get('max_examen') || '40';
        const conduite = await settingsService.get('max_conduite') || '20';
        const sigTitle = await settingsService.get('signatory_title') || 'Le Préfet des Études';
        const sigName = await settingsService.get('signatory_name') || 'M. Masolo Kabasele';
        const sigSecTitle = await settingsService.get('signatory_sec_title') || 'Le Titulaire de la Classe';
        const city = await settingsService.get('school_city') || 'Kinshasa';

        setAcademicDivision(division);
        setPeriodsPerTerm(periods);
        setMaxInterro(interro);
        setMaxExamen(examen);
        setMaxConduite(conduite);
        setSignatoryTitle(sigTitle);
        setSignatoryName(sigName);
        setSignatorySecTitle(sigSecTitle);
        setSchoolCity(city);
      } catch (err) {
        console.error("Échec de la récupération des configurations académiques :", err);
      }
    }
    loadAcademicSettings();
  }, []);

  // Enregistrement des configurations académiques
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.set('academic_division', academicDivision);
      await settingsService.set('periods_per_term', periodsPerTerm);
      await settingsService.set('max_interro', maxInterro);
      await settingsService.set('max_examen', maxExamen);
      await settingsService.set('max_conduite', maxConduite);
      await settingsService.set('signatory_title', signatoryTitle.trim());
      await settingsService.set('signatory_name', signatoryName.trim());
      await settingsService.set('signatory_sec_title', signatorySecTitle.trim());

      toast.success("Configurations académiques enregistrées avec succès !");
      
      // Dispatch d'événement global pour forcer le rafraîchissement
      try {
        window.dispatchEvent(new CustomEvent('db:changed', { detail: {} }));
      } catch (err) {}
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement en BDD.");
    } finally {
      setSaving(false);
    }
  };

  // Restauration des configurations par défaut d'usine
  const handleRestoreDefaults = () => {
    setAcademicDivision('TRIMESTRE');
    setPeriodsPerTerm('2');
    setMaxInterro('20');
    setMaxExamen('40');
    setMaxConduite('20');
    setSignatoryTitle('Le Préfet des Études');
    setSignatoryName('M. Masolo Kabasele');
    setSignatorySecTitle('Le Titulaire de la Classe');
    toast.success("Valeurs par défaut restaurées en local. Pensez à enregistrer.");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* En-tête de section */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Configuration Académique</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Définissez les divisions scolaires, les barèmes par défaut d'encodage et les signataires des diplômes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Formulaire de configuration (colonne gauche : 7/12) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          
          {/* Note informative */}
          <div className="p-4 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 dark:border-purple-500/20 rounded-2xl flex items-start gap-3 shadow-sm">
            <Info size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              Ces valeurs définissent la structure par défaut appliquée lors de la création d'une nouvelle matière ou de l'impression des bas de pages de bulletins élèves.
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 space-y-5 shadow-sm">
            
            {/* 1. Régime temporel (Trimestres / Semestres) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} className="text-purple-500" /> Division de l'Année
                </label>
                <select
                  value={academicDivision}
                  onChange={(e) => setAcademicDivision(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                >
                  <option value="TRIMESTRE">Régime Trimestriel (3 trim.)</option>
                  <option value="SEMESTRE">Régime Semestriel (2 sem.)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={12} className="text-purple-500" /> Périodes par Session
                </label>
                <select
                  value={periodsPerTerm}
                  onChange={(e) => setPeriodsPerTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 transition-all shadow-sm"
                >
                  <option value="1">1 Période par session</option>
                  <option value="2">2 Périodes par session (DRC Standard)</option>
                  <option value="3">3 Périodes par session</option>
                </select>
              </div>

            </div>

            {/* 2. Maximaux scolaires par défaut */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Maximaux par défaut des épreuves</h4>
              
              <div className="grid grid-cols-3 gap-3">
                
                {/* Interro */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Interrogation</label>
                  <input
                    type="number"
                    value={maxInterro}
                    onChange={(e) => setMaxInterro(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-purple-500/10 text-xs font-bold text-slate-900 dark:text-white outline-none"
                    placeholder="20"
                  />
                </div>

                {/* Examen */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Examen</label>
                  <input
                    type="number"
                    value={maxExamen}
                    onChange={(e) => setMaxExamen(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-purple-500/10 text-xs font-bold text-slate-900 dark:text-white outline-none"
                    placeholder="40"
                  />
                </div>

                {/* Conduite */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Conduite max</label>
                  <input
                    type="number"
                    value={maxConduite}
                    onChange={(e) => setMaxConduite(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-purple-500/10 text-xs font-bold text-slate-900 dark:text-white outline-none"
                    placeholder="20"
                  />
                </div>

              </div>
            </div>

            {/* 3. Signataires officiels */}
            <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-3">
              <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Signataires des Bulletins</h4>
              
              <div className="space-y-3">
                
                {/* Titre Prefet */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Titre du Chef d'établissement</label>
                    <input
                      type="text"
                      value={signatoryTitle}
                      onChange={(e) => setSignatoryTitle(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                      placeholder="Le Préfet des Études"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nom complet du Chef</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                      placeholder="M. Masolo Kabasele"
                    />
                  </div>
                </div>

                {/* Titre Secondaire */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Titre du signataire secondaire</label>
                  <input
                    type="text"
                    value={signatorySecTitle}
                    onChange={(e) => setSignatorySecTitle(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    placeholder="Le Titulaire de la Classe"
                  />
                </div>

              </div>
            </div>

          </div>

          {/* Actions boutons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="flex items-center gap-2 px-4 py-2 border border-slate-250 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-white rounded-xl text-xs font-bold transition-all"
            >
              <RotateCcw size={13} />
              Valeurs d'usine
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-purple-500/10"
            >
              {saving ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              Enregistrer
            </button>
          </div>

        </form>

        {/* Colonne droite : Aperçu live de la signature imprimée (colonne droite : 5/12) */}
        <div className="lg:col-span-5 space-y-6 sticky top-6">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">Aperçu du bloc de signature</div>
          
          <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm relative overflow-hidden font-serif">
            
            <div className="text-[8px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 text-center mb-4">
              Bas de page des Bulletins d'Évaluation
            </div>

            <div className="grid grid-cols-2 gap-4 text-[9px] text-slate-800 dark:text-slate-300 leading-relaxed">
              
              {/* Signataire Secondaire (Titulaire) */}
              <div className="text-center border-r border-dashed border-slate-250 dark:border-slate-850 pr-2">
                <div className="font-bold underline">{signatorySecTitle || 'Le Titulaire'}</div>
                <div className="h-16"></div>
                <div className="text-[8px] italic text-slate-400">(Signature libre)</div>
              </div>

              {/* Signataire Principal (Préfet) */}
              <div className="text-center">
                <div className="font-medium">
                  Fait à <span className="font-bold">{schoolCity || 'Kinshasa'}</span>, le <span className="font-bold">__/__/20__</span>
                </div>
                <div className="font-bold underline mt-1">{signatoryTitle || 'Le Préfet des Études'}</div>
                
                {/* Simulation de tampon de l'école */}
                <div className="my-2.5 mx-auto w-14 h-14 rounded-full border-2 border-dashed border-blue-500/30 flex items-center justify-center text-[7px] font-bold uppercase text-blue-500/40 rotate-12">
                  Sceau École
                </div>

                <div className="font-bold text-slate-900 dark:text-white mt-1">
                  {signatoryName || 'M. Masolo Kabasele'}
                </div>
              </div>

            </div>

          </div>

          {/* Guide méthodologique */}
          <div className="p-5 bg-purple-500/5 dark:bg-purple-500/10 border border-purple-500/10 dark:border-purple-500/20 rounded-2xl space-y-1.5 shadow-sm">
            <h5 className="text-[10px] font-bold text-purple-600 dark:text-purple-455 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" /> Cohérence des Signatures
            </h5>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
              Afin de respecter la réglementation nationale du Secrétariat Général à l'EPST, le titre et le nom complet du responsable doivent obligatoirement figurer sous l'emplacement réservé à la signature manuscrite pour authentifier les moyennes scolaires.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
