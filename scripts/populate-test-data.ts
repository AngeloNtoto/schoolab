import Database from 'better-sqlite3';
import { join } from 'path';
import { app } from 'electron';

// Helper to get random integer
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to get random item from array
const randomItem = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

// French first names
const firstNamesMale = [
  'Antoine', 'Baptiste', 'Charles', 'David', 'Emmanuel', 'François', 'Gabriel', 'Henri',
  'Isaac', 'Jacques', 'Kevin', 'Louis', 'Michel', 'Nathan', 'Olivier', 'Pierre',
  'Quentin', 'Raphael', 'Simon', 'Thomas', 'Victor', 'William', 'Xavier', 'Yves', 'Zacharie',
  'André', 'Bernard', 'Claude', 'Daniel', 'Étienne', 'Fabien', 'Georges', 'Hugo',
  'Jean', 'Laurent', 'Marc', 'Nicolas', 'Paul', 'Robert', 'Sylvain'
];

const firstNamesFemale = [
  'Amélie', 'Brigitte', 'Catherine', 'Diane', 'Élise', 'Françoise', 'Geneviève', 'Hélène',
  'Isabelle', 'Julie', 'Karine', 'Louise', 'Marie', 'Nathalie', 'Odette', 'Pauline',
  'Rachel', 'Sophie', 'Thérèse', 'Valérie', 'Yvonne', 'Zoé', 'Alice', 'Béatrice',
  'Céline', 'Dominique', 'Émilie', 'Florence', 'Gabrielle', 'Inès', 'Jacqueline',
  'Laure', 'Marguerite', 'Nicole', 'Patricia', 'Rosalie', 'Sarah', 'Victoire'
];

// Congolese last names
const lastNames = [
  'Mukendi', 'Kabongo', 'Tshimanga', 'Ilunga', 'Kalala', 'Mbuyi', 'Ngoy', 'Kazadi',
  'Mutombo', 'Kabamba', 'Mwamba', 'Kisimba', 'Luboya', 'Numbi', 'Tshibangu', 'Mulamba',
  'Mbayo', 'Kabeya', 'Kitenge', 'Mujinga', 'Mpiana', 'Kabanda', 'Tshimbombo', 'Shamavu',
  'Musonda', 'Kazembe', 'Mwilambwe', 'Kasongo', 'Kabila', 'Lumbala', 'Ntumba', 'Kadima',
  'Makelele', 'Kimbangu', 'Lumumba', 'Tshisekedi', 'Kalonji', 'Ngombe', 'Kalongo', 'Nkulu',
  'Banza', 'Mbuyi', 'Kadiata', 'Mbombo', 'Nzuzi', 'Tshiala', 'Mulongo', 'Kabaso',
  'Maweja', 'Kilolo', 'Nsenga', 'Kambale', 'Muhindo', 'Kavira', 'Paluku', 'Tsongo',
  'Mwanza', 'Kibangu', 'Lukusa', 'Matondo'
];

// Congolese cities for birthplace
const cities = [
  'Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kananga', 'Kisangani', 'Bukavu', 'Goma',
  'Kolwezi', 'Likasi', 'Tshikapa', 'Kikwit', 'Mbandaka', 'Matadi', 'Uvira', 'Butembo',
  'Kalemie', 'Kindu', 'Bandundu', 'Gemena', 'Isiro', 'Beni', 'Bunia'
];

// Subject names for different classes
const subjectsCommon = [
  { name: 'Français', code: 'FR' },
  { name: 'Mathématiques', code: 'MATH' },
  { name: 'Anglais', code: 'ANG' },
  { name: 'Histoire', code: 'HIST' },
  { name: 'Géographie', code: 'GEO' },
  { name: 'Éducation Civique', code: 'EDCIV' },
  { name: 'Sciences', code: 'SCI' },
  { name: 'Éducation Physique', code: 'EP' },
  { name: 'Religion', code: 'REL' },
  { name: 'Dessin', code: 'DESS' }
];

