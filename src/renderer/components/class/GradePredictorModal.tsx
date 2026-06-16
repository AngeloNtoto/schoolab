/**
 * GradePredictorModal.tsx
 *
 * Modal de prédiction des notes manquantes.
 *
 * CORRECTION BUG : Les filtres élèves, matières et périodes étaient mutuellement
 * exclusifs (radio buttons). Maintenant ils sont COMBINABLES : on peut sélectionner
 * des élèves précis ET des matières précises ET des périodes précises en même temps.
 * Le backend Rust supporte déjà cette combinaison via student_ids + subject_ids + periods.
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, X, ChevronDown } from '../iconsSvg';
import { PredictionResult } from '../../services/predictionService';

interface GradePredictorModalProps {
  isOpen: boolean;
  isLoading: boolean;
  results: PredictionResult[];
  error?: string | null;
  classId: number;
  subjects: Array<{ id: number; name: string }>;
  students: Array<{ id: number; name: string }>;
  onPredict: (params: {
    classId: number;
    studentIds?: number[];
    subjectIds?: number[];
    periods?: string[];
    confidenceThreshold: number;
  }) => Promise<void>;
  onApply: (results: PredictionResult[]) => Promise<void>;
  onClose: () => void;
}

const ALL_PERIODS = ['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'];

export const GradePredictorModal: React.FC<GradePredictorModalProps> = ({
  isOpen,
  isLoading,
  results,
  error,
  classId,
  subjects,
  students,
  onPredict,
  onApply,
  onClose
}) => {
  // --- Filtres indépendants et combinables ---
  // Listes vides = "tous" (pas de filtre)
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(60);

  // --- Résultats ---
  const [filteredResults, setFilteredResults] = useState<PredictionResult[]>(results);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  // Sections dépliables pour les listes longues
  const [showStudents, setShowStudents] = useState(false);
  const [showSubjects, setShowSubjects] = useState(false);

  // Filtrer selon le seuil de confiance à chaque changement
  useEffect(() => {
    setFilteredResults(results.filter(r => r.confidence >= confidenceThreshold));
  }, [results, confidenceThreshold]);

  // Pré-sélectionner TOUS les résultats filtrés dès qu'ils arrivent
  useEffect(() => {
    if (filteredResults.length > 0) {
      setSelectedResults(filteredResults.map((_, idx) => idx));
    }
  }, [filteredResults]);

  /**
   * Lance la prédiction avec les filtres combinés.
   * Les listes vides signifient "pas de filtre" (tous).
   */
  const handlePredict = async () => {
    try {
      setSelectedResults([]);
      await onPredict({
        classId,
        // Passer undefined si aucune sélection (= pas de filtre = tous)
        studentIds: selectedStudents.length > 0 ? selectedStudents : undefined,
        subjectIds: selectedSubjects.length > 0 ? selectedSubjects : undefined,
        periods: selectedPeriods.length > 0 ? selectedPeriods : undefined,
        confidenceThreshold
      });
    } catch (err) {
      console.error('Prediction failed:', err);
    }
  };

  const handleApply = async () => {
    const applicableResults = filteredResults.filter((_, idx) => selectedResults.includes(idx));
    if (applicableResults.length === 0) return;

    setIsApplying(true);
    try {
      await onApply(applicableResults);
      onClose();
    } catch (err) {
      console.error('Apply failed:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const toggleResultSelection = (idx: number) => {
    setSelectedResults(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const toggleAllResults = () => {
    if (selectedResults.length === filteredResults.length) {
      setSelectedResults([]);
    } else {
      setSelectedResults(filteredResults.map((_, idx) => idx));
    }
  };

  // Helpers toggle pour chaque filtre
  const toggleStudent = (id: number) =>
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const toggleSubject = (id: number) =>
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const togglePeriod = (p: string) =>
    setSelectedPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  // Tout sélectionner / désélectionner
  const toggleAllStudents = () =>
    setSelectedStudents(prev => prev.length === students.length ? [] : students.map(s => s.id));

  const toggleAllSubjects = () =>
    setSelectedSubjects(prev => prev.length === subjects.length ? [] : subjects.map(s => s.id));

  const toggleAllPeriods = () =>
    setSelectedPeriods(prev => prev.length === ALL_PERIODS.length ? [] : [...ALL_PERIODS]);

  if (!isOpen) return null;

  // Résumé du filtre actif pour affichage
  const filterSummary = [
    selectedStudents.length > 0 ? `${selectedStudents.length} élève${selectedStudents.length > 1 ? 's' : ''}` : null,
    selectedSubjects.length > 0 ? `${selectedSubjects.length} matière${selectedSubjects.length > 1 ? 's' : ''}` : null,
    selectedPeriods.length > 0 ? selectedPeriods.join(', ') : null,
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#020617] rounded-[2rem] shadow-2xl border border-slate-200 dark:border-white/10 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="bg-purple-600 px-6 py-5 flex justify-between items-center shrink-0">
          <div>
            <p className="text-purple-200/60 font-black uppercase tracking-widest text-[9px] mb-1">Intelligence Artificielle</p>
            <h2 className="text-xl font-black text-white">Prédire Notes Manquantes</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Zone de configuration — visible tant qu'il n'y a pas de résultats */}
          {!results.length && !isLoading && (
            <>
              {/* ---- FILTRES COMBINABLES ---- */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
                  <h3 className="font-black text-sm text-slate-700 dark:text-slate-200">
                    Filtres de prédiction
                    <span className="ml-2 text-[10px] font-normal text-slate-400">(cumulables — vide = tous)</span>
                  </h3>
                  {/* Résumé des filtres actifs */}
                  {filterSummary.length > 0 && (
                    <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-1">
                      Filtres actifs : {filterSummary.join(' · ')}
                    </p>
                  )}
                </div>

                {/* Filtre élèves */}
                <div className="border-b border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => setShowStudents(!showStudents)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Élèves</span>
                      {selectedStudents.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black">
                          {selectedStudents.length} sélectionné{selectedStudents.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {selectedStudents.length === 0 && (
                        <span className="text-[10px] text-slate-400">tous ({students.length})</span>
                      )}
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${showStudents ? 'rotate-180' : ''}`} />
                  </button>
                  {showStudents && (
                    <div className="px-4 pb-3">
                      {/* Bouton tout sélectionner/désélectionner */}
                      <button
                        onClick={toggleAllStudents}
                        className="text-[10px] font-black text-purple-600 dark:text-purple-400 mb-2 hover:underline"
                      >
                        {selectedStudents.length === students.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                      </button>
                      <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                        {students.map(s => (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 rounded-lg transition-colors ${
                              selectedStudents.includes(s.id)
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(s.id)}
                              onChange={() => toggleStudent(s.id)}
                              className="w-3.5 h-3.5 accent-purple-600 shrink-0"
                            />
                            <span className="truncate font-medium">{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filtre matières */}
                <div className="border-b border-slate-200 dark:border-white/10">
                  <button
                    onClick={() => setShowSubjects(!showSubjects)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Matières</span>
                      {selectedSubjects.length > 0 && (
                        <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-black">
                          {selectedSubjects.length} sélectionnée{selectedSubjects.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {selectedSubjects.length === 0 && (
                        <span className="text-[10px] text-slate-400">toutes ({subjects.length})</span>
                      )}
                    </div>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${showSubjects ? 'rotate-180' : ''}`} />
                  </button>
                  {showSubjects && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={toggleAllSubjects}
                        className="text-[10px] font-black text-purple-600 dark:text-purple-400 mb-2 hover:underline"
                      >
                        {selectedSubjects.length === subjects.length ? 'Désélectionner tout' : 'Sélectionner tout'}
                      </button>
                      <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                        {subjects.map(s => (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 text-xs cursor-pointer px-2 py-1.5 rounded-lg transition-colors ${
                              selectedSubjects.includes(s.id)
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedSubjects.includes(s.id)}
                              onChange={() => toggleSubject(s.id)}
                              className="w-3.5 h-3.5 accent-purple-600 shrink-0"
                            />
                            <span className="truncate font-medium">{s.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Filtre périodes — toujours visible (court) */}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                      Périodes
                      {selectedPeriods.length === 0 && (
                        <span className="ml-2 text-[10px] font-normal text-slate-400">toutes</span>
                      )}
                    </span>
                    <button
                      onClick={toggleAllPeriods}
                      className="text-[10px] font-black text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      {selectedPeriods.length === ALL_PERIODS.length ? 'Aucune' : 'Toutes'}
                    </button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {ALL_PERIODS.map(p => (
                      <button
                        key={p}
                        onClick={() => togglePeriod(p)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
                          selectedPeriods.includes(p)
                            ? 'bg-purple-600 text-white shadow'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {p.replace('EXAM', 'Ex')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seuil de confiance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    Confiance minimale
                  </label>
                  <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                    {confidenceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confidenceThreshold}
                  onChange={e => setConfidenceThreshold(parseInt(e.target.value))}
                  className="w-full accent-purple-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (inclure tout)</span>
                  <span>100% (très fiable)</span>
                </div>
              </div>

              {/* Message d'erreur éventuel */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl text-red-700 dark:text-red-300 text-sm">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              {/* Bouton de lancement */}
              <button
                onClick={handlePredict}
                disabled={isLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] shadow-lg"
              >
                {isLoading ? 'Analyse en cours...' : 'Lancer la Prédiction'}
              </button>
            </>
          )}

          {/* Zone des résultats */}
          {(results.length > 0 || isLoading) && (
            <>
              {isLoading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin mr-3 text-purple-600" size={22} />
                  <span className="text-slate-500 font-medium">Prédiction en cours...</span>
                </div>
              )}

              {results.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        {filteredResults.length} prédiction{filteredResults.length > 1 ? 's' : ''}
                        <span className="ml-1 font-normal text-slate-400">
                          ({results.length - filteredResults.length} rejetée{results.length - filteredResults.length > 1 ? 's' : ''} sous le seuil)
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        Confiance moy : {(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(0)}%
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedResults.length === filteredResults.length && filteredResults.length > 0}
                        onChange={toggleAllResults}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-slate-600 dark:text-slate-400 font-medium">Tout sélectionner</span>
                    </label>
                  </div>

                  <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-white/10">
                        <tr>
                          <th className="px-4 py-3 w-8"></th>
                          <th className="px-4 py-3 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">Élève</th>
                          <th className="px-4 py-3 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">Matière</th>
                          <th className="px-4 py-3 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">Période</th>
                          <th className="px-4 py-3 text-right font-black text-[10px] uppercase text-slate-400 tracking-widest">Prédiction</th>
                          <th className="px-4 py-3 text-right font-black text-[10px] uppercase text-slate-400 tracking-widest">Confiance</th>
                          <th className="px-4 py-3 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">Justification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filteredResults.map((result, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedResults.includes(idx)}
                                onChange={() => toggleResultSelection(idx)}
                                className="w-4 h-4 accent-purple-600"
                              />
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-200">{result.studentName}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{result.subjectName}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-black text-xs">
                                {result.period}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">
                              {result.predictedGrade.toFixed(2)}
                              <span className="text-slate-400 font-normal"> / {result.maxGrade.toFixed(0)}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`px-2 py-1 rounded-lg text-xs font-black ${
                                result.confidence >= 80
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : result.confidence >= 60
                                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}>
                                {result.confidence}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400 truncate max-w-[180px]" title={result.reasoning}>
                              {result.reasoning}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {(results.length > 0 || !isLoading) && (
          <div className="shrink-0 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/10 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 border border-slate-300 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium text-sm transition-all"
            >
              Annuler
            </button>
            {results.length > 0 && (
              <button
                onClick={handleApply}
                disabled={isApplying || selectedResults.length === 0}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95"
              >
                {isApplying ? (
                  <><Loader2 size={16} className="animate-spin" /> Import...</>
                ) : (
                  <><CheckCircle size={16} /> Importer {selectedResults.length} note{selectedResults.length > 1 ? 's' : ''}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
