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
  { label: 'Mécanique Automobile', value: 'MECANIQUE_AUTOMOBILE', short: 'ACL' },
  { label: 'Machines outils', value: 'MACHINES_OUTILS', short: 'MO' },
  { label: 'Construction', value: 'CONSTRUCTION', short: 'HTC' },
  {label: 'Menuiserie', value: 'MENUISERIE', short: 'MEN'}
] as const;

export const PERIODS = [
  { id: 'P1', label: '1ère Période', type: 'PERIOD' },
  { id: 'P2', label: '2ème Période', type: 'PERIOD' },
  { id: 'EXAM1', label: 'Examen 1ère Sem', type: 'EXAM' },
  { id: 'P3', label: '3ème Période', type: 'PERIOD' },
  { id: 'P4', label: '4ème Période', type: 'PERIOD' },
  { id: 'EXAM2', label: 'Examen 2ème Sem', type: 'EXAM' },
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
    { name: 'Mathématiques', code: 'MATH', max_p1: 50, max_p2: 50, max_exam1: 100, max_p3: 50, max_p4: 50, max_exam2: 100 },
    { name: 'Français', code: 'FR', max_p1: 50, max_p2: 50, max_exam1: 100, max_p3: 50, max_p4: 50, max_exam2: 100 },
    { name: 'Anglais', code: 'ANG', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Histoire', code: 'HIST', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Géographie', code: 'GEO', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
  ],
  'ELECTRONIQUE': [
    { name: 'Mathématiques', code: 'MATH', max_p1: 50, max_p2: 50, max_exam1: 100, max_p3: 50, max_p4: 50, max_exam2: 100 },
    { name: 'Électronique', code: 'ETRO', max_p1: 20, max_p2: 20, max_exam1: 40, max_p3: 20, max_p4: 20, max_exam2: 40 },
    { name: 'Laboratoire', code: 'LABO', max_p1: 100, max_p2: 100, max_exam1:0, max_p3: 100, max_p4: 100, max_exam2: 0 },
    { name: 'Français', code: 'FR', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
  ],
  'MENUISERIE': [
    { name: 'Mathématiques', code: 'MATH', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Français', code: 'FR', max_p1: 10, max_p2: 10, max_exam1: 20, max_p3: 10, max_p4: 10, max_exam2: 20 },
    { name: 'Anglais', code: 'ANG', max_p1: 5, max_p2: 5, max_exam1: 10, max_p3: 5, max_p4: 5, max_exam2: 10 },
  ],
};
