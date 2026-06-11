import React, { useEffect, useRef, useState } from 'react';
import {
  convertGradeToCourseMax,
  formatGradeInputValue
} from './gradeUtils';

interface GradeCellProps {
  value: number | null;
  studentIdx: number;
  subjectId: number;
  period: string;
  isExam?: boolean;
  disabled?: boolean;
  maxValue?: number;
  locked?: boolean;
  correctionMax: number | null;
  onChange: (val: number | null) => void;
}

const GradeCell = React.memo(({
  value,
  studentIdx,
  subjectId,
  period,
  isExam = false,
  disabled = false,
  maxValue = 0,
  locked = false,
  correctionMax,
  onChange
}: GradeCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(formatGradeInputValue(value, maxValue, correctionMax));
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    setEditValue(formatGradeInputValue(value, maxValue, correctionMax));
  }, [value, maxValue, correctionMax]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const flashSaved = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 800);
  };

  const navigateTo = (nextStudentIdx: number, nextSubjectId: number, nextPeriod: string) => {
    setTimeout(() => {
      const nextCell = document.querySelector(
        `[data-student-idx="${nextStudentIdx}"][data-subject-id="${nextSubjectId}"][data-period="${nextPeriod}"]`
      ) as HTMLElement;
      if (nextCell) {
        nextCell.click();
      }
    }, 30);
  };

  const findSiblingCell = (direction: 'next' | 'prev') => {
    const allCells = Array.from(document.querySelectorAll(
      `[data-student-idx="${studentIdx}"][data-period]`
    )) as HTMLElement[];
    const currentIndex = allCells.findIndex(
      c => c.dataset.subjectId === String(subjectId) && c.dataset.period === period
    );
    if (currentIndex === -1) return null;
    const targetIdx = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    return allCells[targetIdx] || null;
  };

  const handleBlur = () => {
    setIsEditing(false);
    const finalValue = editValue.trim();

    if (finalValue === '') {
      if (value !== null) {
        onChange(null);
        flashSaved();
      }
    } else if (finalValue === '0') {
      if (value !== null) {
        onChange(null);
      }
      setEditValue('');
    } else {
      const num = finalValue === '00' ? 0 : parseFloat(finalValue);
      if (!isNaN(num) && num >= 0) {
        const inputMax = correctionMax || maxValue;
        if (inputMax > 0 && num > inputMax) {
          setEditValue(formatGradeInputValue(value, maxValue, correctionMax));
          return;
        }

        const convertedValue = convertGradeToCourseMax(num, maxValue, correctionMax);
        if (convertedValue !== value) {
          onChange(convertedValue);
          flashSaved();
        }
      } else {
        setEditValue(formatGradeInputValue(value, maxValue, correctionMax));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(raw)) {
      setEditValue(raw);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      navigateTo(studentIdx + 1, subjectId, period);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleBlur();
      const sibling = findSiblingCell('next');
      if (sibling) setTimeout(() => sibling.click(), 30);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleBlur();
      const sibling = findSiblingCell('prev');
      if (sibling) setTimeout(() => sibling.click(), 30);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleBlur();
      navigateTo(studentIdx + 1, subjectId, period);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleBlur();
      navigateTo(studentIdx - 1, subjectId, period);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value?.toString() || '');
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || locked || isEditing) return;
    if (/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      setEditValue(e.key);
      setIsEditing(true);
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (value !== null) {
        onChange(null);
        flashSaved();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled || locked) return;
    e.preventDefault();
    const text = e.clipboardData.getData('text').trim();
    const num = parseFloat(text);
    if (!isNaN(num) && num >= 0) {
      const inputMax = correctionMax || maxValue;
      if (inputMax > 0 && num > inputMax) return;
      onChange(convertGradeToCourseMax(num, maxValue, correctionMax));
      flashSaved();
    }
  };

  const hasConversion = Boolean(correctionMax && maxValue > 0 && correctionMax !== maxValue);
  const percentage = (value !== null && maxValue > 0) ? (value / maxValue) * 100 : null;
  const conditionalColorClass = percentage !== null
    ? percentage < 50
      ? 'text-red-600 dark:text-red-400'
      : percentage >= 80
        ? 'text-emerald-600 dark:text-emerald-400'
        : ''
    : '';

  return (
    <td
      ref={tdRef}
      data-student-idx={studentIdx}
      data-subject-id={subjectId}
      data-period={period}
      tabIndex={disabled || locked ? -1 : 0}
      className={`relative px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 transition-colors duration-150 outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-inset ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
          : locked
            ? 'bg-amber-50/50 dark:bg-amber-900/10 text-slate-500 cursor-not-allowed'
            : isEditing
              ? 'bg-blue-50 dark:bg-blue-900/40'
              : `cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${conditionalColorClass || 'text-slate-700 dark:text-slate-300'} ${isExam ? 'bg-slate-50 dark:bg-slate-800/50 font-medium' : ''}`
      }`}
      onClick={() => !disabled && !locked && !isEditing && setIsEditing(true)}
      onKeyDown={handleCellKeyDown}
      onPaste={handlePaste}
      title={
        disabled
          ? "Pas d'examen pour ce cours"
          : locked
            ? 'Période verrouillée'
            : hasConversion
              ? `Saisie sur ${correctionMax}, enregistrée sur ${maxValue}`
              : ''
      }
    >
      <span className={`${isEditing && !disabled ? 'invisible' : ''} ${conditionalColorClass}`}>
        {disabled ? 'N/A' : (value !== null ? value : '-')}
      </span>

      {showSaved && (
        <span className="absolute inset-0 flex items-center justify-center text-emerald-500 text-xs font-bold animate-in fade-in zoom-in duration-200">
          ✓
        </span>
      )}

      {isEditing && !disabled && !locked && (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="absolute inset-0 w-full h-full text-center outline-none bg-transparent font-medium text-slate-800 dark:text-white caret-blue-500"
          value={editValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      )}
    </td>
  );
});

export default GradeCell;
