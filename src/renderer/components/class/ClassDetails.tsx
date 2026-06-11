import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileSpreadsheet, Award, Users, FileText, BookOpen, Printer, Search, ArrowUpDown, Edit, ChevronDown, TrendingUp, Lock, Unlock, Maximize, Minimize, Download, RefreshCw, RotateCcw } from '../iconsSvg';

// Services & Hooks
import { ClassData, Subject } from '../../services/classService';
import { Student } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';

// Composants
import AddStudentModal from './AddStudentModal';
import AddSubjectModal from './AddSubjectModal';
import CustomSortModal from './CustomSortModal';
import { customSortService, CustomSort } from '../../services/customSortService';

// Interface pour les props
interface ClassDetailsProps {
  // Données pré-chargées
  classInfo: ClassData;
  subjects: Subject[];
  students: Student[];
  gradesMap: Map<string, number>;
  editingSubject: Subject | null;
  loading?: boolean;
  
  // Actions
  onEditStudent: (studentId: number) => void;
  onOpenBulletin: (studentId: number) => void;
  onOpenBulkPrint: () => void;
  onOpenCouponsPrint: () => void;
  onOpenPalmares: () => void;
  onUpdateGrade: (studentId: number, subjectId: number, period: string, value: number | null) => Promise<void>;
  onAddStudent: (student: Partial<Student>) => Promise<void>;
  onDeleteStudent: (studentId: number) => Promise<void>;
  onImportStudents: (students: Partial<Student>[]) => Promise<void>;
  onRefreshSubjects: () => Promise<void>;
  onRefreshAll: () => Promise<void>;
  onSetEditingSubject: (subject: Subject | null) => void;
  onOpenRepechage: (studentId: number) => void;
}

const roundGradeValue = (value: number) => Math.round((value));

const convertGradeToCourseMax = (rawValue: number, courseMax: number, correctionMax: number | null) => {
  if (!correctionMax || correctionMax <= 0 || courseMax <= 0 || correctionMax === courseMax) {
    return roundGradeValue(rawValue);
  }

  return roundGradeValue((rawValue / correctionMax) * courseMax);
};

const convertGradeToCorrectionMax = (storedValue: number, courseMax: number, correctionMax: number | null) => {
  if (!correctionMax || correctionMax <= 0 || courseMax <= 0 || correctionMax === courseMax) {
    return storedValue;
  }

  return roundGradeValue((storedValue / courseMax) * correctionMax);
};

const formatGradeInputValue = (value: number | null, courseMax: number, correctionMax: number | null) => {
  if (value === null) return '';
  return convertGradeToCorrectionMax(value, courseMax, correctionMax).toString();
};

