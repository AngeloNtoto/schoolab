import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  initialLeftWidth?: number; // in pixels, or percentage if handled
  minLeftWidth?: number;
  minRightWidth?: number;
  showRight?: boolean;
}

export default function SplitView({
  left,
  right,
  initialLeftWidth = 800,
  minLeftWidth = 300,
  minRightWidth = 300,
  showRight = true
}: SplitViewProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Restore sizes from local storage if needed (Phase 3 requirement)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('schoolab_workbench_splitwidth');
      if (saved) {
        setLeftWidth(parseInt(saved, 10));
      }
    } catch(e) {}
  }, []);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      localStorage.setItem('schoolab_workbench_splitwidth', leftWidth.toString());
    }
  }, [isResizing, leftWidth]);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        let newWidth = mouseMoveEvent.clientX - containerRect.left;
        
        if (newWidth < minLeftWidth) newWidth = minLeftWidth;
        if (containerRect.width - newWidth < minRightWidth) {
          newWidth = containerRect.width - minRightWidth;
        }
        
        setLeftWidth(newWidth);
      }
    },
    [isResizing, minLeftWidth, minRightWidth]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  if (!showRight) {
    return <div className="flex-1 w-full h-full relative flex">{left}</div>;
  }

  return (
    <div ref={containerRef} className="flex flex-1 w-full h-full relative overflow-hidden">
      {/* Gauche */}
      <div style={{ width: leftWidth }} className="flex-shrink-0 flex flex-col h-full relative">
        {left}
      </div>

      {/* Resizer */}
      <div
        className="w-1 cursor-col-resize bg-slate-200 hover:bg-blue-500 hover:w-1.5 transition-all z-40 group flex-shrink-0 relative"
        onMouseDown={startResizing}
      >
        {isResizing && <div className="absolute inset-y-0 -left-10 -right-10 z-50 cursor-col-resize" />}
      </div>

      {/* Droite */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 min-w-0 relative border-l border-slate-200 shadow-inner">
        {right}
      </div>
    </div>
  );
}
