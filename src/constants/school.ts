// ============================================================================
// NIVEAUX SCOLAIRES DISPONIBLES
// ============================================================================
export const LEVELS = [
  '7ème',
  '8ème',
  '1ère',
  '2ème',
  '3ème',
  '4ème',
] as const;

// ============================================================================
// OPTIONS D'ORIENTATION (utilisées pour le dropdown de sélection de classe)
// ============================================================================
export const OPTIONS = [
  { label: 'Éducation de Base', value: 'EB', short: 'EB' },
  { label: 'Électronique', value: 'ELECTRONIQUE', short: 'ETRO' },
  { label: 'Électricité', value: 'ELECTRICITE', short: 'ELEC' },
  { label: 'Mécanique Automobile', value: 'MECANIQUE_AUTOMOBILE', short: 'ACL' },
  { label: 'Machines outils', value: 'MACHINES_OUTILS', short: 'MO' },
  { label: 'Construction', value: 'CONSTRUCTION', short: 'HTC' },
  { label: 'Menuiserie', value: 'MENUISERIE', short: 'MEN' },
] as const;

// ============================================================================
// PÉRIODES SCOLAIRES
// ============================================================================
export const PERIODS = [
  { id: 'P1', label: '1ère Période', type: 'PERIOD' },
  { id: 'P2', label: '2ème Période', type: 'PERIOD' },
  { id: 'EXAM1', label: 'Examen 1ère Sem', type: 'EXAM' },
  { id: 'P3', label: '3ème Période', type: 'PERIOD' },
  { id: 'P4', label: '4ème Période', type: 'PERIOD' },
  { id: 'EXAM2', label: 'Examen 2ème Sem', type: 'EXAM' },
] as const;

// ============================================================================
// TYPES POUR LE CATALOGUE DE COURS
// ============================================================================

/** Structure d'un cours dans le catalogue */
export interface CatalogCourse {
  name: string;
  code: string;
  max_period: number;   // max par période (P1, P2, P3, P4 = même valeur)
  max_exam: number;     // max par examen (EXAM1, EXAM2 = même valeur)
}

/** Groupe de cours avec un sous-domaine (pour l'éducation de base) */
export interface CatalogGroup {
  domain: string;       // nom du domaine (correspondra au domaine dans la BDD)
  subdomain: string;    // sous-domaine affiché
  courses: CatalogCourse[];
}

/** Catégorie de cours (pour les humanités, sans domaines) */
export interface CatalogCategory {
  category: string;     // nom de la catégorie (Sciences, Langues, etc.)
  courses: CatalogCourse[];
}

// ============================================================================
// CATALOGUE ÉDUCATION DE BASE (7ème / 8ème)
// Organisé par domaine et sous-domaine, avec pondérations pré-remplies
// ============================================================================
export const EB_COURSE_CATALOG: CatalogGroup[] = [
  {
    domain: 'Domaine des sciences',
    subdomain: 'Sous-domaine des Mathématiques',
    courses: [
      { name: 'Algèbre', code: 'ALG', max_period: 40, max_exam: 80 },
      { name: 'Arithmétique', code: 'ARITH', max_period: 10, max_exam: 20 },
      { name: 'Géométrie', code: 'GEO', max_period: 20, max_exam: 40 },
      { name: 'Statistique', code: 'STAT', max_period: 10, max_exam: 20 },
    ],
  },
  {
    domain: 'Domaine des sciences',
    subdomain: 'Sous-domaine des Sciences de la vie et de la terre',
    courses: [
      { name: 'Anatomie', code: 'ANAT', max_period: 10, max_exam: 20 },
      { name: 'Botanique', code: 'BOT', max_period: 10, max_exam: 20 },
      { name: 'Zoologie', code: 'ZOO', max_period: 20, max_exam: 40 },
    ],
  },
  {
    domain: 'Domaine des sciences',
    subdomain: 'Sous-domaine des Sciences Physiques, Technologie et TIC',
    courses: [
      { name: 'Sciences physiques', code: 'PHYS', max_period: 10, max_exam: 20 },
      { name: 'Technologie', code: 'TECH', max_period: 10, max_exam: 20 },
      { name: "Tech. d'Info & Com", code: 'TIC', max_period: 10, max_exam: 20 },
    ],
  },
  {
    domain: 'Domaine des langues',
    subdomain: 'Langues',
    courses: [
      { name: 'Français', code: 'FR', max_period: 50, max_exam: 100 },
      { name: 'Anglais', code: 'ANG', max_period: 30, max_exam: 60 },
    ],
  },
  {
    domain: "Domaine de l'univers social et environnement",
    subdomain: 'Univers social',
    courses: [
      { name: 'Religion', code: 'REL', max_period: 20, max_exam: 40 },
      { name: 'Éducation à la vie', code: 'EDV', max_period: 20, max_exam: 40 },
      { name: 'Éducation civique et morale', code: 'ECM', max_period: 20, max_exam: 40 },
      { name: 'Géographie', code: 'GEOG', max_period: 20, max_exam: 40 },
      { name: 'Histoire', code: 'HIST', max_period: 20, max_exam: 40 },
    ],
  },
  {
    domain: 'Domaine des arts',
    subdomain: 'Arts',
    courses: [
      { name: 'Dessin', code: 'DES', max_period: 20, max_exam: 40 },
      { name: 'Musique', code: 'MUS', max_period: 20, max_exam: 40 },
    ],
  },
  {
    domain: 'Domaine du développement personnel',
    subdomain: 'Développement personnel',
    courses: [
      { name: 'Éducation physique', code: 'EPS', max_period: 20, max_exam: 40 },
    ],
  },
];

