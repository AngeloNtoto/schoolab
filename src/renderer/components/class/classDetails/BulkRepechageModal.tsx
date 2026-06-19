import React, { useState, useEffect } from 'react';
import { Subject } from '../../../services/classService';
import { Student } from '../../../services/studentService';
import { repechageService } from '../../../services/repechageService';
import { useToast } from '../../../context/ToastContext';

interface BulkRepechageModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  students: Student[];
}

export default function BulkRepechageModal({ isOpen, onClose, subject, students }: BulkRepechageModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repechagePercentages, setRepechagePercentages] = useState<Record<number, string>>({});
  const [repechagePoints, setRepechagePoints] = useState<Record<number, string>>({});
  const [originalValues, setOriginalValues] = useState<Record<number, number>>({});

  useEffect(() => {
    if (isOpen && subject) {
      loadData();
    } else {
      setRepechagePercentages({});
      setRepechagePoints({});
      setOriginalValues({});
    }
  }, [isOpen, subject]);

  const totalMax = subject ? ((subject.max_p1 || 0) + (subject.max_p2 || 0) + (subject.max_exam1 || 0) + (subject.max_p3 || 0) + (subject.max_p4 || 0) + (subject.max_exam2 || 0)) : 0;

  const loadData = async () => {
    if (!subject) return;
    setLoading(true);
    try {
      const initialPercentages: Record<number, string> = {};
      const initialPoints: Record<number, string> = {};
      const origValues: Record<number, number> = {};
      
      // Load existing repechages for each student for this subject
      for (const student of students) {
        const reps = await repechageService.getRepechagesByStudent(student.id);
        const rep = reps.find(r => r.subject_id === subject.id);
        if (rep && rep.percentage > 0) {
          initialPercentages[student.id] = rep.percentage.toString();
          initialPoints[student.id] = ((rep.percentage * totalMax) / 100).toFixed(1).replace(/\.0$/, '');
          origValues[student.id] = rep.percentage;
        } else {
          initialPercentages[student.id] = '';
          initialPoints[student.id] = '';
          origValues[student.id] = 0;
        }
      }
      setRepechagePercentages(initialPercentages);
      setRepechagePoints(initialPoints);
      setOriginalValues(origValues);
    } catch (error) {
      console.error('Erreur lors du chargement des repêchages', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handlePercentageChange = (studentId: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      let num = parseFloat(value);
      let newPercentageStr = value;

      if (value !== '' && !isNaN(num) && num > 100) {
        newPercentageStr = '100';
        num = 100;
      }
      
      setRepechagePercentages(prev => ({ ...prev, [studentId]: newPercentageStr }));
      
      if (!isNaN(num) && value !== '') {
        const points = (num * totalMax) / 100;
        setRepechagePoints(prev => ({ ...prev, [studentId]: points.toFixed(1).replace(/\.0$/, '') }));
      } else {
        setRepechagePoints(prev => ({ ...prev, [studentId]: '' }));
      }
    }
  };

  const handlePointsChange = (studentId: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      let num = parseFloat(value);
      let newPointsStr = value;

      if (value !== '' && !isNaN(num) && num > totalMax) {
        newPointsStr = totalMax.toString();
        num = totalMax;
      }
      
      setRepechagePoints(prev => ({ ...prev, [studentId]: newPointsStr }));
      
      if (!isNaN(num) && value !== '' && totalMax > 0) {
        const percentage = (num / totalMax) * 100;
        setRepechagePercentages(prev => ({ ...prev, [studentId]: percentage.toFixed(1).replace(/\.0$/, '') }));
      } else {
        setRepechagePercentages(prev => ({ ...prev, [studentId]: '' }));
      }
    }
  };

  const handleSave = async () => {
    if (!subject) return;
    setSaving(true);
    let updatedCount = 0;

    try {
      for (const student of students) {
        const valStr = repechagePercentages[student.id];
        const currentVal = originalValues[student.id] || 0;
        
        let percentage = 0;
        if (valStr && valStr.trim() !== '') {
           percentage = parseFloat(valStr);
           if (isNaN(percentage)) percentage = 0;
        }

        if (percentage !== currentVal) {
          await repechageService.updateRepechage(student.id, subject.id, percentage);
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        toast.success(`${updatedCount} note(s) de repêchage mise(s) à jour`);
      } else {
        toast.info('Aucune modification détectée');
      }
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast.error("Erreur lors de l\\'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </span>
              Examen de repêchage
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Branche : <span className="text-blue-600 dark:text-blue-400">{subject.name}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-500 font-medium animate-pulse">Chargement des données...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              Aucun élève dans cette classe.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-16 text-center">N°</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Élève</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-48 text-right">Points (/{totalMax})</th>
                  <th className="py-3 px-6 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 w-48 text-right">Pourcentage (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="py-2.5 px-6 text-sm text-slate-400 font-medium text-center">{idx + 1}</td>
                    <td className="py-2.5 px-6">
                      <div className="font-semibold text-slate-700 dark:text-slate-200">{student.last_name}</div>
                      <div className="text-xs text-slate-500">{student.first_name} {student.post_name}</div>
                    </td>
                    <td className="py-2.5 px-6 text-right">
                      <div className="relative inline-block w-32">
                        <input
                          type="text"
                          value={repechagePoints[student.id] || ''}
                          onChange={(e) => handlePointsChange(student.id, e.target.value)}
                          placeholder="0"
                          className="w-full text-right py-2 pl-3 pr-10 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 group-hover:border-blue-300 dark:group-hover:border-slate-600"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none text-xs">/{totalMax}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-6 text-right">
                      <div className="relative inline-block w-32">
                        <input
                          type="text"
                          value={repechagePercentages[student.id] || ''}
                          onChange={(e) => handlePercentageChange(student.id, e.target.value)}
                          placeholder="0"
                          className="w-full text-right py-2 pl-3 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 group-hover:border-blue-300 dark:group-hover:border-slate-600"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none">%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving || loading}
            className="px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                <span>Enregistrer</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
