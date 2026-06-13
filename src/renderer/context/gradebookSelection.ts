import { useSyncExternalStore } from 'react';

export interface CellPosition {
  studentId: number;
  subjectId: number;
  period: string;
}

export const getCellKey = (pos: CellPosition) => `${pos.studentId}-${pos.subjectId}-${pos.period}`;

interface GradebookState {
  activeCell: CellPosition | null;
  selectedCells: Set<string>; // Set of cellKeys
  isEditing: boolean;
  copiedData: any | null; // For copy-paste
}

class GradebookStore {
  private state: GradebookState = {
    activeCell: null,
    selectedCells: new Set(),
    isEditing: false,
    copiedData: null
  };
  private listeners: Set<() => void> = new Set();

  getState() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  setActiveCell(cell: CellPosition | null, keepSelection: boolean = false) {
    const newState = { ...this.state, activeCell: cell, isEditing: false };
    if (!keepSelection) {
      newState.selectedCells = new Set();
    }
    if (cell) {
      newState.selectedCells.add(getCellKey(cell));
    }
    this.state = newState;
    this.notify();
  }

  setEditing(isEditing: boolean) {
    if (this.state.isEditing !== isEditing) {
      this.state = { ...this.state, isEditing };
      this.notify();
    }
  }

  addSelection(cell: CellPosition) {
    const newSelected = new Set(this.state.selectedCells);
    newSelected.add(getCellKey(cell));
    this.state = { ...this.state, selectedCells: newSelected };
    this.notify();
  }

  selectColumn(subjectId: number, period: string, studentIds: number[], keepSelection: boolean = false) {
    const newSelected = keepSelection ? new Set(this.state.selectedCells) : new Set<string>();
    studentIds.forEach(id => {
      newSelected.add(getCellKey({ studentId: id, subjectId, period }));
    });
    this.state = { ...this.state, selectedCells: newSelected, isEditing: false };
    if (!this.state.activeCell && studentIds.length > 0) {
      this.state.activeCell = { studentId: studentIds[0], subjectId, period };
    }
    this.notify();
  }

  selectRow(studentId: number, columns: {subjectId: number, period: string}[], keepSelection: boolean = false) {
    const newSelected = keepSelection ? new Set(this.state.selectedCells) : new Set<string>();
    columns.forEach(col => {
      newSelected.add(getCellKey({ studentId, subjectId: col.subjectId, period: col.period }));
    });
    this.state = { ...this.state, selectedCells: newSelected, isEditing: false };
    if (!this.state.activeCell && columns.length > 0) {
      this.state.activeCell = { studentId, subjectId: columns[0].subjectId, period: columns[0].period };
    }
    this.notify();
  }

  clearSelection() {
    this.state = { ...this.state, selectedCells: new Set(), activeCell: null, isEditing: false };
    this.notify();
  }
}

export const gradebookStore = new GradebookStore();

export function useGradebookSelection() {
  return useSyncExternalStore(
    (l) => gradebookStore.subscribe(l),
    () => gradebookStore.getState()
  );
}

export function useCellState(pos: CellPosition) {
  const key = getCellKey(pos);
  return useSyncExternalStore(
    (l) => gradebookStore.subscribe(l),
    () => {
      const state = gradebookStore.getState();
      const isActive = state.activeCell ? getCellKey(state.activeCell) === key : false;
      const isSelected = state.selectedCells.has(key);
      const isEditing = isActive && state.isEditing;
      return `${isActive}-${isSelected}-${isEditing}`;
    }
  );
}
