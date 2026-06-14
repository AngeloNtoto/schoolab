import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertCircle, CheckCircle, Loader2, X } from '../iconsSvg';
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

const PERIODS = ['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'];

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
  const [scope, setScope] = useState<'all' | 'students' | 'subjects' | 'periods'>('all');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(60);
  const [filteredResults, setFilteredResults] = useState<PredictionResult[]>(results);
  const [selectedResults, setSelectedResults] = useState<number[]>([]);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    // Filtrer selon le seuil de confiance à chaque changement
    setFilteredResults(results.filter(r => r.confidence >= confidenceThreshold));
  }, [results, confidenceThreshold]);

  // Pré-sélectionner TOUS les résultats filtrés dès qu'ils arrivent
  // On le fait dans un useEffect séparé pour éviter le timing async
  useEffect(() => {
    if (filteredResults.length > 0) {
      setSelectedResults(filteredResults.map((_, idx) => idx));
    }
  }, [filteredResults]);

  const handlePredict = async () => {
    try {
      // Réinitialiser la sélection avant chaque nouvelle prédiction
      setSelectedResults([]);
      await onPredict({
        classId,
        studentIds: scope === 'students' && selectedStudents.length > 0 ? selectedStudents : undefined,
        subjectIds: scope === 'subjects' && selectedSubjects.length > 0 ? selectedSubjects : undefined,
        periods: scope === 'periods' && selectedPeriods.length > 0 ? selectedPeriods : undefined,
        confidenceThreshold
      });
      // Note: la pré-sélection des résultats est gérée par le useEffect ci-dessus
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

  const handleStudentToggle = (id: number) => {
    setSelectedStudents(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleSubjectToggle = (id: number) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handlePeriodToggle = (period: string) => {
    setSelectedPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Prédire Notes Manquantes</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!results.length && !isLoading && (
            <>
              {/* Configuration */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Portée</label>
                  <div className="space-y-2">
                    {['all', 'students', 'subjects', 'periods'].map(s => (
                      <label key={s} className="flex items-center">
                        <input
                          type="radio"
                          name="scope"
                          value={s}
                          checked={scope === s}
                          onChange={e => setScope(e.target.value as any)}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {{
                            all: 'Tous les élèves, matières, périodes',
                            students: 'Sélectionner élèves',
                            subjects: 'Sélectionner matières',
                            periods: 'Sélectionner périodes'
                          }[s]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {scope === 'students' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Élèves</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                      {students.map(s => (
                        <label key={s.id} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(s.id)}
                            onChange={() => handleStudentToggle(s.id)}
                            className="mr-2"
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {scope === 'subjects' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Matières</label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded p-2">
                      {subjects.map(s => (
                        <label key={s.id} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={selectedSubjects.includes(s.id)}
                            onChange={() => handleSubjectToggle(s.id)}
                            className="mr-2"
                          />
                          {s.name}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {scope === 'periods' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Périodes</label>
                    <div className="grid grid-cols-3 gap-2">
                      {PERIODS.map(p => (
                        <label key={p} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={selectedPeriods.includes(p)}
                            onChange={() => handlePeriodToggle(p)}
                            className="mr-2"
                          />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confiance minimale: {confidenceThreshold}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={confidenceThreshold}
                    onChange={e => setConfidenceThreshold(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button
                onClick={handlePredict}
                disabled={isLoading}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md font-medium"
              >
                {isLoading ? 'Analyse en cours...' : 'Lancer Prédiction'}
              </button>
            </>
          )}

          {/* Results */}
          {(results.length > 0 || isLoading) && (
            <>
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin mr-2" size={18} />
                  <span>Prédiction en cours...</span>
                </div>
              )}

              {results.length > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {filteredResults.length} prédictions ({results.length - filteredResults.length} rejetées)
                      </p>
                      <p className="text-xs text-gray-600">
                        Confiance moy: {(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(0)}%
                      </p>
                    </div>
                    <label className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={selectedResults.length === filteredResults.length && filteredResults.length > 0}
                        onChange={toggleAllResults}
                        className="mr-2"
                      />
                      Sélectionner tout
                    </label>
                  </div>

                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-4 py-2 text-left w-8"></th>
                          <th className="px-4 py-2 text-left">Élève</th>
                          <th className="px-4 py-2 text-left">Matière</th>
                          <th className="px-4 py-2 text-left">Période</th>
                          <th className="px-4 py-2 text-right">Prédiction</th>
                          <th className="px-4 py-2 text-right">Confiance</th>
                          <th className="px-4 py-2 text-left">Justification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((result, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <input
                                type="checkbox"
                                checked={selectedResults.includes(idx)}
                                onChange={() => toggleResultSelection(idx)}
                              />
                            </td>
                            <td className="px-4 py-2 font-medium">{result.studentName}</td>
                            <td className="px-4 py-2">{result.subjectName}</td>
                            <td className="px-4 py-2">{result.period}</td>
                            <td className="px-4 py-2 text-right font-medium">
                              {result.predictedGrade.toFixed(2)} / {result.maxGrade.toFixed(0)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                result.confidence >= 80 ? 'bg-green-100 text-green-800' :
                                result.confidence >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {result.confidence}%
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs text-gray-600 truncate" title={result.reasoning}>
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
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Annuler
            </button>
            {results.length > 0 && (
              <button
                onClick={handleApply}
                disabled={isApplying || selectedResults.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md font-medium flex items-center gap-2"
              >
                {isApplying ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Import...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Importer {selectedResults.length}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
