import React, { useState, useEffect } from 'react';
import { X, Save, StickyNote, User, Users, FileText, ChevronDown, Tag } from 'lucide-react';
import { notesService, Note } from '../services/notesService';
import { useToast } from '../context/ToastContext';

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
        const result = await window.api.db.query<{id: number; first_name: string; last_name: string}>(
          'SELECT id, first_name, last_name FROM students ORDER BY last_name, first_name LIMIT 100'
        );
        setStudents(result.map(s => ({ id: s.id, label: `${s.first_name} ${s.last_name}` })));
      } else if (type === 'class') {
        const result = await window.api.db.query<{id: number; level: string; option: string; section: string}>(
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
          tags,
        });
        toast.success('Note mise à jour');
      } else {
        await notesService.create({
          title,
          content,
          target_type: targetType,
          target_id: targetType === 'general' ? undefined : (targetId || initialTargetId),
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-slate-800 dark:to-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-lg">
              <StickyNote size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            {noteToEdit ? 'Modifier la Note' : 'Nouvelle Note'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/50 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Target Type Selector */}
          {!initialTargetId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Type de note
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => { setTargetType('general'); setTargetId(undefined); }}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    targetType === 'general' ? getTypeColor('general') + ' border-yellow-400' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <FileText size={20} />
                  <span className="text-xs font-medium">Général</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType('class'); setTargetId(undefined); }}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    targetType === 'class' ? getTypeColor('class') + ' border-green-400' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Users size={20} />
                  <span className="text-xs font-medium">Classe</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTargetType('student'); setTargetId(undefined); }}
                  className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-all ${
                    targetType === 'student' ? getTypeColor('student') + ' border-blue-400' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <User size={20} />
                  <span className="text-xs font-medium">Élève</span>
                </button>
              </div>
            </div>
          )}

          {/* Target Selector (if not general and not pre-set) */}
          {!initialTargetId && targetType !== 'general' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                {targetType === 'student' ? 'Sélectionner un élève' : 'Sélectionner une classe'}
              </label>
              {loadingOptions ? (
                <div className="py-3 text-center text-slate-500 text-sm">Chargement...</div>
              ) : (
                <select
                  value={targetId || ''}
                  onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:text-white"
                >
                  <option value="">-- Choisir --</option>
                  {(targetType === 'student' ? students : classes).map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:text-white"
              placeholder="Ex: Rappel réunion parents, Comportement..."
              required
              autoFocus
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contenu <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[150px] dark:bg-slate-800 dark:text-white resize-none"
              placeholder="Détails de la note..."
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
              <Tag size={14} /> Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-800 dark:text-white"
              placeholder="Ex: comportement, urgent, rappel (séparés par des virgules)"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
