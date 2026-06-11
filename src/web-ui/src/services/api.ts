import { Class, Grade, Subject, Student, CustomSort } from '../types';

// Structure complète des données d'une classe retournée par l'API
interface FullClassData {
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  custom_sorts: CustomSort[];
}

export const api = {
  fetchClasses: async (): Promise<Class[]> => {
    const res = await fetch('/api/classes');
    if (!res.ok) throw new Error('Failed to fetch classes');
    return await res.json();
  },

  fetchClassData: async (clsId: number): Promise<FullClassData> => {
    const res = await fetch(`/api/classes/${clsId}/full`);
    if (!res.ok) throw new Error('Failed to fetch class data');
    return await res.json();
  },

  saveGrades: async (updates: Grade[], clientId: string): Promise<void> => {
    const res = await fetch('/api/grades/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        updates,
        senderId: clientId 
      })
    });
    if (!res.ok) throw new Error('Failed to save grades');
  },

  getEventSource: (): EventSource => {
    return new EventSource('/api/events');
  }
};
