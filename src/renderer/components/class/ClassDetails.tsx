import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileSpreadsheet, Award, Users, FileText, BookOpen, Printer, Search, ArrowUpDown, Edit } from 'lucide-react';

// Services & Hooks
import { ClassData, Subject } from '../../services/classService';
import { Student } from '../../services/studentService';
import { useTutorial } from '../../context/TutorialContext';
import { useToast } from '../../context/ToastContext';
import { ExportExcelForClass } from './ExportExcel';

// Composants
import AddStudentModal from './AddStudentModal';
import AddSubjectModal from './AddSubjectModal';
import Activity from '../shared/Activity';

// Interface pour les props
interface ClassDetailsProps {
  // Données pré-chargées
  classInfo: ClassData;
  subjects: Subject[];
  students: Student[];
  gradesMap: Map<string, number>;
  editingSubject: Subject | null;
  
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
}

export default function ClassDetails({
  classInfo,
  subjects,
  students,
  gradesMap,
  editingSubject,
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
  onSetEditingSubject
}: ClassDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tutorial = useTutorial();

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showOnlyAbandons, setShowOnlyAbandons] = useState(false);

  const toast = useToast();

  useEffect(() => {
    // Show tutorial on first visit
    tutorial.showTutorial('classDetails');
  }, []);

  // When subjects are loaded (table of notes available), show the grades tutorial
  useEffect(() => {
    if (subjects.length > 0) {
      tutorial.showTutorial('classDetails.grades');
    }
  }, [subjects.length]);

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

  // Calcul du total semestriel
  const calculateSemesterTotal = (studentId: number, subjectId: number, semester: 1 | 2) => {
    if (semester === 1) {
      const p1 = getGrade(studentId, subjectId, 'P1');
      const p2 = getGrade(studentId, subjectId, 'P2');
      const ex1 = getGrade(studentId, subjectId, 'EXAM1');
      
      if (p1 === null && p2 === null && ex1 === null) return null;
      return (p1 || 0) + (p2 || 0) + (ex1 || 0);
    } else {
      const p3 = getGrade(studentId, subjectId, 'P3');
      const p4 = getGrade(studentId, subjectId, 'P4');
      const ex2 = getGrade(studentId, subjectId, 'EXAM2');
      
      if (p3 === null && p4 === null && ex2 === null) return null;
      return (p3 || 0) + (p4 || 0) + (ex2 || 0);
    }
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
      <header className="bg-blue-600 dark:bg-slate-900 border-b border-transparent dark:border-white/5 sticky top-0 z-30 shadow-lg transition-colors">
        <div className="px-6 py-4">
           {/* Top Row: Navigation & Title */}
           <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-black text-white dark:text-slate-100 flex items-center gap-2 tracking-tight">
                    {classInfo.level} {classInfo.option} <span className="text-blue-300 dark:text-slate-500 font-light">|</span> {classInfo.section}
                  </h1>
                   <p className="text-blue-100 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest flex gap-4 mt-1">
                      <span className="flex items-center gap-1.5"><Users size={12}/> {students.length} élèves</span>
                      <span className="flex items-center gap-1.5"><BookOpen size={12}/> {subjects.length} cours</span>
                     <span className="flex items-center gap-1.5">
                        <button
                          onClick={() => setShowOnlyAbandons(prev => !prev)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${showOnlyAbandons ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-red-500/20 text-red-200 hover:bg-red-500/40'}`}
                          title="Afficher uniquement les élèves en abandon"
                        >
                          Abandons: {students.filter(s => Boolean((s as Student).is_abandoned)).length}
                        </button>
                     </span>
                  </p>
                </div>
               </div>

                 <div className="flex gap-3">
                    <button 
                     onClick={onOpenPalmares}
                     className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border border-white/20 backdrop-blur-md"
                   >
                     <Award size={16} />
                     Palmarès
                   </button>
                   <button 
                     onClick={() => handleExportExcel(id)}
                     className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border border-white/20 backdrop-blur-md"
                   >
                     <FileSpreadsheet size={16} />
                     Excel
                   </button>
                    <div className="flex bg-white/10 rounded-xl p-1.5 border border-white/20 backdrop-blur-md">
                     <button 
                         onClick={onOpenCouponsPrint}
                         className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                         title="Imprimer tous les coupons"
                     >
                         <Printer size={18} />
                     </button>
                     <button 
                         onClick={onOpenBulkPrint}
                         className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                         title="Imprimer tous les bulletins"
                     >
                         <FileText size={18} />
                     </button>
                    </div>
                </div>
           </div>

           {/* Bottom Row: Controls & Actions */}
           <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
               {/* Search & Sort */}
               <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative group w-full md:w-80">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 group-focus-within:text-white transition-colors" size={18} />
                     <input 
                       type="text" 
                       placeholder="Rechercher un élève..." 
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       className="w-full pl-12 pr-4 py-3 bg-white/10 dark:bg-slate-950/50 border border-white/20 dark:border-white/5 rounded-2xl text-white placeholder-white/40 focus:ring-4 focus:ring-white/10 focus:bg-white/20 transition-all outline-none font-bold text-sm"
                     />
                  </div>
                  <button 
                     onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                     className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/20 backdrop-blur-md"
                     title={sortOrder === 'asc' ? "Trier Z-A" : "Trier A-Z"}
                  >
                     <ArrowUpDown size={18} className={sortOrder === 'desc' ? 'transform rotate-180' : ''} />
                  </button>
               </div>

               {/* Major Actions */}
               <div className="flex gap-3 w-full md:w-auto justify-end">
                 <button 
                   onClick={() => setShowAddSubjectModal(true)}
                   className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-2xl transition-all border border-white/20 backdrop-blur-md font-bold text-[10px] uppercase tracking-widest"
                 >
                   <BookOpen size={18} />
                   Gérer les cours
                 </button>
                 <button 
                   onClick={() => setShowAddModal(true)}
                   className="flex items-center gap-2 bg-white dark:bg-blue-600 text-blue-600 dark:text-white px-6 py-3 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 font-black text-[10px] uppercase tracking-widest"
                 >
                   <Plus size={18} />
                   Ajouter un élève
                 </button>
               </div>
           </div>
        </div>
      </header>

      {/* Contenu Principal - Grille scrollable */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-20 shadow-sm">
            {/* Ligne d'en-tête principale */}
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="sticky left-0 z-30 bg-slate-100 px-4 py-3 text-left font-bold text-slate-700 border-r-2 border-slate-300 min-w-[200px]">
                Élèves ({filteredAndSortedStudents.length})
              </th>
              
              {subjects.map(subject => (
                <th 
                  key={subject.id} 
                  colSpan={8} 
                  className="bg-slate-100 px-2 py-2 text-center font-semibold text-slate-700 border-x border-slate-300"
                >
                  {subject.name}
                </th>
              ))}
            </tr>

            {/* Ligne de sous-en-tête avec les Maxima */}
            <tr className="border-b-2 border-slate-300 bg-slate-50">
              {/* TODO: Ajouter  la colonne Nom et PostNom sur la meme ligne que les maximas */}
              <th className='sticky left-0 z-30 bg-slate-50 border-r-2 border-slate-300 text-left px-4 py-3 font-bold text-blue-700'>
                Nom et PostNom
              </th>
              {subjects.map(subject => {
                // Détection cours sans examen pour styling conditionnel des en-têtes
                const hasExam1 = subject.max_exam1 > 0;
                const hasExam2 = subject.max_exam2 > 0;
                
                return (
                <React.Fragment key={subject.id}>
                  {/* P1 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200 min-w-[50px]">
                    P1<br/><span className="text-[10px] text-slate-400">/{subject.max_p1}</span>
                  </th>
                  
                  {/* P2 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200 min-w-[50px]">
                    P2<br/><span className="text-[10px] text-slate-400">/{subject.max_p2}</span>
                  </th>
                  
                  {/* Ex1 - STYLING CONDITIONNEL si désactivé */}
                  <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 min-w-[50px] ${
                    hasExam1 
                      ? 'text-slate-600 bg-blue-50' 
                      : 'text-slate-400 bg-slate-100 opacity-60'  // Grisé si pas d'examen
                  }`}>
                    Ex1<br/><span className="text-[10px] text-slate-400">
                      {hasExam1 ? `/${subject.max_exam1}` : 'N/A'}
                    </span>
                  </th>
                  
                  {/* Semestre 1 */}
                  <th className="px-2 py-2 text-xs font-semibold text-blue-700 border-r-2 border-slate-400 bg-blue-100 min-w-[60px]">
                    Sem1<br/><span className="text-[10px] text-slate-400">/{subject.max_p1 + subject.max_p2 + subject.max_exam1}</span>
                  </th>
                  
                  {/* P3 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200 min-w-[50px]">
                    P3<br/><span className="text-[10px] text-slate-400">/{subject.max_p3}</span>
                  </th>
                  
                  {/* P4 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200 min-w-[50px]">
                    P4<br/><span className="text-[10px] text-slate-400">/{subject.max_p4}</span>
                  </th>
                  
                  {/* Ex2 - STYLING CONDITIONNEL si désactivé */}
                  <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 min-w-[50px] ${
                    hasExam2 
                      ? 'text-slate-600 bg-green-50' 
                      : 'text-slate-400 bg-slate-100 opacity-60'  // Grisé si pas d'examen
                  }`}>
                    Ex2<br/><span className="text-[10px] text-slate-400">
                      {hasExam2 ? `/${subject.max_exam2}` : 'N/A'}
                    </span>
                  </th>
                  
                  {/* Semestre 2 */}
                  <th className="px-2 py-2 text-xs font-semibold text-green-700 border-r-2 border-slate-400 bg-green-100 min-w-[60px]">
                    Sem2<br/><span className="text-[10px] text-slate-400">/{subject.max_p3 + subject.max_p4 + subject.max_exam2}</span>
                  </th>
                </React.Fragment>
              )}
              )}
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
      </div>

      {/* Modals wraped in Activity for instant appearance and state preservation */}
      <Activity mode={showAddModal ? 'visible' : 'hidden'}>
        <AddStudentModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={onAddStudent}
          onImport={onImportStudents}
          classId={Number(id)}
          existingStudents={students}
        />
      </Activity>

      <Activity mode={showAddSubjectModal ? 'visible' : 'hidden'}>
        <AddSubjectModal
          classId={Number(id)}
          classLevel={classInfo.level}
          subjects={subjects}
          editingSubject={editingSubject}
          onSelectSubject={(subject) => {
            onSetEditingSubject(subject);
            setShowAddSubjectModal(true);
          }}
          onClose={() => {
            onSetEditingSubject(null); // reset → retour à l'état neutre
            setShowAddSubjectModal(false);
          }}
          onSuccess={() => {
            onRefreshSubjects();
            onSetEditingSubject(null);
          }}
        />
      </Activity>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg py-1 z-50 border border-slate-200 min-w-40px"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={() => {
              onEditStudent(contextMenu.student.id);
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
          >
            <Edit size={16} />
            Éditer l'élève
          </button>
          <button 
            onClick={() => {
              onOpenBulletin(contextMenu.student.id);
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
          >
            <FileText size={16} />
            Voir le bulletin
          </button>
          <div className="h-px bg-slate-100 my-1"></div>
          <button 
            onClick={() => {
              handleDeleteStudent();
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 size={16} />
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Composant de ligne d'élève mémorisé pour éviter les re-rendus inutiles
 */
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
    <tr className={`border-b border-slate-200 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
      <td 
        className="sticky left-0 bg-inherit px-4 py-3 font-medium text-slate-800 border-r-2 border-slate-300"
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
            <td className="px-2 py-3 text-center font-bold text-blue-700 bg-blue-50 border-r-2 border-slate-400">
              {sem1Total !== null ? sem1Total.toFixed(1) : '-'}
            </td>
            <GradeCell value={getGrade(subject.id, 'P3')} onChange={(val) => onUpdateGrade(student.id, subject.id, 'P3', val)} />
            <GradeCell value={getGrade(subject.id, 'P4')} onChange={(val) => onUpdateGrade(student.id, subject.id, 'P4', val)} />
            <GradeCell 
              value={getGrade(subject.id, 'EXAM2')} 
              isExam disabled={!hasExam2} 
              onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM2', val)} 
            />
            <td className="px-2 py-3 text-center font-bold text-green-700 bg-green-50 border-r-2 border-slate-400">
              {sem2Total !== null ? sem2Total.toFixed(1) : '-'}
            </td>
          </React.Fragment>
        );
      })}
    </tr>
  );
});

/**
 * Composant de cellule de note avec édition inline - MÉMORISÉ
 */
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
      <td className="p-0 border-r border-slate-200">
        <input
          ref={inputRef}
          type="number"
          className="w-full h-full px-1 py-3 text-center outline-none bg-blue-50 focus:bg-blue-100 font-medium"
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
      className={`px-1 py-3 text-center border-r border-slate-200 transition-colors ${
        disabled
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'
          : `cursor-pointer hover:bg-blue-50 ${isExam ? 'bg-slate-50 font-medium' : ''}`
      }`}
      onDoubleClick={() => !disabled && setIsEditing(true)}
      title={disabled ? 'Pas d\'examen pour ce cours (évaluation continue)' : ''}
    >
      {disabled ? 'N/A' : (value !== null ? value : '-')}
    </td>
  );
});
