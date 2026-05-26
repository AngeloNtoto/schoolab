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

// Libellés exacts conformes à la mise en page de l'image de référence
const CATEGORY_LABELS: Record<StudentCategory, string> = {
  1: 'Ont Réussis sans Echecs',
  2: 'Ont Réussis avec Echecs',
  3: 'Ont Echoués',
  4: 'Non classés',
};

type Period = 'P1' | 'P2' | 'EXAM1' | 'SEM1' | 'P3' | 'P4' | 'EXAM2' | 'SEM2' | 'ANNUAL';
type PalmaresMode = 'BEFORE_REPECHAGE' | 'AFTER_REPECHAGE';

/**
 * Composant pour afficher les observations textuelles très précises des élèves dans le palmarès.
 * Les détails respectent scrupuleusement la structure de l'image fournie par l'utilisateur.
 */
const StudentObservation = ({ rankedStudent }: { rankedStudent: RankedStudent }) => {
  const student = rankedStudent.student;

  // En cas d'abandon de l'élève
  if (student.is_abandoned) {
    return (
      <span className="text-red-700 font-bold text-[9px] uppercase">
        Abandon {student.abandon_reason ? `: ${student.abandon_reason}` : ''}
      </span>
    );
  }

  // Catégorie 1 (Ont Réussis sans Echecs) & Catégorie 3 (Ont Echoués) : L'observation doit rester VIDE
  if (rankedStudent.category === 1 || rankedStudent.category === 3) {
    return null;
  }

  // Catégorie 2 (Ont Réussis avec Echecs) : On liste les échecs sous forme de texte semi-gras (font-semibold)
  if (rankedStudent.category === 2) {
    const failedDetails = rankedStudent.subjectDetails.filter(
      (s: any) => s.maxPoints > 0 && (s.points / s.maxPoints) * 100 < 50
    );

    return (
      <span className="text-black text-[9px] font-semibold leading-tight">
        {failedDetails.map((s) => `${s.subjectCode || s.subjectName} ${Math.round(s.points)}/${s.maxPoints}`).join(', ')}
      </span>
    );
  }

  // Catégorie 4 (Non classés) : Affiche les manques en gras (bold) et les échecs en semi-gras (semibold)
  if (rankedStudent.category === 4) {
    const elements: React.ReactNode[] = [];

    // On parcourt les matières de l'élève
    for (let i = 0; i < rankedStudent.subjectDetails.length; i++) {
      const detail = rankedStudent.subjectDetails[i];
      const isMissing = rankedStudent.missingSubjects.includes(detail.subjectCode || detail.subjectName);
      
      if (isMissing) {
        // Côte manquante : gras intense (font-bold)
        elements.push(
          <span key={i} className="font-bold text-black uppercase">
            {detail.subjectCode || detail.subjectName}
          </span>
        );
      } else {
        // Échec : semi-gras (font-semibold)
        if (detail.maxPoints > 0 && (detail.points / detail.maxPoints) * 100 < 50) {
          elements.push(
            <span key={i} className="font-medium text-black">
              {detail.subjectCode || detail.subjectName} {Math.round(detail.points)}/{detail.maxPoints}
            </span>
          );
        }
      }
    }

    // Reconstruction avec des virgules de séparation textuelles simples
    const joinedElements: React.ReactNode[] = [];
    elements.forEach((el, idx) => {
      joinedElements.push(el);
      if (idx < elements.length - 1) {
        joinedElements.push(<span key={`comma-${idx}`} className="text-black font-normal">, </span>);
      }
    });

    return <span className="text-black text-[9px] leading-tight">{joinedElements}</span>;
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
      padding: 2px 4px !important;
      font-size: 10px !important;
      line-height: 1.1 !important;
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

        // Cumul des points de l'élève
        if (!subjectHasMissingGrade) {
          totalPoints += subjectPoints;
          totalMaxPoints += subjectMaxPoints;
        }

        // Détection d'un échec uniquement si le cours a toutes ses notes
        if (!subjectHasMissingGrade && subjectMaxPoints > 0) {
          const subjectPercentage = (subjectPoints / subjectMaxPoints) * 100;
          if (subjectPercentage < 50) {
            failedSubjects.push(subject.code || subject.name);
          }
        }

        // Vérification des repêchages
        const rep = repechages.find(r => r.student_id === student.id && r.subject_id === subject.id);
        if (rep && rep.percentage > 1) {
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

      // Attribution de la catégorie correspondante
      let category: StudentCategory = 3;
      if (!hasAllGrades || missingSubjects.length > 0) {
        category = 4; // Non classé (notes manquantes)
      } else if (percentage >= 50) {
        if (failedSubjects.length === 0) {
          category = 1; // Réussi sans échecs
        } else {
          category = 2; // Réussi avec échecs
        }
      } else {
        category = 3; // Ont échoué (< 50%)
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
  }, [students, subjects, grades, selectedPeriod, onlyAbandons, sortByAbandon, repechages]);

  // Calcul des statistiques d'en-tête conformes au modèle textuel
  const stats = {
    total: students.length,
    cat1: rankedStudents.filter(r => r.category === 1).length,
    cat2: rankedStudents.filter(r => r.category === 2).length,
    cat3: rankedStudents.filter(r => r.category === 3).length,
    cat4: rankedStudents.filter(r => r.category === 4).length,
    passed: rankedStudents.filter(r => r.category === 1 || r.category === 2).length,
    failed: rankedStudents.filter(r => r.category === 3).length,
  };

  return (
    <div className="bg-slate-100 p-8 print:p-0 print:bg-white">
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm"
        >
          <ArrowLeft size={20} />
          Retour à la classe
        </button>

        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as Period)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            <option value="P1">1ère Période</option>
            <option value="P2">2ème Période</option>
            <option value="EXAM1">Examen 1er Semestre</option>
            <option value="SEM1">Semestre 1</option>
            <option value="P3">3ème Période</option>
            <option value="P4">4ème Période</option>
            <option value="EXAM2">Examen 2ème Semestre</option>
            <option value="SEM2">Semestre 2</option>
            <option value="ANNUAL">Annuel</option>
          </select>

          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={onlyAbandons}
              onChange={(e) => setOnlyAbandons(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Exclure les abandons</span>
          </label>

          <select
            value={palmaresMode}
            onChange={(e) => setPalmaresMode(e.target.value as PalmaresMode)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
          >
            <option value="BEFORE_REPECHAGE">Avant Délibération</option>
            <option value="AFTER_REPECHAGE">Après Délibération (Repêché)</option>
          </select>

          <PrintButton
            targetRef={palmaresRef}
            title={`Palmarès (${palmaresMode === 'AFTER_REPECHAGE' ? 'Après Del.' : 'Avant Del.'}) - ${classInfo.name} - ${selectedPeriod}`}
            extraCss={printCss}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Printer size={20} />
            Imprimer
          </PrintButton>
        </div>
      </div>

      {/* Rendu imprimable du palmarès */}
      <div
        ref={palmaresRef}
        className="print-container max-w-[210mm] mx-auto bg-white shadow-xl p-6 print:p-2 min-h-[297mm] text-black"
      >
        {/* En-tête supérieure avec les informations de l'école et de la classe */}
        <div className="flex justify-between items-start mb-3 font-bold text-[11px] text-black">
          <div className="space-y-0.5">
            <p>École: {schoolName}</p>
            <p>Ville: {schoolCity}</p>
            <p>Boîte Postale: {schoolPoBox || ''}</p>
          </div>
          <div className="space-y-0.5 text-right">
            <p>Classe: {classInfo.name}</p>
            <p>Effectif: {stats.total}</p>
            <p>Ont réussis: {stats.passed}</p>
            <p>Ont échoué: {stats.failed}</p>
            <p>Non classés: {stats.cat4}</p>
          </div>
        </div>

        {/* Titre principal centré */}
        <div className="text-center font-black text-[12px] uppercase tracking-wider mb-3 text-black">
          PALMARÈS - {classInfo.name.toUpperCase()} - {selectedPeriod}
        </div>

        {/* Structure du tableau simplifiée à 4 colonnes conformément à l'image */}
        <table className="w-full border-collapse border border-black text-[10px] text-black">
          <thead>
            <tr className="font-bold text-black border border-black">
              <th className="border border-black px-1 py-0.5 w-10 text-center">N°</th>
              <th className="border border-black px-2 py-0.5 text-left">Nom et PostNom</th>
              <th className="border border-black px-1 py-0.5 w-12 text-center">%</th>
              <th className="border border-black px-2 py-0.5 text-left">Observation</th>
            </tr>
          </thead>
          <tbody>
            {rankedStudents.map((rankedStudent, index) => {
              // Détection du changement de catégorie pour insertion du séparateur
              const prev = index > 0 ? rankedStudents[index - 1] : null;
              const isNewCat = !prev || prev.category !== rankedStudent.category;

              // Formatage spécifique pour le libellé de catégorie (ex : ajout de count/total pour Cat. 1)
              const catLabel = rankedStudent.category === 1
                ? `${CATEGORY_LABELS[1]} ${stats.cat1}/${stats.total}`
                : CATEGORY_LABELS[rankedStudent.category];

              return (
                <React.Fragment key={rankedStudent.student.id}>
                  {isNewCat && (
                    <tr className="bg-white border-y border-black font-bold">
                      <td colSpan={4} className="border border-black px-2 py-0.5 text-center font-bold text-black text-[10px]">
                        {catLabel}
                      </td>
                    </tr>
                  )}
                  <tr className="border border-black">
                    {/* Indexation N° (ex : 1., 2., 3.) */}
                    <td className="border border-black px-1 py-0.5 text-center font-bold">
                      {rankedStudent.rank}.
                    </td>
                    {/* Nom Complet de l'élève */}
                    <td className="border border-black px-2 py-0.5 font-bold">
                      {rankedStudent.student.last_name} {rankedStudent.student.post_name} {rankedStudent.student.first_name}
                    </td>
                    {/* Pourcentage (vide pour la catégorie 4 Non classé d'après le modèle) */}
                    <td className="border border-black px-1 py-0.5 text-center font-bold">
                      {rankedStudent.category === 4 ? '' : `${Math.round(rankedStudent.percentage)}`}
                    </td>
                    {/* Colonne Observation personnalisée */}
                    <td className="border border-black px-2 py-0.5">
                      <StudentObservation rankedStudent={rankedStudent} />
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Bas de page pour les signatures officielles */}
        <div className="mt-6 flex justify-between text-[11px] text-black font-bold break-inside-avoid">
          <div className="text-center">
            <p className="font-bold mb-8">Le Chef d'Établissement</p>
            <p className="border-t border-black pt-0.5 px-2">Nom et Signature</p>
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
