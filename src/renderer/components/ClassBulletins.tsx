import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import BulletinHumanitesContent from './BulletinHumanitesContent';
import BulletinPrimaireContent from './BulletinPrimaireContent';

// Services
import { Student } from '../services/studentService';
import { classService, ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';
import { bulletinService, StudentRanks } from '../services/bulletinService';
import { domainService, Domain } from '../services/domainService';

// Import du composant d'impression isolé
import PrintButton from './PrintWrapper';

export default function ClassBulletins() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  
  // Ref pour capturer TOUS les bulletins
  const allBulletinsRef = useRef<HTMLDivElement>(null);

  // États pour les données
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [allRanks, setAllRanks] = useState<Record<number, StudentRanks>>({});
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [onlyAbandons, setOnlyAbandons] = useState(false);

  // ============================================================================
  // CSS D'IMPRESSION (Le secret est ici)
  // ============================================================================
const printCss = `
    @page { 
      size: A4; 
      margin: 0; 
    }
    
    /* Force l'impression des couleurs et backgrounds */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body { 
      background: white; 
      margin: 0; 
    }
    
    .bulletin-page-wrapper {
      page-break-after: always;
      break-after: page;
      width: 100%;
      height: 100%;
      display: block;
    }
    
    .bulletin-page-wrapper:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    .print-reset {
      margin: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      max-width: none !important;
    }
  `;

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    if (!classId) return;
    setLoading(true);

    try {
      const cData = await classService.getClassById(Number(classId));
      if (!cData) return;
      setClassInfo(cData);

      const studentsData = await window.api.db.query<Student>(
        'SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name',
        [Number(classId)]
      );
      setStudents(studentsData);

      const subjectData = await classService.getSubjectsByClass(Number(classId));
      setSubjects(subjectData);

      const domainData = await domainService.getAllDomains();
      setDomains(domainData);

      const gradesData = await window.api.db.query<Grade>(
        `SELECT g.* FROM grades g 
         INNER JOIN students s ON g.student_id = s.id 
         WHERE s.class_id = ?`,
        [Number(classId)]
      );
      setAllGrades(gradesData);

      const sName = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_name']);
      const sCity = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_city']);
      
      if (sName && sName.length > 0) setSchoolName(sName[0].value);
      if (sCity && sCity.length > 0) setSchoolCity(sCity[0].value);

      const { ranks, totalStudents } = await bulletinService.calculateClassRanks(Number(classId));
      setAllRanks(ranks);
      setTotalStudents(totalStudents);

    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return <ProfessionalLoader message="Préparation des bulletins..." subMessage={`Traitement de ${students.length} élèves`} />;
  }

  if (!classInfo || students.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-600">Aucun élève trouvé.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Retour</button>
      </div>
    );
  }

  // Filtrage des étudiants
  const studentsToPrint = onlyAbandons 
    ? students.filter(s => !(s as Student).is_abandoned) 
    : students;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      
      {/* --- Zone de Contrôle (Non imprimée) --- */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <span className="text-slate-500 text-sm font-medium bg-white px-3 py-1 rounded-full border">
            {studentsToPrint.length} Bulletins
          </span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={onlyAbandons} 
              onChange={(e) => setOnlyAbandons(e.target.checked)} 
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" 
            />
            <span>Masquer les abandons</span>
          </label>

          {/* Bouton d'impression intelligent */}
          <PrintButton
            targetRef={allBulletinsRef}
            title={`Bulletins - ${classInfo.name}`}
            extraCss={printCss}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 shadow-sm transition-all"
          >
            <Printer size={20} />
            Imprimer Tout ({studentsToPrint.length})
          </PrintButton>
        </div>
      </div>

      {/* --- Conteneur des Bulletins (Cible de l'impression) --- */}
      {/* 1. On attache la ref ici.
          2. print-reset est une classe utilitaire qu'on cible dans le CSS ci-dessus 
             pour enlever padding/margin lors de l'impression 
      */}
      <div ref={allBulletinsRef} className="print-reset w-full flex flex-col items-center">
        
        {studentsToPrint.map((student) => {
          const studentGrades = allGrades.filter(g => g.student_id === student.id);
          const ranks = allRanks[student.id] || { p1: 0, p2: 0, ex1: 0, tot1: 0, p3: 0, p4: 0, ex2: 0, tot2: 0, tg: 0 };
          const isPrimary = classInfo.level === '7ème' || classInfo.level === '8ème';

          return (
            /* WRAPPER INDIVIDUEL : C'est lui qui force le saut de page */
            <div key={student.id} className="bulletin-page-wrapper mb-8 print:mb-0">
              
              {/* Le contenu du bulletin */}
              {isPrimary ? (
                <BulletinPrimaireContent
                  student={student}
                  classInfo={classInfo}
                  subjects={subjects}
                  grades={studentGrades}
                  domains={domains}
                  schoolName={schoolName}
                  schoolCity={schoolCity}
                />
              ) : (
                <BulletinHumanitesContent
                  student={student}
                  classInfo={classInfo}
                  subjects={subjects}
                  grades={studentGrades}
                  schoolName={schoolName}
                  schoolCity={schoolCity}
                  studentRanks={ranks}
                  totalStudents={totalStudents}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}