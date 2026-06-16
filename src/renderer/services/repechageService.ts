import { dbService } from './databaseService';

// Interface représentant une entrée de repêchage pour un élève dans une matière
export interface Repechage {
  id?: number;
  student_id: number;
  subject_id: number;
  value: number;
  percentage: number;
  // Marqueur "Voir Bureau" : l'élève a une dette et doit se présenter au bureau (0 = non, 1 = oui)
  voir_bureau?: number;
}

/**
 * Service responsable de la gestion des points de repêchage et du statut "Voir Bureau".
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
    // 1. Récupérer les maximums de la matière
    const subjects = await dbService.query<any>(
      'SELECT * FROM subjects WHERE id = ?',
      [subjectId]
    );
    
    if (subjects.length === 0) {
      throw new Error("Matière introuvable");
    }

    const s = subjects[0];
    // Calculer le total des points maximum de l'année
    const totalMax = (s.max_p1 || 0) + (s.max_p2 || 0) + (s.max_exam1 || 0) + 
                     (s.max_p3 || 0) + (s.max_p4 || 0) + (s.max_exam2 || 0);

    // Convertir le pourcentage en points réels
    const value = totalMax > 0 ? (percentage * totalMax) / 100 : 0;

    const existing = await dbService.query<Repechage>(
      'SELECT id FROM repechages WHERE student_id = ? AND subject_id = ?',
      [studentId, subjectId]
    );

    if (existing.length > 0) {
      if (percentage === 0 || percentage === null) {
        // Supprimer l'entrée si le pourcentage est remis à 0
        await dbService.execute(
          'DELETE FROM repechages WHERE student_id = ? AND subject_id = ?',
          [studentId, subjectId]
        );
      } else {
        // Mettre à jour les points et le pourcentage (le statut voir_bureau est préservé)
        await dbService.execute(
          'UPDATE repechages SET value = ?, percentage = ?, is_dirty = 1, last_modified_at = (datetime(\'now\')) WHERE student_id = ? AND subject_id = ?',
          [value, percentage, studentId, subjectId]
        );
      }
    } else if (percentage !== 0 && percentage !== null) {
      // Insérer une nouvelle entrée avec voir_bureau = 0 par défaut
      await dbService.execute(
        'INSERT INTO repechages (student_id, subject_id, value, percentage, voir_bureau, is_dirty, last_modified_at) VALUES (?, ?, ?, ?, 0, 1, (datetime(\'now\')))',
        [studentId, subjectId, value, percentage]
      );
    }
  }

  /**
   * Bascule le statut "Voir Bureau" d'un élève pour une matière donnée.
   * Si l'entrée n'existe pas encore, elle est créée avec voir_bureau = 1 et percentage = 0.
   * @param studentId L'identifiant de l'élève
   * @param subjectId L'identifiant de la matière
   * @param enabled true = activer le VB, false = le désactiver
   */
  async setVoirBureau(studentId: number, subjectId: number, enabled: boolean): Promise<void> {
    const voirBureauValue = enabled ? 1 : 0;

    const existing = await dbService.query<Repechage>(
      'SELECT id, voir_bureau FROM repechages WHERE student_id = ? AND subject_id = ?',
      [studentId, subjectId]
    );

    if (existing.length > 0) {
      // Mettre à jour le statut VB de l'entrée existante
      await dbService.execute(
        'UPDATE repechages SET voir_bureau = ?, is_dirty = 1, last_modified_at = (datetime(\'now\')) WHERE student_id = ? AND subject_id = ?',
        [voirBureauValue, studentId, subjectId]
      );
    } else if (enabled) {
      // Créer une entrée minimale juste pour marquer "Voir Bureau" (pas de points pour l'instant)
      await dbService.execute(
        'INSERT INTO repechages (student_id, subject_id, value, percentage, voir_bureau, is_dirty, last_modified_at) VALUES (?, ?, 0, 0, 1, 1, (datetime(\'now\')))',
        [studentId, subjectId]
      );
    }
    // Si disabled et pas d'entrée, rien à faire
  }
}

export const repechageService = new RepechageService();