export default function ClassDetails({
  classInfo,
  subjects,
  students,
  gradesMap,
  editingSubject,
  loading,
  onEditStudent,
  onOpenBulletin,
  onOpenBulkPrint,
  onOpenCouponsPrint,
  onOpenPalmares,
  onUpdateGrade,
  onAddStudent,
  onDeleteStudent,
  onImportStudents,
  onRefreshSubjects,
  onRefreshAll,
  onSetEditingSubject,
  onOpenRepechage
}: ClassDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [customSorts, setCustomSorts] = useState<CustomSort[]>([]);
  const [showCustomSortModal, setShowCustomSortModal] = useState(false);
  const [editingCustomSort, setEditingCustomSort] = useState<CustomSort | null>(null);
  const [showOnlyAbandons, setShowOnlyAbandons] = useState(false);
  const ALL_PERIODS = ['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'];
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set(ALL_PERIODS));
  // Nouveaux états pour les améliorations du mark board
  const [lockedPeriods, setLockedPeriods] = useState<Set<string>>(new Set());
  const [focusedSubject, setFocusedSubject] = useState<number | 'all'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [correctionMaxInput, setCorrectionMaxInput] = useState('');

  const toast = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; student: Student } | null>(null);

  const loadCustomSorts = useCallback(async () => {
    if (classInfo) {
      try {
        const sorts = await customSortService.getByClass(classInfo.id);
        setCustomSorts(sorts);
      } catch (err) {
        console.error("Failed to load custom sorts", err);
      }
    }
  }, [classInfo]);

  useEffect(() => {
    loadCustomSorts();
  }, [loadCustomSorts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowFiltersPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const correctionMax = useMemo(() => {
    const parsed = parseFloat(correctionMaxInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [correctionMaxInput]);

  // Filter & Sort Logic
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];
    // Filter by abandon status if requested
    if (showOnlyAbandons) {
      result = result.filter(s => Boolean((s as Student).is_abandoned));
    }

    // Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.last_name.toLowerCase().includes(q) || 
        s.first_name.toLowerCase().includes(q) || 
        (s.post_name && s.post_name.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder.startsWith('custom_')) {
        const customId = parseInt(sortOrder.replace('custom_', ''), 10);
        const sortProfile = customSorts.find(s => s.id === customId);
        if (sortProfile) {
          try {
            const orderMap = JSON.parse(sortProfile.student_order);
            const posA = orderMap[a.id] ?? 9999;
            const posB = orderMap[b.id] ?? 9999;
            
            const isWithdrawnA = posA === -1;
            const isWithdrawnB = posB === -1;

            if (isWithdrawnA && !isWithdrawnB) return 1;
            if (!isWithdrawnA && isWithdrawnB) return -1;
            if (posA !== posB) return posA - posB;
          } catch (e) {}
        }
      }

      const nameA = `${a.last_name} ${a.post_name}`;
      const nameB = `${b.last_name} ${b.post_name}`;
      return sortOrder === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
    });

    return result;
  }, [students, searchQuery, sortOrder, customSorts]);

  // Sujets filtrés par le sélecteur de matière
  const displayedSubjects = useMemo(() => {
    if (focusedSubject === 'all') return subjects;
    return subjects.filter(s => s.id === focusedSubject);
  }, [subjects, focusedSubject]);

  // Calcul de la progression : combien de notes remplies par période
  const progressData = useMemo(() => {
    const periods = ['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'];
    const data: Record<string, { filled: number; total: number }> = {};
    for (const p of periods) {
      let filled = 0;
      let total = 0;
      for (const student of filteredAndSortedStudents) {
        for (const subject of displayedSubjects) {
          // Ignorer les examens désactivés (max = 0)
          const isExamDisabled = (p === 'EXAM1' && subject.max_exam1 === 0) || (p === 'EXAM2' && subject.max_exam2 === 0);
          if (isExamDisabled) continue;
          total++;
          const val = gradesMap.get(`${student.id}-${subject.id}-${p}`);
          if (val !== undefined) filled++;
        }
      }
      data[p] = { filled, total };
    }
    return data;
  }, [filteredAndSortedStudents, displayedSubjects, gradesMap]);

  // Stats par colonne (moyenne, min, max) pour la période active
  const columnStats = useMemo(() => {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    const targetPeriods = Array.from(selectedPeriods);
    for (const subject of displayedSubjects) {
      for (const p of targetPeriods) {
        const key = `${subject.id}-${p}`;
        const values: number[] = [];
        for (const student of filteredAndSortedStudents) {
          const val = gradesMap.get(`${student.id}-${subject.id}-${p}`);
          if (val !== undefined) values.push(val);
        }
        if (values.length > 0) {
          stats[key] = {
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length
          };
        }
      }
    }
    return stats;
  }, [displayedSubjects, filteredAndSortedStudents, gradesMap, selectedPeriods]);

  // Basculer le verrouillage d'une période
  const toggleLockPeriod = (period: string) => {
    setLockedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  };

  // Export CSV rapide de la grille visible
  const handleExportCSV = () => {
    if (!classInfo) return;
    const periods = ALL_PERIODS.filter(p => selectedPeriods.has(p));
    // En-tête CSV
    let csv = 'N°,Nom,Prénom';
    for (const sub of displayedSubjects) {
      for (const p of periods) {
        csv += `,${sub.name} ${p}`;
      }
    }
    csv += '\n';
    // Données
    filteredAndSortedStudents.forEach((student, idx) => {
      csv += `${idx + 1},${student.last_name},${student.first_name}`;
      for (const sub of displayedSubjects) {
        for (const p of periods) {
          const val = gradesMap.get(`${student.id}-${sub.id}-${p}`);
          csv += `,${val !== undefined ? val : ''}`;
        }
      }
      csv += '\n';
    });
    // Télécharger le fichier
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classInfo.name}_notes.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };


  // Récupération optimisée d'une note via la Map (O(1))
  const getGrade = (studentId: number, subjectId: number, period: string) => {
    return gradesMap.get(`${studentId}-${subjectId}-${period}`) ?? null;
  };

  const onGradeUpdate = useCallback(async (studentId: number, subjectId: number, period: string, value: number | null) => {
    try {
      await onUpdateGrade(studentId, subjectId, period, value);
    } catch (error) {
      console.error('Failed to update grade:', error);
      toast.error('Erreur lors de la mise à jour de la note');
    }
  }, [onUpdateGrade, toast]);


  const onContextMenu = useCallback((e: React.MouseEvent, student: Student) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, student });
  }, []);

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleDeleteStudent = async () => {
    if (contextMenu) {
      const confirmed = await toast.confirm({
        title: 'Supprimer l\'élève',
        message: `Êtes-vous sûr de vouloir supprimer l'élève ${contextMenu.student.last_name} ? Cette action est irréversible.`,
        confirmLabel: 'Supprimer',
        cancelLabel: 'Annuler',
        variant: 'danger'
      });
      if (confirmed) {
        await onDeleteStudent(contextMenu.student.id);
      }
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-[#020617] min-h-0 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {/* En-tête Unifié */}
      <header className="bg-blue-600 dark:bg-slate-900 border-b border-white/5 sticky top-0 z-30 shadow-lg">
        <div className="px-6 py-3">
          {/* Static Header: Row 1 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2.5 bg-white/10 hover:bg-white hover:text-blue-600 dark:hover:text-slate-900 rounded-xl text-white transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/5 hover:scale-105 active:scale-95 group shrink-0"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
              </button>

         
              
              <div className="flex flex-col min-w-0">
                <h1 className="text-xl font-black text-white dark:text-slate-100 flex items-center gap-2 tracking-tight truncate leading-none">
                  {classInfo ? `${classInfo.level} ${classInfo.option}` : 'Chargement...'} 
                  <span className="text-blue-300/50 dark:text-slate-500 font-light ml-1">|</span> 
                  <span className="truncate text-blue-100/90 dark:text-slate-300">{classInfo?.section || '...'}</span>
                </h1>
                <div className="flex items-center gap-3 mt-1.5 font-black uppercase tracking-widest text-[9px]">
                  <p className="text-blue-100/60 dark:text-slate-500 flex gap-3">
                    <span className="flex items-center gap-1"><Users size={11}/> {students.length} élèves</span>
                    <span className="flex items-center gap-1"><BookOpen size={11}/> {subjects.length} cours</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap w-full md:w-auto">
                {/* Bouton d'actualisation — rafraîchit matières, élèves et notes sans redemander le mdp */}
              <button 
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await onRefreshAll();
                    toast.success('Données actualisées');
                  } catch {
                    toast.error('Erreur lors de l\'actualisation');
                  } finally {
                    setRefreshing(false);
                  }
                }}
                disabled={refreshing}
                className="p-2.5 bg-white/10 hover:bg-white hover:text-blue-600 dark:hover:text-slate-900 rounded-xl text-white transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/5 hover:scale-105 active:scale-95 group shrink-0 disabled:opacity-50"
                title="Actualiser les données"
              >
                <RefreshCw size={18} className={`transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              </button>
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                <button 
                  onClick={onOpenPalmares}
                  className="flex items-center gap-1.5 hover:bg-white hover:text-blue-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all text-white border border-transparent"
                >
                  <Award size={14} />
                  <span>Palmarès</span>
                </button>
                <div className="flex items-center gap-1 px-1 border-l border-white/10 ml-0.5">
                  <button onClick={onOpenCouponsPrint} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Coupons">
                    <Printer size={16} />
                  </button>
                  <button onClick={onOpenBulkPrint} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Bulletins">
                    <FileText size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Search, Sort & Major Actions (Permanent) */}
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-t border-white/10 pt-3">
            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="relative group flex-1 md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Rechercher par nom..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-white/10 dark:bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:bg-white/15 outline-none font-bold text-xs transition-all"
                />
              </div>

              <button
                onClick={() => setShowOnlyAbandons(prev => !prev)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${showOnlyAbandons ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-red-300 border border-white/10 hover:bg-white/10'}`}
              >
                Abandons ({students.filter(s => Boolean((s as Student).is_abandoned)).length})
              </button>

              {/* Popover Filtres & Affichage */}
              <div className="relative" ref={popoverRef}>
                <button
                  onClick={() => setShowFiltersPopover(!showFiltersPopover)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                    showFiltersPopover || selectedPeriods.size < ALL_PERIODS.length || focusedSubject !== 'all' || sortOrder !== 'asc' || correctionMax
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Search size={14} className="hidden" /> {/* Fix iconsSvg import trick, we use ArrowUpDown */}
                  <ArrowUpDown size={14} />
                  Filtres & Affichage
                  <ChevronDown size={12} className={`transition-transform duration-300 ${showFiltersPopover ? 'rotate-180' : ''}`} />
                </button>

                {showFiltersPopover && (
                  <div className="absolute top-full mt-2 left-0 w-[380px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-5 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
                    
                    {/* Tri */}
                    <div className="flex flex-col gap-2">
                      <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Tri des élèves</span>
                      <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl border border-white/10 p-1">
                        <button 
                          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                          className="p-2 hover:text-blue-400 text-white transition-all active:scale-95 border-r border-white/10"
                          title="Trier la liste (A-Z / Z-A)"
                        >
                          <ArrowUpDown size={14} className={`transition-transform duration-500 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                        </button>
                        <select
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                          className="bg-transparent flex-1 text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer p-1"
                        >
                          <option value="asc" className="bg-slate-800">Alpha (A-Z)</option>
                          <option value="desc" className="bg-slate-800">Alpha (Z-A)</option>
                          {customSorts.map(sort => (
                            <option key={`custom_${sort.id}`} value={`custom_${sort.id}`} className="bg-slate-800">{sort.name}</option>
                          ))}
                        </select>
                        {sortOrder.startsWith('custom_') && (
                          <div className="flex items-center gap-1 ml-1 border-l border-white/10 pl-1">
                            <button
                              onClick={() => {
                                const sort = customSorts.find(s => s.id === parseInt(sortOrder.replace('custom_', ''), 10));
                                if (sort) {
                                  setEditingCustomSort(sort);
                                  setShowCustomSortModal(true);
                                }
                              }}
                              className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-all"
                              title="Modifier ce tri"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={async () => {
                                const customId = parseInt(sortOrder.replace('custom_', ''), 10);
                                if (await toast.confirm({
                                  title: 'Supprimer le tri',
                                  message: 'Êtes-vous sûr de vouloir supprimer ce profil de tri ?',
                                  confirmLabel: 'Supprimer',
                                  cancelLabel: 'Annuler',
                                  variant: 'danger'
                                })) {
                                  await customSortService.delete(customId);
                                  await loadCustomSorts();
                                  setSortOrder('asc');
                                }
                              }}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/70 hover:text-red-400 transition-all"
                              title="Supprimer ce tri"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => { setEditingCustomSort(null); setShowCustomSortModal(true); }}
                          className="ml-1 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-all"
                          title="Créer un nouveau tri personnalisé"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Périodes */}
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Périodes affichées</span>
                        <div className="flex gap-1">
                          <button onClick={() => setSelectedPeriods(new Set(['P1', 'P2', 'EXAM1']))} className="text-[8px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white/80 transition-colors">Semestre 1</button>
                          <button onClick={() => setSelectedPeriods(new Set(['P3', 'P4', 'EXAM2']))} className="text-[8px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white/80 transition-colors">Semestre 2</button>
                          <button onClick={() => setSelectedPeriods(new Set(ALL_PERIODS))} className="text-[8px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white/80 transition-colors">Tout</button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-900/50 p-1.5 rounded-xl border border-white/10">
                        {ALL_PERIODS.map(p => (
                          <button
                            key={p}
                            onClick={() => {
                              setSelectedPeriods(prev => {
                                const next = new Set(prev);
                                if (next.has(p)) {
                                  if (next.size > 1) next.delete(p);
                                } else {
                                  next.add(p);
                                }
                                return next;
                              });
                            }}
                            className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${
                              selectedPeriods.has(p)
                                ? 'bg-blue-500 text-white shadow'
                                : 'text-white/40 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {p.replace('EXAM', 'Ex')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cours & Correction */}
                    <div className="flex gap-4">
                      <div className="flex flex-col gap-2 flex-1">
                        <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Filtrer par matière</span>
                        <select
                          value={focusedSubject === 'all' ? 'all' : String(focusedSubject)}
                          onChange={(e) => setFocusedSubject(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                          className="bg-slate-900/50 border border-white/10 text-white px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                        >
                          <option value="all" className="bg-slate-800">Toutes les matières ({subjects.length})</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Corrigé sur</span>
                        <div className="flex items-center gap-1 bg-slate-900/50 border border-white/10 rounded-xl px-2 py-1.5 w-24">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={correctionMaxInput}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (/^[0-9]*\.?[0-9]*$/.test(raw)) setCorrectionMaxInput(raw);
                            }}
                            placeholder="Max"
                            className="w-full bg-transparent text-center text-white placeholder-white/30 outline-none font-black text-[10px]"
                          />
                          {correctionMax && (
                            <button onClick={() => setCorrectionMaxInput('')} className="p-1 text-white/40 hover:text-white rounded-lg"><RotateCcw size={10} /></button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Verrouillage */}
                    <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                      <span className="text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><Lock size={10}/> Verrouiller des périodes (Édition bloquée)</span>
                      <div className="flex items-center gap-1">
                        {ALL_PERIODS.map(p => (
                          <button
                            key={`lock_${p}`}
                            onClick={() => toggleLockPeriod(p)}
                            className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all border ${
                              lockedPeriods.has(p)
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-slate-900/50 text-white/40 border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                            title={lockedPeriods.has(p) ? `Déverrouiller ${p}` : `Verrouiller ${p}`}
                          >
                            {lockedPeriods.has(p) ? <Lock size={10} /> : <Unlock size={10} />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Statistiques (Option 5) */}
                    <div className="flex items-center justify-between border-t border-white/10 pt-4 pb-1">
                      <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Afficher les statistiques de classe</span>
                      <button 
                        onClick={() => setShowStats(!showStats)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${showStats ? 'bg-blue-500' : 'bg-slate-600'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${showStats ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end flex-wrap mt-2 md:mt-0">
              <button onClick={handleExportCSV} className="p-2.5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95" title="Exporter en CSV"><Download size={16} /></button>
              <button onClick={() => setIsFullscreen(prev => !prev)} className="p-2.5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95" title={isFullscreen ? 'Quitter le plein écran' : 'Mode Focus'}>
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
              <button 
                onClick={() => setShowAddSubjectModal(true)}
                className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-100 px-4 py-2.5 rounded-xl border border-indigo-500/30 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                <BookOpen size={14} />
                <span>Gérer les cours</span>
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-white text-blue-600 dark:bg-blue-600 dark:text-white px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
              >
                <Plus size={14} />
                <span>Ajouter un élève</span>
              </button>
            </div>
          </div>

          {/* Mini-barres de progression conditionnelles */}
          {showStats && (
            <div className="flex flex-wrap items-center gap-3 pt-3 animate-in fade-in duration-300">
              <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Saisie:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {ALL_PERIODS.filter(p => selectedPeriods.has(p)).map(p => {
                  const d = progressData[p];
                  if (!d || d.total === 0) return null;
                  const pct = Math.round((d.filled / d.total) * 100);
                  return (
                    <div key={p} className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10" title={`${d.filled}/${d.total} notes remplies`}>
                      <span className="text-[8px] font-black text-white/40 uppercase">{p.replace('EXAM', 'Ex')}</span>
                      <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-400' : pct > 50 ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Contenu Principal - Grille scrollable */}
      <div className="flex-1 overflow-auto relative">
        {/* Loader non-intrusif si on a déjà des données, sinon loader plein écran */}
        {loading && students.length === 0 ? (
          <><div className="absolute top-0 left-0 right-0 z-40">
                <div className="h-0.5 w-full bg-blue-500/20 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-loading" style={{ width: '30%' }}></div>
                </div>
              </div>
            </>
        ) : !classInfo ? (
          <div className="p-8 text-center text-slate-500">Aucune donnée trouvée pour cette classe.</div>
        ) : (
          <>
            {/* Indicateur de chargement discret pour les mises à jour en arrière-plan */}
            {loading && (
              <div className="absolute top-0 left-0 right-0 z-40">
                <div className="h-0.5 w-full bg-blue-500/20 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-loading" style={{ width: '30%' }}></div>
                </div>
              </div>
            )}
            
            <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
                <th className="sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 text-center font-black uppercase tracking-widest text-[9px] text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[40px] w-[40px]">
                  #
                </th>
                <th className="sticky left-[40px] z-40 bg-slate-100 dark:bg-slate-800 px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600 min-w-[200px] whitespace-nowrap">
                  Élèves ({filteredAndSortedStudents.length})
                </th>
              
              {displayedSubjects.map(subject => (
                <th 
                  key={subject.id} 
                  colSpan={
                    (selectedPeriods.has('P1') ? 1 : 0) +
                    (selectedPeriods.has('P2') ? 1 : 0) +
                    (selectedPeriods.has('EXAM1') ? 1 : 0) +
                    (selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1') ? 1 : 0) +
                    (selectedPeriods.has('P3') ? 1 : 0) +
                    (selectedPeriods.has('P4') ? 1 : 0) +
                    (selectedPeriods.has('EXAM2') ? 1 : 0) +
                    (selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2') ? 1 : 0)
                  } 
                  className="bg-slate-100 dark:bg-slate-800 px-2 py-2 text-center font-semibold text-slate-700 dark:text-slate-200 border-x border-slate-300 dark:border-slate-700 whitespace-nowrap"
                >
                  {subject.name}
                </th>
              ))}
            </tr>

            {/* Ligne de sous-en-tête avec les Maxima */}
            <tr className="border-b-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
              <th className='sticky left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-center px-1 font-black text-slate-400 text-[9px] min-w-[40px] w-[40px]'>
                #
              </th>
              <th className='sticky left-[40px] z-30 bg-slate-50 dark:bg-slate-900 border-r-2 border-slate-300 dark:border-slate-600 text-left px-4 py-3 font-bold text-blue-700 dark:text-blue-400'>
                Nom et PostNom
              </th>
              {displayedSubjects.map(subject => {
                // Détection cours sans examen pour styling conditionnel des en-têtes
                const hasExam1 = subject.max_exam1 > 0;
                const hasExam2 = subject.max_exam2 > 0;
                
                return (
                <React.Fragment key={subject.id}>
                  {selectedPeriods.has('P1') && (
                    <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                      P1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p1}</span>
                    </th>
                  )}
                  
                  {selectedPeriods.has('P2') && (
                    <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                      P2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p2}</span>
                    </th>
                  )}
                  
                  {selectedPeriods.has('EXAM1') && (
                    <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 dark:border-slate-600 min-w-[50px] ${
                      hasExam1 
                        ? 'text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/30' 
                        : 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 opacity-60'
                    }`}>
                      Ex1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {hasExam1 ? `/${subject.max_exam1}` : 'N/A'}
                      </span>
                    </th>
                  )}
                  
                  {(selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1')) && (
                    <th className="px-2 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 border-r-2 border-slate-400 dark:border-slate-500 bg-blue-100 dark:bg-blue-900/40 min-w-[60px]">
                      Sem1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p1 + subject.max_p2 + subject.max_exam1}</span>
                    </th>
                  )}
                  
                  {selectedPeriods.has('P3') && (
                    <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                      P3<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p3}</span>
                    </th>
                  )}
                  
                  {selectedPeriods.has('P4') && (
                    <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                      P4<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p4}</span>
                    </th>
                  )}
                  
                  {selectedPeriods.has('EXAM2') && (
                    <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 dark:border-slate-600 min-w-[50px] ${
                      hasExam2 
                        ? 'text-slate-600 dark:text-slate-300 bg-green-50 dark:bg-green-900/30' 
                        : 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 opacity-60'
                    }`}>
                      Ex2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {hasExam2 ? `/${subject.max_exam2}` : 'N/A'}
                      </span>
                    </th>
                  )}
                  
                  {(selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2')) && (
                    <th className="px-2 py-2 text-xs font-semibold text-green-700 dark:text-green-400 border-r-2 border-slate-400 dark:border-slate-500 bg-green-100 dark:bg-green-900/40 min-w-[60px]">
                      Sem2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p3 + subject.max_p4 + subject.max_exam2}</span>
                    </th>
                  )}
                </React.Fragment>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {(() => {
              const orderMap = sortOrder.startsWith('custom_') 
                ? (() => {
                    const profile = customSorts.find(s => s.id === parseInt(sortOrder.replace('custom_', ''), 10));
                    return profile ? JSON.parse(profile.student_order) : {};
                  })()
                : {};

              const activeStudents = filteredAndSortedStudents.filter(s => orderMap[s.id] !== -1);
              const withdrawnStudents = filteredAndSortedStudents.filter(s => orderMap[s.id] === -1);

              return (
                <>
                  {activeStudents.map((student, idx) => (
                    <StudentRow 
                      key={student.id}
                      student={student}
                      idx={idx}
                      subjects={displayedSubjects}
                      gradesMap={gradesMap}
                      onContextMenu={onContextMenu}
                      onUpdateGrade={onGradeUpdate}
                      selectedPeriods={selectedPeriods}
                      lockedPeriods={lockedPeriods}
                      correctionMax={correctionMax}
                    />
                  ))}
                  {withdrawnStudents.length > 0 && (
                    <>
                      <tr>
                        <td colSpan={2 + displayedSubjects.length * (
                          (selectedPeriods.has('P1') ? 1 : 0) +
                          (selectedPeriods.has('P2') ? 1 : 0) +
                          (selectedPeriods.has('EXAM1') ? 1 : 0) +
                          (selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1') ? 1 : 0) +
                          (selectedPeriods.has('P3') ? 1 : 0) +
                          (selectedPeriods.has('P4') ? 1 : 0) +
                          (selectedPeriods.has('EXAM2') ? 1 : 0) +
                          (selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2') ? 1 : 0)
                        )} className="bg-red-50/50 dark:bg-red-900/10 px-4 py-2 border-y border-red-200 dark:border-red-900/30">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-400"></span>
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                              Retrait temporaire ({withdrawnStudents.length})
                            </span>
                          </div>
                        </td>
                      </tr>
                      {withdrawnStudents.map((student, idx) => (
                        <StudentRow 
                          key={student.id}
                          student={student}
                          idx={activeStudents.length + idx}
                          subjects={displayedSubjects}
                          gradesMap={gradesMap}
                          onContextMenu={onContextMenu}
                          onUpdateGrade={onGradeUpdate}
                          selectedPeriods={selectedPeriods}
                          lockedPeriods={lockedPeriods}
                          correctionMax={correctionMax}
                          // Note: We could pass a prop to StudentRow to make it visually faded, but this is good enough for now.
                        />
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </tbody>

          {/* Footer statistique : moyenne, min, max par colonne */}
          {showStats && (
            <tfoot className="sticky bottom-0 z-10 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <tr>
                <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 px-1 py-2 text-center border-r border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Σ</span>
                </td>
                <td className="sticky left-[40px] z-20 bg-slate-100 dark:bg-slate-800 px-4 py-2 border-r-2 border-slate-300 dark:border-slate-600">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Moy / Min / Max</span>
                </td>
                {displayedSubjects.map(subject => {
                  return (
                    <React.Fragment key={subject.id}>
                      {selectedPeriods.has('P1') && (
                        <td className="px-1 py-2 text-center border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                          {columnStats[`${subject.id}-P1`] ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{columnStats[`${subject.id}-P1`].avg.toFixed(1)}</span>
                              <span className="text-[8px] font-black text-slate-400">{columnStats[`${subject.id}-P1`].min}–{columnStats[`${subject.id}-P1`].max}</span>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">-</span>}
                        </td>
                      )}
                      
                      {selectedPeriods.has('P2') && (
                        <td className="px-1 py-2 text-center border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                          {columnStats[`${subject.id}-P2`] ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{columnStats[`${subject.id}-P2`].avg.toFixed(1)}</span>
                              <span className="text-[8px] font-black text-slate-400">{columnStats[`${subject.id}-P2`].min}–{columnStats[`${subject.id}-P2`].max}</span>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">-</span>}
                        </td>
                      )}
                      
                      {selectedPeriods.has('EXAM1') && (
                        <td className="px-1 py-2 text-center border-r border-slate-300 dark:border-slate-600 min-w-[50px]">
                          {columnStats[`${subject.id}-EXAM1`] ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{columnStats[`${subject.id}-EXAM1`].avg.toFixed(1)}</span>
                              <span className="text-[8px] font-black text-slate-400">{columnStats[`${subject.id}-EXAM1`].min}–{columnStats[`${subject.id}-EXAM1`].max}</span>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">-</span>}
                        </td>
                      )}
                      
                      {(selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1')) && (
                        <td className="px-1 py-2 border-r-2 border-slate-400 dark:border-slate-500 bg-blue-50/50 dark:bg-blue-900/20 min-w-[60px]" />
                      )}
                      
                      {selectedPeriods.has('P3') && (
                        <td className="px-1 py-2 text-center border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                          {columnStats[`${subject.id}-P3`] ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{columnStats[`${subject.id}-P3`].avg.toFixed(1)}</span>
                              <span className="text-[8px] font-black text-slate-400">{columnStats[`${subject.id}-P3`].min}–{columnStats[`${subject.id}-P3`].max}</span>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">-</span>}
                        </td>
                      )}
                      
                      {selectedPeriods.has('P4') && (
                        <td className="px-1 py-2 text-center border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                          {columnStats[`${subject.id}-P4`] ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{columnStats[`${subject.id}-P4`].avg.toFixed(1)}</span>
                              <span className="text-[8px] font-black text-slate-400">{columnStats[`${subject.id}-P4`].min}–{columnStats[`${subject.id}-P4`].max}</span>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">-</span>}
                        </td>
                      )}
                      
                      {selectedPeriods.has('EXAM2') && (
                        <td className="px-1 py-2 text-center border-r border-slate-300 dark:border-slate-600 min-w-[50px]">
                          {columnStats[`${subject.id}-EXAM2`] ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{columnStats[`${subject.id}-EXAM2`].avg.toFixed(1)}</span>
                              <span className="text-[8px] font-black text-slate-400">{columnStats[`${subject.id}-EXAM2`].min}–{columnStats[`${subject.id}-EXAM2`].max}</span>
                            </div>
                          ) : <span className="text-[10px] text-slate-300">-</span>}
                        </td>
                      )}
                      
                      {(selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2')) && (
                        <td className="px-1 py-2 border-r-2 border-slate-400 dark:border-slate-500 bg-green-50/50 dark:bg-green-900/20 min-w-[60px]" />
                      )}
                    </React.Fragment>
                  );
                })}
              </tr>
            </tfoot>
          )}
          </table>
        </>
        )}
      </div>

      {showAddModal && (
        <AddStudentModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddStudent={onAddStudent}
          onImportStudents={onImportStudents}
          classId={Number(id)}
          currentStudentCount={students.length}
        />
      )}

      {showAddSubjectModal && (
        <AddSubjectModal
          classId={Number(id)}
          classLevel={classInfo?.level || ''}
          subjects={subjects}
          editingSubject={editingSubject}
          onSelectSubject={(subject) => {
            onSetEditingSubject(subject);
            setShowAddSubjectModal(true);
          }}
          onClose={() => {
            onSetEditingSubject(null);
            setShowAddSubjectModal(false);
          }}
          onSuccess={() => {
            onRefreshSubjects();
            onSetEditingSubject(null);
          }}
        />
      )}

      {showCustomSortModal && (
        <CustomSortModal
          isOpen={showCustomSortModal}
          onClose={() => setShowCustomSortModal(false)}
          students={students}
          existingSorts={customSorts}
          initialProfile={editingCustomSort}
          onSave={async (name, sortMap) => {
            if (classInfo) {
              if (editingCustomSort) {
                await customSortService.update(editingCustomSort.id, name, sortMap);
                await loadCustomSorts();
                setSortOrder(`custom_${editingCustomSort.id}`);
              } else {
                const newId = await customSortService.create(classInfo.id, name, sortMap);
                await loadCustomSorts();
                setSortOrder(`custom_${newId}`);
              }
            }
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white dark:bg-slate-800 shadow-lg dark:shadow-2xl rounded-lg py-1 z-50 border border-slate-200 dark:border-slate-700 min-w-40px"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={() => {
              onEditStudent(contextMenu.student.id);
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
          >
            <Edit size={16} />
            Éditer l'élève
          </button>
          <button 
            onClick={() => {
              onOpenBulletin(contextMenu.student.id);
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
          >
            <FileText size={16} />
            Voir le bulletin
          </button>
          <button 
            onClick={() => {
              onOpenRepechage(contextMenu.student.id);
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
          >
            <TrendingUp size={16} />
            Gérer le repêchage
          </button>
          <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
          <button 
            onClick={() => {
              handleDeleteStudent();
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

const StudentRow = React.memo(({ 
  student, 
  subjects, 
  idx, 
  gradesMap, 
  onContextMenu, 
  onUpdateGrade,
  lockedPeriods,
  correctionMax,
  selectedPeriods,
}: { 
  student: Student; 
  subjects: Subject[]; 
  idx: number;
  gradesMap: Map<string, number>;
  onContextMenu: (e: React.MouseEvent, student: Student) => void;
  onUpdateGrade: (studentId: number, subjectId: number, period: string, value: number | null) => Promise<void>;
  lockedPeriods: Set<string>;
  correctionMax: number | null;
  selectedPeriods: Set<string>;
}) => {
  const getGrade = (subjectId: number, period: string) => {
    return gradesMap.get(`${student.id}-${subjectId}-${period}`) ?? null;
  };

  const calculateSemesterTotal = (subjectId: number, semester: 1 | 2) => {
    if (semester === 1) {
      const p1 = getGrade(subjectId, 'P1');
      const p2 = getGrade(subjectId, 'P2');
      const ex1 = getGrade(subjectId, 'EXAM1');
      if (p1 === null && p2 === null && ex1 === null) return null;
      return (p1 || 0) + (p2 || 0) + (ex1 || 0);
    } else {
      const p3 = getGrade(subjectId, 'P3');
      const p4 = getGrade(subjectId, 'P4');
      const ex2 = getGrade(subjectId, 'EXAM2');
      if (p3 === null && p4 === null && ex2 === null) return null;
      return (p3 || 0) + (p4 || 0) + (ex2 || 0);
    }
  };

  return (
    <tr className={`group border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
      <td className={`sticky left-0 z-10 px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 min-w-[40px] w-[40px] ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'} group-hover:bg-slate-100 dark:group-hover:bg-slate-700`}>
        {idx + 1}
      </td>
      <td 
        className={`sticky left-[40px] z-10 px-4 py-3 font-medium text-slate-800 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'} group-hover:bg-slate-100 dark:group-hover:bg-slate-700`}
        onContextMenu={(e) => onContextMenu(e, student)}
      >
        {student.last_name} {student.post_name}
      </td>
      {subjects.map(subject => {
        const sem1Total = calculateSemesterTotal(subject.id, 1);
        const sem2Total = calculateSemesterTotal(subject.id, 2);
        const hasExam1 = subject.max_exam1 > 0;
        const hasExam2 = subject.max_exam2 > 0;

        return (
          <React.Fragment key={subject.id}>
            {selectedPeriods.has('P1') && (
              <GradeCell 
                value={getGrade(subject.id, 'P1')} 
                studentIdx={idx}
                subjectId={subject.id}
                period="P1"
                maxValue={subject.max_p1}
                locked={lockedPeriods.has('P1')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P1', val)} 
              />
            )}
            {selectedPeriods.has('P2') && (
              <GradeCell 
                value={getGrade(subject.id, 'P2')} 
                studentIdx={idx}
                subjectId={subject.id}
                period="P2"
                maxValue={subject.max_p2}
                locked={lockedPeriods.has('P2')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P2', val)} 
              />
            )}
            {selectedPeriods.has('EXAM1') && (
              <GradeCell 
                value={getGrade(subject.id, 'EXAM1')} 
                studentIdx={idx}
                subjectId={subject.id}
                period="EXAM1"
                isExam disabled={!hasExam1}
                maxValue={subject.max_exam1}
                locked={lockedPeriods.has('EXAM1')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM1', val)} 
              />
            )}
            {(selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1')) && (
              <td className="px-2 py-3 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-r-2 border-slate-400 dark:border-slate-500">
                {sem1Total !== null ? sem1Total.toFixed(1) : '-'}
              </td>
            )}
            {selectedPeriods.has('P3') && (
              <GradeCell 
                value={getGrade(subject.id, 'P3')} 
                studentIdx={idx}
                subjectId={subject.id}
                period="P3"
                maxValue={subject.max_p3}
                locked={lockedPeriods.has('P3')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P3', val)} 
              />
            )}
            {selectedPeriods.has('P4') && (
              <GradeCell 
                value={getGrade(subject.id, 'P4')} 
                studentIdx={idx}
                subjectId={subject.id}
                period="P4"
                maxValue={subject.max_p4}
                locked={lockedPeriods.has('P4')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P4', val)} 
              />
            )}
            {selectedPeriods.has('EXAM2') && (
              <GradeCell 
                value={getGrade(subject.id, 'EXAM2')} 
                studentIdx={idx}
                subjectId={subject.id}
                period="EXAM2"
                isExam disabled={!hasExam2}
                maxValue={subject.max_exam2}
                locked={lockedPeriods.has('EXAM2')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM2', val)} 
              />
            )}
            {(selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2')) && (
              <td className="px-2 py-3 text-center font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-r-2 border-slate-400 dark:border-slate-500">
                {sem2Total !== null ? sem2Total.toFixed(1) : '-'}
              </td>
            )}
          </React.Fragment>
        );
      })}
    </tr>
  );
});

const GradeCell = React.memo(({ value, studentIdx, subjectId, period, isExam = false, disabled = false, maxValue = 0, locked = false, correctionMax, onChange }: { 
  value: number | null; 
  studentIdx: number;
  subjectId: number;
  period: string;
  isExam?: boolean; 
  disabled?: boolean;
  maxValue?: number;
  locked?: boolean;
  correctionMax: number | null;
  onChange: (val: number | null) => void 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(formatGradeInputValue(value, maxValue, correctionMax));
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);

  // Synchroniser la valeur affichée quand la prop change
  useEffect(() => {
    setEditValue(formatGradeInputValue(value, maxValue, correctionMax));
  }, [value, maxValue, correctionMax]);

  // Focus et sélection automatique à l'ouverture du mode édition
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Fonction utilitaire pour naviguer vers une cellule adjacente
  const navigateTo = (nextStudentIdx: number, nextSubjectId: number, nextPeriod: string) => {
    setTimeout(() => {
      const nextCell = document.querySelector(
        `[data-student-idx="${nextStudentIdx}"][data-subject-id="${nextSubjectId}"][data-period="${nextPeriod}"]`
      ) as HTMLElement;
      if (nextCell) {
        nextCell.click();
      }
    }, 30);
  };

  // Trouver la cellule voisine (ArrowLeft / ArrowRight)
  const findSiblingCell = (direction: 'next' | 'prev') => {
    const allCells = Array.from(document.querySelectorAll(
      `[data-student-idx="${studentIdx}"][data-period]`
    )) as HTMLElement[];
    const currentIndex = allCells.findIndex(
      c => c.dataset.subjectId === String(subjectId) && c.dataset.period === period
    );
    if (currentIndex === -1) return null;
    const targetIdx = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    return allCells[targetIdx] || null;
  };

  const handleBlur = () => {
    setIsEditing(false);
    const finalValue = editValue.trim();

    if (finalValue === '') {
      // Champ vidé → supprimer la note
      if (value !== null) {
        onChange(null);
        flashSaved();
      }
    } else if (finalValue === '0') {
      // "0" seul = probablement involontaire
      if (value !== null) {
        onChange(null);
      }
      setEditValue('');
    } else {
      // "00" = vrai zéro intentionnel
      const num = finalValue === '00' ? 0 : parseFloat(finalValue);
      if (!isNaN(num) && num >= 0) {
        const inputMax = correctionMax || maxValue;
        if (inputMax > 0 && num > inputMax) {
          setEditValue(formatGradeInputValue(value, maxValue, correctionMax));
          return;
        }

        const convertedValue = convertGradeToCourseMax(num, maxValue, correctionMax);
        if (convertedValue !== value) {
          onChange(convertedValue);
          flashSaved();
        }
      } else {
        setEditValue(formatGradeInputValue(value, maxValue, correctionMax));
      }
    }
  };

  // Petit flash vert "✓" après sauvegarde
  const flashSaved = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 800);
  };

  // Filtrer les caractères autorisés
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(raw)) {
      setEditValue(raw);
    }
  };

  // Gestion clavier enrichie : Enter, Tab, Shift+Tab, flèches, Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      // Descendre d'une ligne (même colonne)
      navigateTo(studentIdx + 1, subjectId, period);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleBlur();
      // Flèche droite = cellule suivante (même ligne)
      const sibling = findSiblingCell('next');
      if (sibling) {
        setTimeout(() => sibling.click(), 30);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleBlur();
      // Flèche gauche = cellule précédente (même ligne)
      const sibling = findSiblingCell('prev');
      if (sibling) {
        setTimeout(() => sibling.click(), 30);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleBlur();
      navigateTo(studentIdx + 1, subjectId, period);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleBlur();
      navigateTo(studentIdx - 1, subjectId, period);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value?.toString() || '');
    }
  };

  // Saisie directe : si la cellule est focusable et qu'on tape un chiffre, entrer en édition
  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || locked || isEditing) return;
    // Un chiffre ou un point → entrer en mode édition avec ce caractère
    if (/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      setEditValue(e.key);
      setIsEditing(true);
    }
    // Supprimer/Backspace → effacer la note
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (value !== null) {
        onChange(null);
        flashSaved();
      }
    }
  };

  // Copier-coller : intercepte Ctrl+V sur la cellule (géré au niveau parent aussi)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled || locked) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    const num = parseFloat(text);
    if (!isNaN(num) && num >= 0) {
      const inputMax = correctionMax || maxValue;
      if (inputMax > 0 && num > inputMax) return;
      onChange(convertGradeToCourseMax(num, maxValue, correctionMax));
      flashSaved();
    }
  };

  const hasConversion = Boolean(correctionMax && maxValue > 0 && correctionMax !== maxValue);

  // Calcul du pourcentage pour la coloration conditionnelle
  const percentage = (value !== null && maxValue > 0) ? (value / maxValue) * 100 : null;
  // Classe CSS conditionnelle basée sur le % de la note
  const conditionalColorClass = percentage !== null
    ? percentage < 50
      ? 'text-red-600 dark:text-red-400'       // < 50% = insuffisant
      : percentage >= 80
        ? 'text-emerald-600 dark:text-emerald-400' // ≥ 80% = excellent
        : ''                                      // entre 50-80% = normal
    : '';

  return (
    <td 
      ref={tdRef}
      data-student-idx={studentIdx}
      data-subject-id={subjectId}
      data-period={period}
      tabIndex={disabled || locked ? -1 : 0}
      className={`relative px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 transition-colors duration-150 outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-inset ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
          : locked
            ? 'bg-amber-50/50 dark:bg-amber-900/10 text-slate-500 cursor-not-allowed'
            : isEditing
              ? 'bg-blue-50 dark:bg-blue-900/40'
              : `cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${conditionalColorClass || 'text-slate-700 dark:text-slate-300'} ${isExam ? 'bg-slate-50 dark:bg-slate-800/50 font-medium' : ''}`
      }`}
      onClick={() => !disabled && !locked && !isEditing && setIsEditing(true)}
      onKeyDown={handleCellKeyDown}
      onPaste={handlePaste}
      title={
        disabled
          ? "Pas d'examen pour ce cours"
          : locked
            ? "Période verrouillée"
            : hasConversion
              ? `Saisie sur ${correctionMax}, enregistrée sur ${maxValue}`
              : ''
      }
    >
      {/* Texte affiché (toujours présent pour maintenir la taille) */}
      <span className={`${isEditing && !disabled ? 'invisible' : ''} ${conditionalColorClass}`}>
        {disabled ? 'N/A' : (value !== null ? value : '-')}
      </span>

      {/* Flash vert "sauvé" */}
      {showSaved && (
        <span className="absolute inset-0 flex items-center justify-center text-emerald-500 text-xs font-bold animate-in fade-in zoom-in duration-200">
          ✓
        </span>
      )}

      {/* Input en overlay */}
      {isEditing && !disabled && !locked && (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="absolute inset-0 w-full h-full text-center outline-none bg-transparent font-medium text-slate-800 dark:text-white caret-blue-500"
          value={editValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      )}
    </td>
  );
});
