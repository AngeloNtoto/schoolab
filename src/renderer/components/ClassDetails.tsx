import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, FileSpreadsheet, Award, User, FileText, BookOpen, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import * as XLSX from 'xlsx';

// Services & Hooks
import { classService, ClassData, Subject } from '../services/classService';
import { useStudents } from '../hooks/useStudents';
import { useGrades } from '../hooks/useGrades';
import { Student } from '../services/studentService';

// Components
import AddStudentModal from './AddStudentModal';
import AddSubjectModal from './AddSubjectModal';

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const classId = id ? Number(id) : 0;
  const navigate = useNavigate();
  
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classLoading, setClassLoading] = useState(true);

  useEffect(() => {
    const loadClassData = async () => {
      if (!classId) return;
      try {
        const cData = await classService.getClassById(classId);
        if (cData) setClassInfo(cData);
        
        const sData = await classService.getSubjectsByClass(classId);
        setSubjects(sData);
      } catch (error) {
        console.error('Failed to load class data:', error);
      } finally {
        setClassLoading(false);
      }
    };
    loadClassData();
  }, [id]);

  const { gradesMap, loading: gradesLoading, updateGrade, refresh: refreshGrades } = useGrades(classId);
  
  // UTILISATION DU HOOK useStudents :
  // Ce hook gère tout l'état et les opérations liées aux élèves de cette classe
  // Il expose plusieurs fonctions et états :
  // - students : la liste des élèves (avec cache pour optimisation)
  // - loading : indicateur de chargement
  // - addStudent : fonction pour ajouter UN élève manuellement
  // - deleteStudent : fonction pour supprimer un élève
  // - importStudents : fonction pour importer PLUSIEURS élèves depuis Excel
  //
  // PRINCIPE DE MODULARITÉ :
  // Le composant ne connaît PAS les détails de l'implémentation
  // Il appelle simplement les fonctions exposées par le hook
  // Le hook orchestre entre le service et le composant
  const { students, loading: studentsLoading, addStudent, deleteStudent, importStudents, refresh: refreshStudents } = useStudents(classId);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; student: Student } | null>(null);

  const loading = classLoading || gradesLoading || studentsLoading;

  // Optimized getGrade using Map (O(1))
  const getGrade = (studentId: number, subjectId: number, period: string) => {
    return gradesMap.get(`${studentId}-${subjectId}-${period}`) ?? null;
  };

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
    }
  };

  const handleExportExcel = () => {
    if (!classInfo || students.length === 0) return;

    const workbook = XLSX.utils.book_new();
    
    // Prepare data for export
    const data = students.map(student => {
      const row: any = {
        'Nom': student.last_name,
        'Post-nom': student.post_name,
        'Prénom': student.first_name,
        'Sexe': student.gender
      };

      subjects.forEach(subject => {
        row[`${subject.name} - P1`] = getGrade(student.id, subject.id, 'P1');
        row[`${subject.name} - P2`] = getGrade(student.id, subject.id, 'P2');
        row[`${subject.name} - Ex1`] = getGrade(student.id, subject.id, 'EXAM1');
        row[`${subject.name} - P3`] = getGrade(student.id, subject.id, 'P3');
        row[`${subject.name} - P4`] = getGrade(student.id, subject.id, 'P4');
        row[`${subject.name} - Ex2`] = getGrade(student.id, subject.id, 'EXAM2');
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Notes");
    XLSX.writeFile(workbook, `Notes_${classInfo.level}_${classInfo.option}.xlsx`);
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

  // Rafraîchir la vue lorsque la base de données change ailleurs (import réseau, suppression, etc.)
  useEffect(() => {
    const handler = async (ev: Event) => {
      try {
        const detail = (ev as CustomEvent<any>)?.detail;
        console.debug('[ClassDetails] received db:changed', detail);
        const incomingClassId = detail?.classId;

        // If the event targets another class, ignore
        if (incomingClassId && Number(incomingClassId) !== Number(id)) return;

        const targetClassId = incomingClassId ? Number(incomingClassId) : Number(id);

        // Si la modal d'ajout de matière est ouverte, ne pas recharger les sujets
        // car cela provoque un re-render qui détruit le focus de l'input.
        // Nous continuons toutefois à rafraîchir notes et élèves.
        try { await refreshGrades(); } catch (e) { console.error('refreshGrades failed', e); }
        try { await refreshStudents(); } catch (e) { console.error('refreshStudents failed', e); }

        if (!isAddSubjectModalOpen) {
          try {
            const subs = await classService.getSubjectsByClass(targetClassId);
            setSubjects(subs);
          } catch (e) {
            console.error('Failed to reload subjects on db:changed', e);
          }
        } else {
          console.debug('[ClassDetails] skipping subjects reload because AddSubjectModal is open');
        }
      } catch (err) {
        console.error('db:changed handler failed', err);
      }
    };

    window.addEventListener('db:changed', handler as EventListener);
    return () => window.removeEventListener('db:changed', handler as EventListener);
  }, [id, refreshGrades, refreshStudents, isAddSubjectModalOpen]);

  const handleDeleteStudent = async () => {
    if (contextMenu) {
      if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'élève ${contextMenu.student.last_name} ?`)) {
        await deleteStudent(contextMenu.student.id);
      }
    }
  };

  if (loading) {
    return <ProfessionalLoader message="Chargement de la classe..." subMessage="Récupération des élèves et des notes" />;
  }

  if (!classInfo) return <div className="p-8 text-center text-slate-500">Aucune classe trouvée.</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {classInfo.level} {classInfo.option} {classInfo.section}
            </h1>
            <p className="text-slate-500 text-sm">
              {students.length} élèves • {subjects.length} cours
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Ajouter un élève
          </button>
          <button 
            onClick={() => setIsAddSubjectModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <BookOpen size={18} />
            Ajouter une matière
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={18} />
            Exporter Excel
          </button>
          <button 
            onClick={() => navigate(`/palmares/${id}`)}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Award size={18} />
            Palmarès
          </button>
          <div className="h-8 w-px bg-slate-300 mx-2"></div>
          <button 
            onClick={() => navigate(`/print-coupons/${id}`)}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            title="Imprimer tous les coupons"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={() => navigate(`/print-bulletins/${id}`)}
            className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            title="Imprimer tous les bulletins"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* Main Content - Scrollable Grid */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse min-w-max">
          <thead className="sticky top-0 z-20 shadow-sm">
            {/* Main Header Row */}
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="sticky left-0 z-30 bg-slate-100 px-4 py-3 text-left font-bold text-slate-700 border-r-2 border-slate-300 min-w-[200px]">
                Élèves
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

            {/* Sub Header Row with Maxima */}
            <tr className="border-b-2 border-slate-300 bg-slate-50">
              <th className="sticky left-0 z-30 bg-slate-50 border-r-2 border-slate-300"></th>
              {subjects.map(subject => {
                // Détection cours sans examen pour styling conditionnel des en-têtes
                const hasExam1 = subject.max_exam1 > 0;
                const hasExam2 = subject.max_exam2 > 0;
                
                return (
                <React.Fragment key={subject.id}>
                  {/* P1 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">
                    P1<br/><span className="text-[10px] text-slate-400">/{subject.max_p1}</span>
                  </th>
                  
                  {/* P2 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">
                    P2<br/><span className="text-[10px] text-slate-400">/{subject.max_p2}</span>
                  </th>
                  
                  {/* Ex1 - STYLING CONDITIONNEL si désactivé */}
                  <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 ${
                    hasExam1 
                      ? 'text-slate-600 bg-blue-50' 
                      : 'text-slate-400 bg-slate-100 opacity-60'  // Grisé si pas d'examen
                  }`}>
                    Ex1<br/><span className="text-[10px] text-slate-400">
                      {hasExam1 ? `/${subject.max_exam1}` : 'N/A'}
                    </span>
                  </th>
                  
                  {/* Sem1 */}
                  <th className="px-2 py-2 text-xs font-semibold text-blue-700 border-r-2 border-slate-400 bg-blue-100">
                    Sem1<br/><span className="text-[10px] text-slate-400">/{subject.max_p1 + subject.max_p2 + subject.max_exam1}</span>
                  </th>
                  
                  {/* P3 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">
                    P3<br/><span className="text-[10px] text-slate-400">/{subject.max_p3}</span>
                  </th>
                  
                  {/* P4 - Toujours actif */}
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">
                    P4<br/><span className="text-[10px] text-slate-400">/{subject.max_p4}</span>
                  </th>
                  
                  {/* Ex2 - STYLING CONDITIONNEL si désactivé */}
                  <th className={`px-2 py-2 text-xs font-medium border-r border-slate-300 ${
                    hasExam2 
                      ? 'text-slate-600 bg-green-50' 
                      : 'text-slate-400 bg-slate-100 opacity-60'  // Grisé si pas d'examen
                  }`}>
                    Ex2<br/><span className="text-[10px] text-slate-400">
                      {hasExam2 ? `/${subject.max_exam2}` : 'N/A'}
                    </span>
                  </th>
                  
                  {/* Sem2 */}
                  <th className="px-2 py-2 text-xs font-semibold text-green-700 border-r-2 border-slate-400 bg-green-100">
                    Sem2<br/><span className="text-[10px] text-slate-400">/{subject.max_p3 + subject.max_p4 + subject.max_exam2}</span>
                  </th>
                </React.Fragment>
              )}
              )}
            </tr>
          </thead>

          <tbody>
            {students.map((student, idx) => (
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
      {/* 
        MODAL D'AJOUT D'ÉLÈVE :
        Ce modal permet deux modes d'ajout :
        1. Manuel : formulaire pour ajouter UN élève
        2. Import : upload Excel pour ajouter PLUSIEURS élèves
        
        PROPS PASSÉES AU MODAL :
        - isOpen : contrôle l'affichage du modal (état local du composant)
        - onClose : callback pour fermer le modal
        - onAdd : fonction pour ajouter un élève manuellement (vient du hook useStudents)
        - onImport : fonction pour importer plusieurs élèves (vient du hook useStudents)
        - classId : ID de la classe courante (CRUCIAL pour associer les élèves à la bonne classe)
        
        FLUX DE DONNÉES :
        Component (ClassDetails) → Hook (useStudents) → Service (studentService) → Database
        
        POURQUOI classId EST IMPORTANT :
        - Chaque élève DOIT être lié à une classe (contrainte de la BDD)
        - Le modal ne connaît pas la classe, c'est le composant parent qui la connaît
        - On passe donc classId comme prop pour que le modal puisse créer les élèves correctement
      */}
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
          onClose={() => setIsAddSubjectModalOpen(false)}
          onSuccess={() => {
            // Refresh subjects
            classService.getSubjectsByClass(classId).then(setSubjects);
          }}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg py-1 z-50 border border-slate-200 min-w-[160px]"
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

// Grade Cell Component
/**
 * COMPOSANT DE CELLULE DE NOTE
 * 
 * Permet l'édition inline des notes avec double-clic.
 * 
 * NOUVEAUTÉ : Support du mode désactivé pour les cellules d'examen
 * - Quand disabled=true : cellule grisée,  non éditable, affiche "N/A"
 * - Utilisé pour les cours à 100 points (pas d'examen)
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
