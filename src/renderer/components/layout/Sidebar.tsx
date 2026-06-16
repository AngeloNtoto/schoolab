import React from 'react';
import { useLocation } from 'react-router-dom';
import { useWorkbench } from '../../workbench/WorkbenchProvider';
import { LayoutDashboard, CalendarRange, Settings, GraduationCap, Network, StickyNote, FileSpreadsheet } from '../iconsSvg';
import { SchoolabSymbol } from '../ui/Logo';

interface ActivityBarProps {
  activeView: string | null;
  onToggleView: (view: string) => void;
}

export default function ActivityBar({ activeView, onToggleView }: ActivityBarProps) {
  const location = useLocation();
  const { executeCommand } = useWorkbench();

  const navItems = [
    { path: '/network', commandId: 'schoolab.openNetwork', icon: Network, label: 'Réseau' },
    { path: '/academic-years', commandId: 'schoolab.openAcademicYears', icon: CalendarRange, label: 'Années Scolaires' },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-950 w-14 h-screen flex flex-col justify-between items-center py-4 border-r border-slate-200 dark:border-slate-800 shrink-0 z-50 shadow-sm">
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="mb-4">
          <SchoolabSymbol size={28} />
        </div>

        <div className="flex flex-col gap-2 w-full px-2">
          {/* Explorer View Toggle */}
          <button
            onClick={() => onToggleView('explorer')}
            className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all relative group/item ${
              activeView === 'explorer'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Explorateur de classes"
          >
            <FileSpreadsheet size={20} className={`shrink-0 transition-transform group-hover/item:scale-110`} />
            {activeView === 'explorer' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
            )}
          </button>

          <div className="my-2 border-t border-slate-200 dark:border-slate-800 mx-2"></div>

          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => executeCommand(item.commandId)}
                className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all relative group/item ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={item.label}
              >
                <item.icon size={20} className={`shrink-0 transition-transform group-hover/item:scale-110`} />
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
                )}
              </button>
            );
          })}

          <button
            onClick={() => executeCommand('schoolab.openNotes')}
            className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all relative group/item ${
              location.pathname === '/notes'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Notes & Mémos"
          >
            <StickyNote size={20} className={`shrink-0 transition-transform group-hover/item:scale-110`} />
            {location.pathname === '/notes' && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 w-full px-2">
         <button
            onClick={() => executeCommand('schoolab.openSettings')}
            className={`w-10 h-10 mx-auto flex items-center justify-center rounded-xl transition-all group/settings ${
              location.pathname === '/settings'
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
            title="Paramètres"
          >
           <Settings size={20} className={`shrink-0 transition-transform group-hover/settings:rotate-90 duration-500`} />
           {location.pathname === '/settings' && (
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-slate-600 rounded-r-full" />
           )}
         </button>
      </div>
    </div>
  );
}
