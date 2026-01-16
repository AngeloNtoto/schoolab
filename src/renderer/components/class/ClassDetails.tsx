import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileSpreadsheet, Award, Users, FileText, BookOpen, Printer, Search, ArrowUpDown, Edit, ChevronDown, TrendingUp } from 'lucide-react';

// Services & Hooks
import { ClassData, Subject } from '../../services/classService';
import { Student } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { ExportExcelForClass } from './ExportExcel';

// Composants
import AddStudentModal from './AddStudentModal';
import AddSubjectModal from './AddSubjectModal';

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
  onSetEditingSubject: (subject: Subject | null) => void;
  onOpenRepechage: (studentId: number) => void;
}

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
  onSetEditingSubject,
  onOpenRepechage
}: ClassDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showOnlyAbandons, setShowOnlyAbandons] = useState(false);

  const toast = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; student: Student } | null>(null);

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
      const nameA = `${a.last_name} ${a.first_name}`;
      const nameB = `${b.last_name} ${b.first_name}`;
      return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

    return result;
  }, [students, searchQuery, sortOrder]);


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

  const handleExportExcel = async (id: string) => {
    if (!id) return;
    await ExportExcelForClass(Number(id));
    toast.success('Notes exportées avec succès');
  };

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
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'élève ${contextMenu.student.last_name} ?`)) {
        await onDeleteStudent(contextMenu.student.id);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-[#020617] min-h-0 transition-colors duration-500">
      {/* En-tête Unifié */}
      <header className="bg-blue-600 dark:bg-slate-900 border-b border-white/5 sticky top-0 z-30 shadow-lg">
        <div className="px-6 py-3">
          {/* Static Header: Row 1 */}
          <div className="flex items-center justify-between gap-4 mb-3">
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

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
                <button 
                  onClick={onOpenPalmares}
                  className="flex items-center gap-1.5 hover:bg-white hover:text-blue-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all text-white border border-transparent"
                >
                  <Award size={14} />
                  <span>Palmarès</span>
                </button>
                <button 
                  onClick={() => handleExportExcel(id)}
                  className="flex items-center gap-1.5 hover:bg-white hover:text-green-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all text-white border border-transparent"
                >
                  <FileSpreadsheet size={14} />
                  <span>Excel</span>
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
            <div className="flex items-center gap-3 w-full md:w-auto">
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
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-2.5 bg-white/10 hover:bg-white hover:text-blue-600 text-white rounded-xl border border-white/10 transition-all active:scale-95"
                title="Trier la liste"
              >
                <ArrowUpDown size={18} className={`transition-transform duration-500 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setShowOnlyAbandons(prev => !prev)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showOnlyAbandons ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/5 text-red-300 border border-white/10 hover:bg-white/10'}`}
              >
                Abandons ({students.filter(s => Boolean((s as Student).is_abandoned)).length})
              </button>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={() => setShowAddSubjectModal(true)}
                className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-100 px-5 py-2.5 rounded-xl border border-indigo-500/30 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                <BookOpen size={16} />
                Gérer les cours
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-white text-blue-600 dark:bg-blue-600 dark:text-white px-5 py-2.5 rounded-xl hover:bg-blue-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
              >
                <Plus size={16} />
                Ajouter un élève
              </button>
            </div>
          </div>
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
            {/* Ligne d'en-tête principale */}
            <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-300 dark:border-slate-700">
              <th className="sticky left-0 z-30 bg-slate-100 dark:bg-slate-800/80 px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600 min-w-[200px]">
                Élèves ({filteredAndSortedStudents.length})
              </th>
              
              {subjects.map(subject => (
                <th 
                  key={subject.id} 
                  colSpan={8} 
                  className="bg-slate-100 dark:bg-slate-800/80 px-2 py-2 text-center font-semibold text-slate-700 dark:text-slate-200 border-x border-slate-300 dark:border-slate-700"
                >
                  {subject.name}
                </th>
              ))}
            </tr>

            {/* Ligne de sous-en-tête avec les Maxima */}
            <tr className="border-b-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/80">
              <th className='sticky left-0 z-30 bg-slate-50 dark:bg-slate-900/80 border-r-2 border-slate-300 dark:border-slate-600 text-left px-4 py-3 font-bold text-blue-700 dark:text-blue-400'>
                Nom et PostNom
              </th>
              {subjects.map(subject => {
                // Détection cours sans examen pour styling conditionnel des en-têtes
                const hasExam1 = subject.max_exam1 > 0;
                const hasExam2 = subject.max_exam2 > 0;
                
                return (
                <React.Fragment key={subject.id}>
                  {/* P1 */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                    P1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p1}</span>
                  </th>
                  
                  {/* P2 */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                    P2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p2}</span>
                  </th>
                  
                  {/* Ex1 */}
                  <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 dark:border-slate-600 min-w-[50px] ${
                    hasExam1 
                      ? 'text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/30' 
                      : 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 opacity-60'
                  }`}>
                    Ex1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {hasExam1 ? `/${subject.max_exam1}` : 'N/A'}
                    </span>
                  </th>
                  
                  {/* Semestre 1 */}
                  <th className="px-2 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 border-r-2 border-slate-400 dark:border-slate-500 bg-blue-100 dark:bg-blue-900/40 min-w-[60px]">
                    Sem1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p1 + subject.max_p2 + subject.max_exam1}</span>
                  </th>
                  
                  {/* P3 */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                    P3<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p3}</span>
                  </th>
                  
                  {/* P4 */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">
                    P4<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p4}</span>
                  </th>
                  
                  {/* Ex2 */}
                  <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 dark:border-slate-600 min-w-[50px] ${
                    hasExam2 
                      ? 'text-slate-600 dark:text-slate-300 bg-green-50 dark:bg-green-900/30' 
                      : 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 opacity-60'
                  }`}>
                    Ex2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {hasExam2 ? `/${subject.max_exam2}` : 'N/A'}
                    </span>
                  </th>
                  
                  {/* Semestre 2 */}
                  <th className="px-2 py-2 text-xs font-semibold text-green-700 dark:text-green-400 border-r-2 border-slate-400 dark:border-slate-500 bg-green-100 dark:bg-green-900/40 min-w-[60px]">
                    Sem2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p3 + subject.max_p4 + subject.max_exam2}</span>
                  </th>
                </React.Fragment>
                )
              })}
            </tr>
          </thead>

          <tbody>
            {filteredAndSortedStudents.map((student, idx) => (
              <StudentRow 
                key={student.id}
                student={student}
                idx={idx}
                subjects={subjects}
                gradesMap={gradesMap}
                onContextMenu={onContextMenu}
                onUpdateGrade={onGradeUpdate}
              />
            ))}
          </tbody>
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
}: { 
  student: Student; 
  subjects: Subject[]; 
  idx: number;
  gradesMap: Map<string, number>;
  onContextMenu: (e: React.MouseEvent, student: Student) => void;
  onUpdateGrade: (studentId: number, subjectId: number, period: string, value: number | null) => Promise<void>;
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
    <tr className={`border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-800/30'}`}>
      <td 
        className="sticky left-0 bg-inherit px-4 py-3 font-medium text-slate-800 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600"
        onContextMenu={(e) => onContextMenu(e, student)}
      >
        {student.last_name} {student.first_name}
      </td>
      {subjects.map(subject => {
        const sem1Total = calculateSemesterTotal(subject.id, 1);
        const sem2Total = calculateSemesterTotal(subject.id, 2);
        const hasExam1 = subject.max_exam1 > 0;
        const hasExam2 = subject.max_exam2 > 0;

        return (
          <React.Fragment key={subject.id}>
            <GradeCell value={getGrade(subject.id, 'P1')} onChange={(val) => onUpdateGrade(student.id, subject.id, 'P1', val)} />
            <GradeCell value={getGrade(subject.id, 'P2')} onChange={(val) => onUpdateGrade(student.id, subject.id, 'P2', val)} />
            <GradeCell 
              value={getGrade(subject.id, 'EXAM1')} 
              isExam disabled={!hasExam1} 
              onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM1', val)} 
            />
            <td className="px-2 py-3 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-r-2 border-slate-400 dark:border-slate-500">
              {sem1Total !== null ? sem1Total.toFixed(1) : '-'}
            </td>
            <GradeCell value={getGrade(subject.id, 'P3')} onChange={(val) => onUpdateGrade(student.id, subject.id, 'P3', val)} />
            <GradeCell value={getGrade(subject.id, 'P4')} onChange={(val) => onUpdateGrade(student.id, subject.id, 'P4', val)} />
            <GradeCell 
              value={getGrade(subject.id, 'EXAM2')} 
              isExam disabled={!hasExam2} 
              onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM2', val)} 
            />
            <td className="px-2 py-3 text-center font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-r-2 border-slate-400 dark:border-slate-500">
              {sem2Total !== null ? sem2Total.toFixed(1) : '-'}
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );
});

const GradeCell = React.memo(({ value, isExam = false, disabled = false, onChange }: { 
  value: number | null; 
  isExam?: boolean; 
  disabled?: boolean;
  onChange: (val: number | null) => void 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() === '') {
      onChange(null);
    } else {
      const num = parseFloat(editValue);
      if (!isNaN(num)) {
        onChange(num);
      } else {
        setEditValue(value?.toString() || '');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value?.toString() || '');
    }
  };

  if (isEditing && !disabled) {
    return (
      <td className="p-0 border-r border-slate-200 dark:border-slate-700">
        <input
          ref={inputRef}
          type="number"
          className="w-full h-full px-1 py-3 text-center outline-none bg-blue-50 dark:bg-blue-900/50 focus:bg-blue-100 dark:focus:bg-blue-800/50 font-medium text-slate-800 dark:text-white"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </td>
    );
  }

  return (
    <td 
      className={`px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 transition-colors ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
          : `cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-700 dark:text-slate-300 ${isExam ? 'bg-slate-50 dark:bg-slate-800/50 font-medium' : ''}`
      }`}
      onDoubleClick={() => !disabled && setIsEditing(true)}
      title={disabled ? "Pas d'examen pour ce cours" : ""}
    >
      {disabled ? 'N/A' : (value !== null ? value : '-')}
    </td>
  );
});
