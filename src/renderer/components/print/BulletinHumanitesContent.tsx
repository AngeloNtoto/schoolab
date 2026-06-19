/**
 * BulletinHumanitesContent.tsx
 * 
 * Composant de présentation pure pour le bulletin des humanités.
 */

import React, { useState, useEffect } from 'react';
import { Student } from '../../services/studentService';
import { ClassData, Subject } from '../../services/classService';
import { Grade } from '../../services/gradeService';
import { StudentRanks } from '../../services/bulletinService';

import { Repechage } from '../../services/repechageService';
import { settingsService } from '../../services/settingsService';
import { deliberationConfigService, DeliberationConfig, DEFAULT_DELIBERATION_CONFIG } from '../../services/deliberationConfigService';
import drapeauUrl from '../../../../assets/drapeau.svg';
import armoirieUrl from '../../../../assets/armoirie.svg';

export interface BulletinHumanitesContentProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  repechages: Repechage[];
  schoolName: string;
  schoolCity: string;
  studentRanks: StudentRanks;
  totalStudents: number;
  academicYear: string;
}

const getApplication = (percentage: number | null, config: DeliberationConfig): string => {
  if (percentage === null) return '';
  return deliberationConfigService.getAppreciationAbrev(percentage, config);
};

const getSubjectToneClass = (percentage: number | null, threshold: number) => {
  if (percentage === null) return '';
  return percentage < threshold
    ? 'subject-passed'
    : 'subject-failed';
};

