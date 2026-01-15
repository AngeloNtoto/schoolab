import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';

// Système d'impression
import PrintButton from './PrintWrapper';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  post_name: string;
  is_abandoned?: number | boolean;
  conduite_p1?: string;
  conduite_p2?: string;
  conduite_p3?: string;
  conduite_p4?: string;
  abandon_reason?: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  max_p1: number;
  max_p2: number;
  max_exam1: number;
  max_p3: number;
  max_p4: number;
  max_exam2: number;
}

interface Grade {
  student_id: number;
  subject_id: number;
  period: string;
  value: number;
}

interface ClassInfo {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

interface RankedStudent {
  student: Student;
  percentage: number;
  rank: number;
  application: string;
  isUnranked: boolean;
  failedSubjects: string[];
  subjectDetails: {
    subjectName: string;
    points: number;
    maxPoints: number;
  }[];
}

type Period = 'P1' | 'P2' | 'EXAM1' | 'SEM1' | 'P3' | 'P4' | 'EXAM2' | 'SEM2' | 'ANNUAL';

/**
 * Composant pour l'affichage propre de l'observation d'un élève
 */
const StudentObservation = ({ rankedStudent, selectedPeriod }: { rankedStudent: RankedStudent, selectedPeriod: Period }) => {
  const student = rankedStudent.student;
  
  if (student.is_abandoned) {
    return (
      <span className="text-red-600 font-bold text-[7.5px]">
        Abandon {student.abandon_reason ? `: ${student.abandon_reason}` : ''}
      </span>
    );
  }

  if (rankedStudent.isUnranked) {
    return <span className="text-slate-500 italic text-[7.5px]">Non classé</span>;
  }

  if (rankedStudent.percentage < 50) {
    return <span className="text-red-600 font-bold text-[7.5px] uppercase">Redouble la classe</span>;
  }

  if (rankedStudent.failedSubjects.length > 0) {
    const failures = rankedStudent.subjectDetails
      .filter((s: any) => (s.points / s.maxPoints) * 100 < 50)
      .map((s: any) => s.subjectName + (selectedPeriod === "ANNUAL" ? ` (${s.points}/${s.maxPoints})` : ''))
      .join(', ');

    return (
      <div className="flex flex-wrap items-center gap-x-1 leading-tight text-[7.5px]">
        <span className="text-amber-600 font-semibold whitespace-nowrap">
          Échec ({rankedStudent.failedSubjects.length} cours) :
        </span>
        <span className="text-slate-700">{failures}</span>
      </div>
    );
  }

  return <span className="text-green-600 font-medium text-[7.5px]">— Passé</span>;
};

interface PalmaresProps {
  classInfo: ClassInfo;
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  schoolName: string;
  schoolCity: string;
  schoolPoBox: string;
  onClose: () => void;
}

export default function Palmares({
  classInfo,
  students,
  subjects,
  grades,
  schoolName,
  schoolCity,
  schoolPoBox,
  onClose
}: PalmaresProps) {
  const palmaresRef = useRef<HTMLDivElement>(null);
  
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('SEM1');
  const [onlyAbandons, setOnlyAbandons] = useState(false);
  const [sortByAbandon] = useState(false);

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
      font-size: 10px;
    }
    table {
      font-size: 9px !important;
    }
    .print-reset {
      margin: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      max-width: none !important;
    }
  `;

  const getApplication = (percentage: number): string => {
    if (percentage >= 80) return 'E';
    if (percentage >= 60) return 'TB';
    if (percentage >= 50) return 'B';
    if (percentage >= 30) return 'Ma';
    return 'Mé';
  };
  
  const getPeriodConfig = (period: Period) => {
    const configs: Record<Period, Array<{ period: string; getMax: (s: Subject) => number }>> = {
      'P1': [{ period: 'P1', getMax: (s) => s.max_p1 }],
      'P2': [{ period: 'P2', getMax: (s) => s.max_p2 }],
      'EXAM1': [{ period: 'EXAM1', getMax: (s) => s.max_exam1 }],
      'SEM1': [
        { period: 'P1', getMax: (s) => s.max_p1 },
        { period: 'P2', getMax: (s) => s.max_p2 },
        { period: 'EXAM1', getMax: (s) => s.max_exam1 },
      ],
      'P3': [{ period: 'P3', getMax: (s) => s.max_p3 }],
      'P4': [{ period: 'P4', getMax: (s) => s.max_p4 }],
      'EXAM2': [{ period: 'EXAM2', getMax: (s) => s.max_exam2 }],
      'SEM2': [
        { period: 'P3', getMax: (s) => s.max_p3 },
        { period: 'P4', getMax: (s) => s.max_p4 },
        { period: 'EXAM2', getMax: (s) => s.max_exam2 },
      ],
      'ANNUAL': [
        { period: 'P1', getMax: (s) => s.max_p1 },
        { period: 'P2', getMax: (s) => s.max_p2 },
        { period: 'EXAM1', getMax: (s) => s.max_exam1 },
        { period: 'P3', getMax: (s) => s.max_p3 },
        { period: 'P4', getMax: (s) => s.max_p4 },
        { period: 'EXAM2', getMax: (s) => s.max_exam2 },
      ],
    };
    return configs[period];
  };

  const rankedStudents = useMemo(() => {
    const rankings: RankedStudent[] = [];
    let studentsToProcess = [...students];
    
    if (onlyAbandons) {
      studentsToProcess = studentsToProcess.filter(s => !s.is_abandoned);
    }
    
    if (sortByAbandon) {
      studentsToProcess.sort((a, b) => (b.is_abandoned ? 1 : 0) - (a.is_abandoned ? 1 : 0));
    }

    const periodsConfig = getPeriodConfig(selectedPeriod);

    for (const student of studentsToProcess) {
      let totalPoints = 0;
      let totalMaxPoints = 0;
      let hasAllGrades = true;
      const failedSubjects: string[] = [];
      const subjectDetails: RankedStudent['subjectDetails'] = [];

      for (const subject of subjects) {
        let subjectPoints = 0;
        let subjectMaxPoints = 0;

        for (const periodData of periodsConfig) {
          const gradeEntry = grades.find(g => g.student_id === student.id && g.subject_id === subject.id && g.period === periodData.period);
          const grade = gradeEntry ? gradeEntry.value : null;
          
          if (grade === null) {
            hasAllGrades = false;
            break;
          }
          subjectPoints += grade;
          subjectMaxPoints += periodData.getMax(subject);
        }

        if (!hasAllGrades) break;

        totalPoints += subjectPoints;
        totalMaxPoints += subjectMaxPoints;

        if (subjectMaxPoints > 0) {
          const subjectPercentage = (subjectPoints / subjectMaxPoints) * 100;
          if (subjectPercentage < 50) {
            failedSubjects.push(subject.code || subject.name);
          }
        }
        subjectDetails.push({
          subjectName: subject.code || subject.name,
          points: subjectPoints,
          maxPoints: subjectMaxPoints,
        });
      }

      const percentage = hasAllGrades && totalMaxPoints > 0 
        ? (totalPoints / totalMaxPoints) * 100 
        : 0;

      rankings.push({
        student,
        percentage: hasAllGrades ? percentage : 0,
        rank: 0,
        application: hasAllGrades ? getApplication(percentage) : '-',
        isUnranked: !hasAllGrades,
        failedSubjects,
        subjectDetails,
      });
    }

    const ranked = rankings.filter(r => !r.isUnranked);
    const unranked = rankings.filter(r => r.isUnranked);

    ranked.sort((a, b) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      const nameA = `${a.student.last_name} ${a.student.post_name || ''} ${a.student.first_name || ''}`;
      const nameB = `${b.student.last_name} ${b.student.post_name || ''} ${b.student.first_name || ''}`;
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    });

    for (let i = 0; i < ranked.length; i++) {
        ranked[i].rank = i + 1;
    }

    return [...ranked, ...unranked];
  }, [students, subjects, grades, selectedPeriod, onlyAbandons, sortByAbandon]);

  const formatConduite = (stu: Student) => {
    switch (selectedPeriod) {
      case 'P1': return stu.conduite_p1 || '-';
      case 'P2': return stu.conduite_p2 || '-';
      case 'P3': return stu.conduite_p3 || '-';
      case 'P4': return stu.conduite_p4 || '-';
      case 'SEM1': return `${stu.conduite_p1 || '-'} / ${stu.conduite_p2 || '-'}`;
      case 'SEM2': return `${stu.conduite_p3 || '-'} / ${stu.conduite_p4 || '-'}`;
      case 'ANNUAL': return `${stu.conduite_p1 || '-'} / ${stu.conduite_p2 || '-'} / ${stu.conduite_p3 || '-'} / ${stu.conduite_p4 || '-'}`;
      default: return'-';
    }
  };

  const stats = {
    total: students.length,
    passed: rankedStudents.filter(r => !r.isUnranked && r.percentage >= 50).length,
    failed: rankedStudents.filter(r => !r.isUnranked && r.percentage < 50).length,
    unranked: rankedStudents.filter(r => r.isUnranked).length,
  };

  return (
    <div className="bg-slate-100 p-8 print:p-0 print:bg-white">
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm"
        >
          <ArrowLeft size={20} />
          Retour à la classe
        </button>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as Period)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            <option value="P1">1ère Période</option>
            <option value="P2">2ème Période</option>
            <option value="EXAM1">Examen 1er Semestre</option>
            <option value="SEM1">Semestre 1</option>
            <option value="P3">3ème Période</option>
            <option value="P4">4ème Période</option>
            <option value="EXAM2">Examen 2ème Semestre</option>
            <option value="SEM2">Semestre 2</option>
            <option value="ANNUAL">Annuel</option>
          </select>
          
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input 
              type="checkbox" 
              checked={onlyAbandons} 
              onChange={(e) => setOnlyAbandons(e.target.checked)} 
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
            />
            <span>Exclure les abandons</span>
          </label>

          <PrintButton
            targetRef={palmaresRef}
            title={`Palmarès - ${classInfo.name} - ${selectedPeriod}`}
            extraCss={printCss}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Printer size={20} />
            Imprimer
          </PrintButton>
        </div>
      </div>

      <div 
        ref={palmaresRef}
        className="print-container max-w-[210mm] mx-auto bg-white shadow-xl p-8 min-h-[297mm]"
      >
        <div className="border-2 border-black mb-4">
          <div className="flex justify-between items-start p-4">
            <div className="text-[10px]">
              <p className="font-bold text-slate-800">École: {schoolName}</p>
              <p>Ville: {schoolCity}</p>
              <p>Boîte Postale: {schoolPoBox}</p>
            </div>
            
            <div className="text-[10px] text-right">
              <p className="font-bold text-slate-800">Classe: {classInfo.name}</p>
              <p>Effectif: {stats.total}</p>
              <p>Ont réussi: {stats.passed}</p>
              <p>Ont échoué: {stats.failed}</p>
              <p>Non classé: {stats.unranked}</p>
            </div>
          </div>
        </div>

        <h1 className="text-center text-[15px] font-bold mb-2 uppercase text-slate-800">
          Palmarès - {classInfo.name} - {selectedPeriod}
        </h1>

        <table className="w-full border-collapse border-2 border-black text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-[8px]">
              <th className="border border-black px-1 py-0 w-8">N°</th>
              <th className="border border-black px-1.5 py-0 text-left">Nom et Postnom</th>
              <th className="border border-black px-1.5 py-0 w-14">%</th>
              <th className="border border-black px-1.5 py-0 w-20">Application</th>
              <th className="border border-black px-1.5 py-0 w-20">Conduite</th>
              <th className="border border-black px-1.5 py-0">Observation</th>
            </tr>
          </thead>
          <tbody>
            {rankedStudents.map((rankedStudent) => (
              <tr key={rankedStudent.student.id} className={rankedStudent.isUnranked ? 'bg-slate-50' : ''}>
                <td className="border border-black px-1 py-0.5 text-center font-medium">
                  {rankedStudent.isUnranked ? '-' : rankedStudent.rank}
                </td>
                <td className="border border-black px-2 py-0.5 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {rankedStudent.student.last_name} {rankedStudent.student.post_name} {rankedStudent.student.first_name}
                </td>
                <td className="border border-black px-2 py-0.5 text-center font-bold">
                  {rankedStudent.isUnranked ? '-' : `${rankedStudent.percentage.toFixed(1)}%`}
                </td>
                <td className="border border-black px-2 py-0.5 text-center">
                  {rankedStudent.application}
                </td>
                <td className="border border-black px-1 py-0.5 text-center">
                  {formatConduite(rankedStudent.student)}
                </td>
                <td className="border border-black px-1.5 py-0.5">
                  <StudentObservation rankedStudent={rankedStudent} selectedPeriod={selectedPeriod} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-between text-sm break-inside-avoid">
          <div>
            <p className="font-bold">Fait à {schoolCity}</p>
            <p>Le ____/____/______</p>
          </div>
          <div className="text-center">
            <p className="font-bold mb-16">Le Chef d'Établissement</p>
            <p className="border-t border-black pt-1">Nom et Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
}