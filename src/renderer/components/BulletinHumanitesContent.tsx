/**
 * BulletinHumanitesContent.tsx
 * 
 * Composant de présentation pure pour le bulletin des humanités.
 */

import React from 'react';
import { Student } from '../services/studentService';
import { ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';
import { StudentRanks } from '../services/bulletinService';

export interface BulletinHumanitesContentProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  schoolName: string;
  schoolCity: string;
  studentRanks: StudentRanks;
  totalStudents: number;
}

export default function BulletinHumanitesContent({
  student,
  classInfo,
  subjects,
  grades,
  schoolName,
  schoolCity,
  studentRanks,
  totalStudents
}: BulletinHumanitesContentProps) {

  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================

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

  return (
    <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-[297mm] relative text-black text-[11px] font-serif leading-tight print:shadow-none print:p-0 print:mx-0 print:w-full print:max-w-none page-break-after-always">
      
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
          {/* Group subjects by their maxima and display each group with its MAXIMA row */}
          {(() => {
            // Group subjects by their maxima pattern
            const groupedSubjects: { [key: string]: Subject[] } = {};
            
            subjects.forEach(subject => {
              const key = `${subject.max_p1}-${subject.max_p2}-${subject.max_exam1}-${subject.max_p3}-${subject.max_p4}-${subject.max_exam2}`;
              if (!groupedSubjects[key]) {
                groupedSubjects[key] = [];
              }
              groupedSubjects[key].push(subject);
            });
            
            // Sort groups by total maxima (ascending)
            const sortedGroups = Object.entries(groupedSubjects).sort(([keyA], [keyB]) => {
              const [p1A, p2A, ex1A, p3A, p4A, ex2A] = keyA.split('-').map(Number);
              const [p1B, p2B, ex1B, p3B, p4B, ex2B] = keyB.split('-').map(Number);
              const totalA = p1A + p2A + ex1A + p3A + p4A + ex2A;
              const totalB = p1B + p2B + ex1B + p3B + p4B + ex2B;
              return totalA - totalB;
            });
            
            return sortedGroups.map(([key, groupSubjects]) => {
              const firstSubject = groupSubjects[0];
              const sem1Total = firstSubject.max_p1 + firstSubject.max_p2 + firstSubject.max_exam1;
              const sem2Total = firstSubject.max_p3 + firstSubject.max_p4 + firstSubject.max_exam2;
              const totalMax = sem1Total + sem2Total;
              
              return (
                <React.Fragment key={key}>
                  {/* MAXIMA row for this group */}
                  <tr className="font-bold bg-slate-100">
                    <td className="border border-black text-left px-2">MAXIMA</td>
                    <td className="border border-black">{firstSubject.max_p1}</td>
                    <td className="border border-black">{firstSubject.max_p2}</td>
                    <td className="border border-black">{firstSubject.max_exam1}</td>
                    <td className="border border-black">{sem1Total}</td>
                    <td className="border border-black">{firstSubject.max_p3}</td>
                    <td className="border border-black">{firstSubject.max_p4}</td>
                    <td className="border border-black">{firstSubject.max_exam2}</td>
                    <td className="border border-black">{sem2Total}</td>
                    <td className="border border-black">{totalMax}</td>
                    <td className="border border-black bg-black"></td>
                    <td className="border border-black bg-black"></td>
                  </tr>
                  
                  {/* Subjects in this group */}
                  {groupSubjects.map((subject) => {
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
                </React.Fragment>
              );
            });
          })()}


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


          {/* MAXIMA GENERAUX - Sum of all maxima */}
          {(() => {
            let maxP1 = 0, maxP2 = 0, maxEx1 = 0, maxTot1 = 0;
            let maxP3 = 0, maxP4 = 0, maxEx2 = 0, maxTot2 = 0;
            let maxTG = 0;
            
            subjects.forEach(subject => {
              maxP1 += subject.max_p1;
              maxP2 += subject.max_p2;
              maxEx1 += subject.max_exam1;
              maxTot1 += subject.max_p1 + subject.max_p2 + subject.max_exam1;
              
              maxP3 += subject.max_p3;
              maxP4 += subject.max_p4;
              maxEx2 += subject.max_exam2;
              maxTot2 += subject.max_p3 + subject.max_p4 + subject.max_exam2;
              
              maxTG += subject.max_p1 + subject.max_p2 + subject.max_exam1 + subject.max_p3 + subject.max_p4 + subject.max_exam2;
            });
            
            return (
              <tr className="font-bold bg-slate-200 border-t-2 border-black">
                <td className="border border-black text-left px-2">MAXIMA GENERAUX</td>
                <td className="border border-black">{maxP1}</td>
                <td className="border border-black">{maxP2}</td>
                <td className="border border-black">{maxEx1}</td>
                <td className="border border-black">{maxTot1}</td>
                <td className="border border-black">{maxP3}</td>
                <td className="border border-black">{maxP4}</td>
                <td className="border border-black">{maxEx2}</td>
                <td className="border border-black">{maxTot2}</td>
                <td className="border border-black">{maxTG}</td>
                <td className="border border-black bg-black"></td>
                <td className="border border-black bg-black"></td>
              </tr>
            );
          })()}

          {/* Totals Row */}
          {(() => {
            // Calculate totals for each column
            let totalP1 = 0, totalP2 = 0, totalEx1 = 0, totalTot1 = 0;
            let totalP3 = 0, totalP4 = 0, totalEx2 = 0, totalTot2 = 0;
            let totalTG = 0;
            
            // Calculate maxima totals
            let maxP1 = 0, maxP2 = 0, maxEx1 = 0, maxTot1 = 0;
            let maxP3 = 0, maxP4 = 0, maxEx2 = 0, maxTot2 = 0;
            let maxTG = 0;
            
            subjects.forEach(subject => {
              const p1 = getGrade(subject.id, 'P1');
              const p2 = getGrade(subject.id, 'P2');
              const ex1 = getGrade(subject.id, 'EXAM1');
              const tot1 = calculateTotal(subject.id, ['P1', 'P2', 'EXAM1']);
              
              const p3 = getGrade(subject.id, 'P3');
              const p4 = getGrade(subject.id, 'P4');
              const ex2 = getGrade(subject.id, 'EXAM2');
              const tot2 = calculateTotal(subject.id, ['P3', 'P4', 'EXAM2']);
              
              if (p1 !== null) totalP1 += p1;
              if (p2 !== null) totalP2 += p2;
              if (ex1 !== null) totalEx1 += ex1;
              if (tot1 !== null) totalTot1 += tot1;
              
              if (p3 !== null) totalP3 += p3;
              if (p4 !== null) totalP4 += p4;
              if (ex2 !== null) totalEx2 += ex2;
              if (tot2 !== null) totalTot2 += tot2;
              
              totalTG += (tot1 || 0) + (tot2 || 0);
              
              // Sum maxima
              maxP1 += subject.max_p1;
              maxP2 += subject.max_p2;
              maxEx1 += subject.max_exam1;
              maxTot1 += subject.max_p1 + subject.max_p2 + subject.max_exam1;
              
              maxP3 += subject.max_p3;
              maxP4 += subject.max_p4;
              maxEx2 += subject.max_exam2;
              maxTot2 += subject.max_p3 + subject.max_p4 + subject.max_exam2;
              
              maxTG += subject.max_p1 + subject.max_p2 + subject.max_exam1 + subject.max_p3 + subject.max_p4 + subject.max_exam2;
            });
            
            // Calculate percentages
            const pctP1 = maxP1 > 0 ? ((totalP1 / maxP1) * 100).toFixed(1) : '0';
            const pctP2 = maxP2 > 0 ? ((totalP2 / maxP2) * 100).toFixed(1) : '0';
            const pctEx1 = maxEx1 > 0 ? ((totalEx1 / maxEx1) * 100).toFixed(1) : '0';
            const pctTot1 = maxTot1 > 0 ? ((totalTot1 / maxTot1) * 100).toFixed(1) : '0';
            
            const pctP3 = maxP3 > 0 ? ((totalP3 / maxP3) * 100).toFixed(1) : '0';
            const pctP4 = maxP4 > 0 ? ((totalP4 / maxP4) * 100).toFixed(1) : '0';
            const pctEx2 = maxEx2 > 0 ? ((totalEx2 / maxEx2) * 100).toFixed(1) : '0';
            const pctTot2 = maxTot2 > 0 ? ((totalTot2 / maxTot2) * 100).toFixed(1) : '0';
            
            const pctTG = maxTG > 0 ? ((totalTG / maxTG) * 100).toFixed(1) : '0';
            
            return (
              <>
                <tr className="font-bold border-t-2 border-black">
                  <td className="border border-black text-left px-2">TOTAUX</td>
                  <td className="border border-black">{totalP1 || ''}</td>
                  <td className="border border-black">{totalP2 || ''}</td>
                  <td className="border border-black">{totalEx1 || ''}</td>
                  <td className="border border-black">{totalTot1 || ''}</td>
                  <td className="border border-black">{totalP3 || ''}</td>
                  <td className="border border-black">{totalP4 || ''}</td>
                  <td className="border border-black">{totalEx2 || ''}</td>
                  <td className="border border-black">{totalTot2 || ''}</td>
                  <td className="border border-black bg-slate-100">{totalTG || ''}</td>
                  <td className="border border-black bg-black" rowSpan={6}></td>
                  <td className="border border-black text-[8px] text-left align-top p-1" rowSpan={2}>
                    - PASSE (1)<br/>- DOUBLE (1)<br/>LE ... / ... / 20
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-black text-left px-2">POURCENTAGE</td>
                  <td className="border border-black text-[9px]">{pctP1}%</td>
                  <td className="border border-black text-[9px]">{pctP2}%</td>
                  <td className="border border-black text-[9px]">{pctEx1}%</td>
                  <td className="border border-black text-[9px]">{pctTot1}%</td>
                  <td className="border border-black text-[9px]">{pctP3}%</td>
                  <td className="border border-black text-[9px]">{pctP4}%</td>
                  <td className="border border-black text-[9px]">{pctEx2}%</td>
                  <td className="border border-black text-[9px]">{pctTot2}%</td>
                  <td className="border border-black bg-slate-100 text-[9px]">{pctTG}%</td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold">PLACE / NBRE D'ELEVES</td>
                  <td className="border border-black text-sm">{studentRanks.p1}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks.p2}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks.ex1}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks.tot1}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks.p3}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks.p4}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks.ex2}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks.tot2}/{totalStudents}</td>
                  <td className="border border-black font-bold text-sm bg-slate-100">{studentRanks.tg}/{totalStudents}</td>
                  <td className="border border-black text-[8px] text-left align-top p-1" rowSpan={4}>
                    Le Chef d'Etablissement<br/>Sceau de l'Ecole
                  </td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold">APPLICATION</td>
                  <td className="border border-black bg-slate-200"></td>
                  <td className="border border-black bg-slate-200"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-slate-200"></td>
                  <td className="border border-black bg-slate-200"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold">CONDUITE</td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold">Signature du responsable</td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                </tr>
              </>
            );
          })()}
        </tbody>
      </table>

      {/* Footer */}
      <div className="border-2 border-black border-t-0 p-2 text-[10px]">
        <div className="mb-4">
          - L'élève ne pourra passer dans la classe supérieure s'il n'a subi avec succès un examen de repêchage en ...............................................................................................................................................................................................................................................................(1)
        </div>
        <div className="mb-4">
          - L'élève passe dans la classe supérieure (1)<br/>
          - L'élève double la classe (1)
        </div>
        
        <div className="flex justify-between items-end mt-8 px-8">
          <div className="text-center">
            <p className="font-bold mb-16">Signature de l'élève</p>
          </div>
          
          <div className="text-center">
            <p className="font-bold mb-16">Sceau de l'Ecole</p>
          </div>

          <div className="text-center">
            <p className="mb-4">Fait à .........................................., le......../......../20........</p>
            <p className="font-bold mb-16">Chef d'Etablissement,</p>
            <p className="font-bold">Noms et Signature</p>
          </div>
        </div>

        <div className="mt-4 text-[9px]">
          <p>(1) Biffer la mention inutile.</p>
          <p>Note importante : Le bulletin est sans valeur s'il est raturé ou surchargé.</p>
          <p className="text-right font-bold">IGE / P.S./113</p>
          <p className="text-center font-bold italic border-t border-black mt-1 pt-1">
            Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi.
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          .page-break-after-always {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
