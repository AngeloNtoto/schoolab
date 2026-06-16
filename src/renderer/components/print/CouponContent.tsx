/**
 * CouponContent.tsx
 * 
 * Composant de présentation pure pour le coupon élève.
 * Reçoit toutes les données en props pour permettre son utilisation
 * à la fois pour un seul élève et pour l'impression en masse.
 */

import React, { useState, useEffect } from 'react';
import { Student } from '../../services/studentService';
import { ClassData, Subject } from '../../services/classService';
import { Grade } from '../../services/gradeService';
import { StudentRanks } from '../../services/bulletinService';
import { settingsService } from '../../services/settingsService';

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

  // États de configuration d'impression dynamiques
  const [titleSize, setTitleSize] = useState(14);
  const [bodySize, setBodySize] = useState(8);
  const [lineHeight, setLineHeight] = useState(1.2);
  const compactScale = 1.08;
  const annualTableFontSize = compact ? Math.round((bodySize + 4) * compactScale) : bodySize + 1;
  const annualSummaryFontSize = compact ? Math.round((bodySize + 5) * compactScale) : bodySize + 5;
  const annualCellPaddingY = compact ? '1.5px' : '2px';

  useEffect(() => {
    const fetchPrintSettings = async () => {
      try {
        const t = await settingsService.get('coupon_font_size_title');
        const b = await settingsService.get('coupon_font_size_body');
        const l = await settingsService.get('coupon_line_height');
        if (t) setTitleSize(parseFloat(t));
        if (b) setBodySize(parseFloat(b));
        if (l) setLineHeight(parseFloat(l));
      } catch (e) {
        console.error("Impossible de charger les préférences de police du coupon :", e);
      }
    };
    fetchPrintSettings();
  }, []);

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
        compact ? 'p-1 min-h-0 h-full flex flex-col' : 'p-8 min-h-[297mm]'
      } ${forcePageBreak ? 'page-break-after-always' : ''}`}
      style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontSize: `${compact ? Math.round((bodySize + 4) * compactScale) : bodySize}px`, lineHeight: compact ? Math.max(1.1, lineHeight * compactScale) : lineHeight } as any}
    >
      
      {/* ================================================================ */}
      {/* EN-TÊTE AVEC INFOS ÉCOLE ET ANNÉE SCOLAIRE */}
      {/* ================================================================ */}
      <div className="border-2 border-black mb-0">
        <div className="flex">
          {/* Colonne gauche : Infos école */}
          <div className="w-1/4 border-r border-black p-1" style={{ fontSize: `${compact ? Math.round(Math.max(8, bodySize + 1) * compactScale) : Math.max(6, bodySize - 0.5)}px` }}>
            <div className="mb-0">
              <span className="font-semibold">{schoolInfo.name}</span>
            </div>
            <div className="mb-0">
              <span className="font-semibold">B.P : {schoolInfo.pobox}</span>
            </div>
            <div className="mb-0">
              <span className="font-semibold">{schoolInfo.city}</span> 
            </div>
          </div>

          {/* Colonne centrale : Titre du bulletin */}
          <div className="flex-1 p-1 text-center border-r border-black flex items-center justify-center">
            <div className="font-medium uppercase leading-tight" style={{ fontSize: `${compact ? Math.round((titleSize + 5) * compactScale) : titleSize}px` }}>
              COUPON DE L'ÉLÈVE{' '}
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
          <div className="w-1/6 text-center flex flex-col justify-center" style={{ fontSize: `${compact ? Math.round(Math.max(7, bodySize) * compactScale) : Math.max(5, bodySize - 1)}px` }}>
            <div className="font-medium">ANNÉE SCOLAIRE</div>
            <div className="font-medium" style={{ fontSize: `${compact ? Math.round((bodySize + 2) * compactScale) : bodySize}px` }}>{academicYear}</div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* TABLEAU DES NOTES */}
      {/* ================================================================ */}
      <table className={`annual-coupon-table w-full border-2 border-black border-collapse text-center ${compact ? 'flex-1' : ''}`} style={{ fontSize: `${annualTableFontSize}px` }}>
        
        {/* -------------------------------------------------------------- */}
        {/* EN-TÊTE DU TABLEAU */}
        {/* -------------------------------------------------------------- */}
        <thead>
          {/* Ligne 1 : Semestres */}
          <tr>
            <th rowSpan={3} className="border border-black w-[22%] p-0">{compact ? 'Branches' : 'Branches'}</th>
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
            <td className="border border-black text-left px-2 py-0.5">MAXIMA</td>
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
                  <tr className="font-bold bg-slate-100 text-[13px]">
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
                      <tr key={subject.id} className="text-[13px]">
                        <td className="border border-black text-left px-2 py-0 whitespace-nowrap overflow-hidden text-ellipsis">{subject.name}</td>
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
              <td className="border border-black text-[13px] text-left px-2 py-0.5">&nbsp;</td>
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
            
                {/* POURCENTAGE — affiche aussi les % des examens */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 py-0.5">POURCENTAGE</td>
                  <td className="border border-black py-0.5" style={{ fontSize: `${annualSummaryFontSize}px` }}>{pctP1}%</td>
                  <td className="border border-black py-0.5" style={{ fontSize: `${annualSummaryFontSize}px` }}>{pctP2}%</td>
                  <td className={`border border-black py-0.5 ${maxEx1 === 0 ? 'bg-black' : ''}`} style={{ fontSize: `${annualSummaryFontSize}px` }}>{maxEx1 > 0 ? `${pctEx1}%` : ''}</td>
                  <td className="border border-black py-0.5" style={{ fontSize: `${annualSummaryFontSize}px` }}>{pctTot1}%</td>
                  <td className="border border-black py-0.5" style={{ fontSize: `${annualSummaryFontSize}px` }}>{pctP3}%</td>
                  <td className="border border-black py-0.5" style={{ fontSize: `${annualSummaryFontSize}px` }}>{pctP4}%</td>
                  <td className={`border border-black py-0.5 ${maxEx2 === 0 ? 'bg-black' : ''}`} style={{ fontSize: `${annualSummaryFontSize}px` }}>{maxEx2 > 0 ? `${pctEx2}%` : ''}</td>
                  <td className="border border-black py-0.5" style={{ fontSize: `${annualSummaryFontSize}px` }}>{pctTot2}%</td>
                  <td className="border border-black bg-slate-100 py-0.5" style={{ fontSize: `${annualSummaryFontSize}px` }}>{pctTG}%</td>
                </tr>

                {/* PLACE — affiche aussi les places des examens */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 py-0">PLACE</td>
                  <td className="border border-black py-0.5">{ranks?.p1 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black py-0.5">{ranks?.p2 ?? ''}/{totalStudents || '?'}</td>
                  <td className={`border border-black py-0.5 ${maxEx1 === 0 ? 'bg-black' : ''}`}>{maxEx1 > 0 ? `${ranks?.ex1 ?? '?'}/${totalStudents || '?'}` : ''}</td>
                  <td className="border border-black py-0.5">{ranks?.tot1 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black py-0.5">{ranks?.p3 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black py-0.5">{ranks?.p4 ?? ''}/{totalStudents || '?'}</td>
                  <td className={`border border-black py-0.5 ${maxEx2 === 0 ? 'bg-black' : ''}`}>{maxEx2 > 0 ? `${ranks?.ex2 ?? '?'}/${totalStudents || '?'}` : ''}</td>
                  <td className="border border-black py-0.5">{ranks?.tot2 ?? ''}/{totalStudents || '?'}</td>
                  <td className="border border-black bg-blue-50 py-0.5">{ranks?.tg ?? ''}/{totalStudents || '?'}</td>
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

                {/* CONDUITE */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2 py-0.5">CONDUITE</td>
                  <td className="border border-black py-0.5">{student.conduite_p1 || ''}</td>
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
          padding-top: ${annualCellPaddingY} !important;
          padding-bottom: ${annualCellPaddingY} !important;
        }
      `}</style>
    </div>
  );
}
