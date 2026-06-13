import { dbService } from './databaseService';
import { historyService, OperationLog } from './historyService';

class UndoRedoService {
  private undoStack: OperationLog[] = [];
  private redoStack: OperationLog[] = [];
  private isProcessing: boolean = false;

  constructor() {
    // Initialiser la pile avec les opérations récentes
    this.initStack();
    
    // Écouter les nouvelles opérations pour les ajouter à la pile d'annulation
    // et vider la pile de rétablissement (redo)
    window.addEventListener('history:changed', () => {
      if (!this.isProcessing) {
        this.initStack();
        this.redoStack = []; // Une nouvelle action invalide l'historique futur
      }
    });
  }

  private async initStack() {
    // On ne charge que les opérations de la session courante ou les plus récentes
    const ops = await historyService.getRecentOperations(100);
    // getRecentOperations retourne du plus récent au plus ancien (ORDER BY created_at DESC)
    this.undoStack = ops; 
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  async undo(): Promise<boolean> {
    if (this.isProcessing || !this.canUndo) return false;
    
    this.isProcessing = true;
    const op = this.undoStack.shift()!; // Récupère et enlève l'opération la plus récente
    
    try {
      await this.applyOperationInverse(op);
      this.redoStack.unshift(op); // L'ajoute à la pile redo
      
      // Dispatch events for UI updates
      window.dispatchEvent(new CustomEvent('db:changed'));
      window.dispatchEvent(new CustomEvent('undoredo:changed'));
      
      return true;
    } catch (err) {
      console.error('Erreur lors de l\'annulation:', err);
      // En cas d'erreur, on remet l'opération
      this.undoStack.unshift(op);
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  async redo(): Promise<boolean> {
    if (this.isProcessing || !this.canRedo) return false;
    
    this.isProcessing = true;
    const op = this.redoStack.shift()!;
    
    try {
      await this.applyOperationDirect(op);
      this.undoStack.unshift(op);
      
      window.dispatchEvent(new CustomEvent('db:changed'));
      window.dispatchEvent(new CustomEvent('undoredo:changed'));
      
      return true;
    } catch (err) {
      console.error('Erreur lors du rétablissement:', err);
      this.redoStack.unshift(op);
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  private async applyOperationInverse(op: OperationLog) {
    if (op.entity_type === 'grade') {
      const prevState = op.previous_state ? JSON.parse(op.previous_state) : null;
      
      if (!prevState) {
        // L'action d'origine était une CREATE (pas d'état précédent), l'inverse est DELETE
        await dbService.execute('DELETE FROM grades WHERE id = ?', [op.entity_id]);
      } else {
        // Sécurité : vérifier si l'élève et la matière existent toujours
        const studentExists = await dbService.query('SELECT id FROM students WHERE id = ?', [prevState.student_id]);
        const subjectExists = await dbService.query('SELECT id FROM subjects WHERE id = ?', [prevState.subject_id]);
        if (studentExists.length === 0 || subjectExists.length === 0) {
           throw new Error('Impossible de restaurer : l\'élève ou la matière n\'existe plus.');
        }

        // L'action était UPDATE ou DELETE, on restaure l'état précédent
        const existing = await dbService.query('SELECT id FROM grades WHERE id = ?', [op.entity_id]);
        if (existing.length > 0) {
          // UPDATE inverse
          await dbService.execute(
            'UPDATE grades SET value = ?, period = ?, is_dirty = 1 WHERE id = ?',
            [prevState.value, prevState.period, op.entity_id]
          );
        } else {
          // DELETE inverse (réinsérer)
          await dbService.execute(
            'INSERT INTO grades (id, student_id, subject_id, period, value, is_dirty) VALUES (?, ?, ?, ?, ?, 1)',
            [op.entity_id, prevState.student_id, prevState.subject_id, prevState.period, prevState.value]
          );
        }
      }
    }
  }

  private async applyOperationDirect(op: OperationLog) {
    if (op.entity_type === 'grade') {
      const nextState = op.new_state ? JSON.parse(op.new_state) : null;
      
      if (!nextState) {
        // L'action d'origine était une DELETE (pas de nouvel état)
        await dbService.execute('DELETE FROM grades WHERE id = ?', [op.entity_id]);
      } else {
        // Sécurité : vérifier si l'élève et la matière existent toujours
        const studentExists = await dbService.query('SELECT id FROM students WHERE id = ?', [nextState.student_id]);
        const subjectExists = await dbService.query('SELECT id FROM subjects WHERE id = ?', [nextState.subject_id]);
        if (studentExists.length === 0 || subjectExists.length === 0) {
           throw new Error('Impossible de restaurer : l\'élève ou la matière n\'existe plus.');
        }

        // L'action était UPDATE ou CREATE
        const existing = await dbService.query('SELECT id FROM grades WHERE id = ?', [op.entity_id]);
        if (existing.length > 0) {
          // UPDATE direct
          await dbService.execute(
            'UPDATE grades SET value = ?, period = ?, is_dirty = 1 WHERE id = ?',
            [nextState.value, nextState.period, op.entity_id]
          );
        } else {
          // CREATE direct
          await dbService.execute(
            'INSERT INTO grades (id, student_id, subject_id, period, value, is_dirty) VALUES (?, ?, ?, ?, ?, 1)',
            [op.entity_id, nextState.student_id, nextState.subject_id, nextState.period, nextState.value]
          );
        }
      }
    }
  }
}

export const undoRedoService = new UndoRedoService();
