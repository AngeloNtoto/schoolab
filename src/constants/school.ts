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
    { name: 'Mathématiques', code: 'MATH', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Français', code: 'FR', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Anglais', code: 'ANG', max_p1: 5, max_p2: 5, max_exam1: 10, max_p3: 5, max_p4: 5, max_exam2: 10 },
    { name: 'Histoire', code: 'HIST', max_p1: 5, max_p2: 5, max_exam1: 10, max_p3: 5, max_p4: 5, max_exam2: 10 },
    { name: 'Géographie', code: 'GEO', max_p1: 5, max_p2: 5, max_exam1: 10, max_p3: 5, max_p4: 5, max_exam2: 10 },
  ],
  'ELECTRONIQUE': [
    { name: 'Mathématiques', code: 'MATH', max_p1: 20, max_p2: 20, max_exam1: 40, max_p3: 20, max_p4: 20, max_exam2: 40 },
    { name: 'Physique', code: 'PHYS', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Électronique Fondamentale', code: 'ELF', max_p1: 20, max_p2: 20, max_exam1: 40, max_p3: 20, max_p4: 20, max_exam2: 40 },
    { name: 'Laboratoire', code: 'LAB', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Français', code: 'FR', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
  ],
};
