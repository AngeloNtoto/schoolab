/**
 * CouponPeriode.tsx
 * 
 * Coupon compact pour une seule période (P1, P2, P3, P4).
 * Conçu pour afficher 4 à 6 coupons par page A4.
 */

import React from 'react';
import { Student } from '../services/studentService';
import { ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';
import { StudentRanks } from '../services/bulletinService';

export interface SchoolInfo {
  name: string;
  city: string;
  pobox: string;
}

export interface CouponPeriodeProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  schoolInfo: SchoolInfo;
  academicYear: string;
  period: 'P1' | 'P2' | 'P3' | 'P4';
  ranks?: StudentRanks;
  totalStudents?: number;
}

// Mapping des noms de périodes
const PERIOD_NAMES: Record<string, string> = {
  P1: '1ère Période',
  P2: '2ème Période',
  P3: '3ème Période',
  P4: '4ème Période',
};

export default function CouponPeriode({
  student,
  classInfo,
  subjects,
  grades,
  schoolInfo,
  academicYear,
  period,
  ranks,
  totalStudents
}: CouponPeriodeProps) {

  // Récupère la note d'une matière pour la période
  const getGrade = (subjectId: number): number | null => {
    const grade = grades.find(g => g.subject_id === subjectId && g.period === period);
    return grade ? grade.value : null;
  };

  // Récupère le maximum pour cette période
  const getMax = (subject: Subject): number => {
    switch (period) {
      case 'P1': return subject.max_p1;
      case 'P2': return subject.max_p2;
      case 'P3': return subject.max_p3;
      case 'P4': return subject.max_p4;
      default: return 0;
    }
  };

  // Calcul des totaux
  const totalMax = subjects.reduce((sum, s) => sum + getMax(s), 0);
  const totalObtained = subjects.reduce((sum, s) => sum + (getGrade(s.id) || 0), 0);
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white border border-black text-[9px] font-serif p-2 h-full">
      {/* En-tête compact */}
      <div className="border-b border-black pb-1 mb-1">
        <div className="flex justify-between items-start">
          <div className="text-[8px]">
            <div className="font-bold">{schoolInfo.name}</div>
            <div>{schoolInfo.city}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-[10px] uppercase">{PERIOD_NAMES[period]}</div>
            <div className="text-[8px]">{academicYear}</div>
          </div>
          <div className="text-[8px] text-right">
            <div className="font-bold">{classInfo.level} {classInfo.option}</div>
            <div>{classInfo.section}</div>
          </div>
        </div>
        <div className="text-center font-bold mt-1 border-t border-dotted border-black pt-1">
          {student.last_name} {student.post_name} {student.first_name}
        </div>
      </div>

      {/* Tableau des notes compact */}
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr>
            <th className="border border-black text-left px-1 w-3/5">Branche</th>
            <th className="border border-black w-1/5">Max</th>
            <th className="border border-black w-1/5">Note</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map(subject => {
            const max = getMax(subject);
            const note = getGrade(subject.id);
            return (
              <tr key={subject.id}>
                <td className="border border-black text-left px-1 truncate max-w-0">{subject.name}</td>
                <td className="border border-black text-center">{max}</td>
                <td className="border border-black text-center font-bold">{note ?? ''}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-slate-100">
            <td className="border border-black text-left px-1">TOTAL</td>
            <td className="border border-black text-center">{totalMax}</td>
            <td className="border border-black text-center">{totalObtained}</td>
          </tr>
          <tr className="font-bold italic">
            <td className="border border-black text-left px-1">POURCENTAGE</td>
            <td colSpan={2} className="border border-black text-center">{percentage}%</td>
          </tr>
          <tr className='font-bold italic'>
            <td className="border border-black text-left px-1">PLACE</td>
            <td colSpan={2} className="border border-black text-center">{ranks?.[period.toLowerCase() as keyof StudentRanks] || ''} / {totalStudents || '?'}</td>
          </tr>
          <tr className="font-bold italic">
            <td className="border border-black text-left px-1">CONDUITE</td>
            <td colSpan={2} className="border border-black text-center">{student[`conduite_${period.toLowerCase()}` as keyof Student] || ''}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
