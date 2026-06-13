import { gradeService } from './gradeService';
import { historyService } from './historyService';
import { dbService } from './databaseService';
import { Grade } from './gradeService';

export class GradeActions {
  /**
   * Met à jour une note tout en journalisant l'opération dans le moteur d'historique.
   */
  async updateGrade(studentId: number, subjectId: number, period: string, value: number | null): Promise<void> {
    // 1. Récupérer l'état actuel (previousState)
    const existingResult = await dbService.query<Grade>(
      'SELECT * FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?',
      [studentId, subjectId, period]
    );
    const existing = existingResult.length > 0 ? existingResult[0] : null;

    // 2. Déterminer le type d'action et le nouvel état
    let actionType: 'CREATE' | 'UPDATE' | 'DELETE';
    let newState: Grade | null = null;
    let description = '';

    if (existing) {
      if (value === null) {
        actionType = 'DELETE';
        description = `Suppression de la note (${existing.value}) pour la période ${period}`;
      } else {
        actionType = 'UPDATE';
        newState = { ...existing, value };
        description = `Modification de la note (${existing.value} -> ${value}) pour la période ${period}`;
      }
    } else {
      if (value !== null) {
        actionType = 'CREATE';
        newState = { student_id: studentId, subject_id: subjectId, period, value };
        description = `Ajout d'une nouvelle note (${value}) pour la période ${period}`;
      } else {
        // Rien à faire (la note n'existe pas et on veut la supprimer)
        return;
      }
    }

    // 3. Effectuer la mise à jour réelle
    await gradeService.updateGrade(studentId, subjectId, period, value);

    // Si on vient de créer la note, on doit récupérer son ID pour l'historique
    let entityId = existing?.id;
    if (actionType === 'CREATE') {
      const created = await dbService.query<Grade>(
        'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?',
        [studentId, subjectId, period]
      );
      if (created.length > 0) {
        entityId = created[0].id;
        if (newState) newState.id = entityId;
      }
    }

    // 4. Journaliser l'opération
    if (entityId) {
      await historyService.logOperation(
        'grade',
        entityId,
        actionType,
        existing,
        newState,
        description
      );
    }
  }
}

export const gradeActions = new GradeActions();
