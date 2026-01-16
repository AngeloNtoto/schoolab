import React from 'react';

export default function Header() {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="font-serif text-2xl font-extrabold tracking-tight">Schoolab <span className="text-blue-200 font-medium">Marking Board</span></div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-100">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Connecté
        </div>
      </div>
    </header>
  );
}
