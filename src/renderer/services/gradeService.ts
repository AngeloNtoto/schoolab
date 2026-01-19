import { dbService } from './databaseService';

export interface Grade {
  id?: number;
  student_id: number;
  subject_id: number;
  period: string;
  value: number;
}

/**
 * Service responsable de la gestion des notes (cotes).
 */
class GradeService {
  /**
   * Récupère toutes les notes pour tous les élèves d'une classe.
   * Utile pour afficher la grille de points complète.
   * @param classId L'identifiant de la classe
   */
  async getGradesByClass(classId: number): Promise<Grade[]> {
    return await dbService.query<Grade>(
      `SELECT g.* FROM grades g 
       INNER JOIN students s ON g.student_id = s.id 
       WHERE s.class_id = ?`,
      [classId]
    );
  }

  /**
   * Récupère les notes d'un élève spécifique.
   * @param studentId L'identifiant de l'élève
   */
  async getGradesByStudent(studentId: number): Promise<Grade[]> {
    return await dbService.query<Grade>(
      'SELECT * FROM grades WHERE student_id = ?',
      [studentId]
    );
  }

  /**
   * Met à jour ou insère une note pour un élève, une matière et une période donnée.
   * Si la valeur est null, la note est supprimée.
   * @param studentId L'identifiant de l'élève
   * @param subjectId L'identifiant de la matière
   * @param period La période (ex: 'P1', 'EXAM1')
   * @param value La valeur de la note (ou null pour supprimer)
   */
  async updateGrade(studentId: number, subjectId: number, period: string, value: number | null): Promise<void> {
    const existing = await dbService.query<Grade>(
      'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?',
      [studentId, subjectId, period]
    );

    if (existing.length > 0) {
      if (value === null) {
        // Supprimer réellement
        await dbService.execute(
          'DELETE FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?',
          [studentId, subjectId, period]
        );
      } else {
        // Mettre à jour
        await dbService.execute(
          'UPDATE grades SET value = ?, is_dirty = 1, last_modified_at = (datetime(\'now\')) WHERE student_id = ? AND subject_id = ? AND period = ?',
          [value, studentId, subjectId, period]
        );
      }
    } else if (value !== null) {
      // Insérer
      await dbService.execute(
        'INSERT INTO grades (student_id, subject_id, period, value, is_dirty, last_modified_at) VALUES (?, ?, ?, ?, 1, (datetime(\'now\')))',
        [studentId, subjectId, period, value]
      );
    }
  }
}

export const gradeService = new GradeService();
