import React, { useMemo } from 'react';
import { gradebookStore } from '../../../context/gradebookSelection';
import { Subject } from '../../../services/classService';
import { Student } from '../../../services/studentService';
import GradeCell from './GradeCell';
import { GRADE_TRICHEUR_CODE } from './gradeUtils';

interface StudentRowProps {
  student: Student;
  subjects: Subject[];
  idx: number;
  gradesMap: Map<string, number>;
  onContextMenu: (e: React.MouseEvent, student: Student) => void;
  onUpdateGrade: (studentId: number, subjectId: number, period: string, value: number | null) => Promise<void>;
  lockedPeriods: Set<string>;
  correctionMax: number | null;
  selectedPeriods: Set<string>;
  // Sélection multiple desktop-style (CTRL+clic)
  selectedStudentIds: Set<number>;
  onToggleSelectStudent: (studentId: number, withCtrl: boolean) => void;
}

const StudentRow = React.memo(({
  student,
  subjects,
  idx,
  gradesMap,
  onContextMenu,
  onUpdateGrade,
  lockedPeriods,
  correctionMax,
  selectedPeriods,
  selectedStudentIds,
  onToggleSelectStudent,
}: StudentRowProps) => {
  // Vérifie si cet élève est sélectionné (via CTRL+clic)
  const isRowSelected = selectedStudentIds.has(student.id);
  const getGrade = (subjectId: number, period: string) => {
    return gradesMap.get(`${student.id}-${subjectId}-${period}`) ?? null;
  };

  // Calcule la valeur numérique d'une note pour les totaux :
  // null → 0, Tricheur (-1) → 0 (affiché "zéro", compté 0), sinon la valeur réelle
  const getGradeValue = (val: number | null): number => {
    if (val === null) return 0;
    if (val === GRADE_TRICHEUR_CODE) return 0; // "zéro" = compté comme 0
    return val;
  };

  const calculateSemesterTotal = (subjectId: number, semester: 1 | 2) => {
    if (semester === 1) {
      const p1 = getGrade(subjectId, 'P1');
      const p2 = getGrade(subjectId, 'P2');
      const ex1 = getGrade(subjectId, 'EXAM1');
      if (p1 === null && p2 === null && ex1 === null) return null;
      // T(richeur) = -1 contribue comme -1 dans la somme
      return getGradeValue(p1) + getGradeValue(p2) + getGradeValue(ex1);
    }

    const p3 = getGrade(subjectId, 'P3');
    const p4 = getGrade(subjectId, 'P4');
    const ex2 = getGrade(subjectId, 'EXAM2');
    if (p3 === null && p4 === null && ex2 === null) return null;
    return getGradeValue(p3) + getGradeValue(p4) + getGradeValue(ex2);
  };

  const availableColumns = useMemo(() => {
    const cols: {subjectId: number, period: string}[] = [];
    subjects.forEach(subject => {
      if (selectedPeriods.has('P1')) cols.push({subjectId: subject.id, period: 'P1'});
      if (selectedPeriods.has('P2')) cols.push({subjectId: subject.id, period: 'P2'});
      if (selectedPeriods.has('EXAM1') && subject.max_exam1 > 0) cols.push({subjectId: subject.id, period: 'EXAM1'});
      if (selectedPeriods.has('P3')) cols.push({subjectId: subject.id, period: 'P3'});
      if (selectedPeriods.has('P4')) cols.push({subjectId: subject.id, period: 'P4'});
      if (selectedPeriods.has('EXAM2') && subject.max_exam2 > 0) cols.push({subjectId: subject.id, period: 'EXAM2'});
    });
    return cols;
  }, [subjects, selectedPeriods]);

  // Couleur de fond de la ligne : sélectionnée > pair/impair
  const rowBg = isRowSelected
    ? 'bg-blue-50 dark:bg-blue-900/30'
    : idx % 2 === 0
      ? 'bg-white dark:bg-slate-900'
      : 'bg-slate-50 dark:bg-slate-800';

  // Gestion du clic sur le numéro ou le nom de l'élève
  const handleRowHeaderClick = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // CTRL+clic = sélection/désélection multiple
      e.preventDefault();
      onToggleSelectStudent(student.id, true);
    } else {
      // Clic simple = sélection des cellules de la ligne dans la grille
      onToggleSelectStudent(student.id, false);
      gradebookStore.selectRow(student.id, availableColumns, e.shiftKey);
    }
  };

  return (
    <tr className={`group border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 ${rowBg} transition-colors`}>
      <td
        onClick={handleRowHeaderClick}
        className={`sticky left-0 z-10 px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 text-[10px] font-black min-w-[40px] w-[40px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${rowBg} group-hover:bg-slate-100 dark:group-hover:bg-slate-700 select-none ${
          isRowSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
        }`}
      >
        {isRowSelected ? '✓' : idx + 1}
      </td>
      <td
        className={`sticky left-[40px] z-10 px-4 py-3 font-medium border-r-2 border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors select-none ${rowBg} group-hover:bg-slate-100 dark:group-hover:bg-slate-700 ${
          isRowSelected ? 'text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-800 dark:text-slate-200'
        }`}
        onContextMenu={(e) => onContextMenu(e, student)}
        onClick={handleRowHeaderClick}
      >
        {student.last_name} {student.post_name}
      </td>
      {subjects.map(subject => {
        const sem1Total = calculateSemesterTotal(subject.id, 1);
        const sem2Total = calculateSemesterTotal(subject.id, 2);
        const hasExam1 = subject.max_exam1 > 0;
        const hasExam2 = subject.max_exam2 > 0;

        return (
          <React.Fragment key={subject.id}>
            {selectedPeriods.has('P1') && (
              <GradeCell
                value={getGrade(subject.id, 'P1')}
                studentIdx={idx}
                studentId={student.id}
                subjectId={subject.id}
                period="P1"
                maxValue={subject.max_p1}
                locked={lockedPeriods.has('P1')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P1', val)}
              />
            )}
            {selectedPeriods.has('P2') && (
              <GradeCell
                value={getGrade(subject.id, 'P2')}
                studentIdx={idx}
                studentId={student.id}
                subjectId={subject.id}
                period="P2"
                maxValue={subject.max_p2}
                locked={lockedPeriods.has('P2')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P2', val)}
              />
            )}
            {selectedPeriods.has('EXAM1') && (
              <GradeCell
                value={getGrade(subject.id, 'EXAM1')}
                studentIdx={idx}
                studentId={student.id}
                subjectId={subject.id}
                period="EXAM1"
                isExam
                disabled={!hasExam1}
                maxValue={subject.max_exam1}
                locked={lockedPeriods.has('EXAM1')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM1', val)}
              />
            )}
            {(selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1')) && (
              <td className="px-2 py-3 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-r-2 border-slate-400 dark:border-slate-500">
                {sem1Total !== null ? sem1Total.toFixed(1) : '-'}
              </td>
            )}
            {selectedPeriods.has('P3') && (
              <GradeCell
                value={getGrade(subject.id, 'P3')}
                studentIdx={idx}
                studentId={student.id}
                subjectId={subject.id}
                period="P3"
                maxValue={subject.max_p3}
                locked={lockedPeriods.has('P3')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P3', val)}
              />
            )}
            {selectedPeriods.has('P4') && (
              <GradeCell
                value={getGrade(subject.id, 'P4')}
                studentIdx={idx}
                studentId={student.id}
                subjectId={subject.id}
                period="P4"
                maxValue={subject.max_p4}
                locked={lockedPeriods.has('P4')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'P4', val)}
              />
            )}
            {selectedPeriods.has('EXAM2') && (
              <GradeCell
                value={getGrade(subject.id, 'EXAM2')}
                studentIdx={idx}
                studentId={student.id}
                subjectId={subject.id}
                period="EXAM2"
                isExam
                disabled={!hasExam2}
                maxValue={subject.max_exam2}
                locked={lockedPeriods.has('EXAM2')}
                correctionMax={correctionMax}
                onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM2', val)}
              />
            )}
            {(selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2')) && (
              <td className="px-2 py-3 text-center font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 border-r-2 border-slate-400 dark:border-slate-500">
                {sem2Total !== null ? sem2Total.toFixed(1) : '-'}
              </td>
            )}
          </React.Fragment>
        );
      })}
    </tr>
  );
});

export default StudentRow;