async function populateTestData() {
  const dbPath = join(app.getPath('userData'), 'school.db');
  console.log('Database path:', dbPath);
  
  const db = new Database(dbPath);
  
  try {
    // Get or create an academic year
    let academicYear = db.prepare('SELECT * FROM academic_years WHERE is_active = 1').get() as any;
    
    if (!academicYear) {
      console.log('Creating academic year...');
      const result = db.prepare(`
        INSERT INTO academic_years (name, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?)
      `).run('2024-2025', '2024-09-01', '2025-06-30', 1);
      academicYear = { id: result.lastInsertRowid };
    }
    
    console.log('Academic year ID:', academicYear.id);
    
    // Get or create a test class
    let testClass = db.prepare(`
      SELECT * FROM classes 
      WHERE name = 'Test Class' AND academic_year_id = ?
    `).get(academicYear.id) as any;
    
    if (!testClass) {
      console.log('Creating test class...');
      const result = db.prepare(`
        INSERT INTO classes (name, level, option, section, academic_year_id)
        VALUES (?, ?, ?, ?, ?)
      `).run('Test Class', '5ème', 'Scientifique', 'A', academicYear.id);
      testClass = { id: result.lastInsertRowid };
    }
    
    console.log('Test class ID:', testClass.id);
    
    // Create subjects for the class
    console.log('Creating subjects...');
    const subjectIds: number[] = [];
    
    for (const subject of subjectsCommon) {
      // Check if subject already exists
      const existing = db.prepare(`
        SELECT id FROM subjects 
        WHERE name = ? AND class_id = ?
      `).get(subject.name, testClass.id) as any;
      
      if (existing) {
        subjectIds.push(existing.id);
      } else {
        const result = db.prepare(`
          INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          subject.name,
          subject.code,
          10, // max_p1
          10, // max_p2
          20, // max_exam1
          10, // max_p3
          10, // max_p4
          20, // max_exam2
          testClass.id
        );
        subjectIds.push(Number(result.lastInsertRowid));
      }
    }
    
    console.log(`Created ${subjectIds.length} subjects`);
    
    // Generate 100 students
    console.log('Generating 100 students...');
    
    for (let i = 0; i < 100; i++) {
      const gender = randomItem(['M', 'F']);
      const firstName = gender === 'M' 
        ? randomItem(firstNamesMale) 
        : randomItem(firstNamesFemale);
      const lastName = randomItem(lastNames);
      const birthdate = `${randomInt(2008, 2012)}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`;
      const birthplace = randomItem(cities);
      
      try {
        // Insert student
        const studentResult = db.prepare(`
          INSERT INTO students (first_name, last_name, post_name, gender, birth_date, birthplace, class_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          firstName,
          lastName,
          '', // post_name
          gender,
          birthdate,
          birthplace,
          testClass.id
        );
        
        const studentId = Number(studentResult.lastInsertRowid);
        
        // Add random grades for each subject
        for (const subjectId of subjectIds) {
          const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId) as any;
          
          // P1
          db.prepare(`
            INSERT INTO grades (student_id, subject_id, period, value)
            VALUES (?, ?, ?, ?)
          `).run(studentId, subjectId, 'P1', randomInt(0, subject.max_p1));
          
          // P2
          db.prepare(`
            INSERT INTO grades (student_id, subject_id, period, value)
            VALUES (?, ?, ?, ?)
          `).run(studentId, subjectId, 'P2', randomInt(0, subject.max_p2));
          
          // EXAM1
          db.prepare(`
            INSERT INTO grades (student_id, subject_id, period, value)
            VALUES (?, ?, ?, ?)
          `).run(studentId, subjectId, 'EXAM1', randomInt(0, subject.max_exam1));
          
          // P3
          db.prepare(`
            INSERT INTO grades (student_id, subject_id, period, value)
            VALUES (?, ?, ?, ?)
          `).run(studentId, subjectId, 'P3', randomInt(0, subject.max_p3));
          
          // P4
          db.prepare(`
            INSERT INTO grades (student_id, subject_id, period, value)
            VALUES (?, ?, ?, ?)
          `).run(studentId, subjectId, 'P4', randomInt(0, subject.max_p4));
          
          // EXAM2
          db.prepare(`
            INSERT INTO grades (student_id, subject_id, period, value)
            VALUES (?, ?, ?, ?)
          `).run(studentId, subjectId, 'EXAM2', randomInt(0, subject.max_exam2));
        }
        
        if ((i + 1) % 10 === 0) {
          console.log(`Generated ${i + 1} students...`);
        }
      } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
          console.log(`Skipping duplicate student: ${firstName} ${lastName}`);
          i--; // Try again with different name
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Successfully populated database with 100 students and their grades!');
    console.log(`Class ID: ${testClass.id}`);
    console.log('You can now view the bulletin for any of these students.');
    
  } catch (error) {
    console.error('Error populating test data:', error);
    throw error;
  } finally {
    db.close();
  }
}

populateTestData().catch(console.error);
