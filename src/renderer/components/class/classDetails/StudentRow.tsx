import React, { useMemo } from 'react';
import { gradebookStore } from '../../../context/gradebookSelection';
import { Subject } from '../../../services/classService';
import { Student } from '../../../services/studentService';
import GradeCell from './GradeCell';

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
}: StudentRowProps) => {
  const getGrade = (subjectId: number, period: string) => {
    return gradesMap.get(`${student.id}-${subjectId}-${period}`) ?? null;
  };

  const calculateSemesterTotal = (subjectId: number, semester: 1 | 2) => {
    if (semester === 1) {
      const p1 = getGrade(subjectId, 'P1');
      const p2 = getGrade(subjectId, 'P2');
      const ex1 = getGrade(subjectId, 'EXAM1');
      if (p1 === null && p2 === null && ex1 === null) return null;
      return (p1 || 0) + (p2 || 0) + (ex1 || 0);
    }

    const p3 = getGrade(subjectId, 'P3');
    const p4 = getGrade(subjectId, 'P4');
    const ex2 = getGrade(subjectId, 'EXAM2');
    if (p3 === null && p4 === null && ex2 === null) return null;
    return (p3 || 0) + (p4 || 0) + (ex2 || 0);
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

  return (
    <tr className={`group border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'}`}>
      <td 
        onClick={(e) => gradebookStore.selectRow(student.id, availableColumns, e.shiftKey)}
        className={`sticky left-0 z-10 px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400 min-w-[40px] w-[40px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'} group-hover:bg-slate-100 dark:group-hover:bg-slate-700`}
      >
        {idx + 1}
      </td>
      <td
        className={`sticky left-[40px] z-10 px-4 py-3 font-medium text-slate-800 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-800'} group-hover:bg-slate-100 dark:group-hover:bg-slate-700`}
        onContextMenu={(e) => onContextMenu(e, student)}
        onClick={(e) => gradebookStore.selectRow(student.id, availableColumns, e.shiftKey)}
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
