import { dbService } from './databaseService';

export interface Domain {
  id: number;
  name: string;
  display_order: number;
  created_at: string;
}

/**
 * Service pour gérer les domaines de matières (pour le primaire)
 */
class DomainService {
  /**
   * Récupère tous les domaines, triés par ordre d'affichage
   */
  async getAllDomains(): Promise<Domain[]> {
    return await dbService.query<Domain>(
      'SELECT * FROM domains ORDER BY display_order ASC, name ASC'
    );
  }

  /**
   * Récupère un domaine par son ID
   */
  async getDomainById(id: number): Promise<Domain | null> {
    const domains = await dbService.query<Domain>(
      'SELECT * FROM domains WHERE id = ?',
      [id]
    );
    return domains.length > 0 ? domains[0] : null;
  }

  /**
   * Crée un nouveau domaine
   */
  async createDomain(name: string, displayOrder?: number): Promise<number> {
    const order = displayOrder ?? (await this.getNextDisplayOrder());
    const result = await dbService.execute(
      'INSERT INTO domains (name, display_order) VALUES (?, ?)',
      [name, order]
    );
    return result.lastInsertId;
  }

  /**
   * Met à jour un domaine
   */
  async updateDomain(id: number, name: string, displayOrder?: number): Promise<void> {
    if (displayOrder !== undefined) {
      await dbService.execute(
        'UPDATE domains SET name = ?, display_order = ? WHERE id = ?',
        [name, displayOrder, id]
      );
    } else {
      await dbService.execute(
        'UPDATE domains SET name = ? WHERE id = ?',
        [name, id]
      );
    }
  }

  /**
   * Supprime un domaine
   */
  async deleteDomain(id: number): Promise<void> {
    await dbService.execute('DELETE FROM domains WHERE id = ?', [id]);
  }

  /**
   * Obtient le prochian numéro d'ordre d'affichage disponible
   */
  private async getNextDisplayOrder(): Promise<number> {
    const result = await dbService.query<{ max_order: number }>(
      'SELECT COALESCE(MAX(display_order), 0) + 1 as max_order FROM domains'
    );
    return result[0]?.max_order ?? 1;
  }
}

export const domainService = new DomainService();
