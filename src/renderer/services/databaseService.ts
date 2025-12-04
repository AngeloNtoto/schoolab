/**
 * Service generic pour les interactions avec la base de données via IPC.
 * Ce service agit comme un wrapper autour de window.api.db pour fournir un typage et une gestion d'erreurs centralisée.
 */

export interface DatabaseService {
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<any>;
}

class DatabaseServiceImpl implements DatabaseService {
  /**
   * Exécute une requête SELECT et retourne les résultats typés.
   * @param sql La requête SQL à exécuter
   * @param params Les paramètres optionnels pour la requête
   * @returns Une promesse résolue avec un tableau de résultats de type T
   */
  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      return await window.api.db.query<T>(sql, params);
    } catch (error) {
      console.error(`[DatabaseService] Erreur lors de la requête: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Exécute une requête INSERT, UPDATE ou DELETE.
   * @param sql La requête SQL à exécuter
   * @param params Les paramètres optionnels pour la requête
   * @returns Une promesse résolue avec le résultat de l'opération (ex: lastInsertRowid)
   */
  async execute(sql: string, params: any[] = []): Promise<any> {
    try {
      return await window.api.db.execute(sql, params);
    } catch (error) {
      console.error(`[DatabaseService] Erreur lors de l'exécution: ${sql}`, error);
      throw error;
    }
  }
}

export const dbService = new DatabaseServiceImpl();
