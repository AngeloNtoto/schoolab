import React, { useEffect, useState } from 'react';
import { notesService, Note } from '../services/notesService';
import { Plus, Search, StickyNote, Trash2, Calendar, Tag, X, User, Users, Eye, ChevronRight, ArrowLeft } from 'lucide-react';
import AddNoteModal from '../components/AddNoteModal';
import { useToast } from '../context/ToastContext';
import { useTutorial } from '../context/TutorialContext';
import { useNavigate } from 'react-router-dom';
import ProfessionalLoader from '../components/ProfessionalLoader';

// Types for linked entities
interface LinkedStudent {
  id: number;
  first_name: string;
  last_name: string;
  class_id: number;
}

interface LinkedClass {
  id: number;
  level: string;
  option: string;
  section: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'general' | 'class' | 'student'>('all');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Cache for linked entity names
  const [linkedStudents, setLinkedStudents] = useState<Record<number, LinkedStudent>>({});
  const [linkedClasses, setLinkedClasses] = useState<Record<number, LinkedClass>>({});
  
  // Resizable detail panel
  const [detailWidth, setDetailWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  
  const toast = useToast();
  const navigate = useNavigate();
  const tutorial = useTutorial();

  useEffect(() => {
    loadNotes();
    // Show tutorial on first visit
    tutorial.showTutorial('notes');
  }, []);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const data = await notesService.getAll();
      setNotes(data);
      
      // Load linked entities
      await loadLinkedEntities(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
      toast.error('Erreur lors du chargement des notes');
    } finally {
      setLoading(false);
    }
  };

