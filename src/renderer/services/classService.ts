import { dbService } from './databaseService';

export interface ClassData {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  max_p1: number;
  max_p2: number;
  max_exam1: number;
  max_p3: number;
  max_p4: number;
  max_exam2: number;
  class_id?: number;
  domain_id?: number;
  category?: string;
}

/**
 * Service responsable de la gestion des classes et des matières.
 */
class ClassService {
  /**
   * Récupère les détails d'une classe par son ID.
   * @param id L'identifiant de la classe
   */
  async getClassById(id: number): Promise<ClassData | null> {
    const classes = await dbService.query<ClassData>(
      'SELECT * FROM classes WHERE id = ?',
      [id]
    );
    return classes.length > 0 ? classes[0] : null;
  }

  /**
   * Récupère toutes les matières d'une classe, triées par date de création et nom.
   * @param classId L'identifiant de la classe
   */
  async getSubjectsByClass(classId: number): Promise<Subject[]> {
    return await dbService.query<Subject>(
      'SELECT * FROM subjects WHERE class_id = ? ORDER BY created_at ASC, name ASC',
      [classId]
    );
  }

  /**
   * Crée une nouvelle matière pour une classe.
   * @param subject Les données de la matière
   */
  async createSubject(subject: Omit<Subject, 'id'>): Promise<number> {
    const result = await dbService.execute(
      `INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id, is_dirty, last_modified_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, (datetime('now')))`,
      [
        subject.name,
        subject.code,
        subject.max_p1,
        subject.max_p2,
        subject.max_exam1,
        subject.max_p3,
        subject.max_p4,
        subject.max_exam2,
        subject.class_id,
        subject.domain_id || null
      ]
    );
    return result.lastInsertId;
  }
}

export const classService = new ClassService();
