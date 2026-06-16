import { Subject, Grade, Student, RankedStudent, Period, PalmaresMode, StudentCategory } from '../types/palmares';
import { Repechage } from '../services/repechageService';
import { DeliberationConfig, deliberationConfigService } from '../services/deliberationConfigService';
import { getMathValue } from '../components/class/classDetails/gradeUtils';

export const periode = (period: string): string => {
  switch (period) {
    case 'SEM1': return '1ère Semestre';
    case 'SEM2': return '2ème Semestre';
    case 'ANNUAL': return null;
    case 'P1': return '1ère Période';
    case 'P2': return '2ème Période';
    case 'P3': return '3ème Période';
    case 'P4': return '4ème Période';
    default: return 'None';
  }
};

export const getApplication = (percentage: number, delibConfig: DeliberationConfig): string => {
  return deliberationConfigService.getAppreciationAbrev(percentage, delibConfig);
};

export const getPeriodConfig = (period: Period): Array<{ period: string; getMax: (s: Subject) => number }> => {
  const configs: Record<Period, Array<{ period: string; getMax: (s: Subject) => number }>> = {
    'P1': [{ period: 'P1', getMax: (s) => s.max_p1 }],
    'P2': [{ period: 'P2', getMax: (s) => s.max_p2 }],
    'EXAM1': [{ period: 'EXAM1', getMax: (s) => s.max_exam1 }],
    'SEM1': [
      { period: 'P1', getMax: (s) => s.max_p1 },
      { period: 'P2', getMax: (s) => s.max_p2 },
      { period: 'EXAM1', getMax: (s) => s.max_exam1 },
    ],
    'P3': [{ period: 'P3', getMax: (s) => s.max_p3 }],
    'P4': [{ period: 'P4', getMax: (s) => s.max_p4 }],
    'EXAM2': [{ period: 'EXAM2', getMax: (s) => s.max_exam2 }],
    'SEM2': [
      { period: 'P3', getMax: (s) => s.max_p3 },
      { period: 'P4', getMax: (s) => s.max_p4 },
      { period: 'EXAM2', getMax: (s) => s.max_exam2 },
    ],
    'ANNUAL': [
      { period: 'P1', getMax: (s) => s.max_p1 },
      { period: 'P2', getMax: (s) => s.max_p2 },
      { period: 'EXAM1', getMax: (s) => s.max_exam1 },
      { period: 'P3', getMax: (s) => s.max_p3 },
      { period: 'P4', getMax: (s) => s.max_p4 },
      { period: 'EXAM2', getMax: (s) => s.max_exam2 },
    ],
  };
  return configs[period];
};

