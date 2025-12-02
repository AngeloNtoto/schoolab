export const LEVELS = [
  '7ème',
  '8ème',
  '1ère',
  '2ème',
  '3ème',
  '4ème',
] as const;

export const OPTIONS = [
  { label: 'Éducation de Base', value: 'EB', short: 'EB' },
  { label: 'Électronique', value: 'ELECTRONIQUE', short: 'ETRO' },
  { label: 'Électricité', value: 'ELECTRICITE', short: 'ELEC' },
  { label: 'Mécanique', value: 'SCIENTIFIQUE', short: 'SC' },
  { label: 'Commerciale', value: 'COMMERCIALE', short: 'COM' },
  { label: 'Littéraire', value: 'LITTERAIRE', short: 'LIT' },
] as const;

export const PERIODS = [
  { id: 'P1', label: '1ère Période', type: 'PERIOD' },
  { id: 'P2', label: '2ème Période', type: 'PERIOD' },
  { id: 'EXAM1', label: 'Examen 1er Sem', type: 'EXAM' },
  { id: 'P3', label: '3ème Période', type: 'PERIOD' },
  { id: 'P4', label: '4ème Période', type: 'PERIOD' },
  { id: 'EXAM2', label: 'Examen 2nd Sem', type: 'EXAM' },
] as const;

export const SUBJECT_TEMPLATES: Record<string, { name: string; code: string; max: number }[]> = {
  'EB': [
    { name: 'Mathématiques', code: 'MATH', max: 20 },
    { name: 'Français', code: 'FR', max: 20 },
    { name: 'Anglais', code: 'ANG', max: 10 },
    { name: 'Histoire', code: 'HIST', max: 10 },
    { name: 'Géographie', code: 'GEO', max: 10 },
  ],
  'ELECTRONIQUE': [
    { name: 'Mathématiques', code: 'MATH', max: 40 },
    { name: 'Physique', code: 'PHYS', max: 20 },
    { name: 'Électronique Fondamentale', code: 'ELF', max: 40 },
    { name: 'Laboratoire', code: 'LAB', max: 20 },
    { name: 'Français', code: 'FR', max: 20 },
  ],
};
