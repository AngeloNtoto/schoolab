import React, { useState, useRef, useEffect } from 'react';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ({
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
    divider?: never;
  } | {
    divider: true;
    label?: never;
    icon?: never;
    onClick?: never;
    danger?: never;
  })[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-2xl border border-slate-200 py-2 min-w-[200px] z-50 animate-in fade-in slide-in-from-top-2 duration-150"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {'divider' in item && item.divider ? (
            <div className="my-2 border-t border-slate-200" />
          ) : (
            <button
              onClick={() => {
                if ('onClick' in item) {
                  item.onClick();
                  onClose();
                }
              }}
              className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                'danger' in item && item.danger
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {'icon' in item && item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              {'label' in item && <span className="font-medium">{item.label}</span>}
            </button>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
