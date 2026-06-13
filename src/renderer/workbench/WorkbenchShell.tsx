import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TabBar from './TabBar';

export default function WorkbenchShell() {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const location = useLocation();
  const isSettings = location.pathname === '/settings';

  return (
    <div className="flex bg-white h-screen overflow-hidden">
      {!isSettings && <Sidebar width={sidebarWidth} setWidth={setSidebarWidth} />}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <TabBar />
        <div className="flex-1 overflow-auto relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
