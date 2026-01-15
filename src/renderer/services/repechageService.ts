import { dbService } from './databaseService';

export interface Repechage {
  id?: number;
  student_id: number;
  subject_id: number;
  value: number;
  percentage: number;
}

/**
 * Service responsable de la gestion des points de repêchage.
 */
class RepechageService {
  /**
   * Récupère tous les repêchages pour tous les élèves d'une classe.
   * @param classId L'identifiant de la classe
   */
  async getRepechagesByClass(classId: number): Promise<Repechage[]> {
    return await dbService.query<Repechage>(
      `SELECT r.* FROM repechages r 
       INNER JOIN students s ON r.student_id = s.id 
       WHERE s.class_id = ?`,
      [classId]
    );
  }

  /**
   * Récupère les repêchages d'un élève spécifique.
   * @param studentId L'identifiant de l'élève
   */
  async getRepechagesByStudent(studentId: number): Promise<Repechage[]> {
    return await dbService.query<Repechage>(
      'SELECT * FROM repechages WHERE student_id = ?',
      [studentId]
    );
  }

  /**
   * Met à jour ou insère un point de repêchage pour un élève et une matière (Basé sur le pourcentage).
   * @param studentId L'identifiant de l'élève
   * @param subjectId L'identifiant de la matière
   * @param percentage Le pourcentage attribué (0-100)
   */
  async updateRepechage(studentId: number, subjectId: number, percentage: number): Promise<void> {
    // 1. Get Subject Maxima
    const subjects = await dbService.query<any>(
      'SELECT * FROM subjects WHERE id = ?',
      [subjectId]
    );
    
    if (subjects.length === 0) {
      throw new Error("Matière introuvable");
    }

    const s = subjects[0];
    // Calculate total annual max
    const totalMax = (s.max_p1 || 0) + (s.max_p2 || 0) + (s.max_exam1 || 0) + 
                     (s.max_p3 || 0) + (s.max_p4 || 0) + (s.max_exam2 || 0);

    // Calculate value (points) from percentage
    const value = totalMax > 0 ? (percentage * totalMax) / 100 : 0;

    const existing = await dbService.query<Repechage>(
      'SELECT id FROM repechages WHERE student_id = ? AND subject_id = ?',
      [studentId, subjectId]
    );

    if (existing.length > 0) {
      if (percentage === 0 || percentage === null) {
        await dbService.execute(
          'DELETE FROM repechages WHERE student_id = ? AND subject_id = ?',
          [studentId, subjectId]
        );
      } else {
        await dbService.execute(
          'UPDATE repechages SET value = ?, percentage = ? WHERE student_id = ? AND subject_id = ?',
          [value, percentage, studentId, subjectId]
        );
      }
    } else if (percentage !== 0 && percentage !== null) {
      await dbService.execute(
        'INSERT INTO repechages (student_id, subject_id, value, percentage) VALUES (?, ?, ?, ?)',
        [studentId, subjectId, value, percentage]
      );
    }
  }
}

export const repechageService = new RepechageService();
