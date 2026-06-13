import { useEffect, useState, useCallback } from 'react';

export interface DragItem {
  id: string | number;
  type: string;
  data: any;
}

interface DragState {
  isDragging: boolean;
  item: DragItem | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

class DragManager {
  private state: DragState = {
    isDragging: false,
    item: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  };

  private listeners: Set<() => void> = new Set();
  private dragThreshold = 5; // Pixels to move before drag starts
  private potentialDrag: { item: DragItem, x: number, y: number } | null = null;

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getState() {
    return this.state;
  }

  handleMouseDown(e: React.MouseEvent | MouseEvent, item: DragItem) {
    // Only left click
    if (e.button !== 0) return;
    
    // Prevent text selection during drag setup
    e.preventDefault();

    this.potentialDrag = {
      item,
      x: e.clientX,
      y: e.clientY
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!this.potentialDrag) return;

      const dx = moveEvent.clientX - this.potentialDrag.x;
      const dy = moveEvent.clientY - this.potentialDrag.y;
      
      if (!this.state.isDragging && Math.sqrt(dx * dx + dy * dy) > this.dragThreshold) {
        // Start drag
        this.state = {
          isDragging: true,
          item: this.potentialDrag.item,
          startX: this.potentialDrag.x,
          startY: this.potentialDrag.y,
          currentX: moveEvent.clientX,
          currentY: moveEvent.clientY
        };
        // Add global class to change cursor
        document.body.classList.add('dragging');
        this.notify();
      } else if (this.state.isDragging) {
        // Update drag
        this.state = {
          ...this.state,
          currentX: moveEvent.clientX,
          currentY: moveEvent.clientY
        };
        this.notify();
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      if (this.state.isDragging) {
        // Dispatch custom drop event that drop targets can listen to
        const dropEvent = new CustomEvent('dragmanager:drop', {
          detail: {
            item: this.state.item,
            x: upEvent.clientX,
            y: upEvent.clientY
          }
        });
        window.dispatchEvent(dropEvent);
      }

      this.potentialDrag = null;
      this.state = {
        isDragging: false,
        item: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      };
      document.body.classList.remove('dragging');
      this.notify();

      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
}

export const dragManager = new DragManager();

// Hook for a draggable element
export function useDraggable(item: DragItem) {
  return {
    onMouseDown: (e: React.MouseEvent) => dragManager.handleMouseDown(e, item)
  };
}

// Hook to track the global drag state (useful for rendering the ghost element)
export function useDragState() {
  const [state, setState] = useState(dragManager.getState());

  useEffect(() => {
    return dragManager.subscribe(() => setState(dragManager.getState()));
  }, []);

  return state;
}

// Hook for a drop target
export function useDroppable(
  acceptType: string | string[],
  onDrop: (item: DragItem, e: CustomEvent) => void
) {
  const [isHovered, setIsHovered] = useState(false);
  const dragState = useDragState();

  const isAcceptable = dragState.isDragging && dragState.item && 
    (Array.isArray(acceptType) ? acceptType.includes(dragState.item.type) : acceptType === dragState.item.type);

  return {
    isDroppable: isAcceptable,
    isHovered: isHovered && isAcceptable,
    droppableProps: {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
      onMouseUp: (e: React.MouseEvent) => {
        if (isAcceptable) {
          // Fake a drop event since mouseUp fires on the target
          onDrop(dragState.item!, e as any);
        }
      }
    }
  };
}
