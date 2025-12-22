import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Trash2, Edit, Wifi, Search, Filter, LayoutGrid, List, Layers, ArrowUpDown, ChevronDown, StickyNote } from 'lucide-react';
import { useTutorial } from '../context/TutorialContext';
import ContextMenu from './ContextMenu';
import DeleteConfirmModal from './DeleteConfirmModal';
import AddNoteModal from './AddNoteModal';
import { classService, ClassData } from '../services/classService';
import EditClassModal from './EditClassModal';
import { useToast } from '../context/ToastContext';
import { getClassDisplayName } from '../lib/classUtils';

interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
  academic_year_id?: number;
}

type ViewMode = 'grid' | 'list' | 'grouped_level' | 'grouped_option';
type SortOption = 'name' | 'level' | 'option';

export default function Dashboard() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('level');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  // Modals & Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; classId: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: number; name: string } | null>(null);
  const [editModal, setEditModal] = useState<Class | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addNoteModal, setAddNoteModal] = useState<{ type: 'class' | 'student' | 'general', id?: number } | null>(null);
  
  const toast = useToast();
  const tutorial = useTutorial();

  useEffect(() => {
    loadData();
    // Show tutorial on first visit
    tutorial.showTutorial('dashboard');
  }, []);

  // Show tutorial for view-mode the first time user switches view modes
  useEffect(() => {
    if (viewMode) {
      tutorial.showTutorial('dashboard.viewModes');
    }
  }, [viewMode]);

  const loadData = async () => {
    try {
      // 1. Get active academic year
      const activeYear = await window.api.db.query<{ id: number, name: string }>('SELECT id, name FROM academic_years WHERE is_active = 1 LIMIT 1');
      const activeYearId = activeYear[0]?.id;

      if (!activeYearId) {
        toast.warning("Aucune année académique active. Veuillez en configurer une.");
        setClasses([]); // Or show all? Better to show empty to prompt configuration.
        setLoading(false);
        return;
      }

      const [classesData, schoolData, studentCountData] = await Promise.all([
        window.api.db.query<Class>('SELECT * FROM classes WHERE academic_year_id = ? ORDER BY level, section', [activeYearId]),
        window.api.db.query<{ value: string }>("SELECT value FROM settings WHERE key = 'school_name'"),
        window.api.db.query<{ count: number }>(`SELECT COUNT(*) as count FROM students WHERE class_id IN (SELECT id FROM classes WHERE academic_year_id = ?)`, [activeYearId]),
      ]);

      setClasses(classesData);
      setSchoolName(schoolData[0]?.value || 'Ecole');
      setTotalStudents(studentCountData[0]?.count || 0);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Erreur lors du chargement du tableau de bord.');
    } finally {
      setLoading(false);
    }
  };

  // Filter and Sort Logic
  const filteredAndSortedClasses = useMemo(() => {
    let result = [...classes];

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.level.toLowerCase().includes(q) || 
        c.option.toLowerCase().includes(q) ||
        getClassDisplayName(c.level, c.option, c.section).toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = getClassDisplayName(a.level, a.option, a.section).localeCompare(getClassDisplayName(b.level, b.option, b.section));
          break;
        case 'level':
          // Attempt to sort numerically if levels are numbers, otherwise alphabetically
          const levelA = parseInt(a.level) || a.level;
          const levelB = parseInt(b.level) || b.level;
          if (typeof levelA === 'number' && typeof levelB === 'number') {
            comparison = levelA - levelB;
          } else {
            comparison = String(levelA).localeCompare(String(levelB));
          }
          break;
        case 'option':
          comparison = a.option.localeCompare(b.option);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [classes, searchQuery, sortBy, sortOrder]);

  // Grouping Logic
  const groupedClasses = useMemo(() => {
    if (viewMode === 'grid' || viewMode === 'list') return null;

    const groups: Record<string, Class[]> = {};
    filteredAndSortedClasses.forEach(cls => {
      const key = viewMode === 'grouped_level' ? cls.level : cls.option;
      if (!groups[key]) groups[key] = [];
      groups[key].push(cls);
    });
    return groups;
  }, [filteredAndSortedClasses, viewMode]);


  const handleContextMenu = (e: React.MouseEvent, cls: Class) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, classId: cls.id });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleDeleteClass = async () => {
    if (!deleteModal) return;
    
    try {
      await window.api.db.execute('DELETE FROM classes WHERE id = ?', [deleteModal.id]);
      await loadData();
      setDeleteModal(null);
      toast.success('Classe supprimée avec succès');
    } catch (error) {
      console.error('Failed to delete class:', error);
      toast.error('Erreur lors de la suppression de la classe');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative">
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/watermark.png)',
          backgroundSize: '400px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <header className="bg-blue-600 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col gap-4">
            {/* Top Bar: Title & Primary Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <GraduationCap size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight">{schoolName}</h1>
                  <p className="text-blue-100 font-medium text-sm">Tableau de bord</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => navigate('/network')}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 border border-white/30"
                >
                  <Wifi size={18} />
                  <span className="hidden sm:inline">Réseau</span>
                </button>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-white text-blue-600 px-5 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  <Users size={18} />
                  <span>Nouvelle Classe</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/30 p-2 rounded-lg text-white">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{totalStudents}</p>
                    <p className="text-xs text-blue-100 font-medium">Élèves</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/30 p-2 rounded-lg text-white">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{classes.length}</p>
                    <p className="text-xs text-blue-100 font-medium">Classes</p>
                  </div>
                </div>
              </div>
              <div className="hidden md:block bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/30 p-2 rounded-lg text-white">
                    <Layers size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{[...new Set(classes.map(c => c.option))].length}</p>
                    <p className="text-xs text-blue-100 font-medium">Options</p>
                  </div>
                </div>
              </div>
              <div className="hidden md:block bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/30 p-2 rounded-lg text-white">
                    <ArrowUpDown size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{[...new Set(classes.map(c => c.level))].length}</p>
                    <p className="text-xs text-blue-100 font-medium">Niveaux</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Bar: Search, Sort, View Options */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative w-full sm:w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-white transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Rechercher une classe, une option..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:ring-2 focus:ring-white/30 focus:bg-white/30 transition-all outline-none"
                />
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                {/* View Mode Dropdown */}
                <div className="relative">
                    <div className="flex bg-white/20 rounded-lg p-1 border border-white/30">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}
                            title="Grille"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}
                            title="Liste"
                        >
                            <List size={18} />
                        </button>
                        <div className="w-px bg-white/30 mx-1 self-center h-4"></div>
                         <button 
                            onClick={() => setViewMode('grouped_level')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'grouped_level' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}
                        >
                            Par Niveau
                        </button>
                         <button 
                            onClick={() => setViewMode('grouped_option')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${viewMode === 'grouped_option' ? 'bg-white text-blue-600 shadow-sm' : 'text-white/80 hover:text-white'}`}
                        >
                            Par Option
                        </button>
                    </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex items-center bg-white/20 rounded-lg p-1 border border-white/30">
                     <span className="text-xs font-bold text-white/60 px-2 uppercase tracking-wider">Trier</span>
                     <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="bg-transparent text-sm font-semibold text-white outline-none cursor-pointer"
                     >
                        <option value="level" className="text-slate-800">Niveau</option>
                        <option value="option" className="text-slate-800">Option</option>
                        <option value="name" className="text-slate-800">Nom</option>
                     </select>
                     <button 
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="ml-2 p-1.5 hover:bg-white/20 rounded-md text-white/80 hover:text-white transition-colors"
                     >
                         <ArrowUpDown size={14} className={sortOrder === 'desc' ? 'transform rotate-180' : ''} />
                     </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative">
        
        {/* Empty State */}
        {filteredAndSortedClasses.length === 0 ? (
           <div className="text-center py-20">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Aucune classe trouvée</h3>
            <p className="text-slate-500 max-w-md mx-auto mb-8">
               {classes.length === 0 
                  ? "Commencez par créer votre première classe pour gérer vos élèves." 
                  : "Aucune classe ne correspond à votre recherche. Essayez d'autres termes."}
            </p>
            {classes.length === 0 && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg inline-flex items-center gap-2"
              >
                <Users size={20} />
                Créer une classe
              </button>
            )}
          </div>
        ) : (
          /* Content Grid/List */
          <>
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedClasses.map(cls => <ClassCard key={cls.id} cls={cls} navigate={navigate} onEdit={setEditModal} onContextMenu={handleContextMenu} />)}
              </div>
            )}

            {viewMode === 'list' && (
               <div className="space-y-3">
                 {filteredAndSortedClasses.map(cls => <ClassListItem key={cls.id} cls={cls} navigate={navigate} onEdit={setEditModal} onContextMenu={handleContextMenu} />)}
               </div>
            )}

            {(viewMode === 'grouped_level' || viewMode === 'grouped_option') && groupedClasses && (
                <div className="space-y-10">
                    {Object.entries(groupedClasses).map(([groupName, groupClasses]) => (
                        <div key={groupName}>
                            <h2 className="text-lg font-bold text-slate-700 mb-4 px-2 border-l-4 border-blue-500 flex items-center gap-2">
                                {viewMode === 'grouped_level' ? `${groupName}` : groupName}
                                <span className="bg-slate-200 text-slate-600 text-xs py-0.5 px-2 rounded-full">{groupClasses.length}</span>
                            </h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {groupClasses.map(cls => <ClassCard key={cls.id} cls={cls} navigate={navigate} onEdit={setEditModal} onContextMenu={handleContextMenu} />)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </>
        )}
      </main>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          items={[
            {
              label: 'Ouvrir',
              icon: <GraduationCap size={18} />,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) navigate(`/class/${cls.id}`);
                closeContextMenu();
              }
            },
            {
              label: 'Ajouter une note',
              icon: <StickyNote size={18} />,
              onClick: () => {
                 setAddNoteModal({ type: 'class', id: contextMenu.classId });
                 closeContextMenu();
              }
            },
            { divider: true },
            {
              label: 'Modifier',
              icon: <Edit size={18} />,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) setEditModal(cls);
                closeContextMenu();
              }
            },
            {
              label: 'Supprimer',
              icon: <Trash2 size={18} />,
              danger: true,
              onClick: () => {
                const cls = classes.find(c => c.id === contextMenu.classId);
                if (cls) setDeleteModal({ id: cls.id, name: getClassDisplayName(cls.level, cls.option, cls.section) });
                closeContextMenu();
              }
            }
          ]}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          isOpen={!!deleteModal}
          title="Supprimer la classe"
          message={`Êtes-vous sûr de vouloir supprimer la classe ${deleteModal.name} ? Cette action est irréversible.`}
          onConfirm={handleDeleteClass}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {editModal && (
        <EditClassModal
          classData={editModal}
          onClose={() => setEditModal(null)}
          onSuccess={() => {
            loadData();
            setEditModal(null);
            toast.success('Classe modifiée avec succès');
          }}
        />
      )}

      {showCreateModal && (
        <EditClassModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadData();
            setShowCreateModal(false);
            toast.success('Classe créée avec succès');
          }}
        />
      )}


      {addNoteModal && (
        <AddNoteModal
          onClose={() => setAddNoteModal(null)}
          onSuccess={() => {
             setAddNoteModal(null);
             toast.success("Note ajoutée !");
          }}
          initialTargetType={addNoteModal.type}
          initialTargetId={addNoteModal.id}
        />
      )}
    </div>
  );
}

// --- Subcomponents for Rendering ---

function ClassCard({ cls, navigate, onEdit, onContextMenu }: { cls: Class, navigate: any, onEdit: any, onContextMenu: any }) {
    return (
        <div 
          onClick={() => navigate(`/class/${cls.id}`)}
          onContextMenu={(e) => onContextMenu(e, cls)}
          className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          {/* Decorative Gradient Background on Hover */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-transparent opacity-0 group-hover:opacity-50 transition-opacity rounded-bl-full pointer-events-none"></div>

          <div className="absolute top-2 right-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cls);
              }}
              className="p-2 hover:bg-white/80 rounded-full text-slate-400 hover:text-blue-600 transition-colors shadow-sm backdrop-blur-sm"
              title="Modifier"
            >
              <Edit size={16} />
            </button>
          </div>

          <div className="flex items-start justify-between mb-4 relative z-0">
            <div className="bg-blue-50 p-3.5 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm">
              <Users size={24} className="group-hover:scale-110 transition-transform" />
            </div>
            {cls.academic_year_id && (
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider border border-slate-200">
                2025-2026
                </span>
            )}
          </div>
          
          <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-blue-700 transition-colors">
            {getClassDisplayName(cls.level, cls.option, cls.section)}
          </h3>
          <p className="text-slate-500 text-sm font-medium flex gap-2">
            <span>{cls.level}</span>
            <span className="text-slate-300">•</span>
            <span>{cls.option}</span>
          </p>
        </div>
    );
}

function ClassListItem({ cls, navigate, onEdit, onContextMenu }: { cls: Class, navigate: any, onEdit: any, onContextMenu: any }) {
    return (
        <div 
          onClick={() => navigate(`/class/${cls.id}`)}
          onContextMenu={(e) => onContextMenu(e, cls)}
          className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 hover:bg-blue-50/30 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between group"
        >
           <div className="flex items-center gap-4">
               <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                  <Users size={20} />
               </div>
               <div>
                    <h3 className="text-base font-bold text-slate-800">
                        {getClassDisplayName(cls.level, cls.option, cls.section)}
                    </h3>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
                         <span>{cls.level}</span>
                         <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                         <span>{cls.option}</span>
                    </div>
               </div>
           </div>

           <div className="flex items-center gap-3">
                {cls.academic_year_id && (
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md">
                    2025-2026
                    </span>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                         onClick={(e) => {
                            e.stopPropagation();
                            onEdit(cls);
                        }}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                         className="p-2 ml-1 hover:bg-red-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                         onClick={(e) => {
                             // Logic to trigger delete from list view if needed, or just context menu
                             e.preventDefault();
                             e.stopPropagation();
                             onContextMenu(e, cls);
                         }}
                    >
                         <Trash2 size={16} />
                    </button>
                </div>
           </div>
        </div>
    );
}