// ============================================================================
// CATALOGUE HUMANITÉS (1ère à 4ème)
// Organisé par catégorie (pas de domaines), cours communs à toutes les options
// L'utilisateur peut en sélectionner selon son option/section
// ============================================================================
export const HUMANITIES_COURSE_CATALOG: CatalogCategory[] = [
  {
    category: 'Sciences',
    courses: [
      { name: 'Mathématiques', code: 'MATH', max_period: 50, max_exam: 100 },
      { name: 'Physique', code: 'PHYS', max_period: 20, max_exam: 40 },
      { name: 'Chimie', code: 'CHIM', max_period: 20, max_exam: 40 },
      { name: 'Biologie', code: 'BIO', max_period: 20, max_exam: 40 },
      { name: 'Informatique', code: 'INFO', max_period: 20, max_exam: 40 },
    ],
  },
  {
    category: 'Langues',
    courses: [
      { name: 'Français', code: 'FR', max_period: 50, max_exam: 100 },
      { name: 'Anglais', code: 'ANG', max_period: 20, max_exam: 100 },
    ],
  },
  {
    category: 'Sciences humaines',
    courses: [
      { name: 'Histoire', code: 'HIST', max_period: 20, max_exam: 40 },
      { name: 'Géographie', code: 'GEOG', max_period: 20, max_exam: 40 },
      { name: 'Éducation civique', code: 'EDC', max_period: 20, max_exam: 40 },
      { name: 'Philosophie', code: 'PHILO', max_period: 20, max_exam: 40 },
      { name: 'Religion', code: 'REL', max_period: 20, max_exam: 40 },
    ],
  },
  {
    category: 'Techniques',
    courses: [
      { name: 'Électronique', code: 'ETRO', max_period: 40, max_exam: 80 },
      { name: 'Électricité', code: 'ELEC', max_period: 40, max_exam: 80 },
      { name: 'Mécanique', code: 'MECA', max_period: 40, max_exam: 80 },
      { name: 'Dessin technique', code: 'DT', max_period: 40, max_exam: 80 },
      { name: 'Laboratoire', code: 'LABO', max_period: 100, max_exam: 0 }
    ],
  },
  {
    category: 'Arts & Sport',
    courses: [
      { name: 'Éducation physique', code: 'EPS', max_period: 10, max_exam: 20 }
    ],
  },
];

// ============================================================================
// ANCIEN FORMAT — gardé pour compatibilité, mais le catalogue ci-dessus
// est la source principale maintenant
// ============================================================================
export const SUBJECT_TEMPLATES: Record<string, {
  name: string;
  code: string;
  max_p1: number;
  max_p2: number;
  max_exam1: number;
  max_p3: number;
  max_p4: number;
  max_exam2: number;
}[]> = {
  'EB': [
    { name: 'Mathématiques', code: 'MATH', max_p1: 50, max_p2: 50, max_exam1: 100, max_p3: 50, max_p4: 50, max_exam2: 100 },
    { name: 'Français', code: 'FR', max_p1: 50, max_p2: 50, max_exam1: 100, max_p3: 50, max_p4: 50, max_exam2: 100 },
    { name: 'Anglais', code: 'ANG', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Histoire', code: 'HIST', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Géographie', code: 'GEO', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
  ],
  'ELECTRONIQUE': [
    { name: 'Mathématiques', code: 'MATH', max_p1: 50, max_p2: 50, max_exam1: 100, max_p3: 50, max_p4: 50, max_exam2: 100 },
    { name: 'Électronique', code: 'ETRO', max_p1: 20, max_p2: 20, max_exam1: 40, max_p3: 20, max_p4: 20, max_exam2: 40 },
    { name: 'Laboratoire', code: 'LABO', max_p1: 100, max_p2: 100, max_exam1: 0, max_p3: 100, max_p4: 100, max_exam2: 0 },
    { name: 'Français', code: 'FR',  max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
  ],
  'MENUISERIE': [
    { name: 'Mathématiques', code: 'MATH', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Français', code: 'FR', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Anglais', code: 'ANG', max_p1: 5, max_p2: 5, max_exam1: 10, max_p3: 5, max_p4: 5, max_exam2: 10 },
  ],
};
