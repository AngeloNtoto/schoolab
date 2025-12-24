/**
 * BulletinPrimaireContent.tsx
 * 
 * Composant de présentation pure pour le bulletin du degré élémentaire (7ème/8ème).
 */

import React, { useMemo } from 'react';
import { Student } from '../services/studentService';
import { ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';
import { Domain } from '../services/domainService';

export interface BulletinPrimaireContentProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  domains: Domain[];
  schoolName: string;
  schoolCity: string;
}

export default function BulletinPrimaireContent({
  student,
  classInfo,
  subjects,
  grades,
  domains,
  schoolName,
  schoolCity
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
    <div className="max-w-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-6 min-h-[297mm] relative text-black text-[9px] font-serif leading-tight page-break-after-always">
      
      {/* Header */}
      <div className="border-2 border-black mb-1">
        <div className="flex border-b border-black">
          {/* Flag */}
          <div className="w-24 border-r border-black p-2 flex items-center justify-center">
            <div 
              className="w-full aspect-[4/3] relative overflow-hidden border border-black shadow-sm"
              style={{
                backgroundColor: '#007FFF',
                backgroundImage: `linear-gradient(to top left, 
                  transparent 0% 38%, 
                  #FAD02E 38% 40%, 
                  #CE1126 40% 60%, 
                  #FAD02E 60% 62%, 
                  transparent 62% 100%
                )`
              }}
            >
              <div 
                className="absolute top-[0%] left-[8%] text-[#FAD02E] leading-none"
                style={{ fontSize: '24px', filter: 'drop-shadow(0 0 1px rgba(0,0,0,0.5))' }}
              >
                ★
              </div>
            </div>
          </div>
          
          {/* Title */}
          <div className="flex-1 text-center py-1">
            <h1 className="font-bold text-sm uppercase">Republique Democratique du Congo</h1>
            <h2 className="font-bold text-sm uppercase">Ministere de l'Education Nationale</h2>
            <h3 className="font-bold text-sm uppercase">Et Nouvelle Citoyennete</h3>
          </div>

          {/* Logo */}
          <div className="w-16 border-l border-black p-1 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border border-black flex items-center justify-center">
              <span className="text-[7px] text-center">LOGO<br/>ECOLE</span>
            </div>
          </div>
        </div>

        {/* ID Row */}
        <div className="flex border-b border-black">
          <div className="w-16 font-bold p-0.5 border-r border-black bg-slate-100 text-[8px]">N° ID.</div>
          <div className="flex-1 flex">
            {Array(25).fill(0).map((_, i) => (
              <div key={i} className="flex-1 border-r border-black last:border-r-0 h-4"></div>
            ))}
          </div>
        </div>

        {/* Province */}
        <div className="p-0.5 font-bold border-b border-black bg-slate-100 text-[8px]">
          PROVINCE EDUCATIONNELLE : ....................................
        </div>
      </div>

      {/* Info Grid */}
      <div className="border-2 border-black mb-1 p-1 text-[8px]">
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
          <div className="flex items-baseline">
            <span className="font-bold">VILLE :</span>
            <span className="border-b border-dotted border-black flex-1 mx-1">{schoolCity}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold">ELEVE :</span>
            <span className="border-b border-dotted border-black flex-1 mx-1 uppercase">
              {student.last_name} {student.post_name} {student.first_name}
            </span>
            <span className="font-bold">SEXE :</span>
            <span className="ml-1">{student.gender}</span>
          </div>

          <div className="flex items-baseline">
            <span className="font-bold">COMMUNE :</span>
            <span className="border-b border-dotted border-black flex-1 mx-1"></span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold">NE(E) A :</span>
            <span className="border-b border-dotted border-black flex-1 mx-1">
              {student.birthplace}
            </span>
            <span className="font-bold">LE</span>
            <span className="border-b border-dotted border-black w-16 mx-1 text-center">
              {new Date(student.birth_date).toLocaleDateString('fr-FR')}
            </span>
          </div>

          <div className="flex items-baseline">
            <span className="font-bold">ECOLE :</span>
            <span className="border-b border-dotted border-black flex-1 mx-1">{schoolName}</span>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold">CLASSE :</span>
            <span className="border-b border-dotted border-black flex-1 mx-1">
              {classInfo.level} {classInfo.option}
            </span>
          </div>

          <div className="flex items-baseline">
            <span className="font-bold">CODE :</span>
            <div className="flex border border-black h-4 ml-1" style={{ width: '120px' }}>
              {Array(10).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
              ))}
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="font-bold">N° PERM :</span>
            <div className="flex border border-black h-4 ml-1 flex-1">
              {Array(14).fill(0).map((_, i) => (
                <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bulletin Title */}
      <div className="border-2 border-black border-b-0 p-0.5 text-center font-bold bg-slate-100 uppercase text-[9px]">
        BULLETIN DE L'ELEVE DEGRE ELEMENTAIRE ({classInfo.level}) &nbsp; ANNEE SCOLAIRE 2024 - 2025
      </div>

      {/* Grades Table */}
      <table className="w-full border-collapse border-2 border-black text-[7px]">
        <thead>
          {/* Column Headers */}
          <tr className="bg-slate-50">
            <th rowSpan={2} className="border border-black p-0.5 w-32">BRANCHES</th>
            <th rowSpan={2} className="border border-black p-0.5 w-8">MAX</th>
            <th colSpan={2} className="border border-black p-0.5">PREMIER TRIMESTRE</th>
            <th rowSpan={2} className="border border-black p-0.5 w-8">MAX<br/>PTS<br/>1er TR</th>
            <th rowSpan={2} className="border border-black p-0.5 w-8">PTS<br/>1er TR</th>
            <th colSpan={2} className="border border-black p-0.5">DEUXIEME TRIMESTRE</th>
            <th rowSpan={2} className="border border-black p-0.5 w-8">MAX<br/>PTS<br/>2e TR</th>
            <th rowSpan={2} className="border border-black p-0.5 w-8">PTS<br/>2e TR</th>
            <th colSpan={2} className="border border-black p-0.5">TROISIEME TRIMESTRE</th>
            <th rowSpan={2} className="border border-black p-0.5 w-8">MAX<br/>PTS<br/>3e TR</th>
            <th rowSpan={2} className="border border-black p-0.5 w-8">PTS<br/>3e TR</th>
            <th rowSpan={2} className="border border-black p-0.5 w-10">MAX<br/>TOTAL</th>
            <th rowSpan={2} className="border border-black p-0.5 w-10">TOTAL</th>
          </tr>
          <tr className="bg-slate-50">
            <th className="border border-black p-0.5 w-8">PTS<br/>1ère P</th>
            <th className="border border-black p-0.5 w-8">PTS<br/>2ème P</th>
            <th className="border border-black p-0.5 w-8">PTS<br/>1ère P</th>
            <th className="border border-black p-0.5 w-8">PTS<br/>2ème P</th>
            <th className="border border-black p-0.5 w-8">PTS<br/>1ère P</th>
            <th className="border border-black p-0.5 w-8">PTS<br/>2ème P</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(subjectsByDomain.entries()).map(([domainId, domainSubjects]) => {
            const domainName = getDomainName(domainId);
            
            // Calculate domain totals
            let domainMaxTotal = 0;
            let domainTotal = 0;
            
            return (
              <React.Fragment key={domainId ?? 'no-domain'}>
                {/* Domain Header */}
                <tr className="bg-slate-200">
                  <td colSpan={16} className="border border-black p-0.5 font-bold uppercase text-[8px]">
                    {domainName}
                  </td>
                </tr>
                
                {/* Subjects in this domain */}
                {domainSubjects.map(subject => {
                  const p1 = getGrade(subject.id, 'P1');
                  const p2 = getGrade(subject.id, 'P2');
                  const p3 = getGrade(subject.id, 'P3');
                  const p4 = getGrade(subject.id, 'P4');
                  const ex1 = getGrade(subject.id, 'EXAM1');
                  const ex2 = getGrade(subject.id, 'EXAM2');
                  
                  const t1Total = (p1 || 0) + (p2 || 0);
                  const t2Total = (p3 || 0) + (p4 || 0);
                  const t3Total = (ex1 || 0) + (ex2 || 0);
                  
                  const maxPeriod = subject.max_p1;
                  const maxT1 = maxPeriod * 2;
                  const maxT2 = maxPeriod * 2;
                  const maxT3 = subject.max_exam1 + subject.max_exam2;
                  const maxTotal = maxT1 + maxT2 + maxT3;
                  const total = t1Total + t2Total + t3Total;
                  
                  domainMaxTotal += maxTotal;
                  domainTotal += total;
                  
                  return (
                    <tr key={subject.id}>
                      <td className="border border-black p-0.5 text-left">{subject.name}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{maxPeriod}</td>
                      <td className="border border-black p-0.5 text-center">{p1 ?? ''}</td>
                      <td className="border border-black p-0.5 text-center">{p2 ?? ''}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{maxT1}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{t1Total || ''}</td>
                      <td className="border border-black p-0.5 text-center">{p3 ?? ''}</td>
                      <td className="border border-black p-0.5 text-center">{p4 ?? ''}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{maxT2}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{t2Total || ''}</td>
                      <td className="border border-black p-0.5 text-center">{ex1 ?? ''}</td>
                      <td className="border border-black p-0.5 text-center">{ex2 ?? ''}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{maxT3}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{t3Total || ''}</td>
                      <td className="border border-black p-0.5 text-center font-bold bg-slate-100">{maxTotal}</td>
                      <td className="border border-black p-0.5 text-center font-bold bg-slate-100">{total || ''}</td>
                    </tr>
                  );
                })}
                
                {/* Domain Subtotal */}
                <tr className="bg-slate-100 font-bold">
                  <td className="border border-black p-0.5 text-left">Sous-total</td>
                  <td className="border border-black p-0.5" colSpan={13}></td>
                  <td className="border border-black p-0.5 text-center">{domainMaxTotal}</td>
                  <td className="border border-black p-0.5 text-center">{domainTotal || ''}</td>
                </tr>
              </React.Fragment>
            );
          })}
          
          {/* Grand Total */}
          {(() => {
            let grandMaxTotal = 0;
            let grandTotal = 0;
            
            subjects.forEach(subject => {
              const p1 = getGrade(subject.id, 'P1');
              const p2 = getGrade(subject.id, 'P2');
              const p3 = getGrade(subject.id, 'P3');
              const p4 = getGrade(subject.id, 'P4');
              const ex1 = getGrade(subject.id, 'EXAM1');
              const ex2 = getGrade(subject.id, 'EXAM2');
              
              const maxPeriod = subject.max_p1;
              const maxT1 = maxPeriod * 2;
              const maxT2 = maxPeriod * 2;
              const maxT3 = subject.max_exam1 + subject.max_exam2;
              
              grandMaxTotal += maxT1 + maxT2 + maxT3;
              grandTotal += (p1 || 0) + (p2 || 0) + (p3 || 0) + (p4 || 0) + (ex1 || 0) + (ex2 || 0);
            });
            
            return (
              <tr className="bg-slate-200 font-bold border-t-2 border-black">
                <td className="border border-black p-0.5 text-left uppercase">Maxima généraux</td>
                <td className="border border-black p-0.5" colSpan={13}></td>
                <td className="border border-black p-0.5 text-center">{grandMaxTotal}</td>
                <td className="border border-black p-0.5 text-center">{grandTotal || ''}</td>
              </tr>
            );
          })()}
          
          {/* Pourcentage */}
          {(() => {
            let grandMaxTotal = 0;
            let grandTotal = 0;
            
            subjects.forEach(subject => {
              const p1 = getGrade(subject.id, 'P1');
              const p2 = getGrade(subject.id, 'P2');
              const p3 = getGrade(subject.id, 'P3');
              const p4 = getGrade(subject.id, 'P4');
              const ex1 = getGrade(subject.id, 'EXAM1');
              const ex2 = getGrade(subject.id, 'EXAM2');
              
              const maxPeriod = subject.max_p1;
              const maxT1 = maxPeriod * 2;
              const maxT2 = maxPeriod * 2;
              const maxT3 = subject.max_exam1 + subject.max_exam2;
              
              grandMaxTotal += maxT1 + maxT2 + maxT3;
              grandTotal += (p1 || 0) + (p2 || 0) + (p3 || 0) + (p4 || 0) + (ex1 || 0) + (ex2 || 0);
            });
            
            const percentage = grandMaxTotal > 0 ? ((grandTotal / grandMaxTotal) * 100).toFixed(1) : '0';
            
            return (
              <>
                <tr className="font-bold">
                  <td className="border border-black p-0.5 text-left">POURCENTAGE</td>
                  <td className="border border-black p-0.5" colSpan={13}></td>
                  <td className="border border-black p-0.5 text-center" colSpan={2}>{percentage}%</td>
                </tr>
                <tr>
                  <td className="border border-black p-0.5 text-left">PLACE / NBRE D'ELEVES</td>
                  <td className="border border-black p-0.5" colSpan={15}></td>
                </tr>
                <tr>
                  <td className="border border-black p-0.5 text-left">APPLICATION</td>
                  <td className="border border-black p-0.5" colSpan={15}></td>
                </tr>
                <tr>
                  <td className="border border-black p-0.5 text-left">CONDUITE</td>
                  <td className="border border-black p-0.5" colSpan={15}>
                    {`P1: ${student.conduite_p1 || '-'} — P2: ${student.conduite_p2 || '-'} — P3: ${student.conduite_p3 || '-'} — P4: ${student.conduite_p4 || '-'}`}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black p-0.5 text-left">SIGNATURE DU RESP.</td>
                  <td className="border border-black p-0.5" colSpan={15}></td>
                </tr>
              </>
            );
          })()}
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-1 text-[8px]">
        <p className="mb-2">- L'élève passe dans la classe supérieure (1)</p>
        <p className="mb-2">- L'élève double la classe (1)</p>
        
        <div className="flex justify-between items-end mt-4">
          <div className="text-center">
            <p className="mb-12">Signature de l'élève</p>
          </div>
          
          <div className="text-center">
            <p className="mb-12">Sceau de l'Ecole</p>
          </div>

          <div className="text-center">
            <p className="mb-2">Fait à .................., le....../....../20........</p>
            <p className="mb-12">Chef d'Etablissement</p>
            <p>Noms & Signature</p>
          </div>
        </div>

        <div className="mt-2">
          <p>(1) Biffer la mention inutile.</p>
          <p>NOTE IMPORTANTE : Le bulletin est sans valeur s'il est raturé ou surchargé.</p>
          <p className="text-right font-bold">IGE/P.S/004</p>
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
