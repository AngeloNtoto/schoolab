import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Printer, Settings2 } from 'lucide-react';
import { SchoolInfo } from './CouponContent';
import BatchPrintModal, { PrintConfig, PeriodType } from './BatchPrintModal';
import PrintLayout from './PrintLayout';

// Système d'impression
import PrintButton from './PrintWrapper';

// Services
import { Student } from '../../services/studentService';
import { ClassData, Subject } from '../../services/classService';
import { Grade } from '../../services/gradeService';
import { bulletinService, StudentRanks } from '../../services/bulletinService';

// Noms des périodes pour affichage
const PERIOD_LABELS: Record<PeriodType, string> = {
  P1: 'Période 1',
  P2: 'Période 2',
  P3: 'Période 3',
  P4: 'Période 4',
  S1: 'Semestre 1',
  S2: 'Semestre 2',
  YEAR: 'Année complète',
};

interface ClassCouponsProps {
  classInfo: ClassData;
  students: Student[];
  subjects: Subject[];
  allGrades: Grade[];
  schoolInfo: SchoolInfo;
  academicYear: string;
  onClose: () => void;
}

export default function ClassCoupons({
  classInfo,
  students,
  subjects,
  allGrades,
  schoolInfo,
  academicYear,
  onClose
}: ClassCouponsProps) {
  // Réf pour capturer la zone d'impression
  const printAreaRef = useRef<HTMLDivElement>(null);

  // État pour différer le rendu lourd
  const [isReady, setIsReady] = useState(false);

  // États pour la configuration d'impression
  const [showModal, setShowModal] = useState(false);
  const [printConfig, setPrintConfig] = useState<PrintConfig | null>(null);

  // Attendre que l'animation du modal se termine
  React.useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 350);
    return () => clearTimeout(timer);
  }, []);

  // Calcul synchrone des rangs pour tous les élèves
  const { classRanks, totalStudents } = useMemo(() => {
    const ranksMap: Record<number, StudentRanks> = {};
    if (!students.length || !isReady) return { classRanks: ranksMap, totalStudents: 0 };

    students.forEach(student => {
      const { ranks } = bulletinService.computeStudentRanks(students, allGrades, student.id);
      ranksMap[student.id] = ranks;
    });

    return { classRanks: ranksMap, totalStudents: students.length };
  }, [students, allGrades, isReady]);

  // Configuration CSS pour l'impression
  const printCss = `
    @page { 
      size: A4; 
      margin: 5mm; 
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body { 
      background: white; 
      font-size: 10px;
    }
    table {
      font-size: 9px !important;
    }
    .coupon-card, [class*="coupon"] {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .print-container-reset {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `;

  const handlePrintConfig = (config: PrintConfig) => {
    setPrintConfig(config);
    setShowModal(false);
  };

  const selectedStudents = printConfig
    ? students.filter(s => printConfig.selectedStudentIds.includes(s.id))
    : students;

  const className = `${classInfo.level} ${classInfo.option} ${classInfo.section}`;

  return (
    <div className="bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Barre de contrôle (Masquée à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 print:hidden">
        <div className="bg-white rounded-xl shadow-sm p-4 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={onClose} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm">
                <ArrowLeft size={20} />
                Retour à la classe
              </button>
              <div>
                <h1 className="font-bold text-slate-900">{className}</h1>
                <p className="text-sm text-slate-500">Impression des coupons</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            {printConfig ? (
              <>
                <div className="flex items-center gap-6 text-sm">
                  <span className="bg-white px-2 py-1 rounded border font-medium text-blue-700">
                    {PERIOD_LABELS[printConfig.period]}
                  </span>
                  <span className="text-slate-600">
                    <span className="font-bold text-slate-900">{selectedStudents.length}</span> élèves
                  </span>
                  <span className="text-slate-600">
                    <span className="font-bold text-slate-900">{printConfig.couponsPerPage}</span> / page
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrintConfig(null)}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors border"
                  >
                    Modifier
                  </button>
                  
                  <PrintButton
                    targetRef={printAreaRef}
                    title={`Coupons_${className}_${printConfig.period}`}
                    extraCss={printCss}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-all"
                  >
                    <Printer size={16} />
                    Imprimer Tout
                  </PrintButton>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm text-slate-500 italic">
                  Aucune configuration sélectionnée
                </span>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-all shadow-sm"
                >
                  <Settings2 size={16} />
                  Configurer l'impression
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Zone d'impression réelle */}
      <div className="flex justify-center">
        {!isReady ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-xs uppercase tracking-widest">Préparation des données...</p>
          </div>
        ) : printConfig ? (
          <div ref={printAreaRef} className="print-container-reset bg-white shadow-xl">
            <PrintLayout
              students={selectedStudents}
              classInfo={classInfo}
              subjects={subjects}
              allGrades={allGrades}
              schoolInfo={schoolInfo}
              academicYear={academicYear}
              period={printConfig.period}
              couponsPerPage={printConfig.couponsPerPage}
              classRanks={classRanks}
              totalStudents={totalStudents}
             />
          </div>
        ) : (
          <div className="max-w-[210mm] w-full mx-auto">
            <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200 shadow-sm">
              <Settings2 size={48} className="mx-auto mb-4 text-slate-300" />
              <h2 className="text-lg font-medium text-slate-700">Prêt pour l'impression des coupons</h2>
              <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                Choisissez la période et le nombre de coupons par feuille pour générer l'aperçu.
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md font-medium"
              >
                <Settings2 size={18} />
                Lancer la configuration
              </button>
            </div>
          </div>
        )}
      </div>

      <BatchPrintModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        students={students}
        onConfirm={handlePrintConfig}
        className={className}
      />
    </div>
  );
}