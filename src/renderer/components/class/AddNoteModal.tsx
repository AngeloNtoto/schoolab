import React, { useState, useEffect } from 'react';
import { X, Save, StickyNote, User, Users, FileText, ChevronDown, Tag } from 'lucide-react';
import { dbService } from '../../services/databaseService';
import { notesService, Note } from '../../services/notesService';
import { useToast } from '../../context/ToastContext';

interface AddNoteModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialTargetType?: 'student' | 'class' | 'general';
  initialTargetId?: number;
  noteToEdit?: Note | null;
}

interface SelectOption {
  id: number;
  label: string;
}

export default function AddNoteModal({ 
  onClose, 
  onSuccess, 
  initialTargetType = 'general', 
  initialTargetId,
  noteToEdit
}: AddNoteModalProps) {
  const [title, setTitle] = useState(noteToEdit?.title || '');
  const [content, setContent] = useState(noteToEdit?.content || '');
  const [tags, setTags] = useState(noteToEdit?.tags || '');
  const [targetType, setTargetType] = useState<'student' | 'class' | 'general'>(
    noteToEdit?.target_type || initialTargetType
  );
  const [targetId, setTargetId] = useState<number | undefined>(
    noteToEdit?.target_id || initialTargetId
  );
  const [loading, setLoading] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  const toast = useToast();

  // Loaded options for dropdowns
  const [students, setStudents] = useState<SelectOption[]>([]);
  const [classes, setClasses] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Load options when target type changes
  useEffect(() => {
    if (initialTargetId) return; // Don't load if we have a pre-set target
    loadOptionsForType(targetType);
  }, [targetType, initialTargetId]);

  const loadOptionsForType = async (type: string) => {
    if (type === 'general') return;
    
    setLoadingOptions(true);
    try {
      if (type === 'student') {
        const result = await dbService.query<{id: number; first_name: string; last_name: string}>(
          'SELECT id, first_name, last_name FROM students ORDER BY last_name, first_name LIMIT 100'
        );
        setStudents(result.map(s => ({ id: s.id, label: `${s.first_name} ${s.last_name}` })));
      } else if (type === 'class') {
        const result = await dbService.query<{id: number; level: string; option: string; section: string}>(
          'SELECT id, level, option, section FROM classes ORDER BY level, section LIMIT 100'
        );
        setClasses(result.map(c => ({ id: c.id, label: `${c.level} ${c.option} ${c.section}` })));
      }
    } catch (error) {
      console.error('Failed to load options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  // Fetch active academic year
  useEffect(() => {
    const fetchYear = async () => {
      try {
        const result = await dbService.query<{id: number}>('SELECT id FROM academic_years WHERE is_active = 1');
        if (result.length > 0) {
          setAcademicYearId(result[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch academic year:', error);
      }
    };
    fetchYear();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.warning('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      if (noteToEdit) {
        await notesService.update(noteToEdit.id, {
          title,
          content,
          target_type: targetType,
          target_id: targetType === 'general' ? undefined : targetId,
          academic_year_id: academicYearId || noteToEdit.academic_year_id,
          tags,
        });
        toast.success('Note mise à jour');
      } else {
        await notesService.create({
          title,
          content,
          target_type: targetType,
          target_id: targetType === 'general' ? undefined : (targetId || initialTargetId),
          academic_year_id: academicYearId || undefined,
          tags,
        });
        toast.success('Note créée avec succès');
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(noteToEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'student': return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400';
      case 'class': return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400';
      default: return 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-400';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/5 w-full max-w-lg transform scale-100 animate-in fade-in zoom-in-95 duration-300">
        {/* Header section with blue gradient */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-8 relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 right-0 p-10 text-white/5 rotate-12">
                <StickyNote size={120} />
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="bg-white/20 dark:bg-amber-500/30 p-3 rounded-2xl shadow-xl backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
                        <StickyNote size={24} className="text-white dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-blue-100 dark:text-blue-400/60 font-black uppercase tracking-[0.2em] text-[9px] mb-1">Portail de gestion</p>
                        <h2 className="text-xl font-black text-white dark:text-slate-100 tracking-tight">
                            {noteToEdit ? 'Modifier' : 'Nouvelle'} <span className="text-blue-200 dark:text-blue-500">note</span>
                        </h2>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all active:scale-95"
                >
                    <X size={16} />
                </button>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Target Type Selector */}
          {!initialTargetId && (
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 px-1">
                Type de note
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setTargetType('general'); setTargetId(undefined); }}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all group ${
                    targetType === 'general' 
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 shadow-lg shadow-amber-500/10' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-amber-200 dark:hover:border-amber-800 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <FileText size={22} className={targetType === 'general' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Général</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType('class'); setTargetId(undefined); }}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all group ${
                    targetType === 'class' 
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-500/10' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-emerald-200 dark:hover:border-emerald-800 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Users size={22} className={targetType === 'class' ? 'text-emerald-600' : 'text-slate-400'} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Classe</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType('student'); setTargetId(undefined); }}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all group ${
                    targetType === 'student' 
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-lg shadow-blue-500/10' 
                      : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-blue-200 dark:hover:border-blue-800 hover:bg-white dark:hover:bg-slate-800'
                  }`}
                >
                  <User size={22} className={targetType === 'student' ? 'text-blue-600' : 'text-slate-400'} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Élève</span>
                </button>
              </div>
            </div>
          )}

          {/* Target Selector */}
          {!initialTargetId && targetType !== 'general' && (
            <div className="animate-in slide-in-from-top-2 duration-300">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 px-1">
                {targetType === 'student' ? 'Choisir l\'élève' : 'Choisir la classe'}
              </label>
              {loadingOptions ? (
                <div className="py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 text-center text-slate-400 text-sm font-medium">Chargement...</div>
              ) : (
                <div className="relative">
                  <select
                    value={targetId || ''}
                    onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full pl-5 pr-10 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-bold appearance-none cursor-pointer transition-all"
                  >
                    <option value="" className="dark:bg-slate-900">Sélectionner...</option>
                    {(targetType === 'student' ? students : classes).map(opt => (
                      <option key={opt.id} value={opt.id} className="dark:bg-slate-900">{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={20} />
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              Titre de la note
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-800 dark:text-white font-bold text-lg shadow-inner placeholder-slate-300 dark:placeholder-slate-600 transition-all"
              placeholder="Ex: Rappel réunion, Comportement..."
              required
              autoFocus
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
              Détails & Contenu
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none min-h-[180px] text-slate-700 dark:text-slate-200 font-medium leading-relaxed shadow-inner placeholder-slate-300 dark:placeholder-slate-600 resize-none transition-all"
              placeholder="Écrivez vos détails ici..."
              required
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
              <Tag size={12} /> Mot-clés (Tag)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-300 font-semibold shadow-inner placeholder-slate-300 dark:placeholder-slate-600 transition-all"
              placeholder="Ex: comportement, urgent, rappel..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-900/10 dark:shadow-blue-500/10 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {noteToEdit ? 'Mettre à jour' : 'Enregistrer'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
