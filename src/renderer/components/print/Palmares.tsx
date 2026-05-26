import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Printer } from '../iconsSvg';

// Importation du système d'impression et de gestion des repêchages
import PrintButton from './PrintWrapper';
import { repechageService, Repechage } from '../../services/repechageService';

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

// Définition des 4 catégories conformément aux règles de délibération
// 1 = Réussi sans échec, 2 = Réussi avec échec, 3 = Ont échoué, 4 = Non classés
type StudentCategory = 1 | 2 | 3 | 4;

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

// Libellés pour le palmarès standard (avant/après délibération)
const CATEGORY_LABELS: Record<StudentCategory, string> = {
  1: 'Ont Réussis sans Echecs',
  2: 'Ont Réussis avec Echecs',
  3: 'Ont Echoués',
  4: 'Non classés',
};

// Libellés officiels pour le palmarès final (après 2ème session) — conformes au document de référence
const FINAL_CATEGORY_LABELS: Record<StudentCategory, string> = {
  1: 'Passent en première session',
  2: 'Passent après la 2ème session',
  3: 'Doublent la classe',
  4: 'Abandons',
};

type Period = 'P1' | 'P2' | 'EXAM1' | 'SEM1' | 'P3' | 'P4' | 'EXAM2' | 'SEM2' | 'ANNUAL';
type PalmaresMode = 'BEFORE_REPECHAGE' | 'AFTER_REPECHAGE' | 'AFTER_SECOND_SESSION';

/**
 * Composant pour afficher les observations textuelles très précises des élèves dans le palmarès.
 * Les détails respectent scrupuleusement la structure de l'image fournie par l'utilisateur.
 */
