import React, { useRef } from 'react';
import { ArrowLeft, Printer } from '../iconsSvg';
import BulletinHumanitesContent from './BulletinHumanitesContent';

// Import du système d'impression
import PrintButton from './PrintWrapper';

// Services
import { Student } from '../../services/studentService';
import { ClassData, Subject } from '../../services/classService';
import { Grade } from '../../services/gradeService';
import { bulletinService } from '../../services/bulletinService';

interface BulletinHumanitesProps {
  studentId: number | null;
  classInfo: ClassData;
  students: Student[];
  subjects: Subject[];
  grades: Grade[]; // Toutes les notes de la classe
  schoolName: string;
  schoolCity: string;
  onClose: () => void;
}

export default function BulletinHumanites({
  studentId,
  classInfo,
  students,
  subjects,
  grades: allGrades,
  schoolName,
  schoolCity,
  onClose
}: BulletinHumanitesProps) {

  // Ref pour isoler la zone d'impression
  const bulletinRef = useRef<HTMLDivElement>(null);

  // Données dérivées (calculées à la volée ou memoïsées)
  // 1. Trouver l'élève
  const student = students.find(s => s.id === studentId);

  // 2. Filtrer les notes pour cet élève
  const studentGrades = React.useMemo(() => {
    return allGrades.filter(g => g.student_id === studentId);
  }, [allGrades, studentId]);

  // 3. Calculer les rangs (synchrone)
  const { ranks: studentRanks, totalStudents } = React.useMemo(() => {
    if (!studentId || !students.length) return { ranks: { p1:0, p2:0, ex1:0, tot1:0, p3:0, p4:0, ex2:0, tot2:0, tg:0 }, totalStudents: 0 };
    return bulletinService.computeStudentRanks(students, allGrades, studentId);
  }, [students, allGrades, studentId]);

  // Configuration CSS optimisée pour éviter la 2ème page blanche
  const printCss = `
    @page {
      size: A4;
      margin: 10mm;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      background: white;
      margin: 0;
      padding: 0;
    }
    .print-target {
      box-shadow: none !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: none !important;
    }
  `;

  if (!student) return <div className="p-8 text-center">Élève introuvable.</div>;

  return (
    <div className="bg-slate-100 p-8 print:p-0 print:bg-white">

      {/* Barre d'outils - Masquée à l'impression */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <PrintButton
          targetRef={bulletinRef}
          title={`Bulletin - ${student.last_name} ${student.first_name}`}
          extraCss={printCss}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all"
        >
          <Printer size={20} />
          Imprimer le bulletin
        </PrintButton>
      </div>

      {/* Zone du bulletin isolée */}
      <div ref={bulletinRef} className="print-target">
        <BulletinHumanitesContent
          student={student}
          classInfo={classInfo}
          subjects={subjects}
          grades={studentGrades}
          schoolName={schoolName}
          schoolCity={schoolCity}
          studentRanks={studentRanks}
          totalStudents={totalStudents}
        />
      </div>
    </div>
  );
}