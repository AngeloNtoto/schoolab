/**
 * CouponContent.tsx
 * 
 * Composant de présentation pure pour le coupon élève.
 * Reçoit toutes les données en props pour permettre son utilisation
 * à la fois pour un seul élève et pour l'impression en masse.
 */

import React, { useState } from 'react';
import { Student } from '../../services/studentService';
import { ClassData, Subject } from '../../services/classService';
import { Grade } from '../../services/gradeService';
import { StudentRanks } from '../../services/bulletinService';

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
  ranks?: StudentRanks;
  totalStudents?: number;
  compact?: boolean;
  forcePageBreak?: boolean;
}

// ============================================================================
// COMPOSANT
// ============================================================================

const getApplication = (percentage: number | null): string => {
  if (percentage === null) return '';
  if (percentage >= 80) return 'E';
  if (percentage >= 60) return 'TB';
  if (percentage >= 50) return 'B';
  if (percentage >= 30) return 'Mé';
  return 'Ma';
};

export default function CouponContent({
  student,
  classInfo,
  subjects,
  grades,
  schoolInfo,
  academicYear,
  ranks,
  totalStudents,
  compact = false,
  forcePageBreak = true
}: CouponContentProps) {

  const titleSize = 13;
  const bodySize = 8;
  const compactScale = 1.08;
  
  // ============================================================================
  // MISE EN PAGE ADAPTATIVE
  // ============================================================================
  const layout = React.useMemo(() => {
    let totalRows = subjects.length;
    
    if (compact) {
      // MODE 2 PAR PAGE (Hauteur = ~148mm)
      const isVeryCompact = totalRows > 22;    
      const isCompact = totalRows > 16;        
      return {
        subjectFont: isVeryCompact ? '9px' : isCompact ? '10px' : '11px',
        cellPy: isVeryCompact ? '0px' : isCompact ? '2px' : '3px',
        tableFont: isVeryCompact ? '8px' : isCompact ? '9px' : '10px',
        baseFont: isVeryCompact ? '9px' : isCompact ? '10px' : '11px',
        headerText: 'text-[9px]',
      };
    } else {
      // MODE 1 PAR PAGE (Hauteur = 297mm)
      // On a toute la page, on peut écrire gros pour bien remplir l'espace
      return {
        subjectFont: totalRows > 20 ? '11px' : '13px',
        cellPy: totalRows > 20 ? '4px' : '6px',
        tableFont: totalRows > 20 ? '10px' : '12px',
        baseFont: totalRows > 20 ? '11px' : '13px',
        headerText: 'text-[11px]',
      };
    }
  }, [subjects, compact]);

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

  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    if (val === -1) return 'zéro';
    return Number.isInteger(val) ? val.toString() : val.toFixed(1);
  };

  /**
   * Calcule le total des notes pour plusieurs périodes
   */
  const calculateTotal = (subjectId: number, periods: string[]): number | null => {
    let total = 0;
    let hasAnyGrade = false;
    
    periods.forEach(period => {
      const grade = grades.find(g => g.subject_id === subjectId && g.period === period);
      const value = grade ? grade.value : null;
      if (value !== null && value !== -1) {
        total += value;
        hasAnyGrade = true;
      } else if (value === -1) {
        hasAnyGrade = true; // -1 means 0 math but it's a grade
      }
    });
    
    return hasAnyGrade ? total : null;
  };

  return (
    <div
      className={`max-w-[210mm] mx-auto bg-white relative text-black font-serif print:shadow-none print:mx-0 print:w-full print:max-w-none ${
        compact ? 'p-1 min-h-0 h-full flex flex-col' : 'p-4 print:p-2'
      } ${forcePageBreak ? 'page-break-after-always' : ''}`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontSize: layout.baseFont, lineHeight: 1 } as any}
    >
      
      {/* ================================================================ */}
      {/* EN-TÊTE AVEC INFOS ÉCOLE ET ANNÉE SCOLAIRE */}
      {/* ================================================================ */}
      <div className="border-2 border-black mb-0 rounded-sm">
        <div className="flex">
          {/* Colonne gauche : Infos école */}
          <div className="w-[22%] border-r border-black px-1 py-0.5 bg-slate-50">
            <div className="mb-0 text-[8px] uppercase tracking-tight font-semibold leading-snug">
              {schoolInfo.name}
            </div>
            <div className="mb-0 text-[7px] uppercase tracking-tight">
              B.P : {schoolInfo.pobox}
            </div>
            <div className="mb-0 text-[8px] uppercase tracking-tight">
              {schoolInfo.city}
            </div>
          </div>

          {/* Colonne centrale : Titre du bulletin */}
          <div className="flex-1 px-1 py-0.5 text-center border-r border-black flex items-center justify-center bg-white">
            <div className={`font-semibold uppercase tracking-tight leading-snug ${layout.headerText}`}>
              <div>COUPON DE L'ÉLÈVE</div>
              <div className="border-b border-dotted border-black inline-block px-1 py-0.5">{student.last_name} {student.post_name} {student.first_name}</div>
              <div className="mt-1">DE LA</div>
              <div className="border-b border-dotted border-black inline-block px-1 py-0.5">{classInfo.level} {classInfo.option} {classInfo.section}</div>
            </div>
          </div>

          {/* Colonne droite : Année scolaire */}
          <div className="w-[16%] text-center flex flex-col justify-center px-1 py-0.5 bg-slate-50">
            <div className="font-semibold uppercase tracking-tight text-[7px]">ANNÉE SCOLAIRE</div>
            <div className="font-bold text-[10px]">{academicYear}</div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TABLEAU DES NOTES */}
      {/* ================================================================ */}
      <table className={`annual-coupon-table w-full border-2 border-black border-collapse text-center ${compact ? 'flex-1' : ''}`} style={{ fontSize: `${layout.tableFont}` }}>
        
        {/* -------------------------------------------------------------- */}
        {/* EN-TÊTE DU TABLEAU */}
        {/* -------------------------------------------------------------- */}
        <thead>
          {/* Ligne 1 : Semestres */}
          <tr>
            <th rowSpan={3} className="border border-black w-[16%] p-0">{compact ? 'Branches' : 'Branches'}</th>
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
            <th className="border border-black w-[5%] p-0">1ère P.</th>
            <th className="border border-black w-[5%] p-0">2e P.</th>
            <th className="border border-black w-[5%] p-0">3e P.</th>
            <th className="border border-black w-[5%] p-0">4e P.</th>
          </tr>
          {/* Ligne MAXIMA (en-tête) */}
          <tr className="font-bold bg-slate-100">
            <td className="border border-black text-left px-1 py-0">MAXIMA</td>
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
                    <td className="border border-black text-left px-1 py-0">MAXIMA</td>
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
                        <td className="subject-cell border border-black text-left px-1 py-0 whitespace-nowrap overflow-hidden text-ellipsis">{subject.name}</td>
                        <td className="border border-black">{formatValue(p1)}</td>
                        <td className="border border-black py-0">{formatValue(p2)}</td>
                        <td className={`border border-black py-0 ${subject.max_exam1 === 0 ? 'bg-black' : ''}`}>{subject.max_exam1 > 0 ? formatValue(ex1) : ''}</td>
                        <td className="border border-black font-bold py-0">{formatValue(tot1)}</td>
                        <td className="border border-black py-0">{formatValue(p3)}</td>
                        <td className="border border-black py-0">{formatValue(p4)}</td>
                        <td className={`border border-black py-0 ${subject.max_exam2 === 0 ? 'bg-black' : ''}`}>{subject.max_exam2 > 0 ? formatValue(ex2) : ''}</td>
                        <td className="border border-black font-bold py-0">{formatValue(tot2)}</td>
                        <td className="border border-black font-bold bg-slate-50 py-0">{formatValue(tg)}</td>
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
          {Array(Math.max(0, 18 - subjects.length)).fill(0).map((_, i) => (
            <tr key={`empty-${i}`}>
              <td className="border border-black text-left px-1 py-0">&nbsp;</td>
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
                  <td className="border border-black text-left px-1 py-0">MAXIMA GÉNÉRAUX</td>
                  <td className="border border-black py-0">{maxP1}</td>
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
                  <td className="border border-black text-left px-1 py-1 align-middle">TOTAUX</td>
                  <td className="border border-black py-0">{totalP1 || ''}</td>
                  <td className="border border-black py-0.5">{totalP2 || ''}</td>
                  <td className={`border border-black py-0.5 ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? (totalEx1 || '') : ''}</td>
                  <td className="border border-black py-0.5">{totalTot1 || ''}</td>
                  <td className="border border-black py-0.5">{totalP3 || ''}</td>
                  <td className="border border-black py-0.5">{totalP4 || ''}</td>
                  <td className={`border border-black py-0.5 ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? (totalEx2 || '') : ''}</td>
                  <td className="border border-black py-0.5">{totalTot2 || ''}</td>
                  <td className="border border-black bg-slate-100 py-0.5">{totalTG || ''}</td>
                </tr>
            
                {/* POURCENTAGE — affiche aussi les % des examens */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-1 py-0">POURCENTAGE</td>
                  <td className="border border-black text-center py-0">{pctP1}</td>
                  <td className="border border-black text-center py-0">{pctP2}</td>
                  <td className={`border border-black text-center py-0 ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? `${pctEx1}` : ''}</td>
                  <td className="border border-black text-center py-0">{pctTot1}</td>
                  <td className="border border-black text-center py-0">{pctP3}</td>
                  <td className="border border-black text-center py-0">{pctP4}</td>
                  <td className={`border border-black text-center py-0 ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? `${pctEx2}` : ''}</td>
                  <td className="border border-black text-center py-0">{pctTot2}</td>
                  <td className="border border-black bg-slate-100 text-center py-0">{pctTG}</td>
                </tr>

                {/* PLACE — affiche aussi les places des examens */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-1 py-0">PLACE</td>
                  <td className="border border-black px-1 py-0 text-center">{ranks?.p1 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black px-1 py-0 text-center">{ranks?.p2 ?? ''}/{totalStudents || '?'}</td>
                  <td className={`border border-black px-1 py-0 text-center ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? `${ranks?.ex1 ?? '?'}/${totalStudents || '?'}` : ''}</td>
                  <td className="border border-black px-1 py-0 text-center">{ranks?.tot1 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black px-1 py-0 text-center">{ranks?.p3 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black px-1 py-0 text-center">{ranks?.p4 ?? ''}/{totalStudents || '?'}</td>
                  <td className={`border border-black px-1 py-0 text-center ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? `${ranks?.ex2 ?? '?'}/${totalStudents || '?'}` : ''}</td>
                  <td className="border border-black px-1 py-0 text-center">{ranks?.tot2 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black bg-blue-50 px-1 py-0 text-center">{ranks?.tg ?? ''}/{totalStudents || '?'}</td>
                </tr>

                {/* APPLICATION */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-1 py-0">APPLICATION</td>
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

                {/* CONDUITE */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-1 py-0">CONDUITE</td>
                  <td className="border border-black py-0">{student.conduite_p1 || ''}</td>
                  <td className="border border-black py-0.5">{student.conduite_p2 || ''}</td>
                  <td className="border border-black bg-black py-0.5"></td>
                  <td className="border border-black bg-black py-0.5"></td>
                  <td className="border border-black py-0.5">{student.conduite_p3 || ''}</td>
                  <td className="border border-black py-0.5">{student.conduite_p4 || ''}</td>
                  <td className="border border-black bg-black py-0.5"></td>
                  <td className="border border-black bg-black py-0.5"></td>
                  <td className="border border-black bg-black py-0.5"></td>
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
          .page-break-after-always:last-child {
            page-break-after: auto;
          }
        }
        .annual-coupon-table th,
        .annual-coupon-table td {
          padding-top: ${layout.cellPy} !important;
          padding-bottom: ${layout.cellPy} !important;
          font-size: ${layout.tableFont} !important;
          line-height: 1 !important;
        }
        .subject-cell {
          font-size: ${layout.subjectFont} !important;
        }
      `}</style>
    </div>
  );
}
