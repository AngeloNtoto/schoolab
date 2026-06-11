import { dbService } from './databaseService';

export interface CustomSort {
  id: number;
  class_id: number;
  name: string;
  student_order: string; // JSON string representing Record<number, number> (student_id -> position)
  server_id?: string;
}

export const customSortService = {
  async getByClass(classId: number): Promise<CustomSort[]> {
    return await dbService.query<CustomSort>(
      'SELECT * FROM custom_sorts WHERE class_id = ? ORDER BY id ASC',
      [classId]
    );
  },

  async create(classId: number, name: string, studentOrder: Record<number, number>): Promise<number> {
    const result = await dbService.execute(
      'INSERT INTO custom_sorts (class_id, name, student_order) VALUES (?, ?, ?)',
      [classId, name, JSON.stringify(studentOrder)]
    );
    return result.lastInsertId;
  },

  async update(id: number, name: string, studentOrder: Record<number, number>): Promise<void> {
    await dbService.execute(
      'UPDATE custom_sorts SET name = ?, student_order = ? WHERE id = ?',
      [name, JSON.stringify(studentOrder), id]
    );
  },

  async delete(id: number): Promise<void> {
    await dbService.execute('DELETE FROM custom_sorts WHERE id = ?', [id]);
  }
};
