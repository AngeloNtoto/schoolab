import React from 'react';

interface StudentTooltipProps {
  student: {
    id: number;
    first_name: string;
    last_name: string;
    post_name: string;
    gender: string;
    birth_date: string;
    birthplace: string;
  };
  stats?: {
    sem1Total: number | null;
    sem2Total: number | null;
    yearTotal: number | null;
    rank?: number;
  };
}

export default function StudentTooltip({ student, stats }: StudentTooltipProps) {
  return (
    <div className="absolute z-50 bg-slate-900 text-white rounded-lg shadow-2xl p-4 min-w-[280px] -translate-y-full -mt-2 left-0 pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="space-y-2">
        <div className="border-b border-slate-700 pb-2">
          <h3 className="font-bold text-lg">{student.last_name} {student.post_name}</h3>
          <p className="text-sm text-slate-300">{student.first_name}</p>
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Sexe:</span>
            <span>{student.gender === 'M' ? 'Masculin' : 'Féminin'}</span>
          </div>
          {student.birthplace && (
            <div className="flex justify-between">
              <span className="text-slate-400">Lieu naiss.:</span>
              <span>{student.birthplace}</span>
            </div>
          )}
          {student.birth_date && (
            <div className="flex justify-between">
              <span className="text-slate-400">Date naiss.:</span>
              <span>{new Date(student.birth_date).toLocaleDateString('fr-FR')}</span>
            </div>
          )}
        </div>

        {stats && (
          <>
            <div className="border-t border-slate-700 pt-2 mt-2">
              <p className="text-xs text-slate-400 mb-2">Résultats</p>
              <div className="space-y-1 text-sm">
                {stats.sem1Total !== null && (
                  <div className="flex justify-between">
                    <span className="text-blue-300">Semestre 1:</span>
                    <span className="font-semibold">{stats.sem1Total.toFixed(1)}</span>
                  </div>
                )}
                {stats.sem2Total !== null && (
                  <div className="flex justify-between">
                    <span className="text-green-300">Semestre 2:</span>
                    <span className="font-semibold">{stats.sem2Total.toFixed(1)}</span>
                  </div>
                )}
                {stats.yearTotal !== null && (
                  <div className="flex justify-between border-t border-slate-700 pt-1 mt-1">
                    <span className="text-yellow-300">Total année:</span>
                    <span className="font-bold text-lg">{stats.yearTotal.toFixed(1)}</span>
                  </div>
                )}
                {stats.rank && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rang:</span>
                    <span className="font-semibold">{stats.rank}e</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {/* Arrow pointing down */}
      <div className="absolute bottom-0 left-4 translate-y-full">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-slate-900"></div>
      </div>
    </div>
  );
}
