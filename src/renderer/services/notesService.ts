export interface Note {
  id: number;
  title: string;
  content: string;
  target_type: 'student' | 'class' | 'general';
  target_id?: number;
  tags?: string;
  created_at: string;
}

export const notesService = {
  getAll: async (): Promise<Note[]> => {
    try {
      return await window.api.db.query<Note>('SELECT * FROM notes ORDER BY created_at DESC');
    } catch (error) {
      console.error('Failed to get notes:', error);
      return [];
    }
  },

  getByTarget: async (type: string, id: number): Promise<Note[]> => {
    try {
      return await window.api.db.query<Note>(
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
      await window.api.db.execute(
        'INSERT INTO notes (title, content, target_type, target_id, tags) VALUES (?, ?, ?, ?, ?)',
        [note.title, note.content, note.target_type, note.target_id || null, note.tags || '']
      );
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await window.api.db.execute('DELETE FROM notes WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  }
};
