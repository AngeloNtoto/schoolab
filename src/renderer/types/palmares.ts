// Interface représentant un élève de la classe
export interface Student {
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
export interface Subject {
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
export interface Grade {
  student_id: number;
  subject_id: number;
  period: string;
  value: number;
}

// Interface représentant les informations de la classe active
export interface ClassInfo {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

// Définition des catégories
// 1 = Passent 1ère session, 2 = Passent 2ème session, 3 = Doublent, 4 = Abandons, 5 = Non classés (Avant délib.)
export type StudentCategory = 1 | 2 | 3 | 4 | 5;

// Interface représentant un élève classé dans le palmarès
export interface RankedStudent {
  student: Student;
  percentage: number;
  rank: number;
  application: string;
  isUnranked: boolean;
  category: StudentCategory;
  failedSubjects: string[];
  repechageSubjects: string[];
  // Liste des matières pour lesquelles l'élève est marqué "Voir Bureau" (dette non réglée)
  voirBureauSubjects: string[];
  missingSubjects: string[];
  subjectDetails: {
    subjectName: string;
    subjectCode: string;
    points: number;
    maxPoints: number;
  }[];
}

export type Period = 'P1' | 'P2' | 'EXAM1' | 'SEM1' | 'P3' | 'P4' | 'EXAM2' | 'SEM2' | 'ANNUAL';
export type PalmaresMode = 'BEFORE_DELIBERATION' | 'AFTER_DELIBERATION' | 'REPECHAGE_LIST';
