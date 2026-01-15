import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { repechageService, Repechage } from '../../services/repechageService';
import { Student } from '../../services/studentService';
import { Subject } from '../../services/classService';

interface RepechageModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  subjects: Subject[];
}

export default function RepechageModal({ isOpen, onClose, student, subjects }: RepechageModalProps) {
  const [loading, setLoading] = useState(false);
  const [repechages, setRepechages] = useState<Map<number, Repechage>>(new Map());
  const [savingMap, setSavingMap] = useState<Map<number, boolean>>(new Map());
  const toast = useToast();

  useEffect(() => {
    if (isOpen && student) {
      loadRepechages();
    } else {
      setRepechages(new Map());
    }
  }, [isOpen, student]);

  const loadRepechages = async () => {
    if (!student) return;
    setLoading(true);
    try {
      const data = await repechageService.getRepechagesByStudent(student.id);
      const map = new Map<number, Repechage>();
      data.forEach(r => map.set(r.subject_id, r));
      setRepechages(map);
    } catch (error) {
      console.error('Failed to load repechages:', error);
      toast.error('Erreur lors du chargement des repêchages');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (subject: Subject, value: string) => {
    if (!student) return;
    
    const numPercentage = parseFloat(value);
    if (isNaN(numPercentage) && value !== '') return;

    // Calcul du maximum for internal ref
    const maxPoints = (subject.max_p1 || 0) + (subject.max_p2 || 0) + (subject.max_exam1 || 0) + 
                      (subject.max_p3 || 0) + (subject.max_p4 || 0) + (subject.max_exam2 || 0);

    // Validation
    if (numPercentage > 100) {
      toast.error(`Le pourcentage ne peut pas dépasser 100%`);
      return;
    }
    if (numPercentage < 0) {
      toast.error(`Le pourcentage ne peut pas être négatif`);
      return;
    }

    setSavingMap(prev => new Map(prev).set(subject.id, true));
    try {
      await repechageService.updateRepechage(student.id, subject.id, numPercentage || 0);
      
      // Update local state to reflect change immediately (calculating value from percentage)
      const calculatedValue = maxPoints > 0 ? ((numPercentage || 0) * maxPoints) / 100 : 0;
      
      setRepechages(prev => {
        const newMap = new Map(prev);
        newMap.set(subject.id, {
          student_id: student.id,
          subject_id: subject.id,
          value: calculatedValue,
          percentage: numPercentage || 0
        });
        return newMap;
      });

    } catch (error) {
      console.error('Failed to update repechage:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSavingMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(subject.id);
        return newMap;
      });
    }
  };

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 w-full max-w-4xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <TrendingUp size={24} className="text-white" />
            </div>
            <div>
              <p className="text-blue-100/60 font-black uppercase tracking-widest text-[9px] mb-1">Système de Rattrapage</p>
              <h2 className="text-xl font-black text-white tracking-tight flex gap-2">
                Repêchage: <span className="text-blue-200">{student.first_name} {student.last_name}</span>
              </h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"><X size={20} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
          {loading ? (
             <div className="p-12 text-center text-slate-400">Chargement des données...</div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                <tr className="text-[10px] font-black uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4">Cours</th>
                  <th className="px-6 py-4 text-center">Maximum</th>
                  <th className="px-6 py-4 text-center">Pourcentage</th>
                  <th className="px-6 py-4 text-center">Points (Calculé)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {subjects.map(subject => {
                  const maxPoints = (subject.max_p1 || 0) + (subject.max_p2 || 0) + (subject.max_exam1 || 0) + 
                                  (subject.max_p3 || 0) + (subject.max_p4 || 0) + (subject.max_exam2 || 0);
                  
                  const repechage = repechages.get(subject.id);
                  const isSaving = savingMap.get(subject.id);
                  const percentage = repechage?.percentage || 0;
                  const value = repechage?.value || 0;

                  return (
                    <tr key={subject.id} className="bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">
                        {subject.name}
                        <div className="text-[9px] font-normal text-slate-400 uppercase tracking-widest mt-0.5">{subject.category || 'Général'}</div>
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-slate-400 text-xs">
                        / {maxPoints}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center items-center gap-1">
                          <input 
                            type="number" 
                            className="w-20 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-center font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            placeholder="0"
                            min="0"
                            max="100"
                            defaultValue={percentage || ''}
                            onBlur={(e) => handleUpdate(subject, e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                          />
                          <span className="text-slate-400 font-bold">%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className="font-bold text-slate-600 dark:text-slate-400">
                           {value > 0 ? value.toFixed(1) : '-'} <span className="text-xs text-slate-400 font-normal">pts</span>
                         </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                         {isSaving ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /> : 
                          repechage ? <Save size={16} className="text-green-500 mx-auto" /> : <div className="w-4 h-4 mx-auto" />
                         }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
