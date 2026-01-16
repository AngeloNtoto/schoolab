import { dbService } from './databaseService';

export interface Note {
  id: number;
  title: string;
  content: string;
  target_type: 'student' | 'class' | 'general';
  target_id?: number;
  academic_year_id?: number;
  tags?: string;
  created_at: string;
}

export const notesService = {
  getAll: async (): Promise<Note[]> => {
    try {
      return await dbService.query<Note>('SELECT * FROM notes ORDER BY created_at DESC');
    } catch (error) {
      console.error('Failed to get notes:', error);
      return [];
    }
  },

  getByTarget: async (type: string, id: number): Promise<Note[]> => {
    try {
      return await dbService.query<Note>(
        'SELECT * FROM notes WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC',
        [type, id]
      );
    } catch (error) {
      console.error('Failed to get notes by target:', error);
      return [];
    }
  },

  create: async (note: Omit<Note, 'id' | 'created_at'>): Promise<void> => {
    try {
      await dbService.execute(
        'INSERT INTO notes (title, content, target_type, target_id, academic_year_id, tags) VALUES (?, ?, ?, ?, ?, ?)',
        [note.title, note.content, note.target_type, note.target_id || null, note.academic_year_id || null, note.tags || '']
      );
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await dbService.execute('DELETE FROM notes WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  },
  
  update: async (id: number, note: Partial<Omit<Note, 'id' | 'created_at'>>): Promise<void> => {
    try {
      const updates: string[] = [];
      const values: any[] = [];
      
      if (note.title !== undefined) { updates.push('title = ?'); values.push(note.title); }
      if (note.content !== undefined) { updates.push('content = ?'); values.push(note.content); }
      if (note.target_type !== undefined) { updates.push('target_type = ?'); values.push(note.target_type); }
      if (note.target_id !== undefined) { updates.push('target_id = ?'); values.push(note.target_id || null); }
      if (note.academic_year_id !== undefined) { updates.push('academic_year_id = ?'); values.push(note.academic_year_id || null); }
      if (note.tags !== undefined) { updates.push('tags = ?'); values.push(note.tags || ''); }
      
      if (updates.length === 0) return;
      
      values.push(id);
      await dbService.execute(
        `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  }
};
