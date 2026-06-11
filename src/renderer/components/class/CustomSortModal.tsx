import React, { useState, useEffect } from 'react';
import { X, Save, RotateCcw } from '../iconsSvg';
import { Student } from '../../services/studentService';

interface CustomSortModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onSave: (name: string, sortMap: Record<number, number>) => Promise<void>;
  existingSorts: { id: number; name: string }[];
}

export default function CustomSortModal({ isOpen, onClose, students, onSave, existingSorts }: CustomSortModalProps) {
  const [profileName, setProfileName] = useState('');
  const [studentOrder, setStudentOrder] = useState<{ id: number; student: Student; pos: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen, students, existingSorts.length]);

  if (!isOpen) return null;

  const handlePositionChange = (studentId: number, newPosStr: string) => {
    let newPos = parseInt(newPosStr, 10);
    if (isNaN(newPos)) return; // Allow empty string while typing, but don't apply yet
    if (newPos < 1) newPos = 1;
    if (newPos > students.length) newPos = students.length;

    setStudentOrder(prev => {
      const copy = [...prev];
      const oldIndex = copy.findIndex(item => item.id === studentId);
      if (oldIndex === -1) return prev;
      
      const item = copy[oldIndex];
      const targetPos = newPos;
      
      // Remove item
      copy.splice(oldIndex, 1);
      
      // Insert item at new index (targetPos - 1)
      copy.splice(targetPos - 1, 0, item);
      
      // Re-assign positions based on new array order
      return copy.map((st, idx) => ({ ...st, pos: idx + 1 }));
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
        sortMap[item.id] = item.pos;
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nouveau Profil de Tri</h2>
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
            <strong>Comment ça marche ?</strong> Modifiez le numéro de position d'un élève. Les autres élèves seront automatiquement décalés pour faire de la place.
          </div>

          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">Position</th>
                  <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Élève</th>
                </tr>
              </thead>
              <tbody>
                {studentOrder.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2 text-center">
                      <input 
                        type="number" 
                        value={item.pos}
                        onChange={(e) => handlePositionChange(item.id, e.target.value)}
                        min={1}
                        max={students.length}
                        className="w-16 px-2 py-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200">
                      {item.student.last_name} {item.student.post_name} {item.student.first_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
