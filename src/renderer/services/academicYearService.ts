import { dbService } from './databaseService';

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean; // converted from 0/1 in db
}

export const academicYearService = {
  getAll: async (): Promise<AcademicYear[]> => {
    try {
      const years = await dbService.query<any>('SELECT * FROM academic_years ORDER BY start_date DESC');
      return years.map((y: any) => ({ ...y, is_active: Boolean(y.is_active) }));
    } catch (error) {
      console.error('Failed to get academic years:', error);
      throw error;
    }
  },

  getActive: async (): Promise<AcademicYear | null> => {
    try {
      const result = await dbService.query<any>('SELECT * FROM academic_years WHERE is_active = 1 LIMIT 1');
      if (result.length === 0) return null;
      return { ...result[0], is_active: true };
    } catch (error) {
      console.error('Failed to get active academic year:', error);
      throw error;
    }
  },

  create: async (name: string, startDate: string, endDate: string): Promise<number> => {
    try {
      const result = await dbService.execute(
        'INSERT INTO academic_years (name, start_date, end_date, is_active) VALUES (?, ?, ?, 0)',
        [name, startDate, endDate]
      );
      return result.lastInsertId;
    } catch (error) {
      console.error('Failed to create academic year:', error);
      throw error;
    }
  },

  setActive: async (id: number): Promise<void> => {
    try {
      // Transaction-like behavior usually, but we'll do two separate calls
      await dbService.execute('UPDATE academic_years SET is_active = 0');
      await dbService.execute('UPDATE academic_years SET is_active = 1 WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to set active academic year:', error);
      throw error;
    }
  },

  delete: async (id: number): Promise<void> => {
    try {
      await dbService.execute('DELETE FROM academic_years WHERE id = ?', [id]);
    } catch (error) {
       console.error('Failed to delete academic year:', error);
       throw error;
    }
  }
};
