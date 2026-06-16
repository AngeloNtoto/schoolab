import { gradeService, Grade } from './gradeService';
import { studentService } from './studentService';
import { Subject } from './classService';
import { getMathValue } from '../components/class/classDetails/gradeUtils';

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
   * Calcule les rangs d'un élève de manière synchrone avec les données fournies.
   * Optimisé pour éviter les requêtes si les données sont déjà chargées.
   */
  computeStudentRanks(students: any[], allGrades: Grade[], studentId: number): { ranks: StudentRanks, totalStudents: number } {
    const totalStudents = students.length;

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
        const val = getMathValue(grade.value);
        if (grade.period === 'P1') p1 += val;
        if (grade.period === 'P2') p2 += val;
        if (grade.period === 'EXAM1') ex1 += val;
        if (grade.period === 'P3') p3 += val;
        if (grade.period === 'P4') p4 += val;
        if (grade.period === 'EXAM2') ex2 += val;
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
   * Calcule les rangs d'un élève pour chaque colonne (P1, P2, etc.) par rapport à sa classe.
   * @param classId L'identifiant de la classe
   * @param studentId L'identifiant de l'élève
   */
  async calculateStudentRanks(classId: number, studentId: number): Promise<{ ranks: StudentRanks, totalStudents: number }> {
    const students = await studentService.getStudentsByClass(classId);
    // Récupérer toutes les notes de la classe en une seule fois pour optimiser
    const allGrades = await gradeService.getGradesByClass(classId);
    
    return this.computeStudentRanks(students, allGrades, studentId);
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
        const val = getMathValue(grade.value);
        if (grade.period === 'P1') p1 += val;
        if (grade.period === 'P2') p2 += val;
        if (grade.period === 'EXAM1') ex1 += val;
        if (grade.period === 'P3') p3 += val;
        if (grade.period === 'P4') p4 += val;
        if (grade.period === 'EXAM2') ex2 += val;
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
   * Applique l'algorithme de rachat par transfert de surplus (délibération automatisée).
   * Renvoie un nouveau tableau de notes où les transferts invisibles ont été appliqués.
   */
  applyDeliberation(students: any[], allGrades: Grade[], subjects: Subject[]): Grade[] {
    // Copie profonde pour éviter de muter les données d'origine
    const adjustedGrades = allGrades.map(g => ({ ...g }));

    students.forEach(student => {
      let missingCount = 0;
      const studentGrades = adjustedGrades.filter(g => g.student_id === student.id);
      const subjectTotals: Record<number, { points: number; maxPoints: number;isComplete:boolean }> = {};

      subjects.forEach(subject => {
        const subjectMax = subject.max_p1 + subject.max_p2 + subject.max_exam1 + subject.max_p3 + subject.max_p4 + subject.max_exam2;
        if (subjectMax === 0) return;

        const gradesForSubj = studentGrades.filter(g => g.subject_id === subject.id);
        if (gradesForSubj.length === 0) {
          missingCount++;
          return;
        }

        let subjectPts = 0;
        let actualMax = 0;
        let expectedPeriods = 0;
        if (subject.max_p1 > 0) expectedPeriods++;
        if (subject.max_p2 > 0) expectedPeriods++;
        if (subject.max_exam1 > 0) expectedPeriods++;
        if (subject.max_p3 > 0) expectedPeriods++;
        if (subject.max_p4 > 0) expectedPeriods++;
        if (subject.max_exam2 > 0) expectedPeriods++;

        const isComplete = gradesForSubj.length === expectedPeriods;

        ['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'].forEach(period => {
          const gradeEntry = gradesForSubj.find(g => g.period === period);
          if (gradeEntry) {
            subjectPts += getMathValue(gradeEntry.value);
          }
        });

        subjectTotals[subject.id] = { 
          points: subjectPts, 
          maxPoints: subjectMax, // Option B : On utilise le vrai maximum complet
          isComplete 
        };
      });

      // Calcul du pourcentage (Option B : calcul strict sur le total absolu de l'année)
      let totalPts = 0;
      let totalMax = 0;
      Object.values(subjectTotals).forEach(t => {
        totalPts += t.points;
        totalMax += t.maxPoints;
      });

      const percentage = totalMax > 0 ? (totalPts / totalMax) * 100 : 0;
      if (percentage < 50) return;

      const failedSubjects: Array<{ subject: Subject; missing: number }> = [];
      const surplusSubjects: Array<{ subject: Subject; surplus: number; pct: number }> = [];

      subjects.forEach(subject => {
        const t = subjectTotals[subject.id];
        if (!t || t.maxPoints === 0) return;
        
        const moyenne = t.maxPoints / 2;

        // Le cours doit être à 100% complet pour participer à la délibération (donneur ou receveur)
        if (t.isComplete) {
          if (t.points < moyenne) {
            const missing = moyenne - t.points;
            let estRelevable = false;
            if (t.maxPoints <= 80 && missing <= 6) estRelevable = true;
            else if (t.maxPoints > 80 && t.maxPoints <= 160 && missing <= 8) estRelevable = true;
            else if (t.maxPoints > 160 && t.maxPoints <= 300 && missing <= 10) estRelevable = true;
            else if (t.maxPoints > 300 && t.maxPoints <= 320 && missing <= 12) estRelevable = true;
            else if (t.maxPoints > 320 && t.maxPoints <= 500 && missing <= 15) estRelevable = true;

            if (estRelevable) {
              failedSubjects.push({ subject, missing });
            }
          } else if (t.points > moyenne) {
            surplusSubjects.push({ subject, surplus: t.points - moyenne, pct: t.points / t.maxPoints });
          }
        }
      });

      // Trier les surplus du plus grand pourcentage au plus petit
      surplusSubjects.sort((a, b) => b.pct - a.pct);

      failedSubjects.forEach(fail => {
        let needed = fail.missing;

        for (const surp of surplusSubjects) {
          if (needed <= 0) break;
          if (surp.surplus <= 0) continue;

          const amountToTake = Math.min(needed, surp.surplus);
          let amountTransferred = 0;
          
          // Chercher la période idéale pour le transfert (de préférence EXAM2, puis P4, etc.)
          const periods = ['EXAM2', 'P4', 'EXAM1', 'P2', 'P1', 'P3'];
          
          for (const period of periods) {
            if (amountTransferred >= amountToTake) break;
            
            const failGrade = adjustedGrades.find(g => g.student_id === student.id && g.subject_id === fail.subject.id && g.period === period);
            const surpGrade = adjustedGrades.find(g => g.student_id === student.id && g.subject_id === surp.subject.id && g.period === period);
            
            if (failGrade && surpGrade) {
              let maxForPeriod = 0;
              if (period === 'P1') maxForPeriod = fail.subject.max_p1;
              if (period === 'P2') maxForPeriod = fail.subject.max_p2;
              if (period === 'EXAM1') maxForPeriod = fail.subject.max_exam1;
              if (period === 'P3') maxForPeriod = fail.subject.max_p3;
              if (period === 'P4') maxForPeriod = fail.subject.max_p4;
              if (period === 'EXAM2') maxForPeriod = fail.subject.max_exam2;

              const failSpace = maxForPeriod - getMathValue(failGrade.value);
              const surpAvailable = getMathValue(surpGrade.value);

              const transfer = Math.min(amountToTake - amountTransferred, failSpace, surpAvailable);
              if (transfer > 0) {
                failGrade.value += transfer;
                surpGrade.value -= transfer;
                amountTransferred += transfer;
                surp.surplus -= transfer;
                needed -= transfer;
              }
            }
          }
        }
      });
    });

    return adjustedGrades;
  }

  /**
   * Détermine l'appréciation de l'application en fonction du pourcentage.
   */
  getApplication(percentage: number): string {
    if (percentage >= 80) return 'Élite';
    if (percentage >= 70) return 'Très bon';
    if (percentage >= 50) return 'Bon';
    if (percentage >= 40) return 'Médiocre';
    return 'Mauvais';
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
