import React, { useMemo } from 'react';
import { Student } from '../services/studentService';
import { ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';
import { Domain } from '../services/domainService';
import { StudentRanks } from '../services/bulletinService';

export interface BulletinPrimaireContentProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  domains: Domain[];
  schoolName: string;
  schoolCity: string;
  studentRanks: StudentRanks;
  totalStudents: number;
}

const getApplication = (percentage: number | null): string => {
  if (percentage === null) return '';
  if (percentage >= 80) return 'E';
  if (percentage >= 60) return 'TB';
  if (percentage >= 50) return 'B';
  if (percentage >= 30) return 'Ma';
  return 'Mé';
};

const abregeConduite = (conduite: string | null) => {
  if (!conduite) return '-';
  switch(conduite.toUpperCase()){ 
    case 'EXCELLENT': return 'E';
    case 'TRES BIEN': return 'TB';
    case 'BIEN': return 'B';
    case 'MAUVAIS': return 'Ma';
    case 'MEDIOCRE': return 'Me';
    default: return conduite.charAt(0);
  }
};

export default function BulletinPrimaireContent({
  student,
  classInfo,
  subjects,
  grades,
  domains,
  schoolName,
  schoolCity,
  studentRanks,
  totalStudents
}: BulletinPrimaireContentProps) {

  // ============================================================================
  // HELPERS
  // ============================================================================

  const getGrade = (subjectId: number, period: string) => {
    const g = grades.find(g => g.subject_id === subjectId && g.period === period);
    return g ? g.value : null;
  };

  const getDomainName = (domainId: number | null) => {
    if (domainId === null) return 'Autres matières';
    const domain = domains.find(d => d.id === domainId);
    return domain?.name || 'Domaine inconnu';
  };

  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    return Number.isInteger(val) ? val.toString() : val.toFixed(1);
  };

  // Group subjects by domain
  const subjectsByDomain = useMemo(() => {
    const grouped = new Map<number | null, Subject[]>();
    
    subjects.forEach(subject => {
      const domainId = subject.domain_id ?? null;
      if (!grouped.has(domainId)) {
        grouped.set(domainId, []);
      }
      grouped.get(domainId)!.push(subject);
    });
    
    return grouped;
  }, [subjects]);

  return (
    <div className="max-w-[210mm] mx-auto bg-white p-6 min-h-[297mm] relative text-black text-[9px] font-serif leading-tight print:shadow-none print:p-0 print:mx-0 print:w-full print:max-w-none page-break-after-always" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        {/* Left: Flag */}
        <div className="w-32 flex items-center justify-center">
          <div className="w-full aspect-[4/3] border border-black shadow-sm overflow-hidden bg-[#007FFF]">
            <svg viewBox="0 0 400 300" className="w-full h-full">
              <path d="M400 0 L400 60 L60 300 L0 300 L0 240 L340 0 Z" fill="#FAD02E" />
              <path d="M400 15 L400 45 L45 300 L15 300 L0 285 L0 255 Z" fill="#CE1126" />
              <path 
                d="M50 20 L58.5 45 L85 45 L63.5 60 L71.5 85 L50 70 L28.5 85 L36.5 60 L15 45 L41.5 45 Z" 
                fill="#FAD02E" 
              />
            </svg>
          </div>
        </div>

        {/* Center: Ministry Info */}
        <div className="flex-1 text-center px-4">
          <h1 className="font-bold text-[13px] uppercase tracking-tight">Republique Democratique du Congo</h1>
          <h2 className="font-bold text-[11px] uppercase mt-0.5">Ministere de l'Enseignement Primaire, Secondaire</h2>
          <h2 className="font-bold text-[11px] uppercase mt-0.5">et Professionnel</h2>
        </div>

        {/* Right: School Logo Placeholder */}
        <div className="w-32 p-1 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full border border-black flex items-center justify-center overflow-hidden">
             <div className="bg-[#00008B] w-full h-full flex flex-col items-center justify-center p-1 text-white text-[7px] font-bold">
                <span className="text-[14px]">🐆</span>
                <span className="leading-tight text-center">RDC<br/>LOGO</span>
             </div>
          </div>
        </div>
      </div>

      {/* ID Row */}
      <div className="flex border border-black mb-1">
        <div className="w-16 font-bold p-0.5 border-r border-black flex items-center">N° ID</div>
        <div className="flex-1 flex h-5">
          {Array(25).fill(0).map((_, i) => (
            <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
          ))}
        </div>
      </div>

      {/* Province */}
      <div className="flex items-baseline mb-1">
        <span className="font-bold">PROVINCE :</span>
        <span className="border-b border-dotted border-black flex-1 ml-1"></span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-1 border-b border-black pb-1">
        <div className="space-y-1">
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">VILLE :</span>
            <span className="border-b border-dotted border-black flex-1 text-center uppercase">{schoolCity}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">COMMUNE / TER (1) :</span>
            <span className="border-b border-dotted border-black flex-1"></span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">ECOLE :</span>
            <span className="border-b border-dotted border-black flex-1 text-center font-bold uppercase">{schoolName}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">CODE :</span>
            <div className="flex border border-black h-5 flex-1 ml-1">
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">ELEVE :</span>
            <span className="border-b border-dotted border-black flex-1 font-bold text-center uppercase">
               {student.last_name} {student.post_name} {student.first_name}
            </span>
            <span className="font-bold ml-1">SEXE :</span>
            <span className="border-b border-dotted border-black w-8 text-center">{student.gender}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">NE (E) A :</span>
            <span className="border-b border-dotted border-black flex-1 text-center">{student.birthplace}</span>
            <span className="font-bold ml-1">Le</span>
            <span className="border-b border-dotted border-black w-24 text-center">
              {new Date(student.birth_date).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">CLASSE :</span>
            <span className="border-b border-dotted border-black flex-1 font-bold text-center">
              {classInfo.level} {classInfo.option}
            </span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold min-w-[70px]">N° PERM. :</span>
             <div className="flex border border-black h-5 flex-1 ml-1">
              {Array(14).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulletin Title */}
      <div className="text-center font-bold py-1 text-[10px] uppercase">
        BULLETIN DE LA {classInfo.level} ANNEE CYCLE TERMINAL DE L'EDUCATION DE BASE ({classInfo.level === '7ème' ? 'CTB7' : 'CTB8'}) ANNEE SCOLAIRE 2024 - 2025
      </div>

      {/* Grades Table */}
      <table className="w-full border-2 border-black border-collapse text-center text-[8.5px]">
        <thead>
          <tr>
            <th rowSpan={3} className="border border-black w-[22%] p-1">BRANCHE</th>
            <th colSpan={5} className="border border-black bg-slate-50 uppercase py-0.5">Premier Semestre</th>
            <th colSpan={5} className="border border-black bg-slate-50 uppercase py-0.5">Second Semestre</th>
            <th rowSpan={3} className="border border-black w-[5%] py-0.5">T.G.</th>
            <th colSpan={2} className="border border-black uppercase py-0.5">Examen de Repechage</th>
          </tr>
          <tr>
            <th rowSpan={2} className="border border-black w-[4%]">MAX</th>
            <th colSpan={2} className="border border-black">TRAVAUX JOURNAL</th>
            <th rowSpan={2} className="border border-black w-[5%]">MAX EXAMEN</th>
            <th rowSpan={2} className="border border-black w-[5%]">TOT</th>
            <th rowSpan={2} className="border border-black w-[4%]">MAX</th>
            <th colSpan={2} className="border border-black">TRAVAUX JOURNAL</th>
            <th rowSpan={2} className="border border-black w-[5%]">EXAMEN</th>
            <th rowSpan={2} className="border border-black w-[5%]">TOT</th>
            <th rowSpan={2} className="border border-black w-[4%]">%</th>
            <th rowSpan={2} className="border border-black text-[7px] w-[8%]">Sign. Prof</th>
          </tr>
          <tr>
            <th className="border border-black w-[4%]">1ere P</th>
            <th className="border border-black w-[4%]">2e P</th>
            <th className="border border-black w-[4%]">3e P</th>
            <th className="border border-black w-[4%]">4e P</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(subjectsByDomain.entries()).map(([domainId, domainSubjects]) => {
            const domainName = getDomainName(domainId);
            
            let domainMaxP = 0;
            let domainMaxEx1 = 0;
            let domainMaxEx2 = 0;
            let domainMaxTot1 = 0;
            let domainMaxTot2 = 0;
            let domainMaxTG = 0;
            
            let domainP1 = 0, domainP2 = 0, domainEx1 = 0, domainTot1 = 0;
            let domainP3 = 0, domainP4 = 0, domainEx2 = 0, domainTot2 = 0;
            let domainTG = 0;

            return (
              <React.Fragment key={domainId ?? 'no-domain'}>
                {/* Domain Header */}
                <tr className="bg-slate-200">
                  <td colSpan={15} className="border border-black p-1 font-bold uppercase text-left text-[9px]">
                    {domainName}
                  </td>
                </tr>
                
                {/* Subjects in this domain */}
                {domainSubjects.map(subject => {
                  const p1 = getGrade(subject.id, 'P1');
                  const p2 = getGrade(subject.id, 'P2');
                  const ex1 = getGrade(subject.id, 'EXAM1');
                  const tot1 = (p1 !== null || p2 !== null || ex1 !== null) ? (p1 || 0) + (p2 || 0) + (ex1 || 0) : null;
                  
                  const p3 = getGrade(subject.id, 'P3');
                  const p4 = getGrade(subject.id, 'P4');
                  const ex2 = getGrade(subject.id, 'EXAM2');
                  const tot2 = (p3 !== null || p4 !== null || ex2 !== null) ? (p3 || 0) + (p4 || 0) + (ex2 || 0) : null;
                  
                  const tg = (tot1 !== null || tot2 !== null) ? (tot1 || 0) + (tot2 || 0) : null;
                  
                  const maxP = subject.max_p1;
                  const maxEx1 = subject.max_exam1;
                  const maxEx2 = subject.max_exam2;
                  const maxTot1 = (maxP * 2) + maxEx1;
                  const maxTot2 = (maxP * 2) + maxEx2;
                  const maxTG = maxTot1 + maxTot2;

                  domainMaxP += maxP;
                  domainMaxEx1 += maxEx1;
                  domainMaxEx2 += maxEx2;
                  domainMaxTot1 += maxTot1;
                  domainMaxTot2 += maxTot2;
                  domainMaxTG += maxTG;

                  if (p1 !== null) domainP1 += p1;
                  if (p2 !== null) domainP2 += p2;
                  if (ex1 !== null) domainEx1 += ex1;
                  if (tot1 !== null) domainTot1 += tot1;
                  if (p3 !== null) domainP3 += p3;
                  if (p4 !== null) domainP4 += p4;
                  if (ex2 !== null) domainEx2 += ex2;
                  if (tot2 !== null) domainTot2 += tot2;
                  if (tg !== null) domainTG += tg;
                  
                  return (
                    <tr key={subject.id}>
                      <td className="border border-black text-left px-2 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis">{subject.code || subject.name}</td>
                      <td className="border border-black bg-slate-50 font-bold">{formatValue(maxP)}</td>
                      <td className="border border-black">{formatValue(p1)}</td>
                      <td className="border border-black">{formatValue(p2)}</td>
                      <td className="border border-black bg-slate-50 font-bold">{formatValue(maxEx1)}</td>
                      <td className="border border-black font-bold">{formatValue(tot1)}</td>
                      <td className="border border-black bg-slate-50 font-bold">{formatValue(maxP)}</td>
                      <td className="border border-black">{formatValue(p3)}</td>
                      <td className="border border-black">{formatValue(p4)}</td>
                      <td className="border border-black bg-slate-50 font-bold">{formatValue(maxEx2)}</td>
                      <td className="border border-black font-bold">{formatValue(tot2)}</td>
                      <td className="border border-black font-bold bg-slate-50">{formatValue(tg)}</td>
                      <td className="border border-black"></td>
                      <td className="border border-black"></td>
                    </tr>
                  );
                })}
                
                {/* Domain Subtotal */}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-black p-1 text-left uppercase">SOUS-TOTAL</td>
                  <td className="border border-black">{formatValue(domainMaxP)}</td>
                  <td className="border border-black">{formatValue(domainP1)}</td>
                  <td className="border border-black">{formatValue(domainP2)}</td>
                  <td className="border border-black">{formatValue(domainMaxEx1)}</td>
                  <td className="border border-black">{formatValue(domainTot1)}</td>
                  <td className="border border-black">{formatValue(domainMaxP)}</td>
                  <td className="border border-black">{formatValue(domainP3)}</td>
                  <td className="border border-black">{formatValue(domainP4)}</td>
                  <td className="border border-black">{formatValue(domainMaxEx2)}</td>
                  <td className="border border-black">{formatValue(domainTot2)}</td>
                  <td className="border border-black">{formatValue(domainTG)}</td>
                  <td className="border border-black"></td>
                  <td className="border border-black"></td>
                </tr>
              </React.Fragment>
            );
          })}
          
          {/* MAXIMA GENERAUX */}
          {(() => {
            let grandMaxP = 0, grandMaxEx1 = 0, grandMaxEx2 = 0, grandMaxTot1 = 0, grandMaxTot2 = 0, grandMaxTG = 0;
            
            subjects.forEach(subject => {
              grandMaxP += subject.max_p1;
              grandMaxEx1 += subject.max_exam1;
              grandMaxEx2 += subject.max_exam2;
              grandMaxTot1 += (subject.max_p1 * 2) + subject.max_exam1;
              grandMaxTot2 += (subject.max_p1 * 2) + subject.max_exam2;
              grandMaxTG += (subject.max_p1 * 4) + subject.max_exam1 + subject.max_exam2;
            });
            
            return (
              <tr className="font-bold bg-slate-200 border-t border-black">
                <td className="border border-black text-left px-2 py-1 uppercase">MAXIMA GENERAUX</td>
                <td className="border border-black">{formatValue(grandMaxP)}</td>
                <td className="border border-black" colSpan={2}></td>
                <td className="border border-black">{formatValue(grandMaxEx1)}</td>
                <td className="border border-black">{formatValue(grandMaxTot1)}</td>
                <td className="border border-black">{formatValue(grandMaxP)}</td>
                <td className="border border-black" colSpan={2}></td>
                <td className="border border-black">{formatValue(grandMaxEx2)}</td>
                <td className="border border-black">{formatValue(grandMaxTot2)}</td>
                <td className="border border-black">{formatValue(grandMaxTG)}</td>
                <td className="border border-black" colSpan={2}></td>
              </tr>
            );
          })()}

          {/* Table Footer: Totals, Rankings, etc. */}
          {(() => {
            let totalP1 = 0, totalP2 = 0, totalEx1 = 0, totalTot1 = 0;
            let totalP3 = 0, totalP4 = 0, totalEx2 = 0, totalTot2 = 0;
            let totalTG = 0;
            
            let maxP1 = 0, maxEx1 = 0, maxTot1 = 0;
            let maxP3 = 0, maxEx2 = 0, maxTot2 = 0;
            let maxTG = 0;
            
            subjects.forEach(subject => {
              const p1 = getGrade(subject.id, 'P1');
              const p2 = getGrade(subject.id, 'P2');
              const ex1 = getGrade(subject.id, 'EXAM1');
              const p3 = getGrade(subject.id, 'P3');
              const p4 = getGrade(subject.id, 'P4');
              const ex2 = getGrade(subject.id, 'EXAM2');
              
              if (p1 !== null) totalP1 += p1;
              if (p2 !== null) totalP2 += p2;
              if (ex1 !== null) totalEx1 += ex1;
              totalTot1 += (p1 || 0) + (p2 || 0) + (ex1 || 0);
              
              if (p3 !== null) totalP3 += p3;
              if (p4 !== null) totalP4 += p4;
              if (ex2 !== null) totalEx2 += ex2;
              totalTot2 += (p3 || 0) + (p4 || 0) + (ex2 || 0);
              
              totalTG += (p1 || 0) + (p2 || 0) + (ex1 || 0) + (p3 || 0) + (p4 || 0) + (ex2 || 0);

              maxP1 += (subject.max_p1 * 2);
              maxEx1 += subject.max_exam1;
              maxTot1 += (subject.max_p1 * 2) + subject.max_exam1;
              
              maxP3 += (subject.max_p1 * 2);
              maxEx2 += subject.max_exam2;
              maxTot2 += (subject.max_p1 * 2) + subject.max_exam2;
              
              maxTG += (subject.max_p1 * 4) + subject.max_exam1 + subject.max_exam2;
            });
            
            const pct1 = maxTot1 > 0 ? ((totalTot1 / maxTot1) * 100).toFixed(1) : '0';
            const pct2 = maxTot2 > 0 ? ((totalTot2 / maxTot2) * 100).toFixed(1) : '0';
            const pctG = maxTG > 0 ? ((totalTG / maxTG) * 100).toFixed(1) : '0';

            return (
              <>
                <tr className="font-bold border-t border-black">
                  <td className="border border-black text-left px-2 uppercase">TOTAUX</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{formatValue(totalP1)}</td>
                  <td className="border border-black">{formatValue(totalP2)}</td>
                  <td className="border border-black">{formatValue(totalEx1)}</td>
                  <td className="border border-black">{formatValue(totalTot1)}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{formatValue(totalP3)}</td>
                  <td className="border border-black">{formatValue(totalP4)}</td>
                  <td className="border border-black">{formatValue(totalEx2)}</td>
                  <td className="border border-black">{formatValue(totalTot2)}</td>
                  <td className="border border-black">{formatValue(totalTG)}</td>
                  <td className="border border-black" colSpan={2} rowSpan={6}>
                    <div className="text-left p-1 space-y-2 text-[7px] leading-tight">
                       <p>● PASSE (1)</p>
                       <p>● DOUBLE (1)</p>
                       <p>LE ...... / ...... / 20 ......</p>
                       <p className="mt-2">Le chef d'établissement</p>
                       <p>Sceau de l'école</p>
                    </div>
                  </td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 uppercase">POURCENTAGE</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black" colSpan={4}>{pct1}%</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black" colSpan={4}>{pct2}%</td>
                  <td className="border border-black bg-slate-100">{pctG}%</td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold uppercase underline">PLACE/NBRE D'ELEVES</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black text-sm">{studentRanks?.p1}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks?.p2}/{totalStudents}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black text-sm">{studentRanks?.tot1}/{totalStudents}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black text-sm">{studentRanks?.p3}/{totalStudents}</td>
                  <td className="border border-black text-sm">{studentRanks?.p4}/{totalStudents}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black text-sm">{studentRanks?.tot2}/{totalStudents}</td>
                  <td className="border border-black font-bold bg-slate-50">{studentRanks?.tg}/{totalStudents}</td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold uppercase underline">APPLICATION</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{getApplication(totalP1 && maxP1 ? parseFloat(pct1) : null)}</td>
                  <td className="border border-black">{getApplication(totalP2 && maxP1 ? parseFloat(pct1) : null)}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{getApplication(totalP3 && maxP3 ? parseFloat(pct2) : null)}</td>
                  <td className="border border-black">{getApplication(totalP4 && maxP3 ? parseFloat(pct2) : null)}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold uppercase underline">CONDUITE</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{abregeConduite(student.conduite_p1)}</td>
                  <td className="border border-black">{abregeConduite(student.conduite_p2)}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{abregeConduite(student.conduite_p3)}</td>
                  <td className="border border-black">{abregeConduite(student.conduite_p4)}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                </tr>
                <tr className="h-6">
                  <td className="border border-black text-left px-2 font-bold uppercase underline">SIGNATURE</td>
                  <td className="border border-black" colSpan={11}></td>
                </tr>
              </>
            );
          })()}
        </tbody>
      </table>

      {/* Footer text from CTBE model */}
      <div className="mt-2 text-[9px] border-t border-black pt-2">
        <p className="mb-2 italic">
           - L'élève ne pourra passer dans la classe supérieure s'il n'a subi avec succès un examen de repêchage en : ................................................................................................................................................................................................................. (1)
        </p>
        <div className="flex flex-col space-y-1 mb-4">
           <p>- L'élève passe dans la classe supérieure (1)</p>
           <p>- L'élève double la classe (1)</p>
        </div>
        
        <div className="flex justify-between items-start mt-8">
          <div className="text-center w-48">
             <p className="font-bold underline mb-16">Signature de l'élève</p>
          </div>
          <div className="text-center w-48">
             <p className="font-bold underline mb-4">Sceau de l'école</p>
          </div>
          <div className="text-right w-64 space-y-1">
             <p>Fait à .........................................., le ........ / ........ / 20 ......</p>
             <p className="font-bold underline pt-2">Le Chef d'établissement</p>
             <p className="pt-12 underline">Nom et Signature</p>
          </div>
        </div>

        <div className="mt-8 text-[8px] flex justify-between items-end border-t border-black pt-1">
          <div>
            <p>(1) Biffer la mention inutile</p>
            <p className="italic">Note Importante : Le Bulletin est sans valeur s'il est raturé ou surchargé</p>
          </div>
          <div className="font-bold text-[10px]">
            IGE / P.S. / 010
          </div>
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
