import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
// Assurez-vous que le chemin est correct selon votre structure
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

export default function Palmares() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  
  // Ref pour cibler la zone à imprimer
  const palmaresRef = useRef<HTMLDivElement>(null);
  
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');
  
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('SEM1');
  const [rankedStudents, setRankedStudents] = useState<RankedStudent[]>([]);
  const [onlyAbandons, setOnlyAbandons] = useState(false);
  const [sortByAbandon] = useState(false);

  // CSS Spécifique injecté dans l'iframe d'impression pour forcer le format
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

  useEffect(() => {
    loadData();
  }, [classId]);

  useEffect(() => {
    if (students.length > 0 && subjects.length > 0 && grades.length > 0) {
      calculateRankings();
    }
  }, [students, subjects, grades, selectedPeriod, onlyAbandons, sortByAbandon]);

  const loadData = async () => {
    try {
      const [cls] = await window.api.db.query<ClassInfo>(
        'SELECT * FROM classes WHERE id = ?',
        [Number(classId)]
      );
      setClassInfo(cls);

      const studentData = await window.api.db.query<Student>(
        'SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name',
        [Number(classId)]
      );
      setStudents(studentData);

      const subjectData = await window.api.db.query<Subject>(
        'SELECT * FROM subjects WHERE class_id = ? ORDER BY created_at ASC, name ASC',
        [Number(classId)]
      );
      setSubjects(subjectData);

      const gradeData = await window.api.db.query<Grade>(
        'SELECT g.* FROM grades g INNER JOIN students s ON g.student_id = s.id WHERE s.class_id = ?',
        [Number(classId)]
      );
      setGrades(gradeData);

      const [sName] = await window.api.db.query<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'school_name'"
      );
      setSchoolName(sName?.value || '');

      const [sCity] = await window.api.db.query<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'school_city'"
      );
      setSchoolCity(sCity?.value || '');

      const [sPoBox] = await window.api.db.query<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'school_pobox'"
      );
      setSchoolPoBox(sPoBox?.value || '');

    } catch (error) {
      console.error('Failed to load palmares data:', error);
    }
  };

  const getGrade = (studentId: number, subjectId: number, period: string): number | null => {
    const grade = grades.find(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
    return grade ? grade.value : null;
  };

  const calculateRankings = () => {
    const rankings: RankedStudent[] = [];
    let studentsToProcess = [...students];
    if (onlyAbandons) {
      studentsToProcess = studentsToProcess.filter(s => !((s as Student).is_abandoned));
    }
    if (sortByAbandon) {
      studentsToProcess.sort((a: Student, b: Student) => (b.is_abandoned ? 1 : 0) - (a.is_abandoned ? 1 : 0));
    }

    for (const student of studentsToProcess) {
      let totalPoints = 0;
      let totalMaxPoints = 0;
      let hasAllGrades = true;
      const failedSubjects: string[] = [];

      const periodsConfig = getPeriodConfig(selectedPeriod);
      const subjectDetails: RankedStudent['subjectDetails'] = [];

      for (const subject of subjects) {
        let subjectPoints = 0;
        let subjectMaxPoints = 0;

        for (const periodData of periodsConfig) {
          const grade = getGrade(student.id, subject.id, periodData.period);
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
            failedSubjects.push(subject.name);
          }
        }
        subjectDetails.push({
          subjectName: subject.name,
          points: subjectPoints,
          maxPoints: subjectMaxPoints,
        });
      }

      const percentage = hasAllGrades && totalMaxPoints > 0 
        ? (totalPoints / totalMaxPoints) * 100 
        : 0;

      const application = hasAllGrades ? getApplication(percentage) : '-';

      rankings.push({
        student,
        percentage: hasAllGrades ? percentage : 0,
        rank: 0,
        application,
        isUnranked: !hasAllGrades,
        failedSubjects,
        subjectDetails,
      });
    }

    const ranked = rankings.filter(r => !r.isUnranked);
    const unranked = rankings.filter(r => r.isUnranked);

    ranked.sort((a, b) => b.percentage - a.percentage);

    let currentRank = 1;
    for (let i = 0; i < ranked.length; i++) {
      if (i > 0 && ranked[i].percentage < ranked[i - 1].percentage) {
        currentRank = i + 1;
      }
      ranked[i].rank = currentRank;
    }

    setRankedStudents([...ranked, ...unranked]);
  };

  const formatConduite = (stu: Student) => {
    if (!stu) return '-';
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

  if (!classInfo) return <ProfessionalLoader message="Génération du palmarès..." subMessage="Calcul des classements en cours" />;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* --- Print Controls --- */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={20} />
          Retour
        </button>
        
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as Period)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
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
          
          <label className="flex items-center gap-2 text-sm">
            <input 
              type="checkbox" 
              checked={onlyAbandons} 
              onChange={(e) => setOnlyAbandons(e.target.checked)} 
              className="w-4 h-4" 
            />
            <span>Exclure les abandons</span>
          </label>

          {/* Bouton d'impression isolé */}
          <PrintButton
            targetRef={palmaresRef}
            title={`Palmarès - ${classInfo.name} - ${selectedPeriod}`}
            extraCss={printCss}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Printer size={20} />
            Imprimer
          </PrintButton>
        </div>
      </div>

      {/* --- Palmares Page (A4 Zone) --- */}
      {/* On attache la REF ici */}
      <div 
        ref={palmaresRef}
        className="print-container max-w-[210mm] mx-auto bg-white shadow-xl p-8 min-h-[297mm]"
      >
        {/* Header */}
        <div className="border-2 border-black mb-4">
          <div className="flex justify-between items-start p-4">
            <div className="text-sm">
              <p className="font-bold">École: {schoolName}</p>
              <p>Ville: {schoolCity}</p>
              <p>Boîte Postale: {schoolPoBox}</p>
            </div>
            
            <div className="text-sm text-right">
              <p className="font-bold">Classe: {classInfo.name}</p>
              <p>Effectif: {stats.total}</p>
              <p>Ont réussi: {stats.passed}</p>
              <p>Ont échoué: {stats.failed}</p>
              <p>Non classé: {stats.unranked}</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-xl font-bold mb-4 uppercase">
          Palmarès - {classInfo.name} - {selectedPeriod}
        </h1>

        {/* Rankings Table */}
        <table className="w-full border-collapse border-2 border-black text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black px-2 py-2 w-12">N°</th>
              <th className="border border-black px-4 py-2 text-left">Nom et Postnom</th>
              <th className="border border-black px-4 py-2 w-20">%</th>
              <th className="border border-black px-4 py-2 w-32">Application</th>
              <th className="border border-black px-4 py-2 w-32">Conduite</th>
              <th className="border border-black px-4 py-2">Observation</th>
            </tr>
          </thead>
          <tbody>
            {rankedStudents.map((rankedStudent) => (
              <tr key={rankedStudent.student.id} className={rankedStudent.isUnranked ? 'bg-slate-50' : ''}>
                <td className="border border-black px-2 py-2 text-center font-medium">
                  {rankedStudent.isUnranked ? '-' : rankedStudent.rank}
                </td>
                <td className="border border-black px-4 py-2 font-medium">
                  {rankedStudent.student.last_name} {rankedStudent.student.post_name}
                </td>
                <td className="border border-black px-4 py-2 text-center font-bold">
                  {rankedStudent.isUnranked ? '-' : `${rankedStudent.percentage.toFixed(1)}%`}
                </td>
                <td className="border border-black px-4 py-2 text-center">
                  {rankedStudent.application}
                </td>
                <td className="border border-black px-4 py-2 text-center">
                  {formatConduite((rankedStudent.student as Student))}
                </td>

                <td className="border border-black px-4 py-2 text-xs">
                  { (rankedStudent.student as Student).is_abandoned ? (
                    <span className="text-red-600 font-bold">
                      Abandon
                      {(rankedStudent.student as Student).abandon_reason
                        ? ': ' + (rankedStudent.student as Student).abandon_reason
                        : ''}
                    </span>
                  ) : rankedStudent.isUnranked ? (
                    'Non classé'
                  ) : (
                    <>
                      {rankedStudent.percentage < 50 ? (
                        <span className="text-red-600 font-bold block">
                          Redouble la classe
                        </span>
                      ) : rankedStudent.failedSubjects.length > 0 ? (
                        <span className="text-amber-600 block">
                          Échec ({rankedStudent.failedSubjects.length} cours)
                        </span>
                      ) : (
                        <span className="text-green-600 block">-</span>
                      )}

                      {/* Détail échecs */}
                      {rankedStudent.failedSubjects.length > 0 && (
                        <div className="mt-1 text-[10px] text-slate-700 leading-tight">
                          {rankedStudent.subjectDetails
                            .filter(s => {
                              const percentage = (s.points / s.maxPoints) * 100;
                              return percentage < 50;
                            })
                            .map(s => (
                              <div key={s.subjectName}>
                                {s.subjectName} 
                                {selectedPeriod==="ANNUAL" && (`: ${s.points} / ${s.maxPoints}`)}
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
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