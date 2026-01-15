import { dbService } from './databaseService';
import { studentService } from './studentService';
import { classService } from './classService';
import { academicYearService } from './academicYearService';
import { gradeService } from './gradeService';

const FIRST_NAMES = ['Jean', 'Marie', 'Pierre', 'Julie', 'Alain', 'Sophie', 'Cédric', 'Nathalie', 'Patrick', 'Isabelle', 'Thomas', 'Laura', 'Kevin', 'Cindy', 'David', 'Aurélie', 'Marc', 'Sandrine', 'Michel', 'Estelle'];
const LAST_NAMES = ['Kabila', 'Tshisekedi', 'Lumumba', 'Mputu', 'Bakambu', 'Ntoto', 'Mwamba', 'Ilunga', 'Ngoy', 'Kabasele', 'Kazadi', 'Mutombo', 'Banza', 'Kapinga', 'Luvumbu', 'Matampi', 'Mubele', 'N’Koulou', 'Etekiama', 'Botaka'];
const SECTIONS = ['Scientifique', 'Pédagogie', 'Littéraire', 'Commerciale', 'Électronique', 'Mécanique'];
const OPTIONS = ['Bio-Chimie', 'Math-Physique', 'Pédagogie Générale', 'Gestion Informatique', 'Électricité Industrialle'];

export const seedingService = {
  async seedDatabase() {
    console.log('Starting Seeding Process...');

    // 1. Ensure an academic year exists
    let activeYear = await academicYearService.getActive();
    if (!activeYear) {
      await academicYearService.create('2025-2026', '2025-09-01', '2026-07-31');
      const years = await academicYearService.getAll();
      if (years.length > 0) {
        await academicYearService.setActive(years[0].id);
        activeYear = years[0];
      }
    }

    if (!activeYear) throw new Error('Could not find or create an active academic year');

    // 2. Generate 15 classes
    for (let c = 1; c <= 15; c++) {
      const levelNum = (c % 8) + 1;
      const section = SECTIONS[c % SECTIONS.length];
      const option = OPTIONS[c % OPTIONS.length];
      
      const classId = await dbService.execute(
        'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?)',
        [`Classe ${c}`, `${levelNum}ème`, option, section, activeYear.id]
      ).then(res => res.lastInsertRowid);

      // 3. Add 5-8 Subjects per class
      const subjects = [
        { name: 'Mathématiques', code: 'MATH', max: 50 },
        { name: 'Français', code: 'FRAN', max: 50 },
        { name: 'Histoire', code: 'HIST', max: 20 },
        { name: 'Géographie', code: 'GEO', max: 20 },
        { name: 'Physique', code: 'PHYS', max: 40 },
        { name: 'Chimie', code: 'CHIM', max: 40 },
        { name: 'Religion', code: 'RELI', max: 10 },
        { name: 'EPS', code: 'EPS', max: 10 }
      ];

      const subjectIds: number[] = [];
      for (const s of subjects) {
        const subId = await classService.createSubject({
          name: s.name,
          code: s.code,
          max_p1: s.max,
          max_p2: s.max,
          max_exam1: s.max * 2, // General exam rule
          max_p3: s.max,
          max_p4: s.max,
          max_exam2: s.max * 2,
          class_id: classId
        });
        subjectIds.push(subId);
      }

      // 4. Add 10-25 Students per class
      const studentCount = 10 + Math.floor(Math.random() * 15);
      const studentIds: number[] = [];
      const usedNames = new Set<string>();

      for (let s = 0; s < studentCount; s++) {
        let firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        let lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        let fullName = `${firstName} ${lastName}`;

        // Ensure uniqueness within the class
        let attempts = 0;
        while (usedNames.has(fullName) && attempts < 100) {
          firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
          lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
          fullName = `${firstName} ${lastName}`;
          attempts++;
        }
        
        usedNames.add(fullName);

        const studentId = await studentService.createStudent({
          first_name: firstName,
          last_name: lastName,
          post_name: LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)],
          gender: Math.random() > 0.5 ? 'M' : 'F',
          birth_date: '2010-01-01',
          birthplace: 'Kinshasa',
          class_id: classId
        });
        studentIds.push(studentId);
      }

      // 5. Populate grades based on requested patterns
      // Patterns: 1=Only P1, 2=First Semester, 3=Full Year, others=Random
      let pattern: 'P1_ONLY' | 'SEM1_ONLY' | 'FULL_YEAR' | 'RANDOM';
      
      if (c === 1) pattern = 'P1_ONLY';
      else if (c === 2) pattern = 'SEM1_ONLY';
      else if (c === 3) pattern = 'FULL_YEAR';
      else pattern = 'RANDOM';

      const periods = ['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'];
      
      for (const studentId of studentIds) {
        for (let i = 0; i < subjectIds.length; i++) {
          const subjectId = subjectIds[i];
          const baseMax = subjects[i].max;

          for (const period of periods) {
            let shouldPopulate = false;

            if (pattern === 'P1_ONLY') {
              shouldPopulate = period === 'P1';
            } else if (pattern === 'SEM1_ONLY') {
              shouldPopulate = ['P1', 'P2', 'EXAM1'].includes(period);
            } else if (pattern === 'FULL_YEAR') {
              shouldPopulate = true;
            } else {
              // Random pattern: maybe some periods, maybe not
              shouldPopulate = Math.random() > 0.4;
            }

            if (shouldPopulate) {
              const max = period.includes('EXAM') ? baseMax * 2 : baseMax;
              const value = Math.floor(Math.random() * (max + 1));
              await gradeService.updateGrade(studentId, subjectId, period, value);
            }
          }
        }
      }
    }

    console.log('Seeding Complete for 15 classes!');
  }
};
