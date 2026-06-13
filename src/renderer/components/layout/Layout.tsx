import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  const location = useLocation();
  const isSettings = location.pathname === '/settings';

  return (
    <div className="flex bg-white h-screen overflow-hidden">
      {!isSettings && <Sidebar />}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <Outlet />
      </main>
    </div>
  );
}
