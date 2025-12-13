import React, { useState, useEffect } from 'react';
import { X, School, Save } from 'lucide-react';
import { LEVELS, OPTIONS } from '../../constants/school';
import { getClassDisplayName } from '../lib/classUtils';
import { useToast } from '../context/ToastContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting class form...', { name, level, option, section, academicYearId });
    
    if (!academicYearId) {
      console.error('No academic year ID found!');
      toast.error("Erreur: Année académique non trouvée");
      return;
    }

    setLoading(true);

    try {
      // 1. Check for duplicates
      const isDuplicate = await checkDuplicate();
      console.log('Duplicate check result:', isDuplicate);
      
      if (isDuplicate) {
        toast.warning("Une classe avec ces paramètres existe déjà. Impossible de créer des doublons.");
        setLoading(false);
        return;
      }

      // 2. Perform Insert or Update
      if (classData) {
        console.log('Updating existing class:', classData.id);
        // Update existing class
        await window.api.db.execute(
          'UPDATE classes SET name = ?, level = ?, option = ?, section = ? WHERE id = ?',
          [name, level, option, section, classData.id]
        );
      } else {
        console.log('Creating new class');
        // Create new class (Insert with academic_year_id)
        await window.api.db.execute(
          'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?)',
          [name, level, option, section, academicYearId]
        );
      }
      
      console.log('Class saved successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save class:', error);
      toast.error('Erreur lors de l\'enregistrement de la classe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <School className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {classData ? 'Modifier la classe' : 'Nouvelle classe'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom de la classe
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: 7ème"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Niveau
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                required
              >
                {LEVELS.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                required
              >
                {/* Sans section not allowed for 7ème/8ème */}
                {(level !== '7ème' && level !== '8ème') && <option value="-">Sans section</option>}
                {['A', 'B', 'C', 'D', 'E'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Option
            </label>
            <select
              value={option}
              onChange={(e) => setOption(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500"
              required
              disabled={level === '7ème' || level === '8ème'}
            >
              {OPTIONS.filter(o => {
                // 7ème/8ème: only EB
                if (level === '7ème' || level === '8ème') return o.value === 'EB';
                // 1ère-4ème: everything except EB
                return o.value !== 'EB';
              }).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {(level === '7ème' || level === '8ème') && (
              <p className="text-xs text-slate-500 mt-1">
                L'option est fixée à "Éducation de Base" pour ce niveau.
              </p>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !academicYearId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
