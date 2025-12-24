import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileSpreadsheet, Award, User, FileText, BookOpen, Printer, Search, ArrowUpDown, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';

// Services & Hooks
import { classService, ClassData, Subject } from '../services/classService';
import { useStudents } from '../hooks/useStudents';
import { useGrades } from '../hooks/useGrades';
import { Student } from '../services/studentService';
import { useTutorial } from '../context/TutorialContext';
import { useToast } from '../context/ToastContext';
import { ExportExcelForClass } from './ExportExcel';

// Composants
import AddStudentModal from './AddStudentModal';
import AddSubjectModal from './AddSubjectModal';

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tutorial = useTutorial();
  
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classLoading, setClassLoading] = useState(true);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showOnlyAbandons, setShowOnlyAbandons] = useState(false);


  const toast = useToast();

  useEffect(() => {
    const loadClassData = async () => {
      if (!id) return;
      try {
        const cData = await classService.getClassById(Number(id));
        if (cData) setClassInfo(cData);
        
        const sData = await classService.getSubjectsByClass(Number(id));
        setSubjects(sData);
      } catch (error) {
        console.error('Failed to load class data:', error);
      } finally {
        setClassLoading(false);
      }
    };
    loadClassData();
    // Show tutorial on first visit
    tutorial.showTutorial('classDetails');
  }, [id]);

  // When subjects are loaded (table of notes available), show the grades tutorial
  useEffect(() => {
    if (subjects.length > 0) {
      tutorial.showTutorial('classDetails.grades');
    }
  }, [subjects.length]);

  const { gradesMap, loading: gradesLoading, updateGrade } = useGrades(Number(id));
  
  // Utilisation du hook useStudents pour gérer les élèves
  const { students, loading: studentsLoading, addStudent, deleteStudent, importStudents } = useStudents(Number(id));
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; student: Student } | null>(null);
  
  
  //TODO:Implemnter la logique pour lors du chargement des données
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loading = classLoading || gradesLoading || studentsLoading;

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

  const onUpdateGrade = async (studentId: number, subjectId: number, period: string, value: number | null) => {
    try {
      await updateGrade(studentId, subjectId, period, value);
    } catch (error) {
      console.error('Failed to update grade:', error);
      // TODO: Show error toast
      toast.error('Erreur lors de la mise à jour de la note');
    }
  };

  const handleExportExcel = async (id: string) => {
    if (!id) return;
    await ExportExcelForClass(Number(id));
    toast.success('Notes exportées avec succès');
  };

  const onContextMenu = (e: React.MouseEvent, student: Student) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, student });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleDeleteStudent = async () => {
    if (contextMenu) {
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'élève ${contextMenu.student.last_name} ?`)) {
        await deleteStudent(contextMenu.student.id);
      }
    }
  };

  if (!classInfo) return <div className="p-8 text-center text-slate-500">Aucune classe trouvée.</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* En-tête Unifié */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="px-6 py-4">
           {/* Top Row: Navigation & Title */}
           <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    {classInfo.level} {classInfo.option} <span className="text-slate-400 font-light">|</span> {classInfo.section}
                  </h1>
                   <p className="text-slate-500 text-sm font-medium flex gap-3">
                      <span className="flex items-center gap-1"><User size={14}/> {students.length} élèves</span>
                      <span className="flex items-center gap-1"><BookOpen size={14}/> {subjects.length} cours</span>
                     <span className="flex items-center gap-1">
                        <button
                          onClick={() => setShowOnlyAbandons(prev => !prev)}
                          className={`px-2 py-0.5 rounded-full text-sm font-medium ${showOnlyAbandons ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}
                          title="Afficher uniquement les élèves en abandon"
                        >
                          Abandons: {students.filter(s => Boolean((s as Student).is_abandoned)).length}
                        </button>
                     </span>
                  </p>
                </div>
               </div>

                <div className="flex gap-2">
                   <button 
                    onClick={() => navigate(`/palmares/${id}`)}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 px-4 py-2 rounded-lg font-medium transition-colors border border-purple-200"
                  >
                    <Award size={18} />
                    Palmarès
                  </button>
                  <button 
                    onClick={() => handleExportExcel(id)}
                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200"
                  >
                    <FileSpreadsheet size={18} />
                    Excel
                  </button>
                   <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                    <button 
                        onClick={() => navigate(`/print-coupons/${id}`)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all"
                        title="Imprimer tous les coupons"
                    >
                        <Printer size={18} />
                    </button>
                    <button 
                        onClick={() => navigate(`/print-bulletins/${id}`)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-all"
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Rechercher un élève..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all outline-none text-sm"
                    />
                 </div>
                 <button 
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-200"
                    title={sortOrder === 'asc' ? "Trier Z-A" : "Trier A-Z"}
                 >
                    <ArrowUpDown size={18} className={sortOrder === 'desc' ? 'transform rotate-180' : ''} />
                 </button>
              </div>

              {/* Major Actions */}
              <div className="flex gap-3 w-full md:w-auto justify-end">
                <button 
                  onClick={() => setIsAddSubjectModalOpen(true)}
                  className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors border border-slate-300 font-medium shadow-sm text-sm"
                >
                  <BookOpen size={18} />
                  Gérer les cours
                </button>
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md font-bold text-sm"
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
              <tr 
                key={student.id}
                className={`border-b border-slate-200 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <td 
                  className="sticky left-0 bg-inherit px-4 py-3 font-medium text-slate-800 border-r-2 border-slate-300 cursor-pointer hover:text-blue-600"
                  onContextMenu={(e) => onContextMenu(e, student)}
                  onClick={() => window.location.hash = `#/student/${student.id}`}
                >
                  {student.last_name} {student.first_name}
                </td>
                {subjects.map(subject => {
                  const sem1Total = calculateSemesterTotal(student.id, subject.id, 1);
                  const sem2Total = calculateSemesterTotal(student.id, subject.id, 2);

                  // DÉTECTION DES COURS À 100 POINTS :
                  // Si max_exam = 0, c'est un cours en évaluation continue (pas d'examen)
                  // Les cellules d'examen seront désactivées visuellement
                  const hasExam1 = subject.max_exam1 > 0;
                  const hasExam2 = subject.max_exam2 > 0;

                  return (
                    <React.Fragment key={subject.id}>
                      {/* Période 1 - Toujours active */}
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P1')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P1', val)}
                      />
                      
                      {/* Période 2 - Toujours active */}
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P2')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P2', val)}
                      />
                      
                      {/* Examen 1 - DÉSACTIVÉ si max_exam1 = 0 */}
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'EXAM1')} 
                        isExam 
                        disabled={!hasExam1}  // NOUVEAUTÉ : désactive si pas d'examen
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM1', val)}
                      />
                      
                      {/* Total Semestre 1 */}
                      <td className="px-2 py-3 text-center font-bold text-blue-700 bg-blue-50 border-r-2 border-slate-400">
                        {sem1Total !== null ? sem1Total.toFixed(1) : '-'}
 </td>
                      
                      {/* Période 3 - Toujours active */}
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P3')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P3', val)}
                      />
                      
                      {/* Période 4 - Toujours active */}
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P4')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P4', val)}
                      />
                      
                      {/* Examen 2 - DÉSACTIVÉ si max_exam2 = 0 */}
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'EXAM2')} 
                        isExam 
                        disabled={!hasExam2}  // NOUVEAUTÉ : désactive si pas d'examen
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM2', val)}
                      />
                      
                      {/* Total Semestre 2 */}
                      <td className="px-2 py-3 text-center font-bold text-green-700 bg-green-50 border-r-2 border-slate-400">
                        {sem2Total !== null ? sem2Total.toFixed(1) : '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {/* Modal d'ajout d'élève */}
      {isAddModalOpen && (
        <AddStudentModal 
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={addStudent}
          onImport={importStudents}
          classId={Number(id)}
          existingStudents={students}
        />
      )}

      {/* Add Subject Modal */}
      {isAddSubjectModalOpen && (
        <AddSubjectModal
  classId={Number(id)}
  classLevel={classInfo.level}
  subjects={subjects}
  editingSubject={editingSubject}
  onSelectSubject={(subject) => {
    setEditingSubject(subject);
    setIsAddSubjectModalOpen(true);
  }}
  onClose={() => {
    setEditingSubject(null); // reset → retour à l’état neutre
    setIsAddSubjectModalOpen(false);
  }}
  onSuccess={() => {
    classService.getSubjectsByClass(Number(id)).then(setSubjects);
    setEditingSubject(null);
  }}
/>

      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg py-1 z-50 border border-slate-200 min-w-40px"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button 
            onClick={() => {
              window.location.hash = `#/student/${contextMenu.student.id}`;
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
          >
            <User size={16} />
            Voir le profil
          </button>
          <button 
            onClick={() => {
              window.location.hash = `#/student/edit/${contextMenu.student.id}`;
              closeContextMenu();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2"
          >
            <Edit size={16} />
            Éditer l'élève
          </button>
          <button 
            onClick={() => {
              window.location.hash = `#/bulletin/${contextMenu.student.id}`;
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
 * Composant de cellule de note avec édition inline
 */
function GradeCell({ value, isExam = false, disabled = false, onChange }: { 
  value: number | null; 
  isExam?: boolean; 
  disabled?: boolean;  // NOUVEAUTÉ : permet de désactiver la cellule
  onChange: (val: number | null) => void 
}) {
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

  // MODE ÉDITION : Afficher l'input
  if (isEditing && !disabled) {  // Ne pas permettre édition si disabled
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

  // MODE LECTURE : Afficher la valeur
  // STYLING SPÉCIAL si disabled : grisé avec curseur non éditable
  return (
    <td 
      className={`px-1 py-3 text-center border-r border-slate-200 transition-colors ${
        disabled
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-60'  // Style désactivé
          : `cursor-pointer hover:bg-blue-50 ${isExam ? 'bg-slate-50 font-medium' : ''}`
      }`}
      onDoubleClick={() => !disabled && setIsEditing(true)}  // Désactiver le double-clic si disabled
      title={disabled ? 'Pas d\'examen pour ce cours (évaluation continue)' : ''}  // Tooltip explicatif
    >
      {disabled ? 'N/A' : (value !== null ? value : '-')}
    </td>
  );
}
