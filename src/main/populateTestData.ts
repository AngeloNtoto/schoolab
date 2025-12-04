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

// Subject names - Expanded to 25+ subjects with varied maxima
const subjectsCommon = [
  // Major subjects - 15-15-30 (total 120)
  { name: 'Français', code: 'FR', maxima: { p1: 15, p2: 15, exam1: 30, p3: 15, p4: 15, exam2: 30 } },
  { name: 'Mathématiques', code: 'MATH', maxima: { p1: 15, p2: 15, exam1: 30, p3: 15, p4: 15, exam2: 30 } },
  
  // Important subjects - 10-10-20 (total 80)
  { name: 'Anglais', code: 'ANG', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Physique', code: 'PHY', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Chimie', code: 'CHIM', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Biologie', code: 'BIO', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Histoire', code: 'HIST', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Géographie', code: 'GEO', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  
  // Secondary subjects - 5-5-10 (total 40)
  { name: 'Éducation Civique', code: 'EDCIV', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Sciences Générales', code: 'SCI', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Éducation Physique', code: 'EP', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Religion', code: 'REL', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Dessin', code: 'DESS', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Musique', code: 'MUS', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  
  // Technical subjects - 10-10-20 (total 80)
  { name: 'Informatique', code: 'INFO', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Économie', code: 'ECO', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Philosophie', code: 'PHILO', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  { name: 'Comptabilité', code: 'COMPTA', maxima: { p1: 10, p2: 10, exam1: 20, p3: 10, p4: 10, exam2: 20 } },
  
  // Language subjects - 8-8-16 (total 64)
  { name: 'Latin', code: 'LAT', maxima: { p1: 8, p2: 8, exam1: 16, p3: 8, p4: 8, exam2: 16 } },
  { name: 'Lingala', code: 'LING', maxima: { p1: 8, p2: 8, exam1: 16, p3: 8, p4: 8, exam2: 16 } },
  { name: 'Swahili', code: 'SWAH', maxima: { p1: 8, p2: 8, exam1: 16, p3: 8, p4: 8, exam2: 16 } },
  
  // Practical subjects - 5-5-10 (total 40)
  { name: 'Travaux Manuels', code: 'TM', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Agriculture', code: 'AGRI', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Dactylographie', code: 'DACTY', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Électricité', code: 'ELEC', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Mécanique', code: 'MECA', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Menuiserie', code: 'MENU', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } },
  { name: 'Couture', code: 'COUT', maxima: { p1: 5, p2: 5, exam1: 10, p3: 5, p4: 5, exam2: 10 } }
];

export function populateTestData(db: any) {
  try {
    // Get or create an academic year
    let academicYear = db.prepare('SELECT * FROM academic_years WHERE is_active = 1').get();
    
    if (!academicYear) {
      console.log('Creating academic year...');
      const result = db.prepare(`
        INSERT INTO academic_years (name, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?)
      `).run('2024-2025', '2024-09-01', '2025-06-30', 1);
      academicYear = { id: result.lastInsertRowid };
    }
    
    console.log('Academic year ID:', academicYear.id);
    
    // Create a new test class with timestamp to ensure it's fresh
    const timestamp = new Date().toLocaleString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).replace(/[/:]/g, '-');
    const className = `Test Class ${timestamp}`;
    
    console.log('Creating new test class:', className);
    const result = db.prepare(`
      INSERT INTO classes (name, level, option, section, academic_year_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(className, '5ème', 'Scientifique', 'A', academicYear.id);
    const testClass = { id: result.lastInsertRowid };
    
    console.log('Test class ID:', testClass.id);
    
    // Create subjects for the class
    console.log('Creating subjects...');
    const subjectIds: number[] = [];
    
    for (const subject of subjectsCommon) {
      const result = db.prepare(`
        INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        subject.name,
        subject.code,
        subject.maxima.p1,
        subject.maxima.p2,
        subject.maxima.exam1,
        subject.maxima.p3,
        subject.maxima.p4,
        subject.maxima.exam2,
        testClass.id
      );
      subjectIds.push(Number(result.lastInsertRowid));
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
          const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(subjectId);
          
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
    
    return { success: true, classId: testClass.id };
  } catch (error: any) {
    console.error('Error populating test data:', error);
    throw error;
  }
}
