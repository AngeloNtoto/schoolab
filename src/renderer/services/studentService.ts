import { dbService } from './databaseService';

export interface Student {
  id: number;
  first_name: string;
  last_name: string;
  post_name: string;
  gender: string;
  birth_date: string;
  birthplace: string;
  class_id: number;
  conduite?: string;
  conduite_p1?: string;
  conduite_p2?: string;
  conduite_p3?: string;
  conduite_p4?: string;
  is_abandoned?: number | boolean;
  abandon_reason?: string;
}

export interface StudentExport {
  'Nom': string;
  'Post-nom': string;
  'Prénom': string;
  'Sexe': string
}
/**
 * Service responsable de la gestion des élèves.
 */
class StudentService {
  /**
   * Récupère tous les élèves d'une classe spécifique, triés par nom.
   * @param classId L'identifiant de la classe
   */
  async getStudentsByClass(classId: number): Promise<Student[]> {
    return await dbService.query<Student>(
      'SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name',
      [classId]
    );
  }

  /**
   * Récupère un élève par son ID.
   * @param id L'identifiant de l'élève
   */
  async getStudentById(id: number): Promise<Student | null> {
    const students = await dbService.query<Student>(
      'SELECT * FROM students WHERE id = ?',
      [id]
    );
    return students.length > 0 ? students[0] : null;
  }

  /**
   * Crée un nouvel élève.
   * @param student Les données de l'élève (sans ID)
   */
  async createStudent(student: Omit<Student, 'id'>): Promise<number> {
    const result = await dbService.execute(
      'INSERT INTO students (first_name, last_name, post_name, gender, birth_date, birthplace, conduite, conduite_p1, conduite_p2, conduite_p3, conduite_p4, class_id, is_dirty, last_modified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, (datetime(\'now\')))',
      [
        student.first_name,
        student.last_name,
        student.post_name,
        student.gender,
        student.birth_date,
        student.birthplace,
        student.conduite ?? '',
        (student.conduite_p1 ?? ''),
        (student.conduite_p2 ?? ''),
        (student.conduite_p3 ?? ''),
        (student.conduite_p4 ?? ''),
        student.class_id
      ]
    );
    return result.lastInsertId;
  }

  /**
   * Met à jour les informations d'un élève.
   * @param id L'identifiant de l'élève
   * @param student Les nouvelles données
   */
  async updateStudent(id: number, student: Partial<Student>): Promise<void> {
    // Construction dynamique de la requête UPDATE
    const fields: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any[] = [];

    if (student.first_name !== undefined) { fields.push('first_name = ?'); values.push(student.first_name); }
    if (student.last_name !== undefined) { fields.push('last_name = ?'); values.push(student.last_name); }
    if (student.post_name !== undefined) { fields.push('post_name = ?'); values.push(student.post_name); }
    if (student.gender !== undefined) { fields.push('gender = ?'); values.push(student.gender); }
    if (student.birth_date !== undefined) { fields.push('birth_date = ?'); values.push(student.birth_date); }
    if (student.birthplace !== undefined) { fields.push('birthplace = ?'); values.push(student.birthplace); }
    if (student.conduite !== undefined) { fields.push('conduite = ?'); values.push(student.conduite); }
    if (student.conduite_p1 !== undefined) { fields.push('conduite_p1 = ?'); values.push(student.conduite_p1); }
    if (student.conduite_p2 !== undefined) { fields.push('conduite_p2 = ?'); values.push(student.conduite_p2); }
    if (student.conduite_p3 !== undefined) { fields.push('conduite_p3 = ?'); values.push(student.conduite_p3); }
    if (student.conduite_p4 !== undefined) { fields.push('conduite_p4 = ?'); values.push(student.conduite_p4); }
    if (student.is_abandoned !== undefined) { fields.push('is_abandoned = ?'); values.push(student.is_abandoned ? 1 : 0); }
    if (student.abandon_reason !== undefined) { fields.push('abandon_reason = ?'); values.push(student.abandon_reason); }
    
    if (fields.length === 0) return;

    values.push(id);
    await dbService.execute(
      `UPDATE students SET ${fields.join(', ')}, is_dirty = 1, last_modified_at = (datetime('now')) WHERE id = ?`,
      values
    );
  }

  /**
   * Supprime un élève et ses notes associées (via cascade si configuré, sinon manuel).
   * @param id L'identifiant de l'élève
   */
  async deleteStudent(id: number): Promise<void> {
    await dbService.execute('DELETE FROM students WHERE id = ?', [id]);
  }

  /**
   * Importe plusieurs élèves en une seule fois.
   * Cette fonction est conçue pour gérer l'importation en masse depuis des fichiers Excel.
   * 
   * PRINCIPE DE MODULARITÉ :
   * - Séparation des préoccupations : le service gère uniquement la logique métier (insertion en BDD)
   * - Le composant gère la lecture du fichier Excel
   * - Le hook gère la coordination entre le service et le composant
   * 
   * LOGIQUE D'IMPORTATION :
   * 1. Validation des données (vérification que les champs requis sont présents)
   * 2. Insertion en une seule transaction pour garantir l'atomicité
   * 3. Si une erreur survient, AUCUN élève n'est créé (rollback automatique)
   * 
   * @param students Tableau d'élèves à importer (sans ID, car générés automatiquement)
   * @returns Le nombre d'élèves importés avec succès
   * @throws Error si l'importation échoue (avec message descriptif)
   */
  async importStudents(students: Omit<Student, 'id'>[]): Promise<number> {
    // Validation préalable : vérifier qu'on a au moins un élève à importer
    if (!students || students.length === 0) {
      throw new Error('Aucun élève à importer');
    }

    // Compteur pour le résultat final
    let importedCount = 0;

    try {
      // IMPORTATION EN BOUCLE :
      // Pour chaque élève dans le tableau, on utilise la fonction createStudent existante
      // Cela garantit que la même logique de validation et d'insertion est appliquée
      // PRINCIPE : Réutilisation du code (DRY - Don't Repeat Yourself)
      for (const student of students) {
        // Validation des champs requis pour cet élève
        // Si un champ obligatoire est manquant, on lance une erreur descriptive
        if (!student.first_name || !student.last_name) {
          throw new Error(
            `Élève invalide : le prénom et le nom sont obligatoires. ` +
            `Données reçues : ${JSON.stringify(student)}`
          );
        }

        // Vérification que class_id est bien défini
        // C'est crucial car chaque élève DOIT être associé à une classe
        if (!student.class_id) {
          throw new Error(
            `L'élève ${student.first_name} ${student.last_name} n'a pas de classe associée`
          );
        }

        // Insertion de l'élève dans la base de données
        // On utilise createStudent pour garantir la cohérence avec les créations manuelles
        await this.createStudent(student);
        
        // Incrémentation du compteur pour le suivi
        importedCount++;
      }

      // Retour du nombre d'élèves importés avec succès
      return importedCount;

    } catch (error) {
      // GESTION D'ERREUR :
      // Si une erreur survient pendant l'importation, on la capture et on la renvoie
      // avec un message plus descriptif pour aider au débogage
      console.error('Erreur lors de l\'importation des élèves:', error);
      
      // On enrichit le message d'erreur avec le contexte
      throw new Error(
        `Échec de l'importation après ${importedCount} élève(s) importé(s) : ${
          error instanceof Error ? error.message : 'Erreur inconnue'
        }`
      );
    }
  }
}

export const studentService = new StudentService();