export default function BulletinHumanitesContent({
  student,
  classInfo,
  subjects,
  grades,
  repechages = [],
  schoolName,
  schoolCity,
  studentRanks,
  totalStudents,
  academicYear
}: BulletinHumanitesContentProps) {

  // États locaux de mise en page d'impression dynamique
  const [titleSize, setTitleSize] = useState(16);
  const [bodySize, setBodySize] = useState(10);
  const [lineHeight, setLineHeight] = useState(1.2);
  const [delibConfig, setDelibConfig] = useState<DeliberationConfig>(DEFAULT_DELIBERATION_CONFIG);

  useEffect(() => {
    const fetchPrintSettings = async () => {
      try {
        const t = await settingsService.get('bulletin_font_size_title');
        const b = await settingsService.get('bulletin_font_size_body');
        const l = await settingsService.get('bulletin_line_height');
        const config = await deliberationConfigService.load();
        
        if (t) setTitleSize(parseFloat(t));
        if (b) setBodySize(parseFloat(b));
        if (l) setLineHeight(parseFloat(l));
        setDelibConfig(config);
      } catch (e) {
        console.error("Erreur technique lors du chargement des tailles de polices d'impression :", e);
      }
    };
    fetchPrintSettings();
  }, []);

  // ============================================================================
  // FONCTIONS UTILITAIRES
  // ============================================================================

  const getGrade = (subjectId: number, period: string) => {
    const g = grades.find(g => g.subject_id === subjectId && g.period === period);
    return g ? g.value : null;
  };

  const formatValue = (val: number | null | undefined): string => {
    if (val === null || val === undefined) return '';
    if (val === -1) return 'zéro';
    return Number.isInteger(val) ? val.toString() : val.toFixed(1);
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

  const abregeConduite = (conduite?: string | null) => {
    switch(conduite?.toUpperCase()){ 
      case 'ELUTE': return 'E';
      case 'TRES BON': return 'TB';
      case 'BON': return 'B';
      case 'MAUVAIS': return 'Ma';
      case 'MEDIOCRE': return 'Me';
      case 'INSUFFISANT': return 'I';
  }}

  return (
    <div className="max-w-[210mm] mx-auto bg-white p-2 print:p-0 min-h-[297mm] relative text-black font-serif print:shadow-none print:mx-0 print:w-full print:max-w-none page-break-after-always" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontSize: `${bodySize * 0.95}px`, lineHeight: lineHeight } as any}>
      
      {/* ===== CADRE GLOBAL DU BULLETIN ===== */}
      {/* Un cadre unique englobe l'intégralité du bulletin pour un rendu officiel soigné */}
      <div className="bulletin-cadre-global" style={{ border: '3px solid #000', padding: '0' }}>

      {/* Header */}
      {/* En-tête du bulletin — bordures internes seulement (le cadre global fait le tour) */}
      <div className="mb-0">
        <div className="flex border-b-2 border-black">
          {/* Flag */}
          <div className="w-20 border-r border-black p-1 flex items-center justify-center">
            <div className="w-full aspect-[4/3] border border-black shadow-sm overflow-hidden bg-white">
              <img src={drapeauUrl} alt="Drapeau de la RDC" className="w-full h-full object-cover" />
            </div>
          </div>
          
          {/* Title */}
          <div className="flex-1 text-center py-1 flex flex-col justify-center">
            <h1 className="font-medium uppercase leading-tight" style={{ fontSize: `${Math.max(10, titleSize - 3)}px` }}>Republique Democratique du Congo</h1>
            <h2 className="font-medium uppercase leading-tight" style={{ fontSize: `${Math.max(8, titleSize - 5)}px` }}>Ministere de l'Education Nationale</h2>
            <h3 className="font-medium uppercase leading-tight" style={{ fontSize: `${Math.max(8, titleSize - 5)}px` }}>Et Nouvelle Citoyennete</h3>
          </div>

          {/* Coat of arms */}
          <div className="w-20 border-l border-black p-1 flex items-center justify-center">
            <div className="w-14 h-14 overflow-hidden">
              <img src={armoirieUrl} alt="Armoiries de la RDC" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>

        {/* ID Row */}
        <div className="flex border-b-2 border-black">
          <div className="w-20 font-bold p-0.5 border-r border-black bg-slate-100">N° ID.</div>
          <div className="flex-1 flex">
            {Array(20).fill(0).map((_, i) => (
              <div key={i} className="flex-1 border-r border-black last:border-r-0"></div>
            ))}
          </div>
        </div>

        {/* Province */}
        <div className="px-1 py-0.5 font-bold border-b-2 border-black bg-slate-100">
          PROVINCE EDUCATIONNELLE :..........................................................................................................................................................................................
        </div>
      </div>

      {/* Info Grid */}
      {/* Grille d'informations de l'élève — sans bordure propre, contenue dans le cadre global */}
      <div className="mb-0 p-0.5 grid grid-cols-2 gap-x-4 gap-y-0.5 border-b-2 border-black">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold min-w-[60px]">VILLE :</span>
          <span className="border-b border-dotted border-black flex-1 text-center font-semibold">{schoolCity}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold min-w-[60px]">ELEVE :</span>
          <span className="border-b border-dotted border-black flex-1 text-center font-semibold uppercase">
            {student.last_name} {student.post_name} {student.first_name}
          </span>
          <span className="font-semibold">SEXE : {student.gender}</span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-semibold min-w-[60px]">COMMUNE :</span>
          <span className="border-b border-dotted border-black flex-1"></span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold min-w-[60px]">NE(E) A :</span>
          <span className="border-b border-dotted border-black flex-1 text-center">
            {student.birthplace}
          </span>
          <span className="font-semibold">LE</span>
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
      {/* Titre du bulletin — harmonisé avec le cadre global */}
      <div className="p-0.5 bg-slate-100 uppercase flex items-center justify-between font-bold border-b-2 border-black" style={{ fontSize: `${titleSize * 0.65}px`, lineHeight: '1.2' }}>
        <span className="pl-4">BULLETIN DE LA {classInfo.level} ANNÉE DES HUMANITES {classInfo.option}</span>
        <span className="pr-4">ANNEE SCOLAIRE {academicYear}</span>
      </div>

      {/* Grades Table */}
      {/* Tableau des notes — bordures internes, le cadre global fait le tour extérieur */}
      <table className="w-full border-collapse text-center" style={{ fontSize: `${Math.max(5.5, bodySize - 2)}px` }}>
        <thead>
          <tr>
            <th rowSpan={3} className="border border-black w-[18%] p-0">BRANCHES</th>
            <th colSpan={4} className="border border-black bg-slate-50 p-0">PREMIER SEMESTRE</th>
            <th colSpan={4} className="border border-black bg-slate-50 p-0">SECOND SEMESTRE</th>
            <th rowSpan={3} className="border border-black w-[5%] p-0">T.G.</th>
            <th colSpan={2} className="border border-black w-[15%] p-0">EXAMEN DE<br/>REPECHAGE</th>
          </tr>
          <tr>
            <th colSpan={2} className="border border-black p-0">TR. JOURNAL</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">EXAM..</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">TOT.</th>
            <th colSpan={2} className="border border-black p-0">TR. JOURNAL</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">EXAM..</th>
            <th rowSpan={2} className="border border-black w-[6%] p-0">TOT.</th>
            <th rowSpan={2} className="border border-black w-[5%] p-0">%</th>
            <th rowSpan={2} className="border border-black p-0">Sign. Prof.</th>
          </tr>
          <tr>
            <th className="border border-black w-[6%] p-0">1ère P.</th>
            <th className="border border-black w-[6%] p-0">2e P.</th>
            <th className="border border-black w-[6%] p-0">3e P.</th>
            <th className="border border-black w-[6%] p-0">4e P.</th>
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
                  <tr className="font-bold bg-slate-300">
                    <td className="border border-black text-left px-2 py-0.5">MAXIMA</td>
                    <td className="border border-black py-0.5">{firstSubject.max_p1}</td>
                    <td className="border border-black py-0.5">{firstSubject.max_p2}</td>
                    {firstSubject.max_exam1==0?(<td className="border bg-black border-black py-0.5"></td>):(<td className="border border-black py-0.5">{firstSubject.max_exam1}</td>)}
                    <td className="border border-black py-0.5">{sem1Total}</td>
                    <td className="border border-black py-0.5">{firstSubject.max_p3}</td>
                    <td className="border border-black py-0.5">{firstSubject.max_p4}</td>
                    {firstSubject.max_exam2===0?(<td className="border bg-black border-black py-0.5"></td>):(<td className="border border-black py-0.5">{firstSubject.max_exam2}</td>)}
                    <td className="border border-black py-0.5">{sem2Total}</td>
                    <td className="border border-black py-0.5">{totalMax}</td>
                    <td className="border border-black bg-black py-0.5"></td>
                    <td className="border border-black bg-black py-0.5"></td>
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

                    // --- Calcul du pourcentage PAR PÉRIODE pour la couleur réussite/échec ---
                    // Chaque cellule est colorée selon son propre pourcentage, pas le total annuel
                    const seuil = delibConfig.seuilEchecMatiere;

                    // Pourcentage par période individuelle (P1, P2, P3, P4)
                    const pctP1 = (p1 !== null && firstSubject.max_p1 > 0) ? (p1 / firstSubject.max_p1) * 100 : null;
                    const pctP2 = (p2 !== null && firstSubject.max_p2 > 0) ? (p2 / firstSubject.max_p2) * 100 : null;
                    const pctEx1 = (ex1 !== null && firstSubject.max_exam1 > 0) ? (ex1 / firstSubject.max_exam1) * 100 : null;
                    const pctP3 = (p3 !== null && firstSubject.max_p3 > 0) ? (p3 / firstSubject.max_p3) * 100 : null;
                    const pctP4 = (p4 !== null && firstSubject.max_p4 > 0) ? (p4 / firstSubject.max_p4) * 100 : null;
                    const pctEx2 = (ex2 !== null && firstSubject.max_exam2 > 0) ? (ex2 / firstSubject.max_exam2) * 100 : null;

                    // Pourcentage par semestre (Tot1 = P1+P2+Exam1, Tot2 = P3+P4+Exam2)
                    const maxSem1 = firstSubject.max_p1 + firstSubject.max_p2 + firstSubject.max_exam1;
                    const maxSem2 = firstSubject.max_p3 + firstSubject.max_p4 + firstSubject.max_exam2;
                    const pctTot1 = (tot1 !== null && maxSem1 > 0) ? (tot1 / maxSem1) * 100 : null;
                    const pctTot2 = (tot2 !== null && maxSem2 > 0) ? (tot2 / maxSem2) * 100 : null;

                    // Pourcentage du Total Général (annuel)
                    const tg = (tot1 !== null || tot2 !== null) ? (tot1 || 0) + (tot2 || 0) : null;
                    const totalMax = maxSem1 + maxSem2;
                    const pctTG = (tg !== null && totalMax > 0) ? (tg / totalMax) * 100 : null;

                    // Classe CSS de couleur par cellule
                    const toneP1 = getSubjectToneClass(pctP1, seuil);
                    const toneP2 = getSubjectToneClass(pctP2, seuil);
                    const toneEx1 = getSubjectToneClass(pctEx1, seuil);
                    const toneTot1 = getSubjectToneClass(pctTot1, seuil);
                    const toneP3 = getSubjectToneClass(pctP3, seuil);
                    const toneP4 = getSubjectToneClass(pctP4, seuil);
                    const toneEx2 = getSubjectToneClass(pctEx2, seuil);
                    const toneTot2 = getSubjectToneClass(pctTot2, seuil);
                    const toneTG = getSubjectToneClass(pctTG, seuil);

                    /**
                     * NOTE IMPORTANTE : Le champ voir_bureau est volontairement ignoré ici.
                     * Le bulletin affiche uniquement le pourcentage de repêchage (valeur chiffrée).
                     * Le VB est réservé à la liste de repêchage du palmarès.
                     */
                    const repechage = repechages.find(
                      r => r.student_id === student.id && r.subject_id === subject.id && (r.percentage ?? 0) > 0
                    );

                    return (
                      <tr key={subject.id}>
                        {/* Nom de la branche — taille augmentée pour meilleure lisibilité */}
                        <td className="border border-black text-left px-1 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: `${Math.max(7, bodySize - 1)}px` }}>{subject.name}</td>
                        <td className={`border border-black py-0.5 ${toneP1}`}>{formatValue(p1)}</td>
                        <td className={`border border-black py-0.5 ${toneP2}`}>{formatValue(p2)}</td>
                        {ex1 === null && firstSubject.max_exam1==0 ? (<td className="border bg-black border-black py-0.5"></td>) : (<td className={`border border-black py-0.5 ${toneEx1}`}>{formatValue(ex1)}</td>)}
                        <td className={`border border-black font-bold py-0.5 ${toneTot1}`}>{formatValue(tot1)}</td>
                        <td className={`border border-black py-0.5 ${toneP3}`}>{formatValue(p3)}</td>
                        <td className={`border border-black py-0.5 ${toneP4}`}>{formatValue(p4)}</td>
                        {ex2 === null && firstSubject.max_exam2==0 ? (<td className="border bg-black border-black py-0.5"></td>) : (<td className={`border border-black py-0.5 ${toneEx2}`}>{formatValue(ex2)}</td>)}
                        <td className={`border border-black font-bold py-0.5 ${toneTot2}`}>{formatValue(tot2)}</td>
                        <td className={`border border-black font-bold bg-slate-50 py-0.5 ${toneTG}`}>{formatValue(tg)}</td>
                        <td className={`border border-black py-0.5 ${toneTG}`}>{repechage?.percentage ? `${repechage.percentage}%` : ''}</td>
                        <td className="border border-black py-0.5"></td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}


          {/* Empty rows to fill space if needed */}
          {Array(Math.max(0,5 - subjects.length)).fill(0).map((_, i) => (
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
                <td className="border border-black text-left px-2 py-0.5">MAXIMA GENERAUX</td>
                <td className="border border-black py-0.5">{maxP1}</td>
                <td className="border border-black py-0.5">{maxP2}</td>
                <td className="border border-black py-0.5">{maxEx1}</td>
                <td className="border border-black py-0.5">{maxTot1}</td>
                <td className="border border-black py-0.5">{maxP3}</td>
                <td className="border border-black py-0.5">{maxP4}</td>
                <td className="border border-black py-0.5">{maxEx2}</td>
                <td className="border border-black py-0.5">{maxTot2}</td>
                <td className="border border-black py-0.5">{maxTG}</td>
                <td className="border border-black bg-black py-0.5"></td>
                <td className="border border-black bg-black py-0.5"></td>
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

            // Track missing grades
            let hasMissingP1 = false, hasMissingP2 = false, hasMissingEx1 = false;
            let hasMissingP3 = false, hasMissingP4 = false, hasMissingEx2 = false;
            
            subjects.forEach(subject => {
              const p1 = getGrade(subject.id, 'P1');
              const p2 = getGrade(subject.id, 'P2');
              const ex1 = getGrade(subject.id, 'EXAM1');
              const tot1 = calculateTotal(subject.id, ['P1', 'P2', 'EXAM1']);
              
              const p3 = getGrade(subject.id, 'P3');
              const p4 = getGrade(subject.id, 'P4');
              const ex2 = getGrade(subject.id, 'EXAM2');
              const tot2 = calculateTotal(subject.id, ['P3', 'P4', 'EXAM2']);
              
              if (subject.max_p1 > 0 && p1 === null) hasMissingP1 = true;
              if (subject.max_p2 > 0 && p2 === null) hasMissingP2 = true;
              if (subject.max_exam1 > 0 && ex1 === null) hasMissingEx1 = true;
              
              if (subject.max_p3 > 0 && p3 === null) hasMissingP3 = true;
              if (subject.max_p4 > 0 && p4 === null) hasMissingP4 = true;
              if (subject.max_exam2 > 0 && ex2 === null) hasMissingEx2 = true;

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
            
            const hasMissingTot1 = hasMissingP1 || hasMissingP2 || hasMissingEx1;
            const hasMissingTot2 = hasMissingP3 || hasMissingP4 || hasMissingEx2;
            const hasMissingTG = hasMissingTot1 || hasMissingTot2;

            // Calculate percentages, hide them if missing grades
            const pctP1 = (!hasMissingP1 && maxP1 > 0) ? ((totalP1 / maxP1) * 100).toFixed(1) : '';
            const pctP2 = (!hasMissingP2 && maxP2 > 0) ? ((totalP2 / maxP2) * 100).toFixed(1) : '';
            const pctEx1 = (!hasMissingEx1 && maxEx1 > 0) ? ((totalEx1 / maxEx1) * 100).toFixed(1) : '';
            const pctTot1 = (!hasMissingTot1 && maxTot1 > 0) ? ((totalTot1 / maxTot1) * 100).toFixed(1) : '';
            
            const pctP3 = (!hasMissingP3 && maxP3 > 0) ? ((totalP3 / maxP3) * 100).toFixed(1) : '';
            const pctP4 = (!hasMissingP4 && maxP4 > 0) ? ((totalP4 / maxP4) * 100).toFixed(1) : '';
            const pctEx2 = (!hasMissingEx2 && maxEx2 > 0) ? ((totalEx2 / maxEx2) * 100).toFixed(1) : '';
            const pctTot2 = (!hasMissingTot2 && maxTot2 > 0) ? ((totalTot2 / maxTot2) * 100).toFixed(1) : '';
            
            const pctTG = (!hasMissingTG && maxTG > 0) ? ((totalTG / maxTG) * 100).toFixed(1) : '';
            
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
                {/* Pourcentages avec taille dynamique selon les préférences de mise en page */}
                <tr className="font-bold">
                  <td className="border border-black text-left px-2">POURCENTAGE</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctP1 ? `${pctP1}%` : ''}</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctP2 ? `${pctP2}%` : ''}</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctEx1 ? `${pctEx1}%` : ''}</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctTot1 ? `${pctTot1}%` : ''}</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctP3 ? `${pctP3}%` : ''}</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctP4 ? `${pctP4}%` : ''}</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctEx2 ? `${pctEx2}%` : ''}</td>
                  <td className="border border-black" style={{ fontSize: `${bodySize}px` }}>{pctTot2 ? `${pctTot2}%` : ''}</td>
                  <td className="border border-black bg-slate-100" style={{ fontSize: `${bodySize}px` }}>{pctTG ? `${pctTG}%` : ''}</td>
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
                  <td className="border border-black">{getApplication(pctP1 !== '0' ? parseFloat(pctP1) : null, delibConfig)}</td>
                  <td className="border border-black">{getApplication(pctP2 !== '0' ? parseFloat(pctP2) : null, delibConfig)}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{getApplication(pctP3 !== '0' ? parseFloat(pctP3) : null, delibConfig)}</td>
                  <td className="border border-black">{getApplication(pctP4 !== '0' ? parseFloat(pctP4) : null, delibConfig)}</td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                </tr>
                <tr>
                  <td className="border border-black text-left px-2 font-bold">CONDUITE</td>
                  <td className="border border-black">{abregeConduite(student.conduite_p1)}</td>
                  <td className="border border-black"> {abregeConduite(student.conduite_p2)} </td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black bg-black"></td>
                  <td className="border border-black">{abregeConduite(student.conduite_p3)}</td>
                  <td className="border border-black">{abregeConduite(student.conduite_p4)}</td>
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

      {/* Pied de page — inclus dans le cadre global, donc pas de bordure propre */}
      <div className="p-2 text-[10px] border-t-2 border-black">
        <div className="mb-0">
          - L'élève ne pourra passer dans la classe supérieure s'il n'a subi avec succès un examen de repêchage en ............................................................................................(1)
        </div>
        <div className="mb-0">
          - L'élève passe dans la classe supérieure (1)<br/>
          - L'élève double la classe (1)
        </div>
        
        <div className="flex justify-between items-end mt-0 px-8">
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

        <div className="mt-0 text-[6px]">
          <p>(1) Biffer la mention inutile.</p>
          <p>Note importante : Le bulletin est sans valeur s'il est raturé ou surchargé.</p>
          <p className="text-right font-bold">IGE / P.S./113</p>
          <p className="text-center font-bold italic border-t border-black mt-1 pt-1">
            Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi.
          </p>
        </div>
      </div>

      {/* ===== FIN DU CADRE GLOBAL ===== */}
      </div>

      <style>{`
        .subject-passed {
          color: #b91c1c;
          font-weight: 650;
          font-style: italic;
        }

        .subject-failed {
          color: #0423AF;
          font-weight: 200;
        }

        @media print {
          /* Saut de page après chaque bulletin */
          .page-break-after-always {
            page-break-after: always;
          }

          /* Cadre global du bulletin — bien visible à l'impression */
          .bulletin-cadre-global {
            border: 3px solid #000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Couleurs réussite/échec en noir à l'impression (pas de couleur) */
          .subject-passed,
          .subject-failed {
            color: #000 !important;
          }

          /* Épaisseur différente pour distinguer réussite et échec */
          .subject-passed {
            font-weight: 650 !important;
            font-style: italic;
          }

          .subject-failed {
            font-weight: 200 !important;
          }
        }
      `}</style>
    </div>
  );
}
