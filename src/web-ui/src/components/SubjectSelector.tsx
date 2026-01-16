import React from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Class, Subject } from '../types';

interface SubjectSelectorProps {
  selectedClass: Class;
  subjects: Subject[];
  isLoading: boolean;
  onSelect: (sub: Subject) => void;
  onBack: () => void;
}

export default function SubjectSelector({ selectedClass, subjects, isLoading, onSelect, onBack }: SubjectSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{selectedClass.name} - Matières</h1>
      </div>
      {isLoading ? (
        <div className="flex items-center gap-3 text-blue-600 font-medium py-10">
          <Loader2 className="animate-spin" /> Chargement des matières...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => onSelect(sub)}
              className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-white group-hover:text-blue-600 transition-colors font-bold text-lg w-10 h-10 flex items-center justify-center">
                  {sub.name.charAt(0)}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{sub.name}</div>
                  <div className="text-xs text-slate-500 font-medium uppercase">{sub.code}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
