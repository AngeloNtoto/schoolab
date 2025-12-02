import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  post_name: string;
  gender: string;
  birth_date: string;
  birthplace: string;
  class_id: number;
}

interface ClassInfo {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

interface Subject {
  id: number;
  name: string;
  max_score: number;
}

interface Grade {
  subject_id: number;
  period: string;
  value: number;
}

export default function Bulletin() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      const [studentData] = await window.api.db.query<Student>(
        'SELECT * FROM students WHERE id = ?',
        [Number(studentId)]
      );

      if (studentData) {
        setStudent(studentData);
        
        const [cls] = await window.api.db.query<ClassInfo>(
          'SELECT * FROM classes WHERE id = ?',
          [studentData.class_id]
        );
        setClassInfo(cls);

        const subjs = await window.api.db.query<Subject>(
          'SELECT * FROM subjects WHERE class_id = ? ORDER BY name',
          [studentData.class_id]
        );
        setSubjects(subjs);

        const grds = await window.api.db.query<Grade>(
          'SELECT * FROM grades WHERE student_id = ?',
          [Number(studentId)]
        );
        setGrades(grds);

        const [sName] = await window.api.db.query<{ value: string }>(
          "SELECT value FROM settings WHERE key = 'school_name'"
        );
        setSchoolName(sName?.value || '');

        const [sCity] = await window.api.db.query<{ value: string }>(
          "SELECT value FROM settings WHERE key = 'school_city'"
        );
        setSchoolCity(sCity?.value || '');
      }
    } catch (error) {
      console.error('Failed to load bulletin data:', error);
    }
  };

  const getGrade = (subjectId: number, period: string) => {
    const g = grades.find(g => g.subject_id === subjectId && g.period === period);
    return g ? g.value : null;
  };

  const calculateTotal = (subjectId: number, periods: string[]) => {
    let total = 0;
    let count = 0;
    periods.forEach(p => {
      const val = getGrade(subjectId, p);
      if (val !== null) {
        total += val;
        count++;
      }
    });
    return count > 0 ? total : null;
  };

  if (!student || !classInfo) return <div>Chargement...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Print Controls */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={20} />
          Retour
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer size={20} />
          Imprimer
        </button>
      </div>

      {/* Bulletin Page - A4 */}
      <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-8 min-h-[297mm] relative text-black text-[11px] font-serif leading-tight">
        
        {/* Header */}
        <div className="border-2 border-black mb-1">
          <div className="flex border-b border-black">
            {/* Flag */}
            <div className="w-24 border-r border-black p-2 flex items-center justify-center">
              <div className="w-full aspect-[4/3] bg-[#007a3d] relative overflow-hidden border border-black">
                <div className="absolute inset-0 bg-sky-400" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }}></div>
                <div className="absolute top-1 left-1 text-yellow-400 text-xl">★</div>
                <div className="absolute bottom-0 right-0 w-full h-2 bg-red-600 transform -rotate-45 origin-bottom-right translate-y-1"></div>
              </div>
            </div>
            
            {/* Title */}
            <div className="flex-1 text-center py-2">
              <h1 className="font-bold text-lg uppercase">Republique Democratique du Congo</h1>
              <h2 className="font-bold text-lg uppercase">Ministere de l'Education Nationale</h2>
              <h3 className="font-bold text-lg uppercase">Et Nouvelle Citoyennete</h3>
            </div>

            {/* Logo */}
            <div className="w-24 border-l border-black p-2 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-black flex items-center justify-center">
                <span className="text-[8px] text-center">LOGO<br/>ECOLE</span>
              </div>
            </div>
          </div>

          {/* ID Row */}
          <div className="flex border-b border-black">
            <div className="w-20 font-bold p-1 border-r border-black bg-slate-100">N° ID.</div>
            <div className="flex-1 flex">
              {Array(20).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
              ))}
            </div>
          </div>

          {/* Province */}
          <div className="p-1 font-bold border-b border-black bg-slate-100">
            PROVINCE EDUCATIONNELLE :
          </div>
        </div>

        {/* Info Grid */}
        <div className="border-2 border-black mb-1 p-2 grid grid-cols-2 gap-x-8 gap-y-1">
          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">VILLE :</span>
            <span className="border-b border-dotted border-black flex-1 text-center font-bold">{schoolCity}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">ELEVE :</span>
            <span className="border-b border-dotted border-black flex-1 text-center font-bold uppercase">
              {student.last_name} {student.post_name} {student.first_name}
            </span>
            <span className="font-bold">SEXE : {student.gender}</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">COMMUNE :</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">NE(E) A :</span>
            <span className="border-b border-dotted border-black flex-1 text-center">
              {student.birthplace}
            </span>
            <span className="font-bold">LE</span>
            <span className="border-b border-dotted border-black w-24 text-center">
              {new Date(student.birth_date).toLocaleDateString('fr-FR')}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">ECOLE :</span>
            <span className="border-b border-dotted border-black flex-1 text-center font-bold">{schoolName}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">CLASSE :</span>
            <span className="border-b border-dotted border-black flex-1 text-center font-bold">
              {classInfo.level} {classInfo.option} {classInfo.section}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">CODE :</span>
            <div className="flex border border-black h-6 w-48">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
              ))}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold min-w-[60px]">N° PERM :</span>
            <div className="flex border border-black h-6 w-64">
              {Array(14).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Bulletin Title */}
        <div className="border-2 border-black border-b-0 p-1 text-center font-bold bg-slate-100 uppercase text-sm">
          BULLETIN DE LA {classInfo.level} ANNEE HUMANITES / {classInfo.option} &nbsp;&nbsp;&nbsp; ANNEE SCOLAIRE 2024 - 2025
        </div>

        {/* Grades Table */}
        <table className="w-full border-2 border-black border-collapse text-center text-[10px]">
          <thead>
            <tr>
              <th rowSpan={3} className="border border-black w-[25%] p-1">BRANCHES</th>
              <th colSpan={4} className="border border-black bg-slate-50">PREMIER SEMESTRE</th>
              <th colSpan={4} className="border border-black bg-slate-50">SECOND SEMESTRE</th>
              <th rowSpan={3} className="border border-black w-[5%]">T.G.</th>
              <th colSpan={2} className="border border-black w-[15%]">EXAMEN DE<br/>REPECHAGE</th>
            </tr>
            <tr>
              <th colSpan={2} className="border border-black">TR. JOURNAL</th>
              <th rowSpan={2} className="border border-black w-[6%]">EXAM.</th>
              <th rowSpan={2} className="border border-black w-[6%]">TOT.</th>
              <th colSpan={2} className="border border-black">TR. JOURNAL</th>
              <th rowSpan={2} className="border border-black w-[6%]">EXAM.</th>
              <th rowSpan={2} className="border border-black w-[6%]">TOT.</th>
              <th rowSpan={2} className="border border-black w-[5%]">%</th>
              <th rowSpan={2} className="border border-black">Sign. Prof.</th>
            </tr>
            <tr>
              <th className="border border-black w-[6%]">1ère P.</th>
              <th className="border border-black w-[6%]">2e P.</th>
              <th className="border border-black w-[6%]">3e P.</th>
              <th className="border border-black w-[6%]">4e P.</th>
            </tr>
          </thead>
          <tbody>
            {/* Maxima Row */}
            <tr className="font-bold bg-slate-100">
              <td className="border border-black text-left px-2">MAXIMA</td>
              <td className="border border-black">10</td>
              <td className="border border-black">10</td>
              <td className="border border-black">20</td>
              <td className="border border-black">40</td>
              <td className="border border-black">10</td>
              <td className="border border-black">10</td>
              <td className="border border-black">20</td>
              <td className="border border-black">40</td>
              <td className="border border-black">80</td>
              <td className="border border-black bg-black"></td>
              <td className="border border-black bg-black"></td>
            </tr>

            {/* Subjects */}
            {subjects.map((subject) => {
              const p1 = getGrade(subject.id, 'P1');
              const p2 = getGrade(subject.id, 'P2');
              const ex1 = getGrade(subject.id, 'EXAM1');
              const tot1 = calculateTotal(subject.id, ['P1', 'P2', 'EXAM1']);

              const p3 = getGrade(subject.id, 'P3');
              const p4 = getGrade(subject.id, 'P4');
              const ex2 = getGrade(subject.id, 'EXAM2');
              const tot2 = calculateTotal(subject.id, ['P3', 'P4', 'EXAM2']);

              const tg = (tot1 || 0) + (tot2 || 0);

              return (
                <tr key={subject.id}>
                  <td className="border border-black text-left px-2 py-0.5">{subject.name}</td>
                  <td className="border border-black">{p1 ?? ''}</td>
                  <td className="border border-black">{p2 ?? ''}</td>
                  <td className="border border-black">{ex1 ?? ''}</td>
                  <td className="border border-black font-bold">{tot1 ?? ''}</td>
                  <td className="border border-black">{p3 ?? ''}</td>
                  <td className="border border-black">{p4 ?? ''}</td>
                  <td className="border border-black">{ex2 ?? ''}</td>
                  <td className="border border-black font-bold">{tot2 ?? ''}</td>
                  <td className="border border-black font-bold bg-slate-50">{tg || ''}</td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                </tr>
              );
            })}

            {/* Empty rows to fill space if needed */}
            {Array(Math.max(0, 20 - subjects.length)).fill(0).map((_, i) => (
              <tr key={`empty-${i}`}>
                <td className="border border-black text-left px-2 py-0.5">&nbsp;</td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
              </tr>
            ))}

            {/* Totals Row */}
            <tr className="font-bold border-t-2 border-black">
              <td className="border border-black text-left px-2">TOTAUX</td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black bg-slate-100"></td>
              <td className="border border-black bg-black" rowSpan={6}></td>
              <td className="border border-black text-[8px] text-left align-top p-1" rowSpan={2}>
                - PASSE (1)<br/>- DOUBLE (1)<br/>LE ... / ... / 20
              </td>
            </tr>
            <tr className="font-bold">
              <td className="border border-black text-left px-2">POURCENTAGE</td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black"></td>
              <td className="border border-black bg-slate-100"></td>
            </tr>
            <tr>
              <td className="border border-black text-left px-2 font-bold">PLACE / NBRE D'ELEVES</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black">/</td>
              <td className="border border-black text-[8px] text-left align-top p-1" rowSpan={4}>
                Le Chef d'Etablissement<br/>Sceau de l'Ecole
              </td>
            </tr>
            <tr>
              <td className="border border-black text-left px-2 font-bold">APPLICATION</td>
              <td className="border border-black bg-slate-200" colSpan={4}></td>
              <td className="border border-black bg-slate-200" colSpan={4}></td>
              <td className="border border-black bg-slate-200"></td>
            </tr>
            <tr>
              <td className="border border-black text-left px-2 font-bold">CONDUITE</td>
              <td className="border border-black bg-slate-200" colSpan={4}></td>
              <td className="border border-black bg-slate-200" colSpan={4}></td>
              <td className="border border-black bg-slate-200"></td>
            </tr>
            <tr>
              <td className="border border-black text-left px-2 font-bold">Signature du responsable</td>
              <td className="border border-black" colSpan={4}></td>
              <td className="border border-black" colSpan={4}></td>
              <td className="border border-black"></td>
            </tr>
          </tbody>
        </table>

        {/* Footer Notes */}
        <div className="mt-2 text-[9px] border-2 border-black p-2">
          <p>- L'élève ne pourra passer dans la classe supérieure s'il n'a subi avec succès un examen de repêchage en..................................................................................................</p>
          <p className="text-right">..................................................................................................................................................................................................................................................................(1)</p>
          <p>- L'élève passe dans la classe supérieure (1)</p>
          <p>- L'élève double la classe (1)</p>
          
          <div className="flex justify-between mt-8 mb-4 px-8">
            <div className="text-center">
              <p className="font-bold mb-16">Signature de l'élève</p>
            </div>
            <div className="text-center">
              <p className="font-bold mb-4">Sceau de l'Ecole</p>
            </div>
            <div className="text-center">
              <p className="mb-1">Fait à .........................................., le......../......../20.......</p>
              <p className="font-bold mb-16">Chef d'Etablissement,</p>
              <p className="font-bold">Noms et Signature</p>
            </div>
          </div>

          <div className="flex justify-between text-[8px] mt-4 border-t border-slate-300 pt-1">
            <p>(1) Biffer la mention inutile.</p>
            <p>IGE / P.S./113</p>
          </div>
          <p className="text-[8px] italic">Note importante : Le bulletin est sans valeur s'il est raturé ou surchargé.</p>
          <p className="text-[8px] font-bold text-center mt-1">Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi.</p>
        </div>

        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0">
          <div className="w-[500px] h-[500px] rounded-full border-[20px] border-black flex items-center justify-center">
            <span className="text-9xl font-bold transform -rotate-45">RDC</span>
          </div>
        </div>

      </div>
    </div>
  );
}
