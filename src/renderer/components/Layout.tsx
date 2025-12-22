import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const [sidebarWidth, setSidebarWidth] = useState(250);

  return (
    <div className="flex bg-white min-h-screen">
      <Sidebar width={sidebarWidth} setWidth={setSidebarWidth} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
         <div className="flex-1 overflow-auto">
            <Outlet />
         </div>
      </div>
    </div>
  );
}
