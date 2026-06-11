import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from '../iconsSvg';
import { Student } from '../../services/studentService';
import { CustomSort } from '../../services/customSortService';

function SortInput({ value, max, onChange }: { value: number; max: number; onChange: (newVal: number) => void }) {
  const [localVal, setLocalVal] = useState(value.toString());

  useEffect(() => {
    setLocalVal(value.toString());
  }, [value]);

  const apply = () => {
    const num = parseInt(localVal, 10);
    if (!isNaN(num) && num !== value) {
      onChange(num);
    } else {
      setLocalVal(value.toString());
    }
  };

  return (
    <input
      type="number"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      min={1}
      max={max}
      className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
    />
  );
}

interface CustomSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (name: string, sortMap: Record<number, number>) => Promise<void>;
  existingSorts: { id: number; name: string }[];
  initialProfile?: CustomSort | null;
}

export default function CustomSortModal({ isOpen, onClose, students, onSave, existingSorts, initialProfile }: CustomSortModalProps) {
  const [profileName, setProfileName] = useState('');
  const [studentOrder, setStudentOrder] = useState<{ id: number; student: Student; pos: number; isWithdrawn?: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialProfile) {
        setProfileName(initialProfile.name);
        try {
          const map = JSON.parse(initialProfile.student_order);
          const ordered = [...students].sort((a, b) => {
            const posA = map[a.id] ?? 9999;
            const posB = map[b.id] ?? 9999;
            if (posA === -1 && posB !== -1) return 1;
            if (posA !== -1 && posB === -1) return -1;
            if (posA !== posB) return posA - posB;
            const nameA = `${a.last_name} ${a.post_name}`;
            const nameB = `${b.last_name} ${b.post_name}`;
            return nameA.localeCompare(nameB);
          });
          
          setStudentOrder(ordered.map((student) => {
            const isWithdrawn = map[student.id] === -1;
            return {
              id: student.id,
              student,
              pos: isWithdrawn ? -1 : 9999, // Will be recalculated below
              isWithdrawn
            };
          }));
          
          setStudentOrder(prev => {
            const copy = prev.map(s => ({...s}));
            let posCounter = 1;
            copy.forEach(item => {
              if (!item.isWithdrawn) item.pos = posCounter++;
            });
            return copy;
          });
        } catch (e) {
          console.error("Failed to parse initial profile", e);
        }
      } else {
        // Initialize with alphabetical order
        const sorted = [...students].sort((a, b) => {
          const nameA = `${a.last_name} ${a.post_name}`;
          const nameB = `${b.last_name} ${b.post_name}`;
          return nameA.localeCompare(nameB);
        });
        
        setStudentOrder(sorted.map((student, index) => ({
          id: student.id,
          student,
          pos: index + 1
        })));
        setProfileName(`Liste Personnalisée ${existingSorts.length + 1}`);
      }
    }
  }, [isOpen, students, existingSorts.length, initialProfile]);

  if (!isOpen) return null;

  const handlePositionChange = (studentId: number, newPos: number) => {
    setStudentOrder(prev => {
      const activeCount = prev.filter(s => !s.isWithdrawn).length;
      if (newPos < 1) newPos = 1;
      if (newPos > activeCount) newPos = activeCount;

      const copy = prev.map(s => ({...s}));
      const oldIndex = copy.findIndex(item => item.id === studentId);
      if (oldIndex === -1 || copy[oldIndex].isWithdrawn) return prev;
      
      const item = copy[oldIndex];
      
      copy.splice(oldIndex, 1);
      
      let activeSeen = 0;
      let insertIndex = copy.length;
      for (let i = 0; i < copy.length; i++) {
        if (!copy[i].isWithdrawn) {
          activeSeen++;
          if (activeSeen === newPos) {
            insertIndex = i;
            break;
          }
        }
      }
      
      copy.splice(insertIndex, 0, item);
      
      let posCounter = 1;
      copy.forEach(item => {
        if (!item.isWithdrawn) {
          item.pos = posCounter++;
        }
      });
      return copy;
    });
  };

  const handleWithdraw = (studentId: number) => {
    setStudentOrder(prev => {
      const copy = prev.map(s => ({...s}));
      const index = copy.findIndex(item => item.id === studentId);
      if (index === -1) return prev;

      copy[index].isWithdrawn = true;
      let posCounter = 1;
      copy.forEach(item => {
        if (!item.isWithdrawn) {
          item.pos = posCounter++;
        }
      });
      return copy;
    });
  };

  const handleRestore = (studentId: number) => {
    setStudentOrder(prev => {
      const copy = prev.map(s => ({...s}));
      const index = copy.findIndex(item => item.id === studentId);
      if (index === -1) return prev;

      copy[index].isWithdrawn = false;
      let posCounter = 1;
      copy.forEach(item => {
        if (!item.isWithdrawn) {
          item.pos = posCounter++;
        }
      });
      return copy;
    });
  };

  const handleSave = async () => {
    if (!profileName.trim()) {
      alert('Veuillez entrer un nom pour ce profil de tri.');
      return;
    }
    
    setLoading(true);
    try {
      // Create a map of studentId -> position
      const sortMap: Record<number, number> = {};
      studentOrder.forEach(item => {
        sortMap[item.id] = item.isWithdrawn ? -1 : item.pos;
      });
      
      await onSave(profileName, sortMap);
      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du tri');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {initialProfile ? 'Modifier le Profil de Tri' : 'Nouveau Profil de Tri'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Nom du profil de tri
            </label>
            <input 
              type="text" 
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Ex: Ordre Saisie Semestre 1"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-4 rounded-xl mb-6 text-sm">
            <strong>Comment ça marche ?</strong> Modifiez le numéro de position d'un élève puis appuyez sur <strong>Entrée</strong>. Vous pouvez aussi <strong>retirer temporairement</strong> des élèves de ce tri, ils apparaîtront dans une section dédiée en bas de la liste.
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Position</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Élève</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentOrder.filter(s => !s.isWithdrawn).map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2 text-center">
                      <SortInput
                        value={item.pos}
                        max={studentOrder.filter(s => !s.isWithdrawn).length}
                        onChange={(newVal) => handlePositionChange(item.id, newVal)}
                      />
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">
                      {item.student.last_name} {item.student.post_name} {item.student.first_name}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button 
                        onClick={() => handleWithdraw(item.id)}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        Retirer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {studentOrder.filter(s => s.isWithdrawn).length > 0 && (
            <div className="border border-red-200 dark:border-red-900/30 rounded-xl overflow-hidden mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 border-b border-red-200 dark:border-red-900/30">
                <h3 className="text-sm font-bold text-red-600 dark:text-red-400">Élèves Retirés</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <tbody>
                  {studentOrder.filter(s => s.isWithdrawn).map((item) => (
                    <tr key={item.id} className="border-b border-red-100 dark:border-red-900/10 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors opacity-75">
                      <td className="px-4 py-2 text-center w-24">
                        <span className="text-red-400 font-bold text-sm">-</span>
                      </td>
                      <td className="px-4 py-2 font-medium text-red-700 dark:text-red-300">
                        {item.student.last_name} {item.student.post_name} {item.student.first_name}
                      </td>
                      <td className="px-4 py-2 text-right w-24">
                        <button 
                          onClick={() => handleRestore(item.id)}
                          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors"
                        >
                          Restaurer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Sauvegarde...' : 'Sauvegarder le tri'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
