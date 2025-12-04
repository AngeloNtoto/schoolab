import { gradeService, Grade } from './gradeService';
import { studentService } from './studentService';
import { Subject } from './classService';

export interface StudentRanks {
  p1: number;
  p2: number;
  ex1: number;
  tot1: number;
  p3: number;
  p4: number;
  ex2: number;
  tot2: number;
  tg: number;
}

/**
 * Service responsable des calculs complexes pour le bulletin.
 */
class BulletinService {
  /**
   * Calcule les rangs d'un élève pour chaque colonne (P1, P2, etc.) par rapport à sa classe.
   * @param classId L'identifiant de la classe
   * @param studentId L'identifiant de l'élève
   */
  async calculateStudentRanks(classId: number, studentId: number): Promise<{ ranks: StudentRanks, totalStudents: number }> {
    const students = await studentService.getStudentsByClass(classId);
    const totalStudents = students.length;

    // Récupérer toutes les notes de la classe en une seule fois pour optimiser
    const allGrades = await gradeService.getGradesByClass(classId);

    // Organiser les notes par élève pour un accès rapide
    const studentGradesMap = new Map<number, Grade[]>();
    allGrades.forEach(g => {
      if (!studentGradesMap.has(g.student_id)) {
        studentGradesMap.set(g.student_id, []);
      }
      studentGradesMap.get(g.student_id)?.push(g);
    });

    // Calculer les scores pour chaque élève
    const scores = students.map(s => {
      const g = studentGradesMap.get(s.id) || [];
      let p1 = 0, p2 = 0, ex1 = 0;
      let p3 = 0, p4 = 0, ex2 = 0;

      g.forEach(grade => {
        if (grade.period === 'P1') p1 += grade.value;
        if (grade.period === 'P2') p2 += grade.value;
        if (grade.period === 'EXAM1') ex1 += grade.value;
        if (grade.period === 'P3') p3 += grade.value;
        if (grade.period === 'P4') p4 += grade.value;
        if (grade.period === 'EXAM2') ex2 += grade.value;
      });

      const tot1 = p1 + p2 + ex1;
      const tot2 = p3 + p4 + ex2;
      const tg = tot1 + tot2;

      return { id: s.id, p1, p2, ex1, tot1, p3, p4, ex2, tot2, tg };
    });

    // Helper pour trouver le rang
    const getRank = (field: keyof typeof scores[0]) => {
      const sorted = [...scores].sort((a, b) => b[field] - a[field]);
      return sorted.findIndex(s => s.id === studentId) + 1;
    };

    const ranks: StudentRanks = {
      p1: getRank('p1'),
      p2: getRank('p2'),
      ex1: getRank('ex1'),
      tot1: getRank('tot1'),
      p3: getRank('p3'),
      p4: getRank('p4'),
      ex2: getRank('ex2'),
      tot2: getRank('tot2'),
      tg: getRank('tg')
    };

    return { ranks, totalStudents };
  }

  /**
   * Calcule les rangs de TOUS les élèves de la classe en une seule fois.
   * Optimisé pour l'impression en masse.
   */
  async calculateClassRanks(classId: number): Promise<{ ranks: Record<number, StudentRanks>, totalStudents: number }> {
    const students = await studentService.getStudentsByClass(classId);
    const totalStudents = students.length;

    // Récupérer toutes les notes de la classe
    const allGrades = await gradeService.getGradesByClass(classId);

    // Organiser les notes par élève
    const studentGradesMap = new Map<number, Grade[]>();
    allGrades.forEach(g => {
      if (!studentGradesMap.has(g.student_id)) {
        studentGradesMap.set(g.student_id, []);
      }
      studentGradesMap.get(g.student_id)?.push(g);
    });

    // Calculer les scores pour chaque élève
    const scores = students.map(s => {
      const g = studentGradesMap.get(s.id) || [];
      let p1 = 0, p2 = 0, ex1 = 0;
      let p3 = 0, p4 = 0, ex2 = 0;

      g.forEach(grade => {
        if (grade.period === 'P1') p1 += grade.value;
        if (grade.period === 'P2') p2 += grade.value;
        if (grade.period === 'EXAM1') ex1 += grade.value;
        if (grade.period === 'P3') p3 += grade.value;
        if (grade.period === 'P4') p4 += grade.value;
        if (grade.period === 'EXAM2') ex2 += grade.value;
      });

      const tot1 = p1 + p2 + ex1;
      const tot2 = p3 + p4 + ex2;
      const tg = tot1 + tot2;

      return { id: s.id, p1, p2, ex1, tot1, p3, p4, ex2, tot2, tg };
    });

    // Helper pour calculer les rangs pour un champ donné
    const calculateRanksForField = (field: keyof typeof scores[0]) => {
      const sorted = [...scores].sort((a, b) => b[field] - a[field]);
      const rankMap = new Map<number, number>();
      
      let currentRank = 1;
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i][field] < sorted[i - 1][field]) {
          currentRank = i + 1;
        }
        rankMap.set(sorted[i].id, currentRank);
      }
      return rankMap;
    };

    const ranksP1 = calculateRanksForField('p1');
    const ranksP2 = calculateRanksForField('p2');
    const ranksEx1 = calculateRanksForField('ex1');
    const ranksTot1 = calculateRanksForField('tot1');
    const ranksP3 = calculateRanksForField('p3');
    const ranksP4 = calculateRanksForField('p4');
    const ranksEx2 = calculateRanksForField('ex2');
    const ranksTot2 = calculateRanksForField('tot2');
    const ranksTg = calculateRanksForField('tg');

    const allRanks: Record<number, StudentRanks> = {};

    students.forEach(s => {
      allRanks[s.id] = {
        p1: ranksP1.get(s.id) || 0,
        p2: ranksP2.get(s.id) || 0,
        ex1: ranksEx1.get(s.id) || 0,
        tot1: ranksTot1.get(s.id) || 0,
        p3: ranksP3.get(s.id) || 0,
        p4: ranksP4.get(s.id) || 0,
        ex2: ranksEx2.get(s.id) || 0,
        tot2: ranksTot2.get(s.id) || 0,
        tg: ranksTg.get(s.id) || 0
      };
    });

    return { ranks: allRanks, totalStudents };
  }

  /**
   * Détermine l'appréciation de l'application en fonction du pourcentage.
   */
  getApplication(percentage: number): string {
    if (percentage >= 80) return 'Excellent';
    if (percentage >= 60) return 'Très bien';
    if (percentage >= 50) return 'Bien';
    if (percentage >= 30) return 'Mauvaise';
    return 'Médiocre';
  }

  /**
   * Détermine l'appréciation de la conduite en fonction du pourcentage.
   * Utilise la même logique que l'application pour le moment.
   */
  getConduite(percentage: number): string {
    return this.getApplication(percentage);
  }
}

export const bulletinService = new BulletinService();
