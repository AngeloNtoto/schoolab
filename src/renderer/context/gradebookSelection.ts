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
