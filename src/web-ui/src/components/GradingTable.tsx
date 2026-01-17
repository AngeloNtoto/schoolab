import React, { useState } from 'react';
import { ChevronLeft, CheckCircle2 } from './iconsSvg';
import { Class, Subject, Student, Grade } from '../types';

interface GradingTableProps {
  selectedClass: Class;
  selectedSubject: Subject;
  period: string;
  setPeriod: (period: string) => void;
  students: Student[];
  grades: Grade[];
  isPeriodDisabled: boolean;
  currentMax: number;
  onGradeChange: (studentId: number, subjectId: number, value: number) => void;
  onBack: () => void;
  statusMessage: { text: string; type: 'info' | 'error' | 'success' } | null;
}

export default function GradingTable({
  selectedClass,
  selectedSubject,
  period,
  setPeriod,
  students,
  grades,
  isPeriodDisabled,
  currentMax,
  onGradeChange,
  onBack,
  statusMessage
}: GradingTableProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{selectedSubject.name}</h1>
            <p className="text-slate-500 text-sm">
              {selectedClass.name} • Max {period.toUpperCase()} : {isPeriodDisabled ? 'N/A' : currentMax}
            </p>
          </div>
        </div>

        {/* Sélecteur de Période (incluant les Examens) */}
        <div className="flex bg-slate-200 p-1 rounded-xl overflow-x-auto max-w-full">
          {['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Élève</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                Points / {isPeriodDisabled ? 'N/A' : currentMax}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map(student => {
              const grade = grades.find((g: Grade) => g.student_id === student.id && g.subject_id === selectedSubject.id && g.period === period);
              return (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {student.last_name} {student.post_name} {student.first_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input
                      type="number"
                      min="0"
                      max={currentMax}
                      step="0.5"
                      value={grade?.value ?? ''}
                      disabled={isPeriodDisabled}
                      onChange={(e) => onGradeChange(student.id, selectedSubject.id, parseFloat(e.target.value) || 0)}
                      className={`w-24 p-2 text-right border-none rounded-lg font-bold outline-none transition-all ${
                        isPeriodDisabled 
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                          : 'bg-slate-100 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white'
                      }`}
                      placeholder={isPeriodDisabled ? "N/A" : "-"}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center pt-4">
          {statusMessage && (
            <div className={`text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full border ${
              statusMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
              statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' :
              'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              {statusMessage.type === 'error' ? '⚠️' : '✅'} {statusMessage.text}
            </div>
          )}
          <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 px-4 py-2 rounded-full border border-green-100 ml-auto">
            <CheckCircle2 size={16} /> Enregistrement automatique activé
          </div>
      </div>
    </div>
  );
}
