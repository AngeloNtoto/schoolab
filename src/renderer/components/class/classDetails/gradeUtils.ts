export const ALL_PERIODS = ['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'] as const;

export type PeriodKey = typeof ALL_PERIODS[number];

export type ColumnStats = Record<string, { avg: number; min: number; max: number; count: number }>;

export const roundGradeValue = (value: number) => Math.round(value);

export const convertGradeToCourseMax = (
  rawValue: number,
  courseMax: number,
  correctionMax: number | null
) => {
  if (!correctionMax || correctionMax <= 0 || courseMax <= 0 || correctionMax === courseMax) {
    return roundGradeValue(rawValue);
  }

  return roundGradeValue((rawValue / correctionMax) * courseMax);
};

export const convertGradeToCorrectionMax = (
  storedValue: number,
  courseMax: number,
  correctionMax: number | null
) => {
  if (!correctionMax || correctionMax <= 0 || courseMax <= 0 || correctionMax === courseMax) {
    return storedValue;
  }

  return roundGradeValue((storedValue / courseMax) * correctionMax);
};

export const formatGradeInputValue = (
  value: number | null,
  courseMax: number,
  correctionMax: number | null
) => {
  if (value === null) return '';
  return convertGradeToCorrectionMax(value, courseMax, correctionMax).toString();
};

export const getVisibleGradeColumnCount = (selectedPeriods: Set<string>) => (
  (selectedPeriods.has('P1') ? 1 : 0) +
  (selectedPeriods.has('P2') ? 1 : 0) +
  (selectedPeriods.has('EXAM1') ? 1 : 0) +
  (selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1') ? 1 : 0) +
  (selectedPeriods.has('P3') ? 1 : 0) +
  (selectedPeriods.has('P4') ? 1 : 0) +
  (selectedPeriods.has('EXAM2') ? 1 : 0) +
  (selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2') ? 1 : 0)
);