export const calculateRankings = (
  students: Student[],
  subjects: Subject[],
  grades: Grade[],
  selectedPeriod: Period,
  onlyAbandons: boolean,
  sortByAbandon: boolean,
  repechages: Repechage[],
  palmaresMode: PalmaresMode,
  delibConfig: DeliberationConfig
): RankedStudent[] => {
  const rankings: RankedStudent[] = [];
  let studentsToProcess = [...students];

  if (onlyAbandons) {
    studentsToProcess = studentsToProcess.filter((s) => !s.is_abandoned);
  }

  if (sortByAbandon) {
    studentsToProcess.sort((a, b) => (b.is_abandoned ? 1 : 0) - (a.is_abandoned ? 1 : 0));
  }

  const periodsConfig = getPeriodConfig(selectedPeriod);

  for (const student of studentsToProcess) {
    let totalPoints = 0;
    let totalMaxPoints = 0;
    let hasAllGrades = true;
    const failedSubjects: string[] = [];
    const repechageSubjects: string[] = [];
    const missingSubjects: string[] = [];
    const subjectDetails: RankedStudent['subjectDetails'] = [];

    for (const subject of subjects) {
      let subjectPoints = 0;
      let subjectMaxPoints = 0;
      let subjectHasMissingGrade = false;

      for (const periodData of periodsConfig) {
        const maxForPeriod = periodData.getMax(subject);
        if (maxForPeriod === 0) continue;

        const gradeEntry = grades.find(
          (g) => g.student_id === student.id && g.subject_id === subject.id && g.period === periodData.period
        );
        const grade = gradeEntry ? getMathValue(gradeEntry.value) : null;

        if (grade === null) {
          hasAllGrades = false;
          subjectHasMissingGrade = true;
          if (!missingSubjects.includes(subject.code || subject.name)) {
            missingSubjects.push(subject.code || subject.name);
          }
          break;
        }
        subjectPoints += grade;
        subjectMaxPoints += maxForPeriod;
      }

      if (palmaresMode === 'AFTER_DELIBERATION') {
        const rep = repechages.find((r) => r.student_id === student.id && r.subject_id === subject.id);
        if (rep && rep.percentage > 0) {
          const newPoints = (rep.percentage / 100) * subjectMaxPoints;
          if (newPoints > subjectPoints) {
            subjectPoints = newPoints;
          }
        }
      }

      if (!subjectHasMissingGrade) {
        totalPoints += subjectPoints;
        totalMaxPoints += subjectMaxPoints;
      }

      if (subjectMaxPoints > 0) {
        const subjectPercentage = (subjectPoints / subjectMaxPoints) * 100;
        if (subjectPercentage < delibConfig.seuilEchecMatiere) {
          failedSubjects.push(subject.code || subject.name);
        }
      }

      const rep = repechages.find((r) => r.student_id === student.id && r.subject_id === subject.id);
      if (rep && rep.percentage > 0) {
        repechageSubjects.push(subject.code || subject.name);
      }

      subjectDetails.push({
        subjectCode: subject.code,
        subjectName: subject.name,
        points: subjectPoints,
        maxPoints: subjectMaxPoints,
      });
    }

    const percentage = hasAllGrades && totalMaxPoints > 0 ? (totalPoints / totalMaxPoints) * 100 : 0;

    if (
      palmaresMode !== 'BEFORE_DELIBERATION' &&
      hasAllGrades &&
      percentage >= delibConfig.seuilReussiteGlobal &&
      failedSubjects.length > 0
    ) {
      let surplusDisponible = 0;
      subjectDetails.forEach((detail) => {
        const moyenne = detail.maxPoints / 2;
        if (detail.points > moyenne) {
          surplusDisponible += detail.points - moyenne;
        }
      });

      const remainingFailedSubjects: string[] = [];

      for (const failedSubjectName of failedSubjects) {
        const detailIndex = subjectDetails.findIndex((s) => (s.subjectCode || s.subjectName) === failedSubjectName);
        if (detailIndex === -1) {
          remainingFailedSubjects.push(failedSubjectName);
          continue;
        }
        const detail = subjectDetails[detailIndex];
        const moyenne = detail.maxPoints / 2;
        const missingPoints = moyenne - detail.points;

        const estRelevable = deliberationConfigService.isRelevable(detail.maxPoints, missingPoints, delibConfig);

        if (estRelevable && surplusDisponible >= missingPoints) {
          surplusDisponible -= missingPoints;
        } else {
          remainingFailedSubjects.push(failedSubjectName);
        }
      }

      failedSubjects.length = 0;
      failedSubjects.push(...remainingFailedSubjects);
    }

    let category: StudentCategory = 3;

    if (student.is_abandoned || !!student.abandon_reason) {
      category = 4;
    } else if (!hasAllGrades || missingSubjects.length > 0) {
      if (palmaresMode === 'AFTER_DELIBERATION') {
        category = delibConfig.manqueCotesDoubleEnFinal ? 3 : 5;
      } else {
        category = 5;
      }
    } else if (percentage >= delibConfig.seuilReussiteGlobal) {
      if (selectedPeriod === 'ANNUAL') {
        if (failedSubjects.length > 0 || repechageSubjects.length > 0) {
          category = 2;
        } else {
          category = 1;
        }
      } else {
        if (failedSubjects.length > 0) {
          category = 2;
        } else {
          category = 1;
        }
      }
    }

    rankings.push({
      student,
      percentage: hasAllGrades ? percentage : 0,
      rank: 0,
      application: hasAllGrades ? getApplication(percentage, delibConfig) : '-',
      isUnranked: category === 5,
      category,
      failedSubjects,
      repechageSubjects,
      missingSubjects,
      subjectDetails,
    });
  }

  const cat1 = rankings.filter((r) => r.category === 1);
  const cat2 = rankings.filter((r) => r.category === 2);
  const cat3 = rankings.filter((r) => r.category === 3);
  const cat4 = rankings.filter((r) => r.category === 4);
  const cat5 = rankings.filter((r) => r.category === 5);

  const sortByPercentage = (a: RankedStudent, b: RankedStudent) => {
    if (b.percentage !== a.percentage) {
      return b.percentage - a.percentage;
    }
    const nameA = `${a.student.last_name} ${a.student.post_name || ''} ${a.student.first_name || ''}`;
    const nameB = `${b.student.last_name} ${b.student.post_name || ''} ${b.student.first_name || ''}`;
    return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
  };

  const sortByAlphabetical = (a: RankedStudent, b: RankedStudent) => {
    const nameA = `${a.student.last_name} ${a.student.post_name || ''} ${a.student.first_name || ''}`;
    const nameB = `${b.student.last_name} ${b.student.post_name || ''} ${b.student.first_name || ''}`;
    return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
  };

  cat1.sort(sortByPercentage);
  cat2.sort(sortByPercentage);
  cat3.sort(sortByPercentage);
  cat4.sort(sortByAlphabetical);

  for (let i = 0; i < cat1.length; i++) cat1[i].rank = i + 1;
  for (let i = 0; i < cat2.length; i++) cat2[i].rank = i + 1;
  for (let i = 0; i < cat3.length; i++) cat3[i].rank = i + 1;
  for (let i = 0; i < cat4.length; i++) cat4[i].rank = i + 1;
  for (let i = 0; i < cat5.length; i++) cat5[i].rank = i + 1;

  return [...cat1, ...cat2, ...cat3, ...cat5, ...cat4];
};
