import * as XLSX from 'xlsx';

/**
 * Export complet des notes d'une classe vers Excel.
 * - Récupère: classe, élèves, matières, notes.
 * - Génère:
 *    - Une feuille "Notes" avec colonnes détaillées (P1,P2,Ex1,Sem1,P3,P4,Ex2,Sem2,TG,%).
 *    - (Optionnel) Une feuille "Matières" listant maxima.
 *
 * Usage (dans un composant React) : await handleExportExcelForClass(Number(classId));
 */
export async function ExportExcelForClass(classId: number) {
  if (!classId) return;

  // 1) Charger tout depuis la BDD
  const [cls] = await window.api.db.query('SELECT * FROM classes WHERE id = ?', [classId]);
  const students = await window.api.db.query(
    'SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name',
    [classId]
  );
  const subjects = await window.api.db.query(
    `SELECT * FROM subjects WHERE class_id = ? ORDER BY created_at ASC, name ASC`,
    [classId]
  );
  const grades = await window.api.db.query(
    `SELECT * FROM grades g INNER JOIN students s ON g.student_id = s.id WHERE s.class_id = ?`,
    [classId]
  );

  // 2) Construire une Map pour accès O(1) aux notes
  const gradesMap = new Map<string, number>();
  for (const g of grades) {
    // clé : "studentId-subjectId-period"
    gradesMap.set(`${g.student_id}-${g.subject_id}-${g.period}`, Number(g.value));
  }
  const getGrade = (studentId: number, subjectId: number, period: string): number | null => {
    const v = gradesMap.get(`${studentId}-${subjectId}-${period}`);
    return typeof v === 'number' ? v : null;
  };

  // 3) Créer le workbook et la feuille principale
  const wb = XLSX.utils.book_new();

  // Construire l'entête: colonnes fixes + pour chaque matière 8 colonnes (P1,P2,Ex1,Sem1,P3,P4,Ex2,Sem2) + TG + % + Appréciation
  const header: string[] = [
    'N°',
    'Nom',
    'Post-nom',
    'Prénom',
    'Sexe'
  ];

  // Pour faciliter lecture humaine, on ajoutera un en-tête multi-lignes en mettant le maxima entre slash
  for (const subj of subjects) {
    header.push(`${subj.name} - P1 /${subj.max_p1}`);
    header.push(`${subj.name} - P2 /${subj.max_p2}`);
    header.push(`${subj.name} - Ex1 /${subj.max_exam1 === 0 ? 'N/A' : subj.max_exam1}`);
    header.push(`${subj.name} - Sem1 /${subj.max_p1 + subj.max_p2 + subj.max_exam1}`);
    header.push(`${subj.name} - P3 /${subj.max_p3}`);
    header.push(`${subj.name} - P4 /${subj.max_p4}`);
    header.push(`${subj.name} - Ex2 /${subj.max_exam2 === 0 ? 'N/A' : subj.max_exam2}`);
    header.push(`${subj.name} - Sem2 /${subj.max_p3 + subj.max_p4 + subj.max_exam2}`);
  }

  // Colonnes finales
  header.push('TOTAL GENERAL');
  header.push('% (total)');
  header.push('Application'); // Excellent, Très bien...
  header.push('Conduite'); // si tu veux
  header.push('Observation'); // echec / redoublement / abandons etc.

  // 4) Préparer les lignes élèves
  const rows: Array<Record<string, any>> = [];
  let idx = 1;
  for (const student of students) {
    const row: Record<string, any> = {
      'N°': idx++,
      'Nom': student.last_name,
      'Post-nom': student.post_name || '',
      'Prénom': student.first_name,
      'Sexe': student.gender || ''
    };

    let totalGeneral = 0;
    let totalMaxGeneral = 0;
    let failedSubjectsCount = 0;
    const failedSubjectsList: string[] = [];

    for (const subj of subjects) {
      // périodes sem1
      const p1 = getGrade(student.id, subj.id, 'P1');
      const p2 = getGrade(student.id, subj.id, 'P2');
      const ex1 = getGrade(student.id, subj.id, 'EXAM1');

      const sem1Points = (p1 || 0) + (p2 || 0) + (ex1 || 0);
      const sem1Max = subj.max_p1 + subj.max_p2 + subj.max_exam1;

      // périodes sem2
      const p3 = getGrade(student.id, subj.id, 'P3');
      const p4 = getGrade(student.id, subj.id, 'P4');
      const ex2 = getGrade(student.id, subj.id, 'EXAM2');

      const sem2Points = (p3 || 0) + (p4 || 0) + (ex2 || 0);
      const sem2Max = subj.max_p3 + subj.max_p4 + subj.max_exam2;

      // Ajouter cellules individuelles (laisser vide si null)
      row[`${subj.name} - P1 /${subj.max_p1}`] = p1 !== null ? p1 : '';
      row[`${subj.name} - P2 /${subj.max_p2}`] = p2 !== null ? p2 : '';
      // Examen absent (max 0) -> marque N/A ou vide
      row[`${subj.name} - Ex1 /${subj.max_exam1 === 0 ? 'N/A' : subj.max_exam1}`] = (subj.max_exam1 === 0) ? '' : (ex1 !== null ? ex1 : '');
      row[`${subj.name} - Sem1 /${sem1Max}`] = sem1Max > 0 ? sem1Points : '';

      row[`${subj.name} - P3 /${subj.max_p3}`] = p3 !== null ? p3 : '';
      row[`${subj.name} - P4 /${subj.max_p4}`] = p4 !== null ? p4 : '';
      row[`${subj.name} - Ex2 /${subj.max_exam2 === 0 ? 'N/A' : subj.max_exam2}`] = (subj.max_exam2 === 0) ? '' : (ex2 !== null ? ex2 : '');
      row[`${subj.name} - Sem2 /${sem2Max}`] = sem2Max > 0 ? sem2Points : '';

      // Totaux généraux
      const subjTotal = sem1Points + sem2Points;
      const subjMaxTotal = sem1Max + sem2Max;

      totalGeneral += subjTotal;
      totalMaxGeneral += subjMaxTotal;

      // échec matière (<50%)
      if (subjMaxTotal > 0) {
        const subjPct = (subjTotal / subjMaxTotal) * 100;
        if (subjPct < 50) {
          failedSubjectsCount++;
          failedSubjectsList.push(subj.name);
        }
      }
    }

    const pct = totalMaxGeneral > 0 ? (totalGeneral / totalMaxGeneral) * 100 : 0;
    // Application simple (mêmes seuils que dans ton code)
    const application = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Très bien' : pct >= 50 ? 'Bien' : pct >= 30 ? 'Mauvaise' : 'Médiocre';

    // Conduite : concat selon dispo (simple)
    const conduite = `${student.conduite_p1 || ''} ${student.conduite_p2 || ''} ${student.conduite_p3 || ''} ${student.conduite_p4 || ''}`.trim();

    row['TOTAL GENERAL'] = totalGeneral;
    row['% (total)'] = totalMaxGeneral > 0 ? Number(pct.toFixed(2)) : '';
    row['Application'] = application;
    row['Conduite'] = conduite || '';
    row['Observation'] = student.is_abandoned ? `Abandon${student.abandon_reason ? ': ' + student.abandon_reason : ''}` :
                          (totalMaxGeneral === 0 ? 'Non classé' :
                           (pct < 50 ? `Redouble (${failedSubjectsCount} matières)` : (failedSubjectsCount > 0 ? `Échec (${failedSubjectsCount})` : '-')));

    rows.push(row);
  }

  // 5) Générer la feuille et écrire le fichier
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: header });
  XLSX.utils.book_append_sheet(wb, worksheet, 'Notes');

  // 6) (Optionnel) feuille "Matières / Maxima" pour référence
  const matRows = subjects.map(s => ({
    'Matière': s.name,
    'Code': s.code,
    'P1': s.max_p1,
    'P2': s.max_p2,
    'Ex1': s.max_exam1,
    'Sem1': s.max_p1 + s.max_p2 + s.max_exam1,
    'P3': s.max_p3,
    'P4': s.max_p4,
    'Ex2': s.max_exam2,
    'Sem2': s.max_p3 + s.max_p4 + s.max_exam2,
    'Total': s.max_p1 + s.max_p2 + s.max_exam1 + s.max_p3 + s.max_p4 + s.max_exam2
  }));
  const wsMat = XLSX.utils.json_to_sheet(matRows);
  XLSX.utils.book_append_sheet(wb, wsMat, 'Matières - Maxima');

  // Nom du fichier
  const fileName = `Notes_${cls?.level || 'class'}_${cls?.option || 'opt'}_${new Date().toISOString().slice(0,10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
