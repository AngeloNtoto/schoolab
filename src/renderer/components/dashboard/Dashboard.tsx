
import React, { useEffect, useState, useMemo, Suspense,Activity } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Trash2, Edit, Wifi, Search, Filter, LayoutGrid, List, Layers, ArrowUpDown, ChevronDown, StickyNote } from 'lucide-react';
import { useTutorial } from '../../context/TutorialContext';
import ContextMenu from '../ui/ContextMenu';
import DeleteConfirmModal from '../ui/DeleteConfirmModal';
import AddNoteModal from '../class/AddNoteModal';
import EditClassModal from '../class/EditClassModal';
import { useToast } from '../../context/ToastContext';
import { getClassDisplayName } from '../../lib/classUtils';
import ProfessionalLoader from '../ui/ProfessionalLoader';
import { AppIcon } from '../ui/Logo';

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
  const [classes, setClasses] = useState([] as Class[]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  
  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid' as ViewMode);
  const [sortBy, setSortBy] = useState('level' as SortOption);
  const [sortOrder, setSortOrder] = useState('asc' as 'asc' | 'desc');
  const [showFilters, setShowFilters] = useState(false);
  const [headerExpanded, setHeaderExpanded] = useState(false);

  // Modals & Context Menu State
  const [contextMenu, setContextMenu] = useState(null as { x: number; y: number; classId: number } | null);
  const [deleteModal, setDeleteModal] = useState(null as { id: number; name: string } | null);
  const [editModal, setEditModal] = useState(null as Class | null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addNoteModal, setAddNoteModal] = useState(null as { type: 'class' | 'student' | 'general', id?: number } | null);
  
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
        window.api.db.query<{ count: number }>(`
          SELECT COUNT(*) as count FROM students 
          WHERE class_id IN (SELECT id FROM classes WHERE academic_year_id = ?)
        `, [activeYearId]),
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

  return (
    <div className="h-full flex flex-col overflow-hidden bg-slate-50/50 dark:bg-[#020617] relative transition-colors duration-500">
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/watermark.png)',
          backgroundSize: '400px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <header className="bg-blue-600 dark:bg-[#020617] border-b border-transparent dark:border-white/5 text-white sticky top-0 z-30 shadow-lg transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-6 py-3">
          {/* Always Visible: Top Bar with Logo, Title & Primary Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AppIcon size={55} bg="blue" className="shadow-lg shadow-blue-900/20" />
              <div className="flex flex-col">
                <h1 className="text-xl font-black tracking-tighter text-white leading-none drop-shadow-md uppercase truncate max-w-[350px]">
                  {schoolName || 'Mon École'}
                </h1>
                <span className="text-[9px] uppercase tracking-[0.3em] text-blue-200 font-bold drop-shadow-sm ml-0.5">Administration</span>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <button 
                onClick={() => navigate('/network')}
                className="bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 text-white px-5 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center gap-2 border border-white/10 dark:border-white/5 active:scale-95 backdrop-blur-md"
              >
                <Wifi size={16} />
                <span className="hidden sm:inline">Réseau Sync</span>
              </button>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-white dark:bg-blue-600 text-blue-600 dark:text-white px-7 py-3 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/90 dark:hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 flex items-center gap-2 active:scale-95 border border-white/10 dark:border-white/5"
              >
                <Users size={16} />
                <span>Nouvelle Classe</span>
              </button>
            </div>
          </div>

          {/* Expandable Stats Bar - Professional Toggle */}
          <button 
            onClick={() => setHeaderExpanded(!headerExpanded)}
            className="w-full mt-3 flex items-center justify-between bg-white/5 hover:bg-white/10 dark:bg-black/20 dark:hover:bg-black/30 border border-white/10 dark:border-white/5 rounded-2xl px-4 py-2.5 transition-all duration-300 group"
          >
            <div className="flex items-center gap-4">
              {/* Mini Stats Preview - Hidden when expanded */}
              {!headerExpanded && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Users size={14} />
                    <span className="text-xs font-bold">{totalStudents}</span>
                    <span className="text-[9px] text-white/50 uppercase tracking-wider">élèves</span>
                  </div>
                  <div className="w-px h-4 bg-white/20"></div>
                  <div className="flex items-center gap-1.5 text-white/80">
                    <GraduationCap size={14} />
                    <span className="text-xs font-bold">{classes.length}</span>
                    <span className="text-[9px] text-white/50 uppercase tracking-wider">classes</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest group-hover:text-white/60 transition-colors">
                {headerExpanded ? 'Masquer' : 'Statistiques & Filtres'}
              </span>
              <ChevronDown size={16} className={`text-white/50 group-hover:text-white transition-all duration-300 ${headerExpanded ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${headerExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0 mt-0'}`}>
            <Activity mode={headerExpanded ? 'visible' : 'hidden'}>
              <div className="flex flex-col gap-4 pb-2">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[1.5rem] p-3 transition-all hover:bg-white/15 hover:scale-[1.02] duration-300">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 dark:bg-blue-500/20 p-2 rounded-xl text-white dark:text-blue-400 shadow-lg">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white tracking-tighter">{totalStudents}</p>
                        <p className="text-[8px] text-blue-100 dark:text-slate-500 font-black uppercase tracking-[0.15em]">Élèves</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[1.5rem] p-3 transition-all hover:bg-white/15 hover:scale-[1.02] duration-300">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 dark:bg-indigo-500/20 p-2 rounded-xl text-white dark:text-indigo-400 shadow-lg">
                        <GraduationCap size={18} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white tracking-tighter">{classes.length}</p>
                        <p className="text-[8px] text-blue-100 dark:text-slate-500 font-black uppercase tracking-[0.15em]">Classes</p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[1.5rem] p-3 transition-all hover:bg-white/15 hover:scale-[1.02] duration-300">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 dark:bg-purple-500/20 p-2 rounded-xl text-white dark:text-purple-400 shadow-lg">
                        <Layers size={18} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white tracking-tighter">{[...new Set(classes.map(c => c.option))].length}</p>
                        <p className="text-[8px] text-blue-100 dark:text-slate-500 font-black uppercase tracking-[0.15em]">Options</p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[1.5rem] p-3 transition-all hover:bg-white/15 hover:scale-[1.02] duration-300">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 dark:bg-emerald-500/20 p-2 rounded-xl text-white dark:text-emerald-400 shadow-lg">
                        <ArrowUpDown size={18} />
                      </div>
                      <div>
                        <p className="text-lg font-black text-white tracking-tighter">{[...new Set(classes.map(c => c.level))].length}</p>
                        <p className="text-[8px] text-blue-100 dark:text-slate-500 font-black uppercase tracking-[0.15em]">Niveaux</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls Bar: Search, Sort, View Options */}
                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Rechercher une classe, une option..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-14 pr-6 py-3 bg-white/10 dark:bg-black/20 border border-white/10 dark:border-white/5 rounded-[2rem] text-white placeholder-white/40 focus:ring-4 focus:ring-white/10 focus:bg-white/20 dark:focus:bg-black/40 transition-all outline-none font-bold text-xs shadow-inner"
                    />
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                    {/* View Mode Buttons */}
                    <div className="relative">
                      <div className="flex bg-white/20 dark:bg-black/20 rounded-xl p-1 border border-white/20 dark:border-white/10 backdrop-blur-md">
                        <button 
                          onClick={() => setViewMode('grid')}
                          className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xl' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                          title="Grille"
                        >
                          <LayoutGrid size={18} />
                        </button>
                        <button 
                          onClick={() => setViewMode('list')}
                          className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xl' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                          title="Liste"
                        >
                          <List size={18} />
                        </button>
                        <div className="w-px bg-white/20 dark:bg-white/10 mx-1 self-center h-4"></div>
                        <button 
                          onClick={() => setViewMode('grouped_level')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'grouped_level' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xl' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                        >
                          Niveau
                        </button>
                        <button 
                          onClick={() => setViewMode('grouped_option')}
                          className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${viewMode === 'grouped_option' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-xl' : 'text-white/80 hover:text-white hover:bg-white/10'}`}
                        >
                          Option
                        </button>
                      </div>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center bg-white/20 dark:bg-black/20 rounded-xl p-1 border border-white/20 dark:border-white/10 backdrop-blur-md">
                      <span className="text-[9px] font-black text-white/50 px-2 uppercase tracking-[0.2em]">Trier</span>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer pr-2"
                      >
                        <option value="level" className="text-slate-800 dark:bg-slate-900 dark:text-white">Niveau</option>
                        <option value="option" className="text-slate-800 dark:bg-slate-900 dark:text-white">Option</option>
                        <option value="name" className="text-slate-800 dark:bg-slate-900 dark:text-white">Nom</option>
                      </select>
                      <button 
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="ml-1 p-2 hover:bg-white/10 rounded-lg text-white transition-all active:scale-95"
                      >
                        <ArrowUpDown size={14} className={sortOrder === 'desc' ? 'transform rotate-180 transition-transform duration-300' : 'transition-transform duration-300'} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Activity>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 relative">
        {loading ? (
          <ProfessionalLoader message="Chargement des classes..." fullScreen={false} />
        ) : (
          <Suspense fallback={<ProfessionalLoader message="Chargement des classes..." />}>
          
          {/* Empty State */}
        {filteredAndSortedClasses.length === 0 ? (
           <div className="text-center py-20">
            <div className="bg-slate-100 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={40} className="text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Aucune classe trouvée</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8">
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
                            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 mb-6 px-4 py-2 border-l-[6px] border-blue-600 dark:border-blue-500 flex items-center gap-3 bg-slate-100/50 dark:bg-white/5 rounded-r-xl tracking-widest uppercase">
                                {viewMode === 'grouped_level' ? `${groupName}` : groupName}
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black py-0.5 px-3 rounded-full border border-blue-200/50 dark:border-blue-500/20 ml-2 shadow-sm">
                                    {groupClasses.length} {groupClasses.length > 1 ? 'Classes' : 'Classe'}
                                </span>
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
          </Suspense>
        )}
        </div>
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

      <Activity mode={!!deleteModal ? 'visible' : 'hidden'}>
        {deleteModal && (
          <DeleteConfirmModal
            isOpen={!!deleteModal}
            title="Supprimer la classe"
            message={`Êtes-vous sûr de vouloir supprimer la classe ${deleteModal.name} ? Cette action est irréversible.`}
            onConfirm={handleDeleteClass}
            onCancel={() => setDeleteModal(null)}
          />
        )}
      </Activity>

      <Activity mode={!!editModal ? 'visible' : 'hidden'}>
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
      </Activity>

      <Activity mode={showCreateModal ? 'visible' : 'hidden'}>
        <EditClassModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            loadData();
            setShowCreateModal(false);
            toast.success('Classe créée avec succès');
          }}
        />
      </Activity>

      <Activity mode={!!addNoteModal ? 'visible' : 'hidden'}>
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
      </Activity>
    </div>
  );
}

// --- Subcomponents for Rendering ---

function ClassCard({ cls, navigate, onEdit, onContextMenu }: { cls: Class, navigate: any, onEdit: any, onContextMenu: any }) {
    return (
        <div 
          onClick={() => navigate(`/class/${cls.id}`)}
          onContextMenu={(e) => onContextMenu(e, cls)}
          className="bg-white dark:bg-slate-900/40 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-white/5 hover:shadow-xl dark:hover:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all duration-300 cursor-pointer group relative overflow-hidden"
        >
          {/* Decorative Gradient Background on Hover */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 dark:from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none duration-500"></div>

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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3.5 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-300 shadow-sm border border-blue-100/50 dark:border-blue-500/10">
              <Users size={24} className="text-blue-600 dark:text-blue-400 group-hover:text-white group-hover:scale-110 transition-all" />
            </div>
            {cls.academic_year_id && (
                <span className="bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border border-slate-200 dark:border-white/5">
                2025-2026
                </span>
            )}
          </div>
          
          <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
            {getClassDisplayName(cls.level, cls.option, cls.section)}
          </h3>
          <p className="text-slate-500 dark:text-slate-400/60 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <span>{cls.level}</span>
            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
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
          className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/5 hover:bg-blue-50/30 dark:hover:bg-slate-900/60 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all cursor-pointer flex items-center justify-between group"
        >
           <div className="flex items-center gap-4">
               <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/10 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                  <Users size={20} />
               </div>
               <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
                        {getClassDisplayName(cls.level, cls.option, cls.section)}
                    </h3>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest flex items-center gap-2 mt-0.5">
                         <span>{cls.level}</span>
                         <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                         <span>{cls.option}</span>
                    </div>
               </div>
           </div>
 
           <div className="flex items-center gap-4">
                {cls.academic_year_id && (
                    <span className="bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest border border-slate-200 dark:border-white/5">
                    2025-2026
                    </span>
                )}
                <div className="opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1">
                    <button 
                         onClick={(e) => {
                            e.stopPropagation();
                            onEdit(cls);
                        }}
                        className="p-2 hover:bg-white dark:hover:bg-blue-600 dark:hover:text-white rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 transition-all shadow-sm"
                    >
                        <Edit size={16} />
                    </button>
                    <button 
                         className="p-2 hover:bg-red-50 dark:hover:bg-red-600 dark:hover:text-white rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-600 transition-all shadow-sm"
                         onClick={(e) => {
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