  const loadLinkedEntities = async (notesList: Note[]) => {
    const studentIds = notesList.filter(n => n.target_type === 'student' && n.target_id).map(n => n.target_id!);
    const classIds = notesList.filter(n => n.target_type === 'class' && n.target_id).map(n => n.target_id!);

    // Fetch students
    if (studentIds.length > 0) {
      try {
        const students = await window.api.db.query<LinkedStudent>(
          `SELECT id, first_name, last_name, class_id FROM students WHERE id IN (${studentIds.join(',')})`
        );
        const studentMap: Record<number, LinkedStudent> = {};
        students.forEach(s => { studentMap[s.id] = s; });
        setLinkedStudents(studentMap);
      } catch (e) {
        console.error('Failed to load linked students:', e);
      }
    }

    // Fetch classes
    if (classIds.length > 0) {
      try {
        const classes = await window.api.db.query<LinkedClass>(
          `SELECT id, level, option, section FROM classes WHERE id IN (${classIds.join(',')})`
        );
        const classMap: Record<number, LinkedClass> = {};
        classes.forEach(c => { classMap[c.id] = c; });
        setLinkedClasses(classMap);
      } catch (e) {
        console.error('Failed to load linked classes:', e);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Voulez-vous vraiment supprimer cette note ?')) return;
    try {
      await notesService.delete(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
      toast.success('Note supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const getTargetDisplay = (note: Note): { label: string; icon: React.ReactNode; link?: string } => {
    if (note.target_type === 'student' && note.target_id) {
      const student = linkedStudents[note.target_id];
      if (student) {
        return {
          label: `${student.first_name} ${student.last_name}`,
          icon: <User size={14} className="text-blue-500" />,
          link: `/student/${note.target_id}`
        };
      }
      return { label: `Élève #${note.target_id}`, icon: <User size={14} /> };
    }
    if (note.target_type === 'class' && note.target_id) {
      const cls = linkedClasses[note.target_id];
      if (cls) {
        return {
          label: `${cls.level} ${cls.option} ${cls.section}`,
          icon: <Users size={14} className="text-green-500" />,
          link: `/class/${note.target_id}`
        };
      }
      return { label: `Classe #${note.target_id}`, icon: <Users size={14} /> };
    }
    return { label: 'Général', icon: <StickyNote size={14} className="text-yellow-500" /> };
  };

  const filteredNotes = notes.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || n.target_type === filterType;
    return matchesSearch && matchesType;
  });

  // Sort by date, most recent first
  const sortedNotes = [...filteredNotes].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Resize handlers
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const containerWidth = window.innerWidth - 250; // Subtract sidebar width
    const newWidth = containerWidth - e.clientX + 250;
    if (newWidth >= 300 && newWidth <= 600) {
      setDetailWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div className="flex h-full bg-white">
      {/* Main List Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Blue Header */}
        <div className="bg-blue-600 text-white px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <StickyNote className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Notes & Mémos</h1>
                <p className="text-blue-100 text-sm">
                  {notes.length} note{notes.length !== 1 ? 's' : ''} au total
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-white text-blue-600 px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all hover:bg-blue-50"
            >
              <Plus size={20} /> Nouvelle Note
            </button>
          </div>

          {/* Search & Filters on blue */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher par titre ou contenu..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/20 border border-white/30 rounded-lg focus:ring-2 focus:ring-white/30 outline-none text-white placeholder-white/60"
              />
            </div>
            <div className="flex bg-white/20 p-1 rounded-lg border border-white/30 self-start">
              {(['all', 'general', 'class', 'student'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filterType === type 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-white/80 hover:text-white'
                  }`}
                >
                  {type === 'all' ? 'Tout' : type === 'general' ? 'Général' : type === 'class' ? 'Classe' : 'Élève'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <ProfessionalLoader message="Chargement de vos notes..." subMessage="Synchronisation des mémos en cours" />
            </div>
          ) : sortedNotes.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-xl bg-white">
              <StickyNote size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-1">Aucune note trouvée</h3>
              <p className="text-slate-500 text-sm mb-4">
                {searchQuery ? 'Essayez une autre recherche.' : 'Créez votre première note pour commencer.'}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm inline-flex items-center gap-1"
                >
                  <Plus size={16} /> Ajouter une note
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotes.map(note => {
                const target = getTargetDisplay(note);
                const isSelected = selectedNote?.id === note.id;
                
                return (
                  <div 
                    key={note.id} 
                    onClick={() => setSelectedNote(note)}
                    className={`bg-white border rounded-xl p-4 cursor-pointer transition-all group ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-800 truncate mb-1">
                          {note.title}
                        </h3>
                        <p className="text-slate-500 text-sm line-clamp-2">
                          {note.content}
                        </p>
                      </div>
                      <ChevronRight size={20} className={`text-slate-300 shrink-0 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-xs">
                        {target.icon}
                        <span className="text-slate-600 font-medium">
                          {target.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar size={12} />
                        {new Date(note.created_at).toLocaleDateString('fr-FR', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel (shows when a note is selected) */}
      {selectedNote && (
        <div 
          className="hidden lg:flex flex-col border-l border-slate-200 bg-white relative"
          style={{ width: detailWidth }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-50"
          />
          
          {/* Detail Header */}
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Eye size={20} className="text-blue-500" />
              Détails de la note
            </h2>
            <button 
              onClick={() => setSelectedNote(null)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>
          
          {/* Detail Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">
                {selectedNote.title}
              </h3>
              
              {/* Target Link */}
              {(() => {
                const target = getTargetDisplay(selectedNote);
                return (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-slate-100 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 flex items-center gap-2">
                      {target.icon}
                      {target.label}
                    </span>
                    {target.link && (
                      <button 
                        onClick={() => navigate(target.link!)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      >
                        Voir <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })()}
              
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar size={14} />
                Créée le {new Date(selectedNote.created_at).toLocaleDateString('fr-FR', { 
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
            
            {/* Note Content */}
            <div className="bg-slate-50 border-l-4 border-blue-500 rounded-r-lg p-5">
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                {selectedNote.content}
              </p>
            </div>
            
            {/* TODO: Future features */}
            {/* TODO: Add edit functionality */}
            {/* TODO: Add tags/categories system */}
            {/* TODO: Add attachments support */}
          </div>
          
          {/* Detail Actions */}
          <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
            <button 
              onClick={() => handleDelete(selectedNote.id)}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 size={18} />
              Supprimer
            </button>
            {/* TODO: Add Edit button when edit functionality is implemented */}
          </div>
        </div>
      )}

      {showAddModal && (
        <AddNoteModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadNotes();
          }}
        />
      )}
    </div>
  );
}
