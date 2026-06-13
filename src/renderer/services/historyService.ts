import { dbService } from './databaseService';

export interface OperationLog {
  id: number;
  entity_type: string;
  entity_id: number;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  previous_state: string | null;
  new_state: string | null;
  description: string;
  checkpoint_id: number | null;
  created_at: string;
}

export interface Checkpoint {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

class HistoryService {
  /**
   * Log an operation in the history engine.
   */
  async logOperation(
    entityType: string,
    entityId: number,
    actionType: 'CREATE' | 'UPDATE' | 'DELETE',
    previousState: any,
    newState: any,
    description: string
  ): Promise<number> {
    const prev = previousState ? JSON.stringify(previousState) : null;
    const next = newState ? JSON.stringify(newState) : null;
    
    // We get the active checkpoint if one exists (for phase 4, we assume null or allow manual checkpoints)
    // Here we will just log with null checkpoint_id for now
    
    const result = await dbService.execute(
      `INSERT INTO operation_log (entity_type, entity_id, action_type, previous_state, new_state, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [entityType, entityId, actionType, prev, next, description]
    );
    
    // Dispatch an event to notify the UI (Recent Changes Panel)
    window.dispatchEvent(new CustomEvent('history:changed'));
    
    return result.lastInsertId;
  }

  /**
   * Get the history of operations.
   */
  async getRecentOperations(limit: number = 50): Promise<OperationLog[]> {
    return await dbService.query<OperationLog>(
      'SELECT * FROM operation_log ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
  }

  /**
   * Create a manual checkpoint.
   */
  async createCheckpoint(name: string, description: string = ''): Promise<number> {
    const result = await dbService.execute(
      'INSERT INTO checkpoints (name, description) VALUES (?, ?)',
      [name, description]
    );
    
    window.dispatchEvent(new CustomEvent('history:checkpoint_created'));
    return result.lastInsertId;
  }

  /**
   * Get all checkpoints.
   */
  async getCheckpoints(): Promise<Checkpoint[]> {
    return await dbService.query<Checkpoint>('SELECT * FROM checkpoints ORDER BY created_at DESC');
  }
}

export const historyService = new HistoryService();
