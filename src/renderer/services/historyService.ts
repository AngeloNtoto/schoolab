import { dbService } from './databaseService';

export interface ChangeRecord {
  id: string; // unique ID for key (table-localId)
  table: string;
  localId: number;
  type: 'NEW' | 'MODIFIED' | 'DELETED';
  label: string;
  currentData?: any;
  snapshotData?: any;
  updatedAt?: string;
}

export interface SyncLog {
  id: number;
  type: string;
  status: string;
  records_synced: string;
  error_message?: string;
  duration_ms: number;
  timestamp: string;
}

export const historyService = {
  async getSyncHistory(): Promise<SyncLog[]> {
    return await dbService.query<SyncLog>('SELECT * FROM sync_history ORDER BY id DESC LIMIT 50');
  },

  async getPendingChanges(): Promise<ChangeRecord[]> {
    const changes: ChangeRecord[] = [];

    // Helper to fetch valid label based on table
    const getLabel = (table: string, data: any) => {
      if (!data) return 'Inconnu';
      if (table === 'students') return `${data.first_name} ${data.last_name}`;
      if (table === 'classes') return data.name;
      if (table === 'subjects') return `${data.name} (${data.code})`;
      if (table === 'academic_years') return data.name;
      if (table === 'domains') return data.name;
      if (table === 'notes') return data.title;
      if (table === 'grades') return `Note (ID: ${data.id})`; // Ideally fetch student/subject name, but might be expensive for list
      return `ID: ${data.id}`;
    };

    const tables = ['academic_years', 'classes', 'students', 'subjects', 'grades', 'notes', 'domains'];

    for (const table of tables) {
      // 1. Modified / New
      const dirtyRecords = await dbService.query<any>(`SELECT * FROM ${table} WHERE is_dirty = 1`);
      
      for (const record of dirtyRecords) {
        // Fetch snapshot
        const snapshotRes = await dbService.query<any>(`SELECT data FROM record_snapshots WHERE table_name = ? AND record_id = ?`, [table, record.id]);
        const snapshotData = snapshotRes.length > 0 ? JSON.parse(snapshotRes[0].data) : null;

        // Verify type: If no server_id or no snapshot, it uses logic. 
        // Technically if no snapshot, it's treated as NEW (since we backed up all clean records).
        // But if server_id exists, it's MODIFIED.
        const type = (record.server_id && snapshotData) ? 'MODIFIED' : 'NEW';

        changes.push({
          id: `${table}-${record.id}`,
          table,
          localId: record.id,
          type,
          label: getLabel(table, record),
          currentData: record,
          snapshotData: snapshotData,
          updatedAt: record.updated_at
        });
      }
    }

    // 2. Deleted
    const deletions = await dbService.query<any>('SELECT * FROM sync_deletions');
    for (const del of deletions) {
      // For deleted records, we try to find a snapshot to show what was deleted
      // OR we just show the ID.
      const snapshotRes = await dbService.query<any>(`SELECT data FROM record_snapshots WHERE table_name = ? AND record_id = ?`, [del.table_name, del.local_id]);
      const snapshotData = snapshotRes.length > 0 ? JSON.parse(snapshotRes[0].data) : null;

      changes.push({
        id: `del-${del.table_name}-${del.local_id}`,
        table: del.table_name,
        localId: del.local_id,
        type: 'DELETED',
        label: snapshotData ? getLabel(del.table_name, snapshotData) : `Suppression (ID: ${del.local_id})`,
        currentData: null,
        snapshotData: snapshotData,
        updatedAt: del.deleted_at
      });
    }

    return changes;
  },
  
  // Clean up history
  async clearHistory() {
      await dbService.execute('DELETE FROM sync_history');
  },

  async ignoreChange(changeId: string) {
    // Parse ID
    let table = '';
    let id = 0;
    let isDeletion = false;

    if (changeId.startsWith('del-')) {
      const parts = changeId.split('-');
      // del-table-id
      table = parts[1];
      id = parseInt(parts[2]);
      isDeletion = true;
    } else {
      const parts = changeId.split('-');
      table = parts[0];
      id = parseInt(parts[1]);
    }

    if (isDeletion) {
      await dbService.execute(`DELETE FROM sync_deletions WHERE table_name = ? AND local_id = ?`, [table, id]);
    } else {
      await dbService.execute(`UPDATE ${table} SET is_dirty = 0 WHERE id = ?`, [id]);
    }
  },

  async revertChange(changeId: string) {
    let table = '';
    let id = 0;
    let isDeletion = false;

    if (changeId.startsWith('del-')) {
      const parts = changeId.split('-');
      table = parts[1];
      id = parseInt(parts[2]);
      isDeletion = true;
    } else {
      const parts = changeId.split('-');
      table = parts[0];
      id = parseInt(parts[1]);
    }

    // Get snapshot
    const snapshotRes = await dbService.query<any>(`SELECT data FROM record_snapshots WHERE table_name = ? AND record_id = ?`, [table, id]);
    const snapshotData = snapshotRes.length > 0 ? JSON.parse(snapshotRes[0].data) : null;

    if (isDeletion) {
      // Revert deletion: Insert back and remove from deletions
      if (snapshotData) {
        const keys = Object.keys(snapshotData).join(', ');
        const placeholders = Object.keys(snapshotData).map(() => '?').join(', ');
        const values = Object.values(snapshotData);
        // Turn off ID constraints if needed or rely on 'id' being in snapshot
        // We might need to handle 'id' conflicts if a new record took it, but usually auto-increment prevents reuse unless force set.
        // Simple insert
        await dbService.execute(`INSERT OR REPLACE INTO ${table} (${keys}) VALUES (${placeholders})`, values);
        await dbService.execute(`DELETE FROM sync_deletions WHERE table_name = ? AND local_id = ?`, [table, id]);
      } else {
        throw new Error("Impossible de restaurer : aucune sauvegarde trouvée.");
      }
    } else {
      // Revert Modification/New
      // If it was NEW (no server_id usually, but here we rely on snapshot presence)
      if (!snapshotData) {
        // Presumably NEW record without snapshot -> Delete it
        await dbService.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
      } else {
        // Modified: Update back to snapshot
        const updates = Object.keys(snapshotData)
          .map(k => `${k} = ?`)
          .join(', ');
        const values = Object.values(snapshotData);
        await dbService.execute(`UPDATE ${table} SET ${updates}, is_dirty = 0 WHERE id = ?`, [...values, id]);
      }
    }
  },

  async ignoreAllChanges() {
    // 1. Clear dirty flags
    const tables = ['academic_years', 'classes', 'students', 'subjects', 'grades', 'notes', 'domains'];
    for (const table of tables) {
      await dbService.execute(`UPDATE ${table} SET is_dirty = 0 WHERE is_dirty = 1`);
    }
    // 2. Clear deletions
    await dbService.execute('DELETE FROM sync_deletions');
  },

  async revertAllChanges() {
    // We get all pending changes and loop through them to revert one by one
    // Ideally we would do this in a transaction but for now looping is safer to reuse logic
    const pending = await this.getPendingChanges();
    for (const change of pending) {
      await this.revertChange(change.id);
    }
  }
};
