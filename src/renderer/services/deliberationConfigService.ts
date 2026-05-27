/**
 * deliberationConfigService.ts
 *
 * Service centralisé pour gérer les critères de délibération configurables.
 * Chaque école peut personnaliser ses seuils, appréciations, libellés et règles
 * via la page de paramètres. Les valeurs sont stockées dans SQLite (table settings).
 */

import { settingsService } from './settingsService';

export interface RachatRule {
  id: string;
  maxPointsLimite: number;
  pointsManquantsMax: number;
}

export interface AppreciationRule {
  id: string;
  seuilMin: number;
  label: string;
  abrev: string;
}

// Interface regroupant tous les critères de délibération paramétrables
export interface DeliberationConfig {
  // --- Seuils de réussite ---
  seuilReussiteGlobal: number;
  seuilEchecMatiere: number;

  // --- Critères de rachat dynamiques ---
  rachatRules: RachatRule[];

  // --- Échelle des appréciations dynamique ---
  appreciationRules: AppreciationRule[];

  // --- Libellés des catégories du palmarès ---
  categorie_1_label: string;
  categorie_2_label: string;
  categorie_3_label: string;
  categorie_4_label: string;
  categorie_5_label: string;

  // --- Règles structurelles ---
  maxEchecsRepechage: number;
  coursCompletObligatoire: boolean;
  ordreTransfertPeriodes: string;
  manqueCotesDoubleEnFinal: boolean;
}

// Valeurs par défaut de référence
export const DEFAULT_DELIBERATION_CONFIG: DeliberationConfig = {
  seuilReussiteGlobal: 50,
  seuilEchecMatiere: 50,

  rachatRules: [
    { id: 'r1', maxPointsLimite: 80, pointsManquantsMax: 6 },
    { id: 'r2', maxPointsLimite: 160, pointsManquantsMax: 8 },
    { id: 'r3', maxPointsLimite: 300, pointsManquantsMax: 10 },
    { id: 'r4', maxPointsLimite: 320, pointsManquantsMax: 12 },
    { id: 'r5', maxPointsLimite: 500, pointsManquantsMax: 15 },
  ],

  appreciationRules: [
    { id: 'a1', seuilMin: 80, label: 'Élite', abrev: 'E' },
    { id: 'a2', seuilMin: 60, label: 'Très Bon', abrev: 'TB' },
    { id: 'a3', seuilMin: 50, label: 'Bon', abrev: 'B' },
    { id: 'a4', seuilMin: 40, label: 'Médiocre', abrev: 'Mé' },
    { id: 'a5', seuilMin: 0, label: 'Mauvais', abrev: 'Ma' },
  ],

  categorie_1_label: 'I. Passent en première session',
  categorie_2_label: 'II. Passent après la 2ème session',
  categorie_3_label: 'III. Doublent la classe',
  categorie_4_label: 'IV. Abandons',
  categorie_5_label: 'Non classés',

  maxEchecsRepechage: 5,
  coursCompletObligatoire: true,
  ordreTransfertPeriodes: 'EXAM2,P4,EXAM1,P2,P1,P3',
  manqueCotesDoubleEnFinal: true,
};

const KEY_PREFIX = 'delib_';

export const deliberationConfigService = {

  async load(): Promise<DeliberationConfig> {
    const config = { ...DEFAULT_DELIBERATION_CONFIG };

    try {
      const all = await settingsService.getAll();

      for (const key of Object.keys(DEFAULT_DELIBERATION_CONFIG) as Array<keyof DeliberationConfig>) {
        const storedValue = all[KEY_PREFIX + key];
        if (storedValue !== undefined && storedValue !== null) {
          const defaultVal = DEFAULT_DELIBERATION_CONFIG[key];
          
          if (Array.isArray(defaultVal)) {
            try {
              (config as any)[key] = JSON.parse(storedValue);
            } catch (e) {
              console.error(`Erreur parsing JSON pour ${key}:`, e);
              (config as any)[key] = defaultVal;
            }
          } else if (typeof defaultVal === 'number') {
            (config as any)[key] = parseFloat(storedValue);
          } else if (typeof defaultVal === 'boolean') {
            (config as any)[key] = storedValue === 'true';
          } else {
            (config as any)[key] = storedValue;
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la config de délibération :', error);
    }

    return config;
  },

  async save(config: DeliberationConfig): Promise<void> {
    try {
      for (const key of Object.keys(config) as Array<keyof DeliberationConfig>) {
        const value = config[key];
        let stringValue = String(value);
        
        if (Array.isArray(value)) {
          stringValue = JSON.stringify(value);
        }
        
        await settingsService.set(KEY_PREFIX + key, stringValue);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la config de délibération :', error);
      throw error;
    }
  },

  async resetToDefaults(): Promise<void> {
    await this.save(DEFAULT_DELIBERATION_CONFIG);
  },

  getAppreciationRule(percentage: number, config: DeliberationConfig): AppreciationRule | undefined {
    // Trier les règles par seuil descendant
    const sortedRules = [...config.appreciationRules].sort((a, b) => b.seuilMin - a.seuilMin);
    return sortedRules.find(r => percentage >= r.seuilMin) || sortedRules[sortedRules.length - 1];
  },

  getAppreciationAbrev(percentage: number, config: DeliberationConfig): string {
    const rule = this.getAppreciationRule(percentage, config);
    return rule ? rule.abrev : '-';
  },

  getAppreciationLabel(percentage: number, config: DeliberationConfig): string {
    const rule = this.getAppreciationRule(percentage, config);
    return rule ? rule.label : '-';
  },

  isRelevable(maxPoints: number, missingPoints: number, config: DeliberationConfig): boolean {
    // Trier les règles par maxPointsLimite ascendant
    const sortedRules = [...config.rachatRules].sort((a, b) => a.maxPointsLimite - b.maxPointsLimite);
    
    // Trouver la première règle dont le maxPointsLimite est >= au maxPoints du cours
    const rule = sortedRules.find(r => maxPoints <= r.maxPointsLimite);
    
    if (rule) {
      return missingPoints <= rule.pointsManquantsMax;
    }
    
    return false;
  },
};
