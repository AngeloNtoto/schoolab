import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

interface BulletinData {
  student: {
    id: number;
    first_name: string;
    last_name: string;
    post_name: string;
    gender: string;
    birth_date: string;
    birthplace: string;
  };
  class: {
    name: string;
    level: string;
    option: string;
  };
  school: {
    name: string;
    city: string;
  };
  year: {
    name: string;
  };
  grades: {
    subject_name: string;
    subject_code: string;
    max_score: number;
    p1: number | null;
    p2: number | null;
    exam1: number | null;
    p3: number | null;
    p4: number | null;
    exam2: number | null;
  }[];
}

export default function Bulletin() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<BulletinData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBulletinData();
  }, [id]);

  const loadBulletinData = async () => {
    try {
      // Load student info
      const [student] = await window.api.db.query(
        'SELECT * FROM students WHERE id = ?',
        [Number(id)]
      );

      if (!student) {
        setLoading(false);
        return;
      }

      // Load class info
      const [classInfo] = await window.api.db.query(
        'SELECT * FROM classes WHERE id = ?',
        [student.class_id]
      );

      // Load school info
      const [schoolData] = await window.api.db.query(
        "SELECT value FROM settings WHERE key = 'school_name'"
      );
      const [cityData] = await window.api.db.query(
        "SELECT value FROM settings WHERE key = 'school_city'"
      );

      // Load academic year
      const [year] = await window.api.db.query(
        'SELECT * FROM academic_years WHERE is_active = 1'
      );

      // Load grades with subjects
      const grades = await window.api.db.query(`
        SELECT 
          s.name as subject_name,
          s.code as subject_code,
          s.max_score,
          MAX(CASE WHEN g.period = 'P1' THEN g.value END) as p1,
          MAX(CASE WHEN g.period = 'P2' THEN g.value END) as p2,
          MAX(CASE WHEN g.period = 'EXAM1' THEN g.value END) as exam1,
          MAX(CASE WHEN g.period = 'P3' THEN g.value END) as p3,
          MAX(CASE WHEN g.period = 'P4' THEN g.value END) as p4,
          MAX(CASE WHEN g.period = 'EXAM2' THEN g.value END) as exam2
        FROM subjects s
        LEFT JOIN grades g ON s.id = g.subject_id AND g.student_id = ?
        WHERE s.class_id = ?
        GROUP BY s.id
        ORDER BY s.name
      `, [Number(id), student.class_id]);

      setData({
        student,
        class: classInfo,
        school: {
          name: schoolData?.value || '',
          city: cityData?.value || '',
        },
        year,
        grades,
      });
    } catch (error) {
      console.error('Failed to load bulletin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (p1: number | null, p2: number | null, exam: number | null) => {
    if (p1 === null && p2 === null && exam === null) return null;
    return (p1 || 0) + (p2 || 0) + (exam || 0);
  };

  const calculateGrandTotal = () => {
    if (!data) return { sem1: 0, sem2: 0, total: 0, max: 0 };
    
    let sem1 = 0, sem2 = 0, max = 0;
    
    data.grades.forEach(g => {
      const s1 = calculateTotal(g.p1, g.p2, g.exam1);
      const s2 = calculateTotal(g.p3, g.p4, g.exam2);
      if (s1) sem1 += s1;
      if (s2) sem2 += s2;
      max += g.max_score * 2; // x2 for both semesters
    });
    
    return { sem1, sem2, total: sem1 + sem2, max };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return <div className="p-8">Données non disponibles</div>;
  }

  const totals = calculateGrandTotal();
  const percentage = totals.max > 0 ? ((totals.total / totals.max) * 100).toFixed(2) : '0';

  return (
    <div className="p-8 bg-white">
      {/* A4 Page Container */}
      <div className="w-[210mm] mx-auto bg-white shadow-lg border-4 border-black p-2">
        {/* Header */}
        <div className="border-2 border-black">
          {/* Top Section with Flag and Title */}
          <div className="flex items-start border-b-2 border-black">
            <div className="w-16 h-20 border-r-2 border-black flex items-center justify-center bg-blue-500">
              {/* DRC Flag colors */}
              <div className="w-full h-full relative bg-blue-600">
                <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-t-yellow-400 border-l-[16px] border-l-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-1/3 bg-red-600"></div>
              </div>
            </div>
            
            <div className="flex-1 text-center py-1">
              <div className="font-bold text-sm">REPUBLIQUE DEMOCRATIQUE DU CONGO</div>
              <div className="font-bold text-sm">MINISTERE DE L'EDUCATION NATIONALE</div>
              <div className="font-bold text-sm">ET NOUVELLE CITOYENNETE</div>
            </div>
            
            <div className="w-16 h-20 border-l-2 border-black flex items-center justify-center">
              {/* Logo placeholder */}
              <div className="w-14 h-14 rounded-full border-2 border-black"></div>
            </div>
          </div>

          {/* ID Number */}
          <div className="flex border-b-2 border-black">
            <div className="font-bold text-xs px-2 py-1 border-r-2 border-black">N° ID.</div>
            <div className="flex-1 flex">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="flex-1 border-r border-black h-6"></div>
              ))}
            </div>
          </div>

          {/* School Info Section */}
          <div className="border-b-2 border-black">
            <div className="px-2 py-1 text-xs font-bold">PROVINCE EDUCATIONNELLE :</div>
          </div>

          <div className="flex text-xs border-b-2 border-black">
            <div className="flex-1 border-r-2 border-black">
              <div className="px-2 py-1">
                <div>VILLE <span className="mx-20">:</span>.....................................................</div>
                <div className="mt-1">COMMUNE / TER. (1) :.........................................</div>
                <div className="mt-1">ECOLE :...................................................................</div>
                <div className="mt-1 flex items-center">
                  CODE : 
                  <div className="flex ml-2">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="w-4 h-4 border border-black mx-0.5"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 px-2 py-1">
              <div>ELEVE :................................................................. SEXE :....</div>
              <div className="mt-1">NE(E) A :......................................................... LE ..../..../......</div>
              <div className="mt-1">CLASSE :....................................................................................</div>
              <div className="mt-1 flex items-center">
                N° PERM. : 
                <div className="flex ml-2">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="w-4 h-4 border border-black mx-0.5"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center font-bold text-xs py-1 border-b-2 border-black">
            BULLETIN DE LA {data.class.level} ANNEE HUMANITES / {data.class.option.toUpperCase()} ANNEE SCOLAIRE {data.year.name}
          </div>

          {/* Grades Table */}
          <table className="w-full text-[8px]">
            <thead>
              <tr className="border-b-2 border-black">
                <th rowSpan={2} className="border-r-2 border-black px-1 py-1 text-left font-bold w-32">
                  <div>BRANCHES</div>
                </th>
                <th colSpan={4} className="border-r-2 border-black px-1 font-bold">
                  <div>PREMIER SEMESTRE</div>
                  <div className="flex border-t border-black">
                    <div className="flex-1 text-center border-r border-black">TR. JOURNAL</div>
                    <div className="w-12 text-center border-r border-black">EXAM.</div>
                    <div className="w-12 text-center">TOT.</div>
                  </div>
                </th>
                <th colSpan={4} className="border-r-2 border-black px-1 font-bold">
                  <div>SECOND SEMESTRE</div>
                  <div className="flex border-t border-black">
                    <div className="flex-1 text-center border-r border-black">TR. JOURNAL</div>
                    <div className="w-12 text-center border-r border-black">EXAM.</div>
                    <div className="w-12 text-center">TOT.</div>
                  </div>
                </th>
                <th rowSpan={2} className="border-r-2 border-black px-1 font-bold w-12">T.G.</th>
                <th colSpan={2} className="px-1 font-bold">
                  <div>EXAMEN D'ETAT</div>
                  <div className="flex border-t border-black">
                    <div className="flex-1 text-center border-r border-black">Points<br/>Obtenus</div>
                    <div className="flex-1 text-center">MAX</div>
                  </div>
                </th>
              </tr>
              <tr className="border-b-2 border-black text-center">
                <th className="border-r border-black w-10">1re P.</th>
                <th className="border-r border-black w-10">2e P.</th>
                <th className="border-r border-black w-12"></th>
                <th className="border-r-2 border-black w-12"></th>
                <th className="border-r border-black w-10">3e P.</th>
                <th className="border-r border-black w-10">4e P.</th>
                <th className="border-r border-black w-12"></th>
                <th className="border-r-2 border-black w-12"></th>
                <th className="border-r border-black"></th>
                <th className=""></th>
              </tr>
            </thead>
            <tbody>
              {/* MAXIMA row */}
              <tr className="border-b border-black font-bold bg-gray-100">
                <td className="border-r-2 border-black px-1">MAXIMA</td>
                <td className="border-r border-black text-center">10</td>
                <td className="border-r border-black text-center">10</td>
                <td className="border-r border-black text-center">20</td>
                <td className="border-r-2 border-black text-center">40</td>
                <td className="border-r border-black text-center">10</td>
                <td className="border-r border-black text-center">10</td>
                <td className="border-r border-black text-center">20</td>
                <td className="border-r-2 border-black text-center">40</td>
                <td className="border-r-2 border-black text-center">80</td>
                <td className="border-r border-black text-center">%</td>
                <td className="text-center"></td>
              </tr>

              {/* Subject rows */}
              {data.grades.map((grade, idx) => {
                const sem1 = calculateTotal(grade.p1, grade.p2, grade.exam1);
                const sem2 = calculateTotal(grade.p3, grade.p4, grade.exam2);
                const tg = sem1 !== null && sem2 !== null ? sem1 + sem2 : null;
                
                return (
                  <tr key={idx} className="border-b border-black">
                    <td className="border-r-2 border-black px-1">{grade.subject_name}</td>
                    <td className="border-r border-black text-center">{grade.p1 ?? ''}</td>
                    <td className="border-r border-black text-center">{grade.p2 ?? ''}</td>
                    <td className="border-r border-black text-center">{grade.exam1 ?? ''}</td>
                    <td className="border-r-2 border-black text-center font-bold">{sem1 ?? ''}</td>
                    <td className="border-r border-black text-center">{grade.p3 ?? ''}</td>
                    <td className="border-r border-black text-center">{grade.p4 ?? ''}</td>
                    <td className="border-r border-black text-center">{grade.exam2 ?? ''}</td>
                    <td className="border-r-2 border-black text-center font-bold">{sem2 ?? ''}</td>
                    <td className="border-r-2 border-black text-center font-bold">{tg ?? ''}</td>
                    <td className="border-r border-black text-center"></td>
                    <td className="text-center"></td>
                  </tr>
                );
              })}

              {/* TOTAUX row */}
              <tr className="border-b-2 border-black font-bold bg-gray-200">
                <td className="border-r-2 border-black px-1">TOTAUX</td>
                <td colSpan={3} className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black text-center">{totals.sem1}</td>
                <td colSpan={3} className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black text-center">{totals.sem2}</td>
                <td className="border-r-2 border-black text-center">{totals.total}</td>
                <td colSpan={2} className=""></td>
              </tr>

              <tr className="border-b border-black">
                <td className="border-r-2 border-black px-1">POURCENTAGE</td>
                <td colSpan={8} className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black text-center font-bold">{percentage} %</td>
                <td colSpan={2}></td>
              </tr>

              <tr className="border-b border-black">
                <td className="border-r-2 border-black px-1">PLACE / NBRE D'ELEVES</td>
                <td colSpan={8} className="border-r-2 border-black"></td>
                <td className="border-r-2 border-black text-center">/</td>
                <td colSpan={2} className="text-right px-1">
                  <div>PASSE: (1)</div>
                  <div>DOUBLE: (1)</div>
                  <div>Lf: ......./20</div>
                </td>
              </tr>

              <tr className="border-b border-black">
                <td className="border-r-2 border-black px-1">APPLICATION</td>
                <td colSpan={10} className="text-center" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, black 0, black 1px, transparent 1px, transparent 3px)',
                  height: '15px'
                }}></td>
                <td className="text-xs px-1">
                  <div>Le Chef d'Établissement</div>
                  <div className="mt-1">Sceau de l'École</div>
                </td>
              </tr>

              <tr className="border-b-2 border-black">
                <td className="border-r-2 border-black px-1">CONDUITE</td>
                <td colSpan={10} className="text-center" style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, black 0, black 1px, transparent 1px, transparent 3px)',
                  height: '15px'
                }}></td>
                <td></td>
              </tr>

              <tr>
                <td className="border-r-2 border-black px-1 text-xs">Signature du responsable</td>
                <td colSpan={10}></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          {/* Footer */}
          <div className="border-t-2 border-black text-[7px] px-2 py-1">
            <div className="mb-1">
              L'élève qui passe dans la classe supérieure (1) ...................................................................
              Est autorisé à fréquenter un établissement scolaire agréé dans le réseau (sous-réseau) de ..............................................................
            </div>
            <div className="mb-1">
              L'élève doit présenter ce bulletin à l'inscription dans une nouvelle école Fait à .....................................le........./.........../20........
            </div>
            <div className="flex justify-between items-end mt-2">
              <div className="text-center">
                <div className="font-bold">Signature de l'élève</div>
              </div>
              <div className="text-center">
                <div className="font-bold">Sceau de l'Ecole</div>
              </div>
              <div className="text-center">
                <div className="font-bold">Chef d'Établissement,</div>
                <div className="mt-4">Noms et Signature</div>
              </div>
            </div>
            <div className="text-right mt-1">IGP / P.S./113</div>
            <div className="mt-2 text-center italic">
              (1) Biffer la mention inutile.<br/>
              Note importante : Le bulletin est sans valeur s'il est maculé ou surchargé
              <br/>
              <span className="font-bold">Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div className="text-center mt-4 no-print">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
        >
          Imprimer le bulletin
        </button>
      </div>

      <style>{`
        @media print {
          .no-print {
            display: none;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
