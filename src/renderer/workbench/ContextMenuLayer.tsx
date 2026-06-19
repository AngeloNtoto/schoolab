import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWorkbench } from './WorkbenchProvider';

export interface MenuItem {
  label: string;
  commandId?: string; // Si fourni, exécute la commande correspondante
  action?: () => void; // Si fourni, exécute cette fonction
  danger?: boolean; // Affiche en rouge
  separator?: boolean; // Ligne de séparation
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: MenuItem[];
  contextData?: any; // Données passées à la commande
}

interface ContextMenuContextType {
  showContextMenu: (e: React.MouseEvent, items: MenuItem[], contextData?: any) => void;
  hideContextMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [menuState, setMenuState] = useState<ContextMenuState | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const { executeCommand } = useWorkbench();

  const showContextMenu = (e: React.MouseEvent, items: MenuItem[], contextData?: any) => {
    e.preventDefault();
    e.stopPropagation();
    
    let x = e.clientX;
    let y = e.clientY;
    
    const menuWidth = 240;
    const menuHeight = items.reduce((h, item) => h + (item.separator ? 9 : 36), 8);
    
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8;
    if (x < 8) x = 8;
    if (y < 8) y = 8;
    
    setMenuPosition({ x, y });
    setMenuState({ x, y, items, contextData });
  };

  const hideContextMenu = () => {
    setMenuState(null);
  };

  useLayoutEffect(() => {
    if (!menuState || !menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const margin = 8;
    let x = menuPosition.x;
    let y = menuPosition.y;

    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);

    if (x > maxX) x = maxX;
    if (y > maxY) y = maxY;
    if (x < margin) x = margin;
    if (y < margin) y = margin;

    if (x !== menuPosition.x || y !== menuPosition.y) {
      setMenuPosition({ x, y });
    }
  }, [menuState, menuPosition.x, menuPosition.y]);

  useEffect(() => {
    const handleClick = () => hideContextMenu();
    const handleScroll = () => hideContextMenu();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      
      {menuState && (
        <div 
          ref={menuRef}
          className="fixed z-[9999] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-md py-1 min-w-[200px] text-sm animate-in fade-in zoom-in-95 duration-100"
          style={{ top: menuPosition.y, left: menuPosition.x }}
          onContextMenu={(e) => e.preventDefault()} // Prevent native menu on our menu
        >
          {menuState.items.map((item, index) => {
            if (item.separator) {
              return <div key={index} className="h-px bg-slate-200 dark:bg-slate-700 my-1" />;
            }
            
            return (
              <button
                key={index}
                className={`w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                  item.danger ? 'text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-700 dark:text-slate-200'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  hideContextMenu();
                  if (item.action) {
                    item.action();
                  } else if (item.commandId) {
                    executeCommand(item.commandId, menuState.contextData);
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
}

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (context === undefined) {
    throw new Error('useContextMenu doit être utilisé à l\'intérieur d\'un ContextMenuProvider');
  }
  return context;
}
