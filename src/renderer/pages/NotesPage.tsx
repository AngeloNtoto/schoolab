import React, { useEffect, useState } from 'react';
import { dbService } from '../services/databaseService';
import { notesService, Note } from '../services/notesService';
import { Plus, Search, StickyNote, Trash2, Calendar, Tag, X, User, Users, Eye, ChevronRight, ArrowLeft } from 'lucide-react';
import AddNoteModal from '../components/class/AddNoteModal';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import ProfessionalLoader from '../components/ui/ProfessionalLoader';

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
  const [noteToEdit, setNoteToEdit] = useState<Note | null>(null);
  
  // Cache for linked entity names
  const [linkedStudents, setLinkedStudents] = useState<Record<number, LinkedStudent>>({});
  const [linkedClasses, setLinkedClasses] = useState<Record<number, LinkedClass>>({});
  
  // Resizable detail panel
  const [detailWidth, setDetailWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadNotes();
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
        const students = await dbService.query<LinkedStudent>(
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
        const classes = await dbService.query<LinkedClass>(
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
    <div className="flex h-full bg-slate-50/50 dark:bg-slate-950 transition-colors">
      {/* Main List Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Premium Adaptive Header */}
        <div className="bg-blue-600 dark:bg-slate-900/50 border-b border-transparent dark:border-white/5 px-6 py-6 shadow-lg transition-colors backdrop-blur-xl">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-white/20 dark:bg-blue-600/30 rounded-2xl shadow-xl backdrop-blur-md transition-colors">
                  <StickyNote className="text-white dark:text-blue-400" size={24} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white dark:text-white tracking-tight">Notes & Mémos</h1>
                  <p className="text-blue-100 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                    {notes.length} note{notes.length !== 1 ? 's' : ''} enregistrée{notes.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-white dark:bg-blue-600 hover:bg-blue-50 dark:hover:bg-blue-700 text-blue-600 dark:text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                <Plus size={20} /> Nouvelle Note
              </button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Rechercher par titre ou contenu..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-4 bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/5 rounded-2xl focus:ring-4 focus:ring-white/10 focus:bg-white/20 dark:focus:bg-black/40 outline-none text-white placeholder-white/40 font-bold shadow-inner transition-all"
                />
              </div>
              <div className="flex bg-white/10 dark:bg-black/20 p-1.5 rounded-[1.25rem] border border-white/10 dark:border-white/5 self-start backdrop-blur-md">
                {(['all', 'general', 'class', 'student'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      filterType === type 
                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xl shadow-blue-500/20' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {type === 'all' ? 'Tout' : type === 'general' ? 'Général' : type === 'class' ? 'Classe' : 'Élève'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notes List Area */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50 dark:bg-transparent transition-colors">
            {loading ? (
                <ProfessionalLoader message="Chargement des mémos..." subMessage="Veuillez patienter" fullScreen={false} />
            ) : sortedNotes.length === 0 ? (
              <div className="text-center py-24 bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-black/20 overflow-hidden relative">
                <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                <StickyNote size={64} className="mx-auto text-slate-200 dark:text-slate-800 mb-6 drop-shadow-sm" />
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-2">Aucune note ici</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 max-w-sm mx-auto">
                  {searchQuery ? 'Aucun résultat ne correspond à votre recherche.' : 'Prenez de l\'avance en créant votre premier mémo dès maintenant.'}
                </p>
                {!searchQuery && (
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-3 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
                  >
                    <Plus size={20} /> Créer une note
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {sortedNotes.map(note => {
                  const target = getTargetDisplay(note);
                  const isSelected = selectedNote?.id === note.id;
                  
                  return (
                    <div 
                      key={note.id} 
                      onClick={() => setSelectedNote(note)}
                      className={`bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2rem] p-6 cursor-pointer transition-all flex flex-col gap-4 border-2 group relative overflow-hidden ${
                        isSelected 
                          ? 'border-blue-500 shadow-2xl shadow-blue-500/10' 
                          : 'border-white dark:border-white/5 hover:border-slate-200 dark:hover:border-blue-500/30 shadow-lg shadow-slate-200/40 dark:shadow-black/40 hover:shadow-xl'
                      }`}
                    >
                      {isSelected && <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-[3rem] -mr-4 -mt-4"></div>}
                      
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight truncate group-hover:text-blue-600 transition-colors">
                            {note.title}
                          </h3>
                        </div>
                        <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-700'}`}>
                          <ChevronRight size={20} className={`transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </div>
                      </div>

                      <p className="text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed h-[3rem]">
                        {note.content}
                      </p>
                      
                      <div className="flex items-center flex-wrap gap-2">
                        {note.tags && note.tags.split(',').map(tag => (
                          <span key={tag} className="px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-tight">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2 pt-4 border-t border-slate-50 dark:border-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
                            {target.icon}
                          </div>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            {target.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          <Calendar size={12} className="opacity-50" />
                          {new Date(note.created_at).toLocaleDateString('fr-FR', { 
                            day: 'numeric', 
                            month: 'short'
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

      {/* Premium Adaptive Detail Panel */}
      {selectedNote && (
        <div 
          className="hidden lg:flex flex-col border-l border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 backdrop-blur-3xl relative animate-in slide-in-from-right-10 duration-500 transition-colors"
          style={{ width: detailWidth }}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-50"
          />
          
          {/* Detail Header */}
          <div className="px-8 py-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400">
                <Eye size={24} />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Vue détaillée</h2>
            </div>
            <button 
              onClick={() => setSelectedNote(null)}
              className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
            >
              <X size={24} />
            </button>
          </div>
          
          {/* Detail Content */}
          <div className="flex-1 overflow-y-auto p-10 space-y-8">
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-[1.15] tracking-tight">
                {selectedNote.title}
              </h3>
              
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const target = getTargetDisplay(selectedNote);
                  return (
                    <>
                      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="p-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm">{target.icon}</div>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">{target.label}</span>
                      </div>
                      {target.link && (
                        <button 
                          onClick={() => navigate(target.link!)}
                          className="bg-blue-600 hover:bg-black text-white px-4 py-2 rounded-[1.25rem] text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                          Aller voir
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-xl inline-flex w-fit">
                <Calendar size={14} className="opacity-50" />
                <span>Le {new Date(selectedNote.created_at).toLocaleDateString('fr-FR', { 
                  weekday: 'long',
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric'
                })}</span>
                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                <span>{new Date(selectedNote.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
            
            {/* Note Content */}
            <div className="bg-white dark:bg-slate-800/50 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 p-8 shadow-inner-lg min-h-[300px]">
              <p className="text-slate-700 dark:text-slate-300 font-medium text-lg leading-relaxed whitespace-pre-wrap">
                {selectedNote.content}
              </p>
            </div>
            
            {/* Tags Display in Detail */}
            {selectedNote.tags && (
              <div className="flex flex-wrap gap-2">
                {selectedNote.tags.split(',').map(tag => (
                  <span key={tag} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                    <Tag size={12} className="opacity-50" /> {tag.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
          
          {/* Detail Actions - Floated or Bottom Bar */}
          <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/30 dark:bg-black/20 flex gap-4">
            <button 
              onClick={() => handleDelete(selectedNote.id)}
              className="px-6 py-4 text-red-500 hover:text-white bg-white dark:bg-slate-800 hover:bg-red-500 dark:hover:bg-red-600 border border-red-100 dark:border-white/5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-3 flex-1"
            >
              <Trash2 size={18} />
              Supprimer
            </button>
            <button 
              onClick={() => setNoteToEdit(selectedNote)}
              className="bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 dark:shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3 flex-[2]"
            >
              <Tag size={18} />
              Modifier
            </button>
          </div>
        </div>
      )}

      {(showAddModal || noteToEdit) && (
        <AddNoteModal 
          noteToEdit={noteToEdit}
          onClose={() => {
            setShowAddModal(false);
            setNoteToEdit(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setNoteToEdit(null);
            loadNotes().then(() => {
              // Refresh selected note if it was the one edited
              if (selectedNote) {
                notesService.getAll().then(allNotes => {
                  const updated = allNotes.find(n => n.id === selectedNote.id);
                  if (updated) setSelectedNote(updated);
                });
              }
            });
          }}
        />
      )}
    </div>
  );
}
