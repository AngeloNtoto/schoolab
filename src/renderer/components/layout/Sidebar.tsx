import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarRange, Settings, GraduationCap, Network, StickyNote, History as HistoryIcon } from '../iconsSvg';
import { SchoolabSymbol, LogoFull } from '../ui/Logo';

interface SidebarProps {
  width: number;
  setWidth: (width: number) => void;
}

export default function Sidebar({ width, setWidth }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth >= 64 && newWidth <= 300) { // Min 64px (icon only), Max 300px
          setWidth(newWidth);
        }
      }
    },
    [isResizing, setWidth]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);
  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/network', icon: Network, label: 'Réseau' },
    { path: '/history', icon: HistoryIcon, label: 'Historique' },
    { path: '/academic-years', icon: CalendarRange, label: 'Années Académiques' },
  ];

  const isCollapsed = width < 150;

  return (
    <div
      ref={sidebarRef}
      className="bg-slate-50/50 dark:bg-slate-950 h-screen flex flex-col justify-between text-slate-600 dark:text-slate-400 relative group transition-all duration-300 border-r border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-black/20"
      style={{ width: width }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-50 group-hover:bg-slate-50 dark:group-hover:bg-slate-900/50"
        onMouseDown={startResizing}
      />

      <div className="flex flex-col gap-2 p-4">
        <div className={`flex items-center gap-3 p-3 mb-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 shadow-sm transition-all ${isCollapsed ? 'justify-center p-2 bg-transparent border-transparent shadow-none' : ''}`}>
           {isCollapsed ? (
             <SchoolabSymbol size={32} />
           ) : (
             <LogoFull size={30} variant="color" />
           )}
        </div>

        <div className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all relative group/item ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 ring-1 ring-blue-500'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <item.icon size={22} className={`shrink-0 transition-transform group-hover/item:scale-110 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover/item:text-blue-600'}`} />
                {!isCollapsed && <span className="font-bold tracking-tight truncate">{item.label}</span>}
                {isActive && !isCollapsed && (
                  <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-sm animate-pulse" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => navigate('/notes')}
            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all relative group/item ${
              location.pathname === '/notes' 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 ring-1 ring-blue-500' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title="Notes"
          >
            <StickyNote size={22} className={`shrink-0 transition-transform group-hover/item:scale-110 ${location.pathname === '/notes' ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover/item:text-blue-600'}`} />
            {!isCollapsed && <span className="font-bold tracking-tight truncate">Notes & Mémos</span>}
            {location.pathname === '/notes' && !isCollapsed && (
              <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-sm animate-pulse" />
            )}
          </button>
        </div>

        <div className="my-6 border-t border-slate-200 dark:border-slate-800 mx-2"></div>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-black/20">
         <button
            onClick={() => navigate('/settings')}
            className={`flex items-center gap-3 p-3.5 rounded-2xl w-full transition-all group/settings ${
              location.pathname === '/settings'
                ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-xl'
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-100 dark:border-transparent'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title="Paramètres"
          >
           <Settings size={22} className={`shrink-0 transition-transform group-hover/settings:rotate-90 duration-500 ${location.pathname === '/settings' ? 'text-white' : 'text-slate-500 dark:text-slate-500 group-hover/settings:text-slate-900 dark:group-hover/settings:text-white'}`} />
           {!isCollapsed && <span className="font-bold tracking-tight truncate">Paramètres</span>}
         </button>
      </div>
    </div>
  );
}
