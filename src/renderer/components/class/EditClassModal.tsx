import React, { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { X, School, Save } from 'lucide-react';
import { LEVELS, OPTIONS } from '../../../constants/school';
import { getClassDisplayName } from '../../lib/classUtils';
import { useToast } from '../../context/ToastContext';

interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

interface EditClassModalProps {
  classData?: Class | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditClassModal({ classData, onClose, onSuccess }: EditClassModalProps) {
  const [name, setName] = useState(classData?.name || '');
  const [level, setLevel] = useState(classData?.level || LEVELS[0]);
  const [option, setOption] = useState(classData?.option || OPTIONS[0].value);
  const [section, setSection] = useState(classData?.section || (classData?.level === '7ème' || classData?.level === '8ème' ? 'A' : '-'));
  const [loading, setLoading] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const toast = useToast();

  // Auto-adjust section when level changes to/from 7ème/8ème
  useEffect(() => {
    if (!classData && (level === '7ème' || level === '8ème') && section === '-') {
      setSection('A');
    }
  }, [level, classData]);

  // Auto-update name and option based on level/section
  useEffect(() => {
    if (!classData) { // Only auto-update for new classes
      setName(getClassDisplayName(level, option, section));
      
      // Force 'EB' for 7ème and 8ème
      if (level === '7ème' || level === '8ème') {
        setOption('EB');
      }
    }
  }, [level, section, option, classData]);

  // Fetch active academic year on mount
  useEffect(() => {
    const fetchYear = async () => {
      try {
        const result = await window.api.db.query<{ id: number }>('SELECT id FROM academic_years WHERE is_active = 1');
        if (result.length > 0) {
          setAcademicYearId(result[0].id);
        } else {
          toast.error("Aucune année académique active trouvée. Veuillez en configurer une.");
          onClose();
        }
      } catch (error) {
        console.error('Failed to fetch academic year:', error);
      }
    };
    fetchYear();
  }, []);

  const checkDuplicate = async (): Promise<boolean> => {
    try {
      // Check if a class with same details exists in the same academic year
      // Exclude the current class if we're editing
      const query = `
        SELECT id FROM classes 
        WHERE name = ? AND level = ? AND option = ? AND section = ? AND academic_year_id = ?
        ${classData ? 'AND id != ?' : ''}
      `;
      
      const params = [name, level, option, section, academicYearId];
      if (classData) params.push(classData.id);

      const result = await window.api.db.query<{ id: number }>(query, params);
      return result.length > 0;
    } catch (error) {
      console.error('Failed to check duplicate:', error);
      return false;
    }
  };

  // React 19 Action for class saving
  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    if (!academicYearId) {
      toast.error("Erreur: Année académique non trouvée");
      return { success: false };
    }

    try {
      // Data from formData or local state (since they are sync)
      const submitData = {
        name: formData.get('name') as string,
        level: formData.get('level') as string,
        option: formData.get('option') as string,
        section: formData.get('section') as string,
      };

      // 1. Check for duplicates (using local data is fine here)
      const query = `
        SELECT id FROM classes 
        WHERE name = ? AND level = ? AND option = ? AND section = ? AND academic_year_id = ?
        ${classData ? 'AND id != ?' : ''}
      `;
      const params = [submitData.name, submitData.level, submitData.option, submitData.section, academicYearId];
      if (classData) params.push(classData.id);

      const dupResult = await window.api.db.query<{ id: number }>(query, params);
      if (dupResult.length > 0) {
        toast.warning("Une classe avec ces paramètres existe déjà. Impossible de créer des doublons.");
        return { success: false, error: 'duplicate' };
      }

      // 2. Perform Insert or Update
      if (classData) {
        await window.api.db.execute(
          'UPDATE classes SET name = ?, level = ?, option = ?, section = ? WHERE id = ?',
          [submitData.name, submitData.level, submitData.option, submitData.section, classData.id]
        );
      } else {
        await window.api.db.execute(
          'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?)',
          [submitData.name, submitData.level, submitData.option, submitData.section, academicYearId]
        );
      }
      
      toast.success(classData ? 'Classe mise à jour' : 'Classe créée avec succès');
      onSuccess();
      onClose();
      return { success: true };
    } catch (error) {
      console.error('Failed to save class:', error);
      toast.error('Erreur lors de l\'enregistrement de la classe');
      return { success: false, error: 'failed' };
    }
  }, null);

  if (!academicYearId) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/5 w-full max-w-md transform scale-100 animate-in fade-in zoom-in-95 duration-300">
        {/* Header section with blue gradient */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-8 relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 right-0 p-10 text-white/5 rotate-12">
                <School size={140} />
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="bg-white/20 dark:bg-blue-600/30 p-3 rounded-2xl shadow-xl backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
                        <School size={28} className="text-white dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-blue-100 dark:text-blue-400/60 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Portail de gestion</p>
                        <h2 className="text-2xl font-black text-white dark:text-slate-100 tracking-tight">
                            {classData ? 'Modifier' : 'Créer'} <span className="text-blue-200 dark:text-blue-500">la classe</span>
                        </h2>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all active:scale-95"
                >
                    <X size={18} />
                </button>
            </div>
        </div>

        <div className="p-6">
          <form action={formAction} className="space-y-6">
                {/* Configuration */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Identité & Structure</h3>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Nom d'affichage</label>
                        <input 
                            name="name" 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required 
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            placeholder="Ex: 7ème A"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Niveau</label>
                            <select 
                                name="level" 
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                required
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner appearance-none text-sm"
                            >
                                {LEVELS.map(l => (
                                    <option key={l} value={l}>{l}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Section</label>
                            <select 
                                name="section" 
                                value={section}
                                onChange={(e) => setSection(e.target.value)}
                                required
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner appearance-none text-sm"
                            >
                                {(level !== '7ème' && level !== '8ème') && <option value="-">Sans section</option>}
                                {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Option / Orientation</label>
                        <select 
                            name="option" 
                            value={option}
                            onChange={(e) => setOption(e.target.value)}
                            required
                            disabled={level === '7ème' || level === '8ème'}
                            className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner appearance-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60 text-sm"
                        >
                            {OPTIONS.filter(o => {
                                if (level === '7ème' || level === '8ème') return o.value === 'EB';
                                return o.value !== 'EB';
                            }).map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                        </select>
                        {(level === '7ème' || level === '8ème') && (
                            <input type="hidden" name="option" value="EB" />
                        )}
                        {(level === '7ème' || level === '8ème') && (
                            <p className="text-[9px] text-blue-500 font-bold mt-2 px-1">
                                ℹ️ L'option est fixée à "Éducation de Base" pour ce niveau.
                            </p>
                        )}
                    </div>
                </div>

              <div className="flex gap-4 pt-4">
                  <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
                  >
                  Annuler
                  </button>
                  <SubmitButton academicYearId={academicYearId} />
              </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Bouton de soumission avec useFormStatus
 */
function SubmitButton({ academicYearId }: { academicYearId: number | null }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || !academicYearId}
      className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <Save size={20} />
      )}
      {pending ? 'Enregistrement...' : 'Enregistrer la classe'}
    </button>
  );
}
