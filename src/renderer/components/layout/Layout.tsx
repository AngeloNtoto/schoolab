import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarWidth, setSidebarWidth] = useState(250);

  return (
    <div className="flex bg-white h-screen overflow-hidden">
      <Sidebar width={sidebarWidth} setWidth={setSidebarWidth} />
      <main className="flex-1 flex flex-col min-w-0 relative">
        <Outlet />
      </main>
    </div>
  );
}
