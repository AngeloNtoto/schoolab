import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import BulletinHumanitesContent from './BulletinHumanitesContent';
import BulletinPrimaireContent from './BulletinPrimaireContent';

// Services
import { Student } from '../../services/studentService';
import { ClassData, Subject } from '../../services/classService';
import { Grade } from '../../services/gradeService';
import { bulletinService, StudentRanks } from '../../services/bulletinService';
import { Domain } from '../../services/domainService';

// Import du composant d'impression isolé
import PrintButton from './PrintWrapper';

interface ClassBulletinsProps {
  classInfo: ClassData;
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  domains: Domain[];
  schoolName: string;
  schoolCity: string;
  onClose: () => void;
}

export default function ClassBulletins({
  classInfo,
  students,
  subjects,
  grades: allGrades,
  domains,
  schoolName,
  schoolCity,
  onClose
}: ClassBulletinsProps) {
  
  // Ref pour capturer TOUS les bulletins
  const allBulletinsRef = useRef<HTMLDivElement>(null);

  // État local pour le filtres
  const [onlyAbandons, setOnlyAbandons] = useState(false);

  // Calcul synchrone des rangs pour tous les élèves
  const { allRanks, totalStudents } = useMemo(() => {
    const ranksMap: Record<number, StudentRanks> = {};
    if (!students.length) return { allRanks: ranksMap, totalStudents: 0 };

    students.forEach(student => {
      const { ranks } = bulletinService.computeStudentRanks(students, allGrades, student.id);
      ranksMap[student.id] = ranks;
    });

    return { allRanks: ranksMap, totalStudents: students.length };
  }, [students, allGrades]);

  // CSS D'IMPRESSION
  const printCss = `
    @page { 
      size: A4; 
      margin: 0; 
    }
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

  if (!classInfo || students.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-600">Aucun élève trouvé.</p>
        <button onClick={onClose} className="mt-4 text-blue-600 hover:underline">Retour</button>
      </div>
    );
  }

  // Filtrage des étudiants pour l'affichage/impression
  const studentsToPrint = onlyAbandons 
    ? students.filter(s => !(s as Student).is_abandoned) 
    : students;

  return (
    <div className="bg-slate-100 p-8 print:p-0 print:bg-white">
      
      {/* --- Zone de Contrôle (Non imprimée) --- */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden sticky top-0 bg-slate-100/90 backdrop-blur pb-4 pt-4 z-10 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-4 py-2 rounded-lg border shadow-sm hover:shadow transition-all"
          >
            <ArrowLeft size={20} />
            Retour à la classe
          </button>
          <span className="text-slate-500 text-sm font-medium bg-white px-3 py-2 rounded-lg border">
            {studentsToPrint.length} Bulletins
          </span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none bg-white px-3 py-2 rounded-lg border hover:bg-slate-50 transition-colors">
            <input 
              type="checkbox" 
              checked={onlyAbandons} 
              onChange={(e) => setOnlyAbandons(e.target.checked)} 
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
            />
            <span>Masquer les abandons</span>
          </label>

          {/* Bouton d'impression intelligent */}
          <PrintButton
            targetRef={allBulletinsRef}
            title={`Bulletins - ${classInfo.name}`}
            extraCss={printCss}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
          >
            <Printer size={20} />
            Imprimer Tout
          </PrintButton>
        </div>
      </div>

      {/* --- Conteneur des Bulletins (Cible de l'impression) --- */}
      <div ref={allBulletinsRef} className="print-reset w-full flex flex-col items-center bg-slate-100 print:bg-white">
        
        {studentsToPrint.map((student) => {
          const studentGrades = allGrades.filter(g => g.student_id === student.id);
          const ranks = allRanks[student.id] || { p1: 0, p2: 0, ex1: 0, tot1: 0, p3: 0, p4: 0, ex2: 0, tot2: 0, tg: 0 };
          
          // Détection automatique Primaire vs Humanités
          // Pour l'instant basé sur 7ème/8ème, à adapter selon vos règles métier exactes
          const isPrimary = classInfo.level === '7ème' || classInfo.level === '8ème';

          return (
            /* WRAPPER INDIVIDUEL : C'est lui qui force le saut de page */
            <div key={student.id} className="bulletin-page-wrapper mb-8 print:mb-0 shadow-lg print:shadow-none">
              
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
                  studentRanks={ranks}
                  totalStudents={totalStudents}
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