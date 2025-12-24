/**
 * CouponContent.tsx
 * 
 * Composant de présentation pure pour le coupon élève.
 * Reçoit toutes les données en props pour permettre son utilisation
 * à la fois pour un seul élève et pour l'impression en masse.
 */

import React from 'react';
import { Student } from '../services/studentService';
import { ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';

// ============================================================================
// TYPES
// ============================================================================

export interface SchoolInfo {
  name: string;
  city: string;
  pobox: string;
}

export interface CouponContentProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  schoolInfo: SchoolInfo;
  academicYear: string;
}

// ============================================================================
// COMPOSANT
// ============================================================================

const getApplication = (percentage: number | null): string => {
  if (percentage === null) return '';
  if (percentage >= 80) return 'E';
  if (percentage >= 60) return 'TB';
  if (percentage >= 50) return 'B';
  if (percentage >= 30) return 'Ma';
  return 'Mé';
};

export default function CouponContent({
  student,
  classInfo,
  subjects,
  grades,
  schoolInfo,
  academicYear
}: CouponContentProps) {

  // ============================================================================
  // FONCTIONS UTILITAIRES POUR LES NOTES
  // ============================================================================

  /**
   * Récupère la note d'une matière pour une période donnée
   */
  const getGrade = (subjectId: number, period: string): number | null => {
    const grade = grades.find(g => g.subject_id === subjectId && g.period === period);
    return grade ? grade.value : null;
  };

  /**
   * Calcule le total des notes pour plusieurs périodes
   */
  const calculateTotal = (subjectId: number, periods: string[]): number | null => {
    let total = 0;
    let hasAnyGrade = false;
    
    periods.forEach(period => {
      const value = getGrade(subjectId, period);
      if (value !== null) {
        total += value;
        hasAnyGrade = true;
      }
    });
    
    return hasAnyGrade ? total : null;
  };

  return (
    <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-[297mm] relative text-black text-[8px] font-serif leading-tight print:shadow-none print:p-0 print:mx-0 print:w-full print:max-w-none page-break-after-always" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}>
      
      {/* ================================================================ */}
      {/* EN-TÊTE AVEC INFOS ÉCOLE ET ANNÉE SCOLAIRE */}
      {/* ================================================================ */}
      <div className="border-2 border-black mb-2">
        <div className="flex">
          {/* Colonne gauche : Infos école */}
          <div className="w-1/4 border-r border-black p-1 text-[7.5px]">
            <div className="mb-0.5">
              <span className="font-semibold">ÉCOLE :</span> {schoolInfo.name}
            </div>
            <div className="mb-0.5">
              <span className="font-semibold">VILLE :</span> {schoolInfo.city}
            </div>
            <div>
              <span className="font-semibold">B.P. :</span> {schoolInfo.pobox}
            </div>
          </div>

          {/* Colonne centrale : Titre du bulletin */}
          <div className="flex-1 p-1 text-center border-r border-black flex items-center justify-center">
            <div className="font-medium text-[8px] uppercase">
              BULLETIN DE L'ÉLÈVE{' '}
              <span className="border-b border-dotted border-black px-2">
                {student.last_name} {student.post_name} {student.first_name}
              </span>
              {' '}DE LA{' '}
              <span className="border-b border-dotted border-black px-1">
                {classInfo.level} {classInfo.option} {classInfo.section}
              </span>
            </div>
          </div>

          {/* Colonne droite : Année scolaire */}
          <div className="w-1/6 p-1 text-center text-[7px] flex flex-col justify-center">
            <div className="font-medium">ANNÉE SCOLAIRE</div>
            <div className="font-medium text-[8px]">{academicYear}</div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TABLEAU DES NOTES */}
      {/* ================================================================ */}
      <table className="w-full border-2 border-black border-collapse text-center text-[8px]">
        
        {/* -------------------------------------------------------------- */}
        {/* EN-TÊTE DU TABLEAU */}
        {/* -------------------------------------------------------------- */}
        <thead>
          {/* Ligne 1 : Semestres */}
          <tr>
            <th rowSpan={3} className="border border-black w-[22%] p-0">Branches</th>
            <th colSpan={4} className="border border-black bg-slate-50 p-0">PREMIER SEMESTRE</th>
            <th colSpan={4} className="border border-black bg-slate-50 p-0">SECOND SEMESTRE</th>
            <th rowSpan={3} className="border border-black w-[5%] p-0">TOTAL<br/>GÉNÉR.</th>
          </tr>
          {/* Ligne 2 : Travaux journaliers et examens */}
          <tr>
            <th colSpan={2} className="border border-black p-0">TR. JOUR</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">Comp<br/>osition</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">TOT</th>
            <th colSpan={2} className="border border-black p-0">TR. JOUR</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">Comp<br/>osition</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">TOT</th>
          </tr>
          {/* Ligne 3 : Périodes */}
          <tr>
            <th className="border border-black w-[6%] p-0">1ère P.</th>
            <th className="border border-black w-[6%] p-0">2e P.</th>
            <th className="border border-black w-[6%] p-0">3e P.</th>
            <th className="border border-black w-[6%] p-0">4e P.</th>
          </tr>
          {/* Ligne MAXIMA (en-tête) */}
          <tr className="font-bold bg-slate-100">
            <td className="border border-black text-left px-2 py-0">MAXIMA</td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
            <td className="border border-black py-0"></td>
          </tr>
        </thead>

        <tbody>
          {/* ============================================================ */}
          {/* MATIÈRES GROUPÉES PAR MAXIMA */}
          {/* ============================================================ */}
          {(() => {
            // Grouper les matières par leur configuration de maxima
            const groupedSubjects: { [key: string]: Subject[] } = {};
            
            subjects.forEach(subject => {
              // Clé unique basée sur tous les maxima
              const key = `${subject.max_p1}-${subject.max_p2}-${subject.max_exam1}-${subject.max_p3}-${subject.max_p4}-${subject.max_exam2}`;
              if (!groupedSubjects[key]) {
                groupedSubjects[key] = [];
              }
              groupedSubjects[key].push(subject);
            });
            
            // Trier les groupes par total des maxima (ordre croissant)
            const sortedGroups = Object.entries(groupedSubjects).sort(([keyA], [keyB]) => {
              const [p1A, p2A, ex1A, p3A, p4A, ex2A] = keyA.split('-').map(Number);
              const [p1B, p2B, ex1B, p3B, p4B, ex2B] = keyB.split('-').map(Number);
              const totalA = p1A + p2A + ex1A + p3A + p4A + ex2A;
              const totalB = p1B + p2B + ex1B + p3B + p4B + ex2B;
              return totalA - totalB;
            });
            
            // Rendu de chaque groupe
            return sortedGroups.map(([key, groupSubjects]) => {
              const firstSubject = groupSubjects[0];
              
              // Calcul des totaux semestriels pour ce groupe
              const sem1Total = firstSubject.max_p1 + firstSubject.max_p2 + firstSubject.max_exam1;
              const sem2Total = firstSubject.max_p3 + firstSubject.max_p4 + firstSubject.max_exam2;
              const totalMax = sem1Total + sem2Total;
              
              return (
                <React.Fragment key={key}>
                  {/* Ligne MAXIMA pour ce groupe */}
                  <tr className="font-bold bg-slate-100">
                    <td className="border border-black text-left px-2 py-0">MAXIMA</td>
                    <td className="border border-black py-0">{firstSubject.max_p1}</td>
                    <td className="border border-black py-0">{firstSubject.max_p2}</td>
                    <td className={`border border-black py-0 ${firstSubject.max_exam1 === 0 ? 'bg-black' : ''}`}>{firstSubject.max_exam1 > 0 ? firstSubject.max_exam1 : ''}</td>
                    <td className="border border-black py-0">{sem1Total}</td>
                    <td className="border border-black py-0">{firstSubject.max_p3}</td>
                    <td className="border border-black py-0">{firstSubject.max_p4}</td>
                    <td className={`border border-black py-0 ${firstSubject.max_exam2 === 0 ? 'bg-black' : ''}`}>{firstSubject.max_exam2 > 0 ? firstSubject.max_exam2 : ''}</td>
                    <td className="border border-black py-0">{sem2Total}</td>
                    <td className="border border-black py-0">{totalMax}</td>
                  </tr>
                  
                  {/* Matières de ce groupe */}
                  {groupSubjects.map((subject) => {
                    // Notes du premier semestre
                    const p1 = getGrade(subject.id, 'P1');
                    const p2 = getGrade(subject.id, 'P2');
                    const ex1 = getGrade(subject.id, 'EXAM1');
                    const tot1 = calculateTotal(subject.id, ['P1', 'P2', 'EXAM1']);

                    // Notes du second semestre
                    const p3 = getGrade(subject.id, 'P3');
                    const p4 = getGrade(subject.id, 'P4');
                    const ex2 = getGrade(subject.id, 'EXAM2');
                    const tot2 = calculateTotal(subject.id, ['P3', 'P4', 'EXAM2']);

                    // Total général
                    const tg = (tot1 || 0) + (tot2 || 0);

                    return (
                      <tr key={subject.id}>
                        <td className="border border-black text-left px-2 py-0 whitespace-nowrap overflow-hidden text-ellipsis">{subject.code || subject.name}</td>
                        <td className="border border-black py-0">{p1 ?? ''}</td>
                        <td className="border border-black py-0">{p2 ?? ''}</td>
                        <td className={`border border-black py-0 ${subject.max_exam1 === 0 ? 'bg-black' : ''}`}>{subject.max_exam1 > 0 ? (ex1 ?? '') : ''}</td>
                        <td className="border border-black font-bold py-0">{tot1 ?? ''}</td>
                        <td className="border border-black py-0">{p3 ?? ''}</td>
                        <td className="border border-black py-0">{p4 ?? ''}</td>
                        <td className={`border border-black py-0 ${subject.max_exam2 === 0 ? 'bg-black' : ''}`}>{subject.max_exam2 > 0 ? (ex2 ?? '') : ''}</td>
                        <td className="border border-black font-bold py-0">{tot2 ?? ''}</td>
                        <td className="border border-black font-bold bg-slate-50 py-0">{tg || ''}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}

          {/* ============================================================ */}
          {/* LIGNES VIDES POUR REMPLIR L'ESPACE */}
          {/* ============================================================ */}
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
            </tr>
          ))}

          {/* ============================================================ */}
          {/* LIGNES RÉCAPITULATIVES */}
          {/* ============================================================ */}
          {(() => {
            // Calcul des totaux généraux
            let maxP1 = 0, maxP2 = 0, maxEx1 = 0, maxTot1 = 0;
            let maxP3 = 0, maxP4 = 0, maxEx2 = 0, maxTot2 = 0;
            let maxTG = 0;
            
            let totalP1 = 0, totalP2 = 0, totalEx1 = 0, totalTot1 = 0;
            let totalP3 = 0, totalP4 = 0, totalEx2 = 0, totalTot2 = 0;
            let totalTG = 0;
            
            // Parcourir toutes les matières pour calculer les totaux
            subjects.forEach(subject => {
              // Maxima
              maxP1 += subject.max_p1;
              maxP2 += subject.max_p2;
              maxEx1 += subject.max_exam1;
              maxTot1 += subject.max_p1 + subject.max_p2 + subject.max_exam1;
              
              maxP3 += subject.max_p3;
              maxP4 += subject.max_p4;
              maxEx2 += subject.max_exam2;
              maxTot2 += subject.max_p3 + subject.max_p4 + subject.max_exam2;
              
              maxTG += subject.max_p1 + subject.max_p2 + subject.max_exam1 + 
                       subject.max_p3 + subject.max_p4 + subject.max_exam2;
              
              // Notes obtenues
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
            });
            
            // Calcul des pourcentages
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
                {/* MAXIMA GÉNÉRAUX */}
                <tr className="font-bold bg-slate-200 border-t-2 border-black">
                  <td className="border border-black text-left px-2 py-0.5">MAXIMA GÉNÉRAUX</td>
                  <td className="border border-black py-0.5">{maxP1}</td>
                  <td className="border border-black py-0.5">{maxP2}</td>
                  <td className={`border border-black py-0.5 ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? maxEx1 : ''}</td>
                  <td className="border border-black py-0.5">{maxTot1}</td>
                  <td className="border border-black py-0.5">{maxP3}</td>
                  <td className="border border-black py-0.5">{maxP4}</td>
                  <td className={`border border-black py-0.5 ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? maxEx2 : ''}</td>
                  <td className="border border-black py-0.5">{maxTot2}</td>
                  <td className="border border-black py-0.5">{maxTG}</td>
                </tr>
                
                {/* TOTAUX */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 py-0.5">TOTAUX</td>
                  <td className="border border-black py-0.5">{totalP1 || ''}</td>
                  <td className="border border-black py-0.5">{totalP2 || ''}</td>
                  <td className={`border border-black py-0.5 ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? (totalEx1 || '') : ''}</td>
                  <td className="border border-black py-0.5">{totalTot1 || ''}</td>
                  <td className="border border-black py-0.5">{totalP3 || ''}</td>
                  <td className="border border-black py-0.5">{totalP4 || ''}</td>
                  <td className={`border border-black py-0.5 ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? (totalEx2 || '') : ''}</td>
                  <td className="border border-black py-0.5">{totalTot2 || ''}</td>
                  <td className="border border-black bg-slate-100 py-0.5">{totalTG || ''}</td>
                </tr>
                
                {/* APPLICATION */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 py-0">APPLICATION</td>
                  <td className="border border-black py-0">{getApplication(pctP1 !== '0' ? parseFloat(pctP1) : null)}</td>
                  <td className="border border-black py-0">{getApplication(pctP2 !== '0' ? parseFloat(pctP2) : null)}</td>
                  <td className="border border-black bg-black py-0"></td>
                  <td className="border border-black bg-black py-0"></td>
                  <td className="border border-black py-0">{getApplication(pctP3 !== '0' ? parseFloat(pctP3) : null)}</td>
                  <td className="border border-black py-0">{getApplication(pctP4 !== '0' ? parseFloat(pctP4) : null)}</td>
                  <td className="border border-black bg-black py-0"></td>
                  <td className="border border-black bg-black py-0"></td>
                  <td className="border border-black bg-black py-0"></td>
                </tr>

                {/* ECHECS */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 py-0.5">ECHECS</td>
                  <td className="border border-black text-left px-2 py-0.5 text-[9px]" colSpan={9}>
                    {(() => {
                      const failures: string[] = [];
                      subjects.forEach(subject => {
                        const tot1 = calculateTotal(subject.id, ['P1', 'P2', 'EXAM1']);
                        const tot2 = calculateTotal(subject.id, ['P3', 'P4', 'EXAM2']);
                        const totalObtained = (tot1 || 0) + (tot2 || 0);
                        
                        const maxTotal = subject.max_p1 + subject.max_p2 + subject.max_exam1 + 
                                       subject.max_p3 + subject.max_p4 + subject.max_exam2;
                        
                        if (maxTotal > 0 && totalObtained < maxTotal / 2) {
                          failures.push(`${subject.code}: ${totalObtained}/${maxTotal}`);
                        }
                      });
                      return failures.length > 0 ? failures.join(', ') : 'Aucune';
                    })()}
                  </td>
                </tr>
                
                {/* POURCENTAGE */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 py-0.5">POURCENTAGE</td>
                  <td className="border border-black py-0.5 text-[9px]">{pctP1}%</td>
                  <td className="border border-black py-0.5 text-[9px]">{pctP2}%</td>
                  <td className={`border border-black py-0.5 text-[9px] ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? `${pctEx1}%` : ''}</td>
                  <td className="border border-black py-0.5 text-[9px]">{pctTot1}%</td>
                  <td className="border border-black py-0.5 text-[9px]">{pctP3}%</td>
                  <td className="border border-black py-0.5 text-[9px]">{pctP4}%</td>
                  <td className={`border border-black py-0.5 text-[9px] ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? `${pctEx2}%` : ''}</td>
                  <td className="border border-black py-0.5 text-[9px]">{pctTot2}%</td>
                  <td className="border border-black bg-slate-100 py-0.5 text-[9px]">{pctTG}%</td>
                </tr>
              </>
            );
          })()}
        </tbody>
      </table>

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
