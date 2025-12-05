/**
 * PrintLayout.tsx
 * 
 * Composant de mise en page pour l'impression multi-coupons.
 * Gère l'arrangement en grille (1, 2, 4, ou 6 coupons par page)
 * et les sauts de page automatiques.
 */

import React from 'react';
import { Student } from '../services/studentService';
import { ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';
import CouponPeriode, { SchoolInfo } from './CouponPeriode';
import CouponSemestre from './CouponSemestre';
import CouponContent from './CouponContent';
import { PeriodType } from './BatchPrintModal';

export interface PrintLayoutProps {
  students: Student[];
  classInfo: ClassData;
  subjects: Subject[];
  allGrades: Grade[];
  schoolInfo: SchoolInfo;
  academicYear: string;
  period: PeriodType;
  couponsPerPage: 1 | 2 | 4 | 6;
}

// Configuration des grilles selon le nombre de coupons par page
const GRID_CONFIG = {
  1: 'grid-cols-1 gap-0',
  2: 'grid-cols-1 gap-4',
  4: 'grid-cols-2 gap-3',
  6: 'grid-cols-2 gap-2',
};

// Hauteurs des coupons en fonction du nombre par page (en mm pour A4)
const COUPON_HEIGHT_CLASS = {
  1: 'min-h-[297mm]',
  2: 'min-h-[140mm]',
  4: 'min-h-[135mm]',
  6: 'min-h-[90mm]',
};

export default function PrintLayout({
  students,
  classInfo,
  subjects,
  allGrades,
  schoolInfo,
  academicYear,
  period,
  couponsPerPage,
}: PrintLayoutProps) {
  // Diviser les élèves en pages
  const pages: Student[][] = [];
  for (let i = 0; i < students.length; i += couponsPerPage) {
    pages.push(students.slice(i, i + couponsPerPage));
  }

  // Rendu d'un coupon selon la période
  const renderCoupon = (student: Student) => {
    const studentGrades = allGrades.filter(g => g.student_id === student.id);

    // Période unique (P1, P2, P3, P4)
    if (['P1', 'P2', 'P3', 'P4'].includes(period)) {
      return (
        <CouponPeriode
          student={student}
          classInfo={classInfo}
          subjects={subjects}
          grades={studentGrades}
          schoolInfo={schoolInfo}
          academicYear={academicYear}
          period={period as 'P1' | 'P2' | 'P3' | 'P4'}
        />
      );
    }

    // Semestre (S1, S2)
    if (period === 'S1' || period === 'S2') {
      return (
        <CouponSemestre
          student={student}
          classInfo={classInfo}
          subjects={subjects}
          grades={studentGrades}
          schoolInfo={schoolInfo}
          academicYear={academicYear}
          semester={period}
        />
      );
    }

    // Année complète
    return (
      <CouponContent
        student={student}
        classInfo={classInfo}
        subjects={subjects}
        grades={studentGrades}
        schoolInfo={schoolInfo}
        academicYear={academicYear}
      />
    );
  };

  return (
    <div className="print-layout">
      {pages.map((pageStudents, pageIndex) => (
        <div
          key={pageIndex}
          className={`
            page-container
            w-[210mm] min-h-[297mm]
            mx-auto bg-white
            p-4 print:p-2
            ${pageIndex > 0 ? 'page-break-before' : ''}
          `}
        >
          <div className={`grid ${GRID_CONFIG[couponsPerPage]} h-full`}>
            {pageStudents.map((student) => (
              <div
                key={student.id}
                className={`coupon-wrapper ${COUPON_HEIGHT_CLASS[couponsPerPage]} overflow-hidden`}
              >
                {renderCoupon(student)}
              </div>
            ))}

            {/* Remplissage pour les pages incomplètes */}
            {pageStudents.length < couponsPerPage &&
              Array(couponsPerPage - pageStudents.length)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className={`${COUPON_HEIGHT_CLASS[couponsPerPage]} border border-dashed border-slate-200 print:border-transparent`}
                  />
                ))}
          </div>
        </div>
      ))}

      <style>{`
        @media print {
          .page-break-before {
            page-break-before: always;
          }
          .page-container {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 5mm !important;
          }
          .coupon-wrapper {
            break-inside: avoid;
          }
        }
        
        @media screen {
          .page-container {
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
          }
        }
      `}</style>
    </div>
  );
}
