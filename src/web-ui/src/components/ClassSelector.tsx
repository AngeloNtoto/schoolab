import React from 'react';
import { Class } from '../types';

interface ClassSelectorProps {
  classes: Class[];
  onSelect: (cls: Class) => void;
}

export default function ClassSelector({ classes, onSelect }: ClassSelectorProps) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Sélectionnez une classe</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => (
          <button
            key={cls.id}
            onClick={() => onSelect(cls)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left group"
          >
            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <span className="text-xl font-black text-blue-600">{cls.name.charAt(0)}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">{cls.name}</h3>
            <p className="text-slate-500 font-medium">{cls.level} • {cls.option} {cls.section}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
