import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Printer } from '../iconsSvg';

// Importation du système d'impression et de gestion des repêchages
import PrintButton from './PrintWrapper';
import { repechageService, Repechage } from '../../services/repechageService';
import { deliberationConfigService, DeliberationConfig, DEFAULT_DELIBERATION_CONFIG } from '../../services/deliberationConfigService';

// Interface représentant un élève de la classe
interface Student {
  id: number;
  first_name: string;
  last_name: string;
  post_name: string;
  is_abandoned?: number | boolean;
  conduite_p1?: string;
  conduite_p2?: string;
  conduite_p3?: string;
  conduite_p4?: string;
  abandon_reason?: string;
}

// Interface représentant une matière (cours)
interface Subject {
  id: number;
  name: string;
  code: string;
  max_p1: number;
  max_p2: number;
  max_exam1: number;
  max_p3: number;
  max_p4: number;
  max_exam2: number;
}

// Interface représentant une note obtenue par un élève
interface Grade {
  student_id: number;
  subject_id: number;
  period: string;
  value: number;
}

// Interface représentant les informations de la classe active
interface ClassInfo {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

// Définition des catégories
// 1 = Passent 1ère session, 2 = Passent 2ème session, 3 = Doublent, 4 = Abandons, 5 = Non classés (Avant délib.)
type StudentCategory = 1 | 2 | 3 | 4 | 5;

// Interface représentant un élève classé dans le palmarès
interface RankedStudent {
  student: Student;
  percentage: number;
  rank: number;
  application: string;
  isUnranked: boolean;
  category: StudentCategory;
  failedSubjects: string[];
  repechageSubjects: string[];
  missingSubjects: string[];
  subjectDetails: {
    subjectName: string;
    subjectCode: string;
    points: number;
    maxPoints: number;
  }[];
}

type Period = 'P1' | 'P2' | 'EXAM1' | 'SEM1' | 'P3' | 'P4' | 'EXAM2' | 'SEM2' | 'ANNUAL';
type PalmaresMode = 'BEFORE_DELIBERATION' | 'AFTER_DELIBERATION' | 'REPECHAGE_LIST';

/**
 * Composant pour afficher les observations textuelles très précises des élèves dans le palmarès.
 */
const StudentObservation = ({
  rankedStudent,
  selectedPeriod,
}: {
  rankedStudent: RankedStudent;
  selectedPeriod: Period;
}) => {

  const student = rankedStudent.student;

  // =========================
  // ABANDON
  // =========================
  if (student.is_abandoned) {
    return (
      <span className="text-red-700 font-bold text-[12px] uppercase">
        Abandon{' '}
        {student.abandon_reason
          ? `: ${student.abandon_reason}`
          : ''}
      </span>
    );
  }

  // =========================
  // ANNUEL
  // =========================
  if (selectedPeriod === 'ANNUAL') {

    // Catégorie 1 et 3 = vide
    if (
      rankedStudent.category === 1 ||
      rankedStudent.category === 3
    ) {
      return null;
    }

    // Catégorie 2 = repêchages
    if (rankedStudent.category === 2) {

      const details =
        rankedStudent.subjectDetails.filter(
          (s: any) =>
            rankedStudent.repechageSubjects.includes(
              s.subjectCode || s.subjectName
            )
        );

      return (
        <div className="text-black text-[12px] font-semibold leading-tight">
          {details
            .map((s) => {
              return `${s.subjectCode || s.subjectName} ${s.points/s.maxPoints}`;
            })
            .join('; ')}
        </div>
      );
    }

    // Catégorie 5 = non classés
    if (rankedStudent.category === 5) {

      const missing: string[] = [];
      const failed: string[] = [];

      for (
        let i = 0;
        i < rankedStudent.subjectDetails.length;
        i++
      ) {

        const detail =
          rankedStudent.subjectDetails[i];

        const name =
          detail.subjectCode || detail.subjectName;

        if (
          rankedStudent.missingSubjects.includes(name)
        ) {

          missing.push(name);

        } else if (
          rankedStudent.failedSubjects.includes(name) ||
          rankedStudent.repechageSubjects.includes(name)
        ) {

          failed.push(`${name} ${detail.points}/${detail.maxPoints}`);
        }
      }

      return (
        <div className="flex flex-col text-black text-[12px] leading-tight space-y-0.5">

          {missing.length > 0 && (
            <span className="font-bold">
              {missing.join(', ')}
            </span>
          )}

          {failed.length > 0 && (
            <span className="font-semibold">
              {failed.join(';')}
            </span>
          )}

        </div>
      );
    }

    return null;
  }

// =========================
// SEMESTRES / PERIODES
// =========================

// Catégorie 1 = rien
if (rankedStudent.category === 1) {
  return null;
}

// =========================
// Catégorie 2 et 3
// Affichage des échecs
// =========================
// =========================
// Catégorie 2
// Affichage des échecs uniquement
// =========================
if (rankedStudent.category === 2) {

  const failedDetails =
    rankedStudent.subjectDetails.filter(
      (s) =>
        rankedStudent.failedSubjects.includes(
          s.subjectCode || s.subjectName
        )
    );

  return (
    <div className="text-black text-[12px] font-semibold leading-tight">

      {failedDetails
        .map((s) => {
          return `${s.subjectCode || s.subjectName}`;
        })
        .join(' ; ')}

    </div>
  );
}

// =========================
// Catégorie 3 = Ont échoués
// Aucun cours affiché
// =========================
if (rankedStudent.category === 3) {
  return null;
}


// =========================
// Catégorie 5 = non classés
// Matières manquantes EN GRAS
// Échecs en normal
// =========================
if (rankedStudent.category === 5) {

  const missing: string[] = [];
  const failed: string[] = [];

  for (
    let i = 0;
    i < rankedStudent.subjectDetails.length;
    i++
  ) {

    const detail =
      rankedStudent.subjectDetails[i];

    const name =
      detail.subjectCode || detail.subjectName;

    // =====================
    // MATIERES MANQUANTES
    // =====================
    if (
      rankedStudent.missingSubjects.includes(name)
    ) {

      missing.push(name);

    }

    // =====================
    // ECHECS
    // =====================
    else if (
      rankedStudent.failedSubjects.includes(name)
    ) {

      failed.push(
        `${name}`
      );
    }
  }

  return (
    <div className="flex flex-col text-[12px] leading-tight space-y-0.5">

      {/* MATIERES MANQUANTES */}
      {missing.length > 0 && (
        <span className="font-medium text-black">
          {missing.join(', ')}
        </span>
      )}

      {/* ECHECS */}
      {failed.length > 0 && (
        <span className="font-bold text-black">
          {failed.join(' ; ')}
        </span>
      )}

    </div>
  );
}

  return null;
};

interface PalmaresProps {
  classInfo: ClassInfo;
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  schoolName: string;
  schoolCity: string;
  schoolPoBox: string;
  onClose: () => void;
}

export default function Palmares({
  classInfo,
  students,
  subjects,
  grades,
  schoolName,
  schoolCity,
  schoolPoBox,
  onClose
}: PalmaresProps) {
  const palmaresRef = useRef<HTMLDivElement>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('SEM1');
  const [onlyAbandons, setOnlyAbandons] = useState(false);
  const [sortByAbandon] = useState(false);
  const [palmaresMode, setPalmaresMode] = useState<PalmaresMode>('BEFORE_DELIBERATION');
  const [repechages, setRepechages] = useState<Repechage[]>([]);
  const [delibConfig, setDelibConfig] = useState<DeliberationConfig>(DEFAULT_DELIBERATION_CONFIG);

  // Chargement des points de repêchage et de la config
  React.useEffect(() => {
    repechageService.getRepechagesByClass(classInfo.id).then(setRepechages).catch(console.error);
    deliberationConfigService.load().then(setDelibConfig).catch(console.error);
  }, [classInfo.id]);

  // Réinitialiser le mode de délibération si la période n'est pas annuelle
  React.useEffect(() => {
    if (selectedPeriod !== 'ANNUAL') {
      setPalmaresMode('BEFORE_DELIBERATION');
    }
  }, [selectedPeriod]);

    const periode : (period:string) => string = (period) => {
  switch (period) {
    case 'SEM1':
      return '1ère Semestre';
    case 'SEM2':
      return '2ème Semestre';
    case 'ANNUAL':
      return 'Année';
    case 'P1':
      return '1ère Période';
    case 'P2':
      return '2ème Période';
    case 'P3':
      return '3ème Période';
    case 'P4':
      return '4ème Période';
      default:
        return "None"
  }
}

  // CSS d'impression propre pour A4 portrait
  const printCss = `
    @page { 
      size: A4 portrait; 
      margin: 5mm; 
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body { 
      background: white; 
      margin: 0; 
      font-family: 'Inter', system-ui, sans-serif;
      color: #000000 !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #000000 !important;
      padding: 3px 5px !important;
      font-size: 11px !important;
      line-height: 1.15 !important;
      color: #000000 !important;
    }
  `;

  // Fonction utilitaire pour associer l'application au pourcentage
  const getApplication = (percentage: number): string => {
    return deliberationConfigService.getAppreciationAbrev(percentage, delibConfig);
  };

  // Récupération de la configuration des sous-périodes pour le calcul des notes
  const getPeriodConfig = (period: Period) => {
    const configs: Record<Period, Array<{ period: string; getMax: (s: Subject) => number }>> = {
      'P1': [{ period: 'P1', getMax: (s) => s.max_p1 }],
      'P2': [{ period: 'P2', getMax: (s) => s.max_p2 }],
      'EXAM1': [{ period: 'EXAM1', getMax: (s) => s.max_exam1 }],
      'SEM1': [
        { period: 'P1', getMax: (s) => s.max_p1 },
        { period: 'P2', getMax: (s) => s.max_p2 },
        { period: 'EXAM1', getMax: (s) => s.max_exam1 },
      ],
      'P3': [{ period: 'P3', getMax: (s) => s.max_p3 }],
      'P4': [{ period: 'P4', getMax: (s) => s.max_p4 }],
      'EXAM2': [{ period: 'EXAM2', getMax: (s) => s.max_exam2 }],
      'SEM2': [
        { period: 'P3', getMax: (s) => s.max_p3 },
        { period: 'P4', getMax: (s) => s.max_p4 },
        { period: 'EXAM2', getMax: (s) => s.max_exam2 },
      ],
      'ANNUAL': [
        { period: 'P1', getMax: (s) => s.max_p1 },
        { period: 'P2', getMax: (s) => s.max_p2 },
        { period: 'EXAM1', getMax: (s) => s.max_exam1 },
        { period: 'P3', getMax: (s) => s.max_p3 },
        { period: 'P4', getMax: (s) => s.max_p4 },
        { period: 'EXAM2', getMax: (s) => s.max_exam2 },
      ],
    };
    return configs[period];
  };

  // Calcul, classement et distribution des élèves au sein des 4 catégories
  const rankedStudents = useMemo(() => {
    const rankings: RankedStudent[] = [];
    let studentsToProcess = [...students];

    // Exclusion facultative des élèves ayant abandonné
    if (onlyAbandons) {
      studentsToProcess = studentsToProcess.filter(s => !s.is_abandoned);
    }

    if (sortByAbandon) {
      studentsToProcess.sort((a, b) => (b.is_abandoned ? 1 : 0) - (a.is_abandoned ? 1 : 0));
    }

    const periodsConfig = getPeriodConfig(selectedPeriod);

    for (const student of studentsToProcess) {
      let totalPoints = 0;
      let totalMaxPoints = 0;
      let hasAllGrades = true;
      const failedSubjects: string[] = [];
      const repechageSubjects: string[] = [];
      const missingSubjects: string[] = [];
      const subjectDetails: RankedStudent['subjectDetails'] = [];

      for (const subject of subjects) {
        let subjectPoints = 0;
        let subjectMaxPoints = 0;
        let subjectHasMissingGrade = false;

        for (const periodData of periodsConfig) {
          const maxForPeriod = periodData.getMax(subject);
          if (maxForPeriod === 0) continue;

          const gradeEntry = grades.find(g => g.student_id === student.id && g.subject_id === subject.id && g.period === periodData.period);
          const grade = gradeEntry ? gradeEntry.value : null;

          // Si une note attendue manque à l'appel
          if (grade === null) {
            hasAllGrades = false;
            subjectHasMissingGrade = true;
            if (!missingSubjects.includes(subject.code || subject.name)) {
              missingSubjects.push(subject.code || subject.name);
            }
            break;
          }
          subjectPoints += grade;
          subjectMaxPoints += maxForPeriod;
        }

        // === PRISE EN COMPTE DU REPÊCHAGE (DEUXIÈME SESSION) ===
        // Uniquement si on est dans le Palmarès Final (Après Délibération)
        if (palmaresMode === 'AFTER_DELIBERATION') {
          const rep = repechages.find(r => r.student_id === student.id && r.subject_id === subject.id);
          if (rep && rep.percentage > 0) {
            const newPoints = (rep.percentage / 100) * subjectMaxPoints;
            // On prend la meilleure des deux notes (normalement le repêchage est fait pour améliorer)
            if (newPoints > subjectPoints) {
              subjectPoints = newPoints;
            }
          }
        }

        // Cumul des points de l'élève
        if (!subjectHasMissingGrade) {
          totalPoints += subjectPoints;
          totalMaxPoints += subjectMaxPoints;
        }

        // Détection d'un échec uniquement si le cours a toutes ses notes
        // Identification des échecs (selon la config de délibération)
        if (subjectMaxPoints > 0) {
          const subjectPercentage = (subjectPoints / subjectMaxPoints) * 100;
          if (subjectPercentage < delibConfig.seuilEchecMatiere) {
            failedSubjects.push(subject.code || subject.name);
          }
        }

        // Vérification des repêchages (pour l'affichage textuel)
        const rep = repechages.find(r => r.student_id === student.id && r.subject_id === subject.id);
        if (rep && rep.percentage > 0) {
          repechageSubjects.push(subject.code || subject.name);
        }

        subjectDetails.push({
          subjectCode: subject.code,
          subjectName: subject.name,
          points: subjectPoints,
          maxPoints: subjectMaxPoints,
        });
      }

      // Calcul de la moyenne en pourcentage
      const percentage = hasAllGrades && totalMaxPoints > 0
        ? (totalPoints / totalMaxPoints) * 100
        : 0;

      // -- LOGIQUE DE RACHAT (DÉLIBÉRATION AUTOMATIQUE) --
      if (palmaresMode !== 'BEFORE_DELIBERATION' && hasAllGrades && percentage >= delibConfig.seuilReussiteGlobal && failedSubjects.length > 0) {
        // 1. Calcul du surplus total disponible
        let surplusDisponible = 0;
        subjectDetails.forEach(detail => {
          const moyenne = detail.maxPoints / 2;
          if (detail.points > moyenne) {
            surplusDisponible += (detail.points - moyenne);
          }
        });

        // 2. Traitement des échecs
        const remainingFailedSubjects: string[] = [];
        
        for (const failedSubjectName of failedSubjects) {
          const detailIndex = subjectDetails.findIndex(s => (s.subjectCode || s.subjectName) === failedSubjectName);
          if (detailIndex === -1) {
             remainingFailedSubjects.push(failedSubjectName);
             continue;
          }
          const detail = subjectDetails[detailIndex];
          const moyenne = detail.maxPoints / 2;
          const missingPoints = moyenne - detail.points;

          // Vérifier si l'échec est relevable selon la configuration
          const estRelevable = deliberationConfigService.isRelevable(detail.maxPoints, missingPoints, delibConfig);

          if (estRelevable && surplusDisponible >= missingPoints) {
            // L'élève est relevé : on puise dans le surplus et l'échec disparaît
            surplusDisponible -= missingPoints;
          } else {
            remainingFailedSubjects.push(failedSubjectName);
          }
        }
        
        // Mise à jour de la liste des échecs (les cours rachetés ont disparu)
        failedSubjects.length = 0;
        failedSubjects.push(...remainingFailedSubjects);
      }

      // Attribution de la catégorie correspondante
      let category: StudentCategory = 3;

      if (student.is_abandoned || !!student.abandon_reason) {
        category = 4; // Abandons (priorité absolue)
      } else if (!hasAllGrades || missingSubjects.length > 0) {
        if (palmaresMode === 'AFTER_DELIBERATION') {
          category = delibConfig.manqueCotesDoubleEnFinal ? 3 : 5;
        } else {
          category = 5;
        }
      } else if (percentage >= delibConfig.seuilReussiteGlobal) {

  // === ANNUEL ===
  if (selectedPeriod === 'ANNUAL') {

    if (repechageSubjects.length > 0) {
      category = 2; // Passent après repêchage
    } else {
      category = 1; // Passent directement
    }

  } 
  
  // === SEMESTRES / PÉRIODES ===
  else {

    if (failedSubjects.length > 0) {
      category = 2; // Réussi avec échecs
    } else {
      category = 1; // Réussi sans échecs
    }

  }

}

      rankings.push({
        student,
        percentage: hasAllGrades ? percentage : 0,
        rank: 0,
        application: hasAllGrades ? getApplication(percentage) : '-',
        isUnranked: category === 5,
        category,
        failedSubjects,
        repechageSubjects,
        missingSubjects,
        subjectDetails,
      });
    }

    // Séparation par catégories pour application des tris individuels
    const cat1 = rankings.filter(r => r.category === 1);
    const cat2 = rankings.filter(r => r.category === 2);
    const cat3 = rankings.filter(r => r.category === 3);
    const cat4 = rankings.filter(r => r.category === 4);
    const cat5 = rankings.filter(r => r.category === 5);

    // Tri par pourcentage décroissant pour les catégories classées
    const sortByPercentage = (a: RankedStudent, b: RankedStudent) => {
      if (b.percentage !== a.percentage) {
        return b.percentage - a.percentage;
      }
      const nameA = `${a.student.last_name} ${a.student.post_name || ''} ${a.student.first_name || ''}`;
      const nameB = `${b.student.last_name} ${b.student.post_name || ''} ${b.student.first_name || ''}`;
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    };

    // Tri alphabétique pour les non classés
    const sortByAlphabetical = (a: RankedStudent, b: RankedStudent) => {
      const nameA = `${a.student.last_name} ${a.student.post_name || ''} ${a.student.first_name || ''}`;
      const nameB = `${b.student.last_name} ${b.student.post_name || ''} ${b.student.first_name || ''}`;
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    };

    cat1.sort(sortByPercentage);
    cat2.sort(sortByPercentage);
    cat3.sort(sortByPercentage);
    cat4.sort(sortByAlphabetical);

    // Attribution de l'index séquentiel (1., 2., 3...) propre à chaque catégorie d'après le modèle
    for (let i = 0; i < cat1.length; i++) cat1[i].rank = i + 1;
    for (let i = 0; i < cat2.length; i++) cat2[i].rank = i + 1;
    for (let i = 0; i < cat3.length; i++) cat3[i].rank = i + 1;
    for (let i = 0; i < cat4.length; i++) cat4[i].rank = i + 1;
    for (let i = 0; i < cat5.length; i++) cat5[i].rank = i + 1;

    return [...cat1, ...cat2, ...cat3, ...cat4, ...cat5];
  }, [students, subjects, grades, selectedPeriod, onlyAbandons, sortByAbandon, repechages, palmaresMode, delibConfig]);

  // Calcul des statistiques d'en-tête conformes au modèle textuel
  const stats = {
    total: students.length,
    cat1: rankedStudents.filter(r => r.category === 1).length,
    cat2: rankedStudents.filter(r => r.category === 2).length,
    cat3: rankedStudents.filter(r => r.category === 3).length,
    cat4: rankedStudents.filter(r => r.category === 4).length,
    cat5: rankedStudents.filter(r => r.category === 5).length,
    passed: rankedStudents.filter(r => r.category === 1 || r.category === 2).length,
    failed: rankedStudents.filter(r => r.category === 3).length,
    participants: students.length - rankedStudents.filter(r => r.category === 4 || r.category === 5).length,
  };

  {/* Libellés dynamiques selon la période */}
const categoryLabels: Record<number, string> =
  selectedPeriod === 'ANNUAL'
    ? {
        1: delibConfig.categorie_1_label,
        2: delibConfig.categorie_2_label,
        3: delibConfig.categorie_3_label,
        4: delibConfig.categorie_4_label,
        5: delibConfig.categorie_5_label,
      }
    : {
        1: 'I. Ont Réussis sans échecs',
        2: 'II. Ont réussis avec des échecs',
        3: 'III. Ont échoués',
        4: 'IV. Abandons',
        5: 'V. Non classés',
      };

  // Filtrage des étudiants à afficher selon le mode
  let displayedStudents = palmaresMode === 'REPECHAGE_LIST'
    ? rankedStudents.filter(r => r.category === 2 || r.category === 5)
    : rankedStudents;

  if (palmaresMode === 'REPECHAGE_LIST') {
    displayedStudents = [...displayedStudents].sort((a, b) => {
      const nameA = `${a.student.last_name} ${a.student.post_name || ''} ${a.student.first_name || ''}`;
      const nameB = `${b.student.last_name} ${b.student.post_name || ''} ${b.student.first_name || ''}`;
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    });
  }

  const documentTitle = palmaresMode === 'REPECHAGE_LIST' ? 'LISTE DE REPECHAGE' : 'PALMARÈS';


  return (
    <div className="bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Barre d'outils supérieure propre et professionnelle (masquée à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 flex items-center gap-3 print:hidden">

        {/* Bouton Retour */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 active:scale-[0.97] transition-all duration-150 font-medium text-sm cursor-pointer"
        >
          <ArrowLeft size={16} />
          Retour
        </button>

        {/* Séparateur vertical */}
        <div className="h-7 w-px bg-slate-200"></div>

        {/* Sélection de la Période */}
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as Period)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none bg-white font-medium text-slate-700 text-sm cursor-pointer"
        >
          <option value="P1">1ère Période</option>
          <option value="P2">2ème Période</option>
          <option value="EXAM1">Examen 1er Sem.</option>
          <option value="SEM1">Semestre 1</option>
          <option value="P3">3ème Période</option>
          <option value="P4">4ème Période</option>
          <option value="EXAM2">Examen 2ème Sem.</option>
          <option value="SEM2">Semestre 2</option>
          <option value="ANNUAL">Annuel</option>
        </select>

        {/* Sélection du mode de Délibération (uniquement si période Annuel) */}
        {selectedPeriod === 'ANNUAL' && (
          <select
            value={palmaresMode}
            onChange={(e) => setPalmaresMode(e.target.value as PalmaresMode)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none bg-white font-medium text-slate-700 text-sm cursor-pointer animate-fade-in"
          >
            <option value="BEFORE_DELIBERATION">Avant Délibération</option>
            <option value="AFTER_DELIBERATION">Palmarès Final (De Délib.)</option>
            <option value="REPECHAGE_LIST">Liste de Repêchage</option>
          </select>
        )}

        {/* Filtre d'exclusion des Abandons */}
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none hover:text-slate-800 transition-colors">
          <input
            type="checkbox"
            checked={onlyAbandons}
            onChange={(e) => setOnlyAbandons(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          Sans abandons
        </label>

        {/* Espacement flexible pour pousser le bouton Imprimer à droite */}
        <div className="flex-1"></div>

        {/* Bouton d'impression */}
        <PrintButton
          targetRef={palmaresRef}
          title={`${documentTitle} de la ${classInfo.name} - ${periode(selectedPeriod)}`}
          extraCss={printCss}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-[0.97] transition-all duration-150 shadow-sm font-medium text-sm cursor-pointer"
        >
          <Printer size={16} />
          Imprimer
        </PrintButton>
      </div>

      {/* Rendu imprimable du palmarès */}
      <div
        ref={palmaresRef}
        className="print-container max-w-[210mm] mx-auto bg-white shadow-xl p-6 print:p-2 min-h-[297mm] text-black"
      >
        {/* En-tête supérieure avec les informations de l'école et des statistiques (Classe et Effectif retirés) */}
        <div className="flex justify-between items-start mb-4 font-bold text-[14px] text-black border-b border-black/80 pb-2">
          <div className="space-y-0.5">
            <p className="uppercase">École: {schoolName}</p>
            <p className="uppercase">Ville: {schoolCity}</p>
            {schoolPoBox && <p className="uppercase">Boîte Postale: {schoolPoBox}</p>}
          </div>

          <div className="space-y-0.5 text-right uppercase">
            <p>Ont réussis: {stats.passed}</p>
            <p>Ont échoué: {stats.failed}</p>
            <p>Non classés: {stats.cat4}</p>
          </div>
        </div>

        {/* Titre principal centré à l'extérieur pour un rendu très professionnel */}
        <div className="text-center font-black text-[16px] uppercase tracking-wider mb-5 text-black">
          <span className="border-b-2 border-black pb-0.5 px-4 inline-block">
            {documentTitle} de la {classInfo.name.toUpperCase()} - {periode(selectedPeriod)}
          </span>
        </div>

{/* Rendu conditionnel du tableau selon le mode */}
{palmaresMode === 'REPECHAGE_LIST' ? (
  <table className="w-full border-collapse border border-black text-[14px] text-black">
    <thead>
      <tr className="font-bold text-black border border-black">
        <th className="border border-black px-1.5 py-1 w-10 text-center">N°</th>
        <th className="border border-black px-2.5 py-1 text-left">Nom et PostNom</th>
        <th className="border border-black px-2.5 py-1 text-center">Repêchage</th>
        <th className="border border-black px-2.5 py-1 text-center">Session - unique</th>
      </tr>
    </thead>

    <tbody>
      {displayedStudents.map((rankedStudent, index) => {
        const missing = rankedStudent.missingSubjects.join(', ');
        const failed = rankedStudent.failedSubjects.join(', ');

        return (
          <tr
            key={rankedStudent.student.id}
            className="border border-black font-semibold leading-none"
          >
            <td className="border border-black px-1.5 py-0 text-center">
              {index + 1}.
            </td>

            <td className="border border-black px-2.5 py-0">
              {rankedStudent.student.last_name}{' '}
              {rankedStudent.student.post_name}{' '}
              {rankedStudent.student.first_name}
            </td>

            <td className="border border-black px-2.5 py-0 text-center text-black">
              {failed}
            </td>

            <td className="border border-black px-2.5 py-0 text-center text-black">
              {missing}
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
) : (
  <table className="w-full border-collapse border border-black text-[13px] text-black">
    <thead>
      <tr className="font-bold text-black border border-black uppercase text-[12px]">
        <th className="border border-black px-1.5 py-1 w-8 text-center">
          N°
        </th>

        <th className="border border-black px-2.5 py-1 text-left">
          NOMS ET POST NOMS
        </th>

        <th className="border border-black px-1.5 py-1 w-12 text-center">
          %
        </th>

        {/* === DIFFERENCE ENTRE SEMESTRE/PERIODE ET ANNUEL === */}
        {selectedPeriod === 'ANNUAL' ? (
          <th className="border border-black px-2.5 py-1 text-left">
            REPECHAGES
          </th>
        ) : (
          <>
            <th className="border border-black px-2.5 py-1 text-center">
              CONDUITE
            </th>

            <th className="border border-black px-2.5 py-1 text-left">
              OBSERVATION
            </th>
          </>
        )}
      </tr>
    </thead>

    <tbody>
      {displayedStudents.map((rankedStudent, index) => {
        const prev =
          index > 0 ? displayedStudents[index - 1] : null;

        const isNewCat =
          !prev || prev.category !== rankedStudent.category;

        let catCount = 0;

        if (rankedStudent.category === 1) catCount = stats.cat1;
        if (rankedStudent.category === 2) catCount = stats.cat2;
        if (rankedStudent.category === 3) catCount = stats.cat3;
        if (rankedStudent.category === 4) catCount = stats.cat4;
        if (rankedStudent.category === 5) catCount = stats.cat5;

        const pctStr =
          stats.total > 0
            ? ((catCount / stats.total) * 100)
                .toFixed(1)
                .replace('.0', '')
            : '0';

        // === CONDUITE SELON LA PERIODE ===
        let conduite = '-';

        if (selectedPeriod === 'P1')
          conduite = rankedStudent.student.conduite_p1 || '-';

        else if (
          selectedPeriod === 'P2' ||
          selectedPeriod === 'SEM1' ||
          selectedPeriod === 'EXAM1'
        )
          conduite = rankedStudent.student.conduite_p2 || '-';

        else if (selectedPeriod === 'P3')
          conduite = rankedStudent.student.conduite_p3 || '-';

        else if (
          selectedPeriod === 'P4' ||
          selectedPeriod === 'SEM2' ||
          selectedPeriod === 'EXAM2'
        )
          conduite = rankedStudent.student.conduite_p4 || '-';

        return (
          <React.Fragment key={rankedStudent.student.id}>
            {isNewCat && (
              <tr className="bg-slate-100 border-y border-black font-bold">
                <td
                  colSpan={
                    selectedPeriod === 'ANNUAL' ? 4 : 5
                  }
                  className="border border-black px-2 py-1 text-center font-bold text-black text-[12px] uppercase"
                >
                  <div className="flex w-full justify-center items-center gap-8">
                    <span>
                      {categoryLabels[rankedStudent.category]}
                    </span>

                    <span>
                      {catCount}/{stats.total} soit {pctStr} %
                    </span>
                  </div>
                </td>
              </tr>
            )}

            <tr className="border border-black font-semibold leading-none">
              {/* N° */}
              <td className="border border-black px-1.5 py-0 text-center">
                {rankedStudent.rank
                  .toString()
                  .padStart(2, '0')}
              </td>

              {/* Nom */}
              <td className="border border-black px-2.5 py-0 uppercase">
                {rankedStudent.student.last_name}{' '}
                {rankedStudent.student.post_name}{' '}
                {rankedStudent.student.first_name}
              </td>

              {/* Pourcentage */}
              <td className="border border-black px-1.5 py-0 text-center text-black">
                {rankedStudent.category === 4 ||
                rankedStudent.category === 5
                  ? ''
                  : `${rankedStudent.percentage
                      .toFixed(1)
                      .replace('.', ',')
                      .replace(',0', '')}`}
              </td>

              {/* === ANNUEL === */}
              {selectedPeriod === 'ANNUAL' ? (
                <td className="border border-black px-2.5 py-0">
                  <StudentObservation
  rankedStudent={rankedStudent}
  selectedPeriod={selectedPeriod}
/>
                </td>
              ) : (
                <>
                  {/* CONDUITE */}
                  <td className="border border-black px-2.5 py-0 text-center uppercase">
                    {conduite}
                  </td>

                  {/* OBSERVATION */}
                  <td className="border border-black px-2.5 py-0">
                   <StudentObservation
  rankedStudent={rankedStudent}
  selectedPeriod={selectedPeriod}
/>
                  </td>
                </>
              )}
            </tr>
          </React.Fragment>
        );
      })}
    </tbody>
  </table>
)}

        {/* Bas de page pour les signatures officielles */}
        <div className="mt-8 flex justify-between text-[12px] text-black font-bold break-inside-avoid">
          <div className="text-center">
            <p className="font-bold mb-8">Le Chef d'Établissement</p>
            <p className="border-t border-black pt-1 px-4">Nom et Signature</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Fait à {schoolCity}</p>
            <p>Le ____/____/______</p>
          </div>
        </div>
      </div>
    </div>
  );
}
