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
    <div className="max-w-[210mm] mx-auto bg-white p-8 min-h-[297mm] relative text-black text-[11px] font-serif leading-tight print:shadow-none print:p-0 print:mx-0 print:w-full print:max-w-none page-break-after-always">
      
      {/* ================================================================ */}
      {/* EN-TÊTE AVEC INFOS ÉCOLE ET ANNÉE SCOLAIRE */}
      {/* ================================================================ */}
      <div className="border-2 border-black mb-4">
        <div className="flex">
          {/* Colonne gauche : Infos école */}
          <div className="w-1/4 border-r border-black p-2 text-[10px]">
            <div className="mb-1">
              <span className="font-bold">ÉCOLE :</span> {schoolInfo.name}
            </div>
            <div className="mb-1">
              <span className="font-bold">VILLE :</span> {schoolInfo.city}
            </div>
            <div>
              <span className="font-bold">B.P. :</span> {schoolInfo.pobox}
            </div>
          </div>

          {/* Colonne centrale : Titre du bulletin */}
          <div className="flex-1 p-2 text-center border-r border-black">
            <div className="font-bold text-sm uppercase">
              BULLETIN DE L'ÉLÈVE{' '}
              <span className="border-b border-dotted border-black px-4">
                {student.last_name} {student.post_name} {student.first_name}
              </span>
              {' '}DE LA{' '}
              <span className="border-b border-dotted border-black px-2">
                {classInfo.level} {classInfo.option} {classInfo.section}
              </span>
            </div>
          </div>

          {/* Colonne droite : Année scolaire */}
          <div className="w-1/5 p-2 text-center text-[10px]">
            <div className="font-bold">ANNÉE SCOLAIRE</div>
            <div className="font-bold text-sm mt-1">{academicYear}</div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TABLEAU DES NOTES */}
      {/* ================================================================ */}
      <table className="w-full border-2 border-black border-collapse text-center text-[10px]">
        
        {/* -------------------------------------------------------------- */}
        {/* EN-TÊTE DU TABLEAU */}
        {/* -------------------------------------------------------------- */}
        <thead>
          {/* Ligne 1 : Semestres */}
          <tr>
            <th rowSpan={3} className="border border-black w-[22%] p-1">Branches</th>
            <th colSpan={4} className="border border-black bg-slate-50">PREMIER SEMESTRE</th>
            <th colSpan={4} className="border border-black bg-slate-50">SECOND SEMESTRE</th>
            <th rowSpan={3} className="border border-black w-[5%]">TOTAL<br/>GÉNÉR.</th>
          </tr>
          {/* Ligne 2 : Travaux journaliers et examens */}
          <tr>
            <th colSpan={2} className="border border-black">TR. JOUR</th>
            <th rowSpan={2} className="border border-black w-[6%]">Comp<br/>osition</th>
            <th rowSpan={2} className="border border-black w-[6%]">TOT</th>
            <th colSpan={2} className="border border-black">TR. JOUR</th>
            <th rowSpan={2} className="border border-black w-[6%]">Comp<br/>osition</th>
            <th rowSpan={2} className="border border-black w-[6%]">TOT</th>
          </tr>
          {/* Ligne 3 : Périodes */}
          <tr>
            <th className="border border-black w-[6%]">1ère P.</th>
            <th className="border border-black w-[6%]">2e P.</th>
            <th className="border border-black w-[6%]">3e P.</th>
            <th className="border border-black w-[6%]">4e P.</th>
          </tr>
          {/* Ligne MAXIMA (en-tête) */}
          <tr className="font-bold bg-slate-100">
            <td className="border border-black text-left px-2">MAXIMA</td>
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
                    <td className="border border-black text-left px-2">MAXIMA</td>
                    <td className="border border-black">{firstSubject.max_p1}</td>
                    <td className="border border-black">{firstSubject.max_p2}</td>
                    <td className={`border border-black ${firstSubject.max_exam1 === 0 ? 'bg-black' : ''}`}>{firstSubject.max_exam1 > 0 ? firstSubject.max_exam1 : ''}</td>
                    <td className="border border-black">{sem1Total}</td>
                    <td className="border border-black">{firstSubject.max_p3}</td>
                    <td className="border border-black">{firstSubject.max_p4}</td>
                    <td className={`border border-black ${firstSubject.max_exam2 === 0 ? 'bg-black' : ''}`}>{firstSubject.max_exam2 > 0 ? firstSubject.max_exam2 : ''}</td>
                    <td className="border border-black">{sem2Total}</td>
                    <td className="border border-black">{totalMax}</td>
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
                        <td className="border border-black text-left px-2 py-0.5">{subject.name}</td>
                        <td className="border border-black">{p1 ?? ''}</td>
                        <td className="border border-black">{p2 ?? ''}</td>
                        <td className={`border border-black ${subject.max_exam1 === 0 ? 'bg-black' : ''}`}>{subject.max_exam1 > 0 ? (ex1 ?? '') : ''}</td>
                        <td className="border border-black font-bold">{tot1 ?? ''}</td>
                        <td className="border border-black">{p3 ?? ''}</td>
                        <td className="border border-black">{p4 ?? ''}</td>
                        <td className={`border border-black ${subject.max_exam2 === 0 ? 'bg-black' : ''}`}>{subject.max_exam2 > 0 ? (ex2 ?? '') : ''}</td>
                        <td className="border border-black font-bold">{tot2 ?? ''}</td>
                        <td className="border border-black font-bold bg-slate-50">{tg || ''}</td>
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
                  <td className="border border-black text-left px-2">MAXIMA GÉNÉRAUX</td>
                  <td className="border border-black">{maxP1}</td>
                  <td className="border border-black">{maxP2}</td>
                  <td className={`border border-black ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? maxEx1 : ''}</td>
                  <td className="border border-black">{maxTot1}</td>
                  <td className="border border-black">{maxP3}</td>
                  <td className="border border-black">{maxP4}</td>
                  <td className={`border border-black ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? maxEx2 : ''}</td>
                  <td className="border border-black">{maxTot2}</td>
                  <td className="border border-black">{maxTG}</td>
                </tr>
                
                {/* TOTAUX */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2">TOTAUX</td>
                  <td className="border border-black">{totalP1 || ''}</td>
                  <td className="border border-black">{totalP2 || ''}</td>
                  <td className={`border border-black ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? (totalEx1 || '') : ''}</td>
                  <td className="border border-black">{totalTot1 || ''}</td>
                  <td className="border border-black">{totalP3 || ''}</td>
                  <td className="border border-black">{totalP4 || ''}</td>
                  <td className={`border border-black ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? (totalEx2 || '') : ''}</td>
                  <td className="border border-black">{totalTot2 || ''}</td>
                  <td className="border border-black bg-slate-100">{totalTG || ''}</td>
                </tr>
                
                {/* APPLICATION */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2">APPLICATION</td>
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

                {/* ECHECS */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2">ECHECS</td>
                  <td className="border border-black text-left px-2 text-[9px]" colSpan={9}>
                    {(() => {
                      const failures: string[] = [];
                      subjects.forEach(subject => {
                        const tot1 = calculateTotal(subject.id, ['P1', 'P2', 'EXAM1']);
                        const tot2 = calculateTotal(subject.id, ['P3', 'P4', 'EXAM2']);
                        const totalObtained = (tot1 || 0) + (tot2 || 0);
                        
                        const maxTotal = subject.max_p1 + subject.max_p2 + subject.max_exam1 + 
                                       subject.max_p3 + subject.max_p4 + subject.max_exam2;
                        
                        if (maxTotal > 0 && totalObtained < maxTotal / 2) {
                          failures.push(`${subject.name}: ${totalObtained}/${maxTotal}`);
                        }
                      });
                      return failures.length > 0 ? failures.join(', ') : 'Néant';
                    })()}
                  </td>
                </tr>
                
                {/* POURCENTAGE */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2">POURCENTAGE</td>
                  <td className="border border-black text-[9px]">{pctP1}%</td>
                  <td className="border border-black text-[9px]">{pctP2}%</td>
                  <td className={`border border-black text-[9px] ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? `${pctEx1}%` : ''}</td>
                  <td className="border border-black text-[9px]">{pctTot1}%</td>
                  <td className="border border-black text-[9px]">{pctP3}%</td>
                  <td className="border border-black text-[9px]">{pctP4}%</td>
                  <td className={`border border-black text-[9px] ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? `${pctEx2}%` : ''}</td>
                  <td className="border border-black text-[9px]">{pctTot2}%</td>
                  <td className="border border-black bg-slate-100 text-[9px]">{pctTG}%</td>
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