const StudentObservation = ({ 
  rankedStudent, 
  palmaresMode, 
  classLevel 
}: { 
  rankedStudent: RankedStudent; 
  palmaresMode: PalmaresMode; 
  classLevel: string;
}) => {
  const student = rankedStudent.student;

  // En cas d'abandon de l'élève
  if (student.is_abandoned) {
    return (
      <span className="text-red-700 font-bold text-[10px] uppercase">
        Abandon {student.abandon_reason ? `: ${student.abandon_reason}` : ''}
      </span>
    );
  }

  // Si des notes manquent à l'appel (Non classé - Catégorie 4)
  if (rankedStudent.category === 4) {
    const elements: React.ReactNode[] = [];
    for (let i = 0; i < rankedStudent.subjectDetails.length; i++) {
      const detail = rankedStudent.subjectDetails[i];
      const isMissing = rankedStudent.missingSubjects.includes(detail.subjectCode || detail.subjectName);
      
      if (isMissing) {
        elements.push(
          <span key={i} className="font-bold text-black uppercase">
            {detail.subjectCode || detail.subjectName}
          </span>
        );
      } else if (detail.maxPoints > 0 && (detail.points / detail.maxPoints) * 100 < 50) {
        elements.push(
          <span key={i} className="font-semibold text-black">
            {detail.subjectCode || detail.subjectName} {Math.round(detail.points)}/{detail.maxPoints}
          </span>
        );
      }
    }

    const joinedElements: React.ReactNode[] = [];
    elements.forEach((el, idx) => {
      joinedElements.push(el);
      if (idx < elements.length - 1) {
        joinedElements.push(<span key={`comma-${idx}`} className="text-black font-normal">, </span>);
      }
    });

    return <span className="text-black text-[10px] leading-tight">{joinedElements}</span>;
  }

  // -------------------------------------------------------------
  // MODE 1 : AVANT DELIBERATION
  // -------------------------------------------------------------
  if (palmaresMode === 'BEFORE_REPECHAGE') {
    if (rankedStudent.category === 1 || rankedStudent.category === 3) {
      return null;
    }

    if (rankedStudent.category === 2) {
      const failedDetails = rankedStudent.subjectDetails.filter(
        (s: any) => s.maxPoints > 0 && (s.points / s.maxPoints) * 100 < 50
      );

      return (
        <span className="text-black text-[10px] font-semibold leading-tight">
          {failedDetails.map((s) => `${s.subjectCode || s.subjectName} ${Math.round(s.points)}/${s.maxPoints}`).join(', ')}
        </span>
      );
    }
  }

  // -------------------------------------------------------------
  // MODE 2 : APRES DELIBERATION (PREMIERE SESSION)
  // -------------------------------------------------------------
  if (palmaresMode === 'AFTER_REPECHAGE') {
    // Si l'élève a échoué (Catégorie 3)
    if (rankedStudent.category === 3) {
      // Vérification de l'éligibilité à la deuxième session
      const failuresCount = rankedStudent.failedSubjects.length;
      const isEligibleForSecondSession = rankedStudent.percentage >= 50 && failuresCount > 0 && failuresCount <= 5;

      if (isEligibleForSecondSession) {
        return (
          <span className="text-blue-700 font-semibold text-[10px] uppercase">
            Admis à la 2e session ({failuresCount} échec{failuresCount > 1 ? 's' : ''})
          </span>
        );
      } else {
        return (
          <span className="text-red-700 font-bold text-[10px] uppercase">
            Redouble la classe
          </span>
        );
      }
    }

    // Si réussi avec échecs (Catégorie 2)
    if (rankedStudent.category === 2) {
      const failedDetails = rankedStudent.subjectDetails.filter(
        (s: any) => s.maxPoints > 0 && (s.points / s.maxPoints) * 100 < 50
      );

      return (
        <span className="text-black text-[10px] font-semibold leading-tight">
          Admis (échec toléré: {failedDetails.map((s) => `${s.subjectCode || s.subjectName}`).join(', ')})
        </span>
      );
    }

    // Réussi sans échecs (Catégorie 1)
    if (rankedStudent.category === 1) {
      return (
        <span className="text-green-700 font-semibold text-[10px] uppercase">
          Admis
        </span>
      );
    }
  }

  // -------------------------------------------------------------
  // MODE 3 : PALMARES FINAL APRES DEUXIEME SESSION
  // Conforme au document officiel : colonne REPECHAGES avec matières + scores
  // -------------------------------------------------------------
  if (palmaresMode === 'AFTER_SECOND_SESSION') {
    // Cat 1 & Cat 3 : pas de détails dans la colonne repêchage
    if (rankedStudent.category === 1 || rankedStudent.category === 3) {
      return null;
    }

    // Cat 2 (Passent après la 2ème session) : afficher les matières repêchées avec leurs scores
    if (rankedStudent.category === 2) {
      // Afficher chaque matière en échec avec son score arrondi (ex: "PHYS 60, TEC.MEC 55")
      const failedDetails = rankedStudent.subjectDetails.filter(
        (s: any) => s.maxPoints > 0 && (s.points / s.maxPoints) * 100 < 50
      );

      return (
        <span className="text-black text-[10px] font-semibold leading-tight">
          {failedDetails.map((s) => `${s.subjectCode || s.subjectName} ${Math.round((s.points / s.maxPoints) * 100)}`).join(', ')}
        </span>
      );
    }
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
  const [palmaresMode, setPalmaresMode] = useState<PalmaresMode>('BEFORE_REPECHAGE');
  const [repechages, setRepechages] = useState<Repechage[]>([]);

  // Chargement des points de repêchage enregistrés en base
  React.useEffect(() => {
    repechageService.getRepechagesByClass(classInfo.id).then(setRepechages).catch(console.error);
  }, [classInfo.id]);

  // Réinitialisation du mode de délibération quand on quitte la période Annuelle
  React.useEffect(() => {
    if (selectedPeriod !== 'ANNUAL') {
      setPalmaresMode('BEFORE_REPECHAGE');
    }
  }, [selectedPeriod]);

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
    if (percentage >= 80) return 'E';
    if (percentage >= 60) return 'TB';
    if (percentage >= 50) return 'B';
    if (percentage >= 40) return 'Mé';
    return 'Ma';
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
  // Critères officiels de délibération :
  // 1. Admis = ≥50% sans échec
  // 2. Admis à la 2e session = ≥50% avec ≤5 échecs (branches principales/spécifiques selon le niveau)
  // 3. Relevable = échec dans la marge (6pts/80, 8pts/160, 10pts/240-300, 12pts/320, 15pts/400-500)
  // 4. Redouble = ne rentre dans aucune des dispositions ci-dessus
  // 5. Abandons = élève marqué comme abandonné (is_abandoned)
  const rankedStudents = useMemo(() => {
    const rankings: RankedStudent[] = [];
    let studentsToProcess = [...students];

    // En mode palmarès final, on ne filtre PAS les abandons car ils sont la catégorie IV
    // Dans les autres modes, on exclut les abandons si le filtre est activé
    if (onlyAbandons && palmaresMode !== 'AFTER_SECOND_SESSION') {
      studentsToProcess = studentsToProcess.filter(s => !s.is_abandoned);
    }

    if (sortByAbandon) {
      studentsToProcess.sort((a, b) => (b.is_abandoned ? 1 : 0) - (a.is_abandoned ? 1 : 0));
    }

    const periodsConfig = getPeriodConfig(selectedPeriod);

    for (const student of studentsToProcess) {
      // Si l'élève est abandonné et qu'on est en mode palmarès final → catégorie 4 directement
      if (student.is_abandoned && palmaresMode === 'AFTER_SECOND_SESSION') {
        rankings.push({
          student,
          percentage: 0,
          rank: 0,
          application: '-',
          isUnranked: true,
          category: 4, // Abandons
          failedSubjects: [],
          repechageSubjects: [],
          missingSubjects: [],
          subjectDetails: [],
        });
        continue;
      }

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

        // Vérification et application des points de repêchage dans les modes "Après Délibération" et "Après 2e Session"
        const rep = repechages.find(r => r.student_id === student.id && r.subject_id === subject.id);
        let finalSubjectPoints = subjectPoints;

        if (palmaresMode !== 'BEFORE_REPECHAGE' && rep && rep.percentage > 0) {
          finalSubjectPoints = (rep.percentage * subjectMaxPoints) / 100;
          repechageSubjects.push(subject.code || subject.name);
        }

        // Cumul des points de l'élève
        if (!subjectHasMissingGrade) {
          totalPoints += finalSubjectPoints;
          totalMaxPoints += subjectMaxPoints;
        }

        // Détection d'un échec uniquement si le cours a toutes ses notes
        if (!subjectHasMissingGrade && subjectMaxPoints > 0) {
          const subjectPercentage = (finalSubjectPoints / subjectMaxPoints) * 100;
          if (subjectPercentage < 50) {
            failedSubjects.push(subject.code || subject.name);
          }
        }

        subjectDetails.push({
          subjectCode: subject.code,
          subjectName: subject.name,
          points: finalSubjectPoints,
          maxPoints: subjectMaxPoints,
        });
      }

      // Application du relèvement automatique pour les modes après délibération et palmarès final (échec unique dans la marge)
      if (palmaresMode !== 'BEFORE_REPECHAGE' && failedSubjects.length === 1) {
        const failedDetail = subjectDetails.find(d => d.maxPoints > 0 && (d.points / d.maxPoints) * 100 < 50);
        if (failedDetail) {
          const passingScore = failedDetail.maxPoints / 2;
          const missingPoints = passingScore - failedDetail.points;
          let margin = 0;

          if (failedDetail.maxPoints <= 80) margin = 6;
          else if (failedDetail.maxPoints <= 160) margin = 8;
          else if (failedDetail.maxPoints <= 300) margin = 10;
          else if (failedDetail.maxPoints <= 320) margin = 12;
          else margin = 15;

          if (missingPoints <= margin) {
            // Relèvement automatique conforme aux critères officiels !
            totalPoints += (passingScore - failedDetail.points);
            failedDetail.points = passingScore;
            failedSubjects.pop(); // Retire l'unique échec
          }
        }
      }

      // Calcul de la moyenne en pourcentage
      const percentage = hasAllGrades && totalMaxPoints > 0
        ? (totalPoints / totalMaxPoints) * 100
        : 0;

      // Attribution de la catégorie selon les critères officiels et le mode choisi
      let category: StudentCategory = 3;

      if (palmaresMode === 'AFTER_SECOND_SESSION') {
        // ---- MODE PALMARES FINAL ----
        // Notes manquantes = redouble (Cat 3), pas "non classé"
        if (!hasAllGrades || missingSubjects.length > 0) {
          category = 3; // Doublent la classe (notes incomplètes)
        } else if (percentage >= 50 && failedSubjects.length === 0) {
          category = 1; // Passent en première session (≥50%, 0 échec)
        } else if (percentage >= 50 && failedSubjects.length > 0 && failedSubjects.length <= 5) {
          category = 2; // Passent après la 2ème session (≥50%, 1-5 échecs)
        } else {
          category = 3; // Doublent la classe (<50% ou >5 échecs)
        }
      } else if (palmaresMode === 'AFTER_REPECHAGE') {
        // ---- MODE APRES DELIBERATION ----
        if (!hasAllGrades || missingSubjects.length > 0) {
          category = 4; // Non classé (notes manquantes)
        } else if (percentage >= 50) {
          if (failedSubjects.length === 0) {
            category = 1; // Réussi sans échecs
          } else if (failedSubjects.length <= 5) {
            category = 2; // Réussi avec échecs (admis à la 2ème session)
          } else {
            category = 3; // Trop d'échecs → redouble
          }
        } else {
          category = 3; // Ont échoué (< 50%)
        }
      } else {
        // ---- MODE AVANT DELIBERATION ----
        if (!hasAllGrades || missingSubjects.length > 0) {
          category = 4; // Non classé (notes manquantes)
        } else if (percentage >= 50) {
          category = failedSubjects.length === 0 ? 1 : 2;
        } else {
          category = 3; // Ont échoué (< 50%)
        }
      }

      rankings.push({
        student,
        percentage: hasAllGrades ? percentage : 0,
        rank: 0,
        application: hasAllGrades ? getApplication(percentage) : '-',
        isUnranked: category === 4,
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

    return [...cat1, ...cat2, ...cat3, ...cat4];
  }, [students, subjects, grades, selectedPeriod, onlyAbandons, sortByAbandon, repechages, palmaresMode]);

  // Calcul des statistiques d'en-tête conformes au modèle textuel
  const abandonsCount = students.filter(s => s.is_abandoned).length;
  const participantsCount = students.length - abandonsCount;
  const stats = {
    total: students.length,
    participants: participantsCount,
    abandons: abandonsCount,
    cat1: rankedStudents.filter(r => r.category === 1).length,
    cat2: rankedStudents.filter(r => r.category === 2).length,
    cat3: rankedStudents.filter(r => r.category === 3).length,
    cat4: rankedStudents.filter(r => r.category === 4).length,
    passed: rankedStudents.filter(r => r.category === 1 || r.category === 2).length,
    failed: rankedStudents.filter(r => r.category === 3).length,
  };

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

        {/* Sélection du mode de Délibération — visible uniquement pour la période Annuelle */}
        {selectedPeriod === 'ANNUAL' && (
          <select
            value={palmaresMode}
            onChange={(e) => setPalmaresMode(e.target.value as PalmaresMode)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none bg-white font-medium text-slate-700 text-sm cursor-pointer"
          >
            <option value="BEFORE_REPECHAGE">Avant Délibération</option>
            <option value="AFTER_REPECHAGE">Après Délibération</option>
            <option value="AFTER_SECOND_SESSION">Palmarès Final (2e Session)</option>
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
          title={`${palmaresMode === 'BEFORE_REPECHAGE' ? 'Palmarès Avant Del.' : palmaresMode === 'AFTER_REPECHAGE' ? 'Palmarès Après Del.' : 'Palmarès Final 2e Session'} - ${classInfo.name} - ${selectedPeriod}`}
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
        {/* En-tête supérieure — adapté selon le mode (standard vs palmarès final) */}
        {palmaresMode === 'AFTER_SECOND_SESSION' ? (
          /* En-tête spécifique palmarès final conforme au document officiel */
          <div className="flex justify-between items-start mb-4 font-bold text-[11px] text-black">
            <div className="space-y-0.5">
              <p>Classe : <span className="uppercase">{classInfo.level} {classInfo.option}</span></p>
              <p>Inscrits : {stats.total}</p>
              <p>Participants : {stats.participants}</p>
              <p>Réussites : {stats.passed}</p>
              <p>Échecs : {stats.failed}</p>
              <p>Abandons : {stats.abandons}</p>
            </div>
            <div className="space-y-0.5 text-right">
              <p>École: <span className="uppercase">{schoolName}</span></p>
              <p>Ville: <span className="uppercase">{schoolCity}</span></p>
            </div>
          </div>
        ) : (
          /* En-tête standard pour les modes avant/après délibération */
          <div className="flex justify-between items-start mb-4 font-bold text-[12px] text-black border-b border-black/80 pb-2">
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
        )}

        {/* Titre principal centré */}
        <div className="text-center font-black text-[14px] uppercase tracking-wider mb-5 text-black">
          <span className="border-b-2 border-black pb-0.5 px-4 inline-block">
            {palmaresMode === 'BEFORE_REPECHAGE' && 'PALMARÈS AVANT DÉLIBÉRATION'}
            {palmaresMode === 'AFTER_REPECHAGE' && 'PALMARÈS APRÈS DÉLIBÉRATION'}
            {palmaresMode === 'AFTER_SECOND_SESSION' && 'PALMARÈS FINAL'}{' '}
            - {classInfo.name.toUpperCase()} - {selectedPeriod}
          </span>
        </div>

        {/* Tableau principal — en-tête de colonne adapté selon le mode */}
        <table className="w-full border-collapse border border-black text-[11px] text-black">
          <thead>
            <tr className="font-bold text-black border border-black">
              <th className="border border-black px-1.5 py-1 w-10 text-center">N°</th>
              <th className="border border-black px-2.5 py-1 text-left">NOMS ET POST NOMS</th>
              <th className="border border-black px-1.5 py-1 w-12 text-center">%</th>
              <th className="border border-black px-2.5 py-1 text-left">
                {palmaresMode === 'AFTER_SECOND_SESSION' ? 'REPECHAGES' : 'Observation'}
              </th>
            </tr>
          </thead>
          <tbody>
            {rankedStudents.map((rankedStudent, index) => {
              // Détection du changement de catégorie pour insertion du séparateur
              const prev = index > 0 ? rankedStudents[index - 1] : null;
              const isNewCat = !prev || prev.category !== rankedStudent.category;

              // Libellés adaptés au mode : numéros romains + stats pour le palmarès final
              const isFinalMode = palmaresMode === 'AFTER_SECOND_SESSION';
              const labels = isFinalMode ? FINAL_CATEGORY_LABELS : CATEGORY_LABELS;
              const romanNumerals: Record<StudentCategory, string> = { 1: 'I.', 2: 'II.', 3: 'III.', 4: 'IV.' };

              // Calcul du pourcentage pour l'en-tête de catégorie (ex: 15/52 soit 28,8%)
              const catCount = stats[`cat${rankedStudent.category}` as keyof typeof stats] as number;
              const catPct = stats.total > 0 ? ((catCount / stats.total) * 100).toFixed(1).replace('.', ',') : '0';

              const catLabel = isFinalMode
                ? `${romanNumerals[rankedStudent.category]}   ${labels[rankedStudent.category]}  ${catCount}/${stats.total} soit ${catPct} %`
                : (rankedStudent.category === 1
                  ? `${CATEGORY_LABELS[1]} ${stats.cat1}/${stats.total}`
                  : CATEGORY_LABELS[rankedStudent.category]);

              return (
                <React.Fragment key={rankedStudent.student.id}>
                  {isNewCat && (
                    <tr className="bg-white border-y border-black font-bold">
                      <td colSpan={4} className={`border border-black px-2.5 py-1 font-bold text-black text-[11px] ${isFinalMode ? 'text-left' : 'text-center'}`}>
                        {catLabel}
                      </td>
                    </tr>
                  )}
                  <tr className="border border-black">
                    {/* Numéro séquentiel (01, 02...) */}
                    <td className="border border-black px-1.5 py-1 text-center font-bold">
                      {isFinalMode ? String(rankedStudent.rank).padStart(2, '0') : `${rankedStudent.rank}.`}
                    </td>
                    {/* Nom Complet de l'élève */}
                    <td className="border border-black px-2.5 py-1 font-bold uppercase">
                      {rankedStudent.student.last_name} {rankedStudent.student.post_name} {rankedStudent.student.first_name}
                    </td>
                    {/* Pourcentage (vide pour la catégorie 4 Abandons) */}
                    <td className="border border-black px-1.5 py-1 text-center font-bold">
                      {rankedStudent.category === 4 ? '' : `${(rankedStudent.percentage).toFixed(1).replace('.', ',')}`}
                    </td>
                    {/* Colonne Observation / REPECHAGES */}
                    <td className="border border-black px-2.5 py-1">
                      <StudentObservation 
                        rankedStudent={rankedStudent} 
                        palmaresMode={palmaresMode}
                        classLevel={classInfo.level}
                      />
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

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
