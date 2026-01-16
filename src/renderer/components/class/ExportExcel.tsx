import { dbService } from '../../services/databaseService';

/**
 * Export complet des notes d'une classe vers CSV.
 */
export async function ExportExcelForClass(classId: number) {
  if (!classId) return;

  const [cls] = await dbService.query<any>('SELECT * FROM classes WHERE id = ?', [classId]);
  const students = await dbService.query<any>(
    'SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name',
    [classId]
  );
  const subjects = await dbService.query<any>(
    `SELECT * FROM subjects WHERE class_id = ? ORDER BY created_at ASC, name ASC`,
    [classId]
  );
  const grades = await dbService.query<any>(
    `SELECT * FROM grades g INNER JOIN students s ON g.student_id = s.id WHERE s.class_id = ?`,
    [classId]
  );

  const gradesMap = new Map<string, number>();
  for (const g of grades) {
    gradesMap.set(`${g.student_id}-${g.subject_id}-${g.period}`, Number(g.value));
  }
  const getGrade = (studentId: number, subjectId: number, period: string): number | null => {
    const v = gradesMap.get(`${studentId}-${subjectId}-${period}`);
    return typeof v === 'number' ? v : null;
  };

  // Header CSV
  const header: string[] = ['N°', 'Nom', 'Post-nom', 'Prénom', 'Sexe'];
  for (const subj of subjects) {
    header.push(`${subj.name} P1`);
    header.push(`${subj.name} P2`);
    header.push(`${subj.name} EX1`);
    header.push(`${subj.name} SEM1`);
    header.push(`${subj.name} P3`);
    header.push(`${subj.name} P4`);
    header.push(`${subj.name} EX2`);
    header.push(`${subj.name} SEM2`);
  }
  header.push('TOTAL GENERAL', '%', 'Application', 'Conduite', 'Observation');

  const csvRows: string[] = [header.join(',')];

  let idx = 1;
  for (const student of students) {
    const row: any[] = [
      idx++,
      `"${student.last_name}"`,
      `"${student.post_name || ''}"`,
      `"${student.first_name}"`,
      student.gender || ''
    ];

    let totalGeneral = 0;
    let totalMaxGeneral = 0;
    let failedCount = 0;

    for (const subj of subjects) {
      const p1 = getGrade(student.id, subj.id, 'P1');
      const p2 = getGrade(student.id, subj.id, 'P2');
      const ex1 = getGrade(student.id, subj.id, 'EXAM1');
      const sem1 = (p1 || 0) + (p2 || 0) + (ex1 || 0);
      const sem1Max = subj.max_p1 + subj.max_p2 + subj.max_exam1;

      const p3 = getGrade(student.id, subj.id, 'P3');
      const p4 = getGrade(student.id, subj.id, 'P4');
      const ex2 = getGrade(student.id, subj.id, 'EXAM2');
      const sem2 = (p3 || 0) + (p4 || 0) + (ex2 || 0);
      const sem2Max = subj.max_p3 + subj.max_p4 + subj.max_exam2;

      row.push(p1 ?? '', p2 ?? '', ex1 ?? '', sem1);
      row.push(p3 ?? '', p4 ?? '', ex2 ?? '', sem2);

      totalGeneral += (sem1 + sem2);
      totalMaxGeneral += (sem1Max + sem2Max);
      
      const subjMax = sem1Max + sem2Max;
      if (subjMax > 0 && ((sem1 + sem2) / subjMax) < 0.5) failedCount++;
    }

    const pct = totalMaxGeneral > 0 ? (totalGeneral / totalMaxGeneral) * 100 : 0;
    const application = pct >= 80 ? 'Élute' : pct >= 70 ? 'Très bon' : pct >= 50 ? 'Bon' : pct >= 40 ? 'Médiocre' : 'Mauvais';
    const conduite = `${student.conduite_p1 || ''} ${student.conduite_p2 || ''} ${student.conduite_p3 || ''} ${student.conduite_p4 || ''}`.trim();

    row.push(totalGeneral, pct.toFixed(2), application, `"${conduite}"`, `"${student.is_abandoned ? 'Abandon' : (pct < 50 ? 'Echec' : '-')}"`);
    csvRows.push(row.join(','));
  }

  const csvContent = "\uFEFF" + csvRows.join('\n'); // Add BOM for Excel compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Notes_${cls?.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
