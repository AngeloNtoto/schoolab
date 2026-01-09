import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarRange, Settings, GraduationCap, Network, StickyNote } from 'lucide-react';

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
    { path: '/academic-years', icon: CalendarRange, label: 'Années Académiques' },
  ];

  const isCollapsed = width < 150;

  return (
    <div
      ref={sidebarRef}
      className="bg-slate-900 h-screen flex flex-col justify-between text-slate-300 relative group transition-all duration-75 border-r-2 border-slate-700"
      style={{ width: width }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-50"
        onMouseDown={startResizing}
      />

      <div className="flex flex-col gap-2 p-2">
        <div className={`flex items-center gap-3 p-3 mb-4 rounded-lg ${isCollapsed ? 'justify-center' : ''}`}>
           <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0">
             <GraduationCap size={20} />
           </div>
           {!isCollapsed && <span className="font-bold text-white tracking-wide truncate">Schoolab Admin</span>}
        </div>

        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              location.pathname === item.path
                ? 'bg-blue-600/20 text-white border-l-4 border-blue-500'
                : 'hover:bg-slate-800 hover:text-white'
            } ${isCollapsed ? 'justify-center' : ''}`}
            title={isCollapsed ? item.label : ''}
          >
            <item.icon size={22} className="shrink-0" />
            {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
          </button>
        ))}


        <button
          onClick={() => navigate('/notes')}
          className={`flex items-center gap-3 p-3 rounded-lg w-full transition-all hover:bg-slate-800 hover:text-white ${location.pathname === '/notes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400'} ${isCollapsed ? 'justify-center' : ''}`}
          title="Notes"
        >
          <StickyNote size={20} className={`shrink-0 ${location.pathname === '/notes' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
          {!isCollapsed && <span className="font-medium truncate">Notes</span>}
        </button>

        <div className="my-4 border-t border-slate-800 mx-2"></div>
      </div>

      <div className="p-2 border-t border-slate-800">
         <button
            onClick={() => navigate('/settings')}
            className={`flex items-center gap-3 p-3 rounded-lg w-full transition-all hover:bg-slate-800 hover:text-white ${isCollapsed ? 'justify-center' : ''}`}
            title="Paramètres"
          >
           <Settings size={22} className="shrink-0" />
           {!isCollapsed && <span className="font-medium truncate">Paramètres</span>}
         </button>
      </div>
    </div>
  );
}
