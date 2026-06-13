import React, { useEffect, useRef, useState, useMemo } from 'react';
import { convertGradeToCourseMax, formatGradeInputValue } from './gradeUtils';
import { gradebookStore, useCellState } from '../../../context/gradebookSelection';

interface GradeCellProps {
  value: number | null;
  studentIdx: number;
  subjectId: number;
  period: string;
  studentId: number; // Added to create CellPosition
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
  studentId,
  isExam = false,
  disabled = false,
  maxValue = 0,
  locked = false,
  correctionMax,
  onChange
}: GradeCellProps) => {
  const cellPos = useMemo(() => ({ studentId, subjectId, period }), [studentId, subjectId, period]);
  const cellStateString = useCellState(cellPos);
  const [isActive, isSelected, isEditing] = cellStateString.split('-').map(s => s === 'true');

  const [editValue, setEditValue] = useState(formatGradeInputValue(value, maxValue, correctionMax));
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tdRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setEditValue(formatGradeInputValue(value, maxValue, correctionMax));
    }
  }, [value, maxValue, correctionMax, isEditing]);

  useEffect(() => {
    if (isActive && !isEditing && tdRef.current) {
      tdRef.current.focus();
    }
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isActive, isEditing]);

  const flashSaved = () => {
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 800);
  };

  const commitValue = () => {
    gradebookStore.setEditing(false);
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

  const handleBlur = () => {
    if (isEditing) {
      commitValue();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(raw)) {
      setEditValue(raw);
    }
  };

  const findSiblingCell = (direction: 'next' | 'prev' | 'up' | 'down') => {
    const table = tdRef.current?.closest('table');
    if (!table) return null;

    if (direction === 'up' || direction === 'down') {
      const allCellsInColumn = Array.from(table.querySelectorAll(`[data-subject-id="${subjectId}"][data-period="${period}"]`)) as HTMLElement[];
      const currentIndex = allCellsInColumn.findIndex(c => c.dataset.studentIdx === String(studentIdx));
      if (currentIndex === -1) return null;
      const targetIdx = direction === 'down' ? currentIndex + 1 : currentIndex - 1;
      return allCellsInColumn[targetIdx] || null;
    } else {
      const allCellsInRow = Array.from(table.querySelectorAll(`[data-student-idx="${studentIdx}"][data-period]`)) as HTMLElement[];
      const currentIndex = allCellsInRow.findIndex(c => c.dataset.subjectId === String(subjectId) && c.dataset.period === period);
      if (currentIndex === -1) return null;
      const targetIdx = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
      return allCellsInRow[targetIdx] || null;
    }
  };

  const navigateTo = (direction: 'next' | 'prev' | 'up' | 'down') => {
    const sibling = findSiblingCell(direction);
    if (sibling) {
      // Fake a click on sibling to activate it via GradeCell's onClick
      sibling.click();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
      navigateTo('down');
    } else if (e.key === 'Escape') {
      gradebookStore.setEditing(false);
      setEditValue(value?.toString() || '');
      tdRef.current?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitValue();
      navigateTo(e.shiftKey ? 'prev' : 'next');
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || locked || isEditing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      gradebookStore.setEditing(true);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      navigateTo(e.shiftKey ? 'prev' : 'next');
      return;
    }

    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      if (e.key === 'ArrowRight') navigateTo('next');
      if (e.key === 'ArrowLeft') navigateTo('prev');
      if (e.key === 'ArrowDown') navigateTo('down');
      if (e.key === 'ArrowUp') navigateTo('up');
      return;
    }

    if (/^[0-9.]$/.test(e.key)) {
      e.preventDefault();
      setEditValue(e.key);
      gradebookStore.setEditing(true);
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      if (value !== null) {
        onChange(null);
        flashSaved();
      }
    }

    // Commandes contextuelles simples
    if (e.key.toLowerCase() === 'm' && maxValue > 0) { // 'm' pour max
       e.preventDefault();
       onChange(maxValue);
       flashSaved();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (disabled || locked) return;
    if (e.ctrlKey || e.metaKey) {
       // Multi-selection (toggle)
       if (isSelected) {
         // It's a bit complex to unselect one cell from the store right now, let's keep simple addSelection
       } else {
         gradebookStore.addSelection(cellPos);
       }
    } else {
       gradebookStore.setActiveCell(cellPos);
    }
  };

  const handleDoubleClick = () => {
    if (disabled || locked) return;
    gradebookStore.setActiveCell(cellPos);
    gradebookStore.setEditing(true);
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
      data-student-id={studentId}
      data-subject-id={subjectId}
      data-period={period}
      tabIndex={disabled || locked ? -1 : 0}
      className={`relative px-1 py-3 text-center border-r border-slate-200 dark:border-slate-700 transition-colors duration-100 outline-none select-none ${
        disabled
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
          : locked
            ? 'bg-amber-50/50 dark:bg-amber-900/10 text-slate-500 cursor-not-allowed'
            : isActive
              ? 'bg-blue-100 dark:bg-blue-900/60 ring-2 ring-blue-500 ring-inset z-10'
              : isSelected
                ? 'bg-blue-50 dark:bg-blue-900/30 ring-1 ring-blue-300 ring-inset'
                : `cursor-cell hover:bg-slate-100 dark:hover:bg-slate-700/50 ${conditionalColorClass || 'text-slate-700 dark:text-slate-300'} ${isExam ? 'bg-slate-50 dark:bg-slate-800/50 font-medium' : ''}`
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
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
        <span className="absolute inset-0 flex items-center justify-center text-emerald-500 text-xs font-bold animate-in fade-in zoom-in duration-200 pointer-events-none">
          ✓
        </span>
      )}

      {isEditing && !disabled && !locked && (
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          className="absolute inset-0 w-full h-full text-center outline-none bg-white dark:bg-slate-800 font-medium text-slate-800 dark:text-white caret-blue-500 shadow-[inset_0_0_0_2px_#3b82f6] z-20"
          value={editValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleInputKeyDown}
          autoComplete="off"
        />
      )}
    </td>
  );
});

export default GradeCell;
