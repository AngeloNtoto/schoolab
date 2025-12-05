/**
 * CouponSemestre.tsx
 * 
 * Coupon moyen pour un semestre (S1 ou S2).
 * Affiche P1+P2+Exam1 (S1) ou P3+P4+Exam2 (S2).
 * Conçu pour afficher 2 à 4 coupons par page A4.
 */

import React from 'react';
import { Student } from '../services/studentService';
import { ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';

export interface SchoolInfo {
  name: string;
  city: string;
  pobox: string;
}

export interface CouponSemestreProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  schoolInfo: SchoolInfo;
  academicYear: string;
  semester: 'S1' | 'S2';
}

// Configuration des semestres
const SEMESTER_CONFIG = {
  S1: {
    name: 'PREMIER SEMESTRE',
    periods: ['P1', 'P2'] as const,
    exam: 'EXAM1' as const,
    periodLabels: ['1ère P.', '2ème P.'],
    maxFields: ['max_p1', 'max_p2', 'max_exam1'] as const,
  },
  S2: {
    name: 'SECOND SEMESTRE',
    periods: ['P3', 'P4'] as const,
    exam: 'EXAM2' as const,
    periodLabels: ['3ème P.', '4ème P.'],
    maxFields: ['max_p3', 'max_p4', 'max_exam2'] as const,
  },
};

export default function CouponSemestre({
  student,
  classInfo,
  subjects,
  grades,
  schoolInfo,
  academicYear,
  semester,
}: CouponSemestreProps) {
  const config = SEMESTER_CONFIG[semester];

  // Récupère la note d'une matière pour une période donnée
  const getGrade = (subjectId: number, period: string): number | null => {
    const grade = grades.find(g => g.subject_id === subjectId && g.period === period);
    return grade ? grade.value : null;
  };

  // Récupère les maxima pour ce semestre
  const getMaxP1 = (subject: Subject): number => subject[config.maxFields[0]];
  const getMaxP2 = (subject: Subject): number => subject[config.maxFields[1]];
  const getMaxExam = (subject: Subject): number => subject[config.maxFields[2]];

  // Calcul des totaux généraux
  let totalMaxP1 = 0, totalMaxP2 = 0, totalMaxExam = 0;
  let totalObtP1 = 0, totalObtP2 = 0, totalObtExam = 0;

  subjects.forEach(subject => {
    totalMaxP1 += getMaxP1(subject);
    totalMaxP2 += getMaxP2(subject);
    totalMaxExam += getMaxExam(subject);

    const p1 = getGrade(subject.id, config.periods[0]);
    const p2 = getGrade(subject.id, config.periods[1]);
    const exam = getGrade(subject.id, config.exam);

    if (p1 !== null) totalObtP1 += p1;
    if (p2 !== null) totalObtP2 += p2;
    if (exam !== null) totalObtExam += exam;
  });

  const totalMax = totalMaxP1 + totalMaxP2 + totalMaxExam;
  const totalObtained = totalObtP1 + totalObtP2 + totalObtExam;
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0';

  return (
    <div className="bg-white border-2 border-black text-[9px] font-serif p-2 h-full">
      {/* En-tête */}
      <div className="border-b border-black pb-1 mb-1">
        <div className="flex justify-between items-start text-[8px]">
          <div>
            <div className="font-bold">{schoolInfo.name}</div>
            <div>{schoolInfo.city} - B.P. {schoolInfo.pobox}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-[11px] uppercase">{config.name}</div>
            <div>Année scolaire: {academicYear}</div>
          </div>
          <div className="text-right">
            <div className="font-bold">{classInfo.level} {classInfo.option}</div>
            <div>{classInfo.section}</div>
          </div>
        </div>
        <div className="text-center font-bold text-[10px] mt-1 border-t border-dotted border-black pt-1">
          Élève: {student.last_name} {student.post_name} {student.first_name}
        </div>
      </div>

      {/* Tableau des notes */}
      <table className="w-full border-collapse text-[8px]">
        <thead>
          <tr>
            <th className="border border-black text-left px-1 w-2/5">Branches</th>
            <th className="border border-black w-[12%]">{config.periodLabels[0]}</th>
            <th className="border border-black w-[12%]">{config.periodLabels[1]}</th>
            <th className="border border-black w-[12%]">Exam</th>
            <th className="border border-black w-[12%]">Total</th>
          </tr>
        </thead>
        <tbody>
          {/* Ligne maxima */}
          <tr className="bg-slate-100 font-bold">
            <td className="border border-black text-left px-1">MAXIMA</td>
            <td className="border border-black text-center"></td>
            <td className="border border-black text-center"></td>
            <td className="border border-black text-center"></td>
            <td className="border border-black text-center"></td>
          </tr>

          {/* Grouper les matières par maxima */}
          {(() => {
            const grouped: { [key: string]: Subject[] } = {};
            subjects.forEach(subject => {
              const key = `${getMaxP1(subject)}-${getMaxP2(subject)}-${getMaxExam(subject)}`;
              if (!grouped[key]) grouped[key] = [];
              grouped[key].push(subject);
            });

            return Object.entries(grouped).map(([key, groupSubjects]) => {
              const firstSubject = groupSubjects[0];
              const maxP1 = getMaxP1(firstSubject);
              const maxP2 = getMaxP2(firstSubject);
              const maxExam = getMaxExam(firstSubject);
              const semTotal = maxP1 + maxP2 + maxExam;

              return (
                <React.Fragment key={key}>
                  <tr className="bg-slate-50 font-semibold text-[7px]">
                    <td className="border border-black text-left px-1">Max</td>
                    <td className="border border-black text-center">{maxP1}</td>
                    <td className="border border-black text-center">{maxP2}</td>
                    <td className={`border border-black text-center ${maxExam === 0 ? 'bg-black' : ''}`}>
                      {maxExam > 0 ? maxExam : ''}
                    </td>
                    <td className="border border-black text-center">{semTotal}</td>
                  </tr>
                  {groupSubjects.map(subject => {
                    const p1 = getGrade(subject.id, config.periods[0]);
                    const p2 = getGrade(subject.id, config.periods[1]);
                    const exam = getGrade(subject.id, config.exam);
                    const total = (p1 || 0) + (p2 || 0) + (exam || 0);

                    return (
                      <tr key={subject.id}>
                        <td className="border border-black text-left px-1 truncate max-w-0">{subject.name}</td>
                        <td className="border border-black text-center">{p1 ?? ''}</td>
                        <td className="border border-black text-center">{p2 ?? ''}</td>
                        <td className={`border border-black text-center ${getMaxExam(subject) === 0 ? 'bg-black' : ''}`}>
                          {getMaxExam(subject) > 0 ? (exam ?? '') : ''}
                        </td>
                        <td className="border border-black text-center font-bold">{total || ''}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            });
          })()}
        </tbody>
        <tfoot>
          <tr className="font-bold bg-slate-200">
            <td className="border border-black text-left px-1">TOTAUX</td>
            <td className="border border-black text-center">{totalObtP1}</td>
            <td className="border border-black text-center">{totalObtP2}</td>
            <td className="border border-black text-center">{totalObtExam}</td>
            <td className="border border-black text-center">{totalObtained}</td>
          </tr>
          <tr className="font-bold">
            <td colSpan={3} className="border border-black text-right px-1">Maximum: {totalMax}</td>
            <td colSpan={2} className="border border-black text-center">Pourcentage: {percentage}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
