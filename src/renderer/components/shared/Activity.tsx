import React from 'react';

interface ActivityProps {
  mode: 'visible' | 'hidden';
  children: React.ReactNode;
}

/**
 * Activity component used to keep components mounted but hidden/visible
 * based on the mode. This is useful for maintaining state in modals
 * and complex views without re-mounting them.
 */
export default function Activity({ mode, children }: ActivityProps) {
  return (
    <div 
      style={{ 
        display: mode === 'visible' ? 'contents' : 'none',
        visibility: mode === 'visible' ? 'visible' : 'hidden',
        pointerEvents: mode === 'visible' ? 'auto' : 'none'
      }}
    >
      {children}
    </div>
  );
}
