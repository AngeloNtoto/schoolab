import React from 'react';
import { useWorkbench } from './WorkbenchProvider';

export default function TabBar() {
  const { tabs, activeTabId, setActiveTab, closeTab } = useWorkbench();

  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center overflow-x-auto bg-slate-100 border-b border-slate-200 hide-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              group relative flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] border-r border-slate-200 cursor-pointer select-none transition-colors
              ${isActive ? 'bg-white text-blue-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
            `}
          >
            {/* Active top border indicator */}
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-600" />
            )}
            
            <span className="truncate text-sm font-medium flex-1" title={tab.title}>
              {tab.title}
            </span>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              className={`
                p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity
                ${isActive ? 'hover:bg-blue-100 text-blue-400 hover:text-blue-700' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-700'}
              `}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
