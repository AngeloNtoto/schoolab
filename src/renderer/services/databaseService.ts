import { getTauriAPI } from './tauriBridge';

/**
 * Service générique pour les interactions avec la base de données.
 * Supporte exclusivement Tauri (via plugin-sql).
 */

export interface DatabaseService {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<any>;
}

class DatabaseServiceImpl implements DatabaseService {
  private tauriDb: any = null;

  private async getTauriDb() {
    if (this.tauriDb) return this.tauriDb;
    const api = await getTauriAPI();
    if (api) {
      // Dans Tauri, on ouvre la base de données. 
      // sqlite:ecole.db créera le fichier dans le dossier app data
      this.tauriDb = await api.Database.load('sqlite:ecole.db');
      return this.tauriDb;
    }
    throw new Error("Tauri API non disponible");
  }

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const db = await this.getTauriDb();
      return await db.select(sql, params);
    } catch (error) {
      console.error(`[DatabaseService] Erreur lors de la requête: ${sql}`, error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      const db = await this.getTauriDb();
      const result = await db.execute(sql, params);
      return result; // Tauri plugin-sql retourne un objet avec lastInsertId et rowsAffected
    } catch (error) {
      console.error(`[DatabaseService] Erreur lors de l'exécution: ${sql}`, error);
      throw error;
    }
  }
}

export const dbService = new DatabaseServiceImpl();
