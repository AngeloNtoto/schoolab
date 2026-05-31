import { OPTIONS } from '../../constants/school';

/**
 * Génère le nom d'affichage d'une classe à partir du niveau, de l'option et de la section.
 * Supporte les options dynamiques (stockées en base de données) en plus du catalogue statique.
 *
 * @param level - Niveau scolaire (ex: "7ème", "1ère")
 * @param option - Code de l'option (ex: "EB", "ELECTRONIQUE", ou tout code dynamique)
 * @param section - Section de la classe (ex: "A", "B", "-" pour aucune section)
 * @param optionLabel - Label explicite de l'option (optionnel). S'il est fourni, il est utilisé
 *                      en priorité au lieu de chercher dans le catalogue statique.
 * @returns Nom de classe formaté, ex: "1ère Électronique A"
 */
export function getClassDisplayName(
  level: string,
  option: string,
  section: string,
  optionLabel?: string
): string {
  // Si un label explicite est fourni, on l'utilise directement (cas du formulaire avec options dynamiques)
  let resolvedLabel = optionLabel;

  // Sinon, on cherche dans le catalogue statique par défaut
  if (!resolvedLabel) {
    const optionObj = OPTIONS.find((o) => o.value === option);
    resolvedLabel = optionObj?.label;
  }

  // Fallback : si l'option n'est ni dans le catalogue ni fournie en paramètre,
  // on formate la valeur brute du code pour l'afficher lisiblement
  // (ex: "MECANIQUE_AUTOMOBILE" → "Mecanique Automobile")
  if (!resolvedLabel && option && option !== 'EB') {
    resolvedLabel = option
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // L'option "Éducation de Base" (EB) ne s'affiche pas dans le nom — c'est le niveau par défaut
  const optionPart = option !== 'EB' && resolvedLabel ? ` ${resolvedLabel}` : '';
  const sectionPart = section && section !== '-' ? ` ${section}` : '';
  return `${level}${optionPart}${sectionPart}`;
}

/**
 * Retourne un rang numérique pour le tri correct des niveaux scolaires.
 * Dans le système éducatif congolais, les classes vont du plus bas au plus haut :
 *   7ème (EB) → 8ème (EB) → 1ère (Humanités) → 2ème → 3ème → 4ème
 *
 * parseInt("7ème") donnerait 7 et parseInt("1ère") donnerait 1,
 * ce qui inverserait l'ordre attendu. Cette fonction corrige ça.
 */
export function getLevelRank(level: string): number {
  // Table de correspondance : rang éducatif croissant
  const rankMap: Record<string, number> = {
    '7ème': 0,
    '8ème': 1,
    '1ère': 2,
    '2ème': 3,
    '3ème': 4,
    '4ème': 5,
  };
  return rankMap[level] ?? 99; // Les niveaux inconnus vont à la fin
}
