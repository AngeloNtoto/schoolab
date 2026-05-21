import React, { useState, useRef } from 'react';
import { ArrowLeft, Printer, StickyNote } from '../iconsSvg';
import CouponContent, { SchoolInfo } from './CouponContent';
import ContextMenu from '../ui/ContextMenu';
import AddNoteModal from '../class/AddNoteModal';
import { useToast } from '../../context/ToastContext';

// Système d'impression
import PrintButton from './PrintWrapper';

// Services
import { Student } from '../../services/studentService';
import { ClassData, Subject } from '../../services/classService';
import { Grade } from '../../services/gradeService';
import { StudentRanks } from '../../services/bulletinService';

interface CouponEleveProps {
  student: Student;
  classInfo: ClassData;
  subjects: Subject[];
  grades: Grade[];
  schoolInfo: SchoolInfo;
  academicYear: string;
  ranks?: StudentRanks;
  totalStudents: number;
  onClose: () => void;
}

export default function CouponEleve({
  student,
  classInfo,
  subjects,
  grades,
  schoolInfo,
  academicYear,
  ranks,
  totalStudents,
  onClose
}: CouponEleveProps) {
  const toast = useToast();

  // Réf pour l'impression isolée
  const couponRef = useRef<HTMLDivElement>(null);

  // Context Menu & Modals
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);

  // Configuration CSS pour l'impression
  const printCss = `
    @page { 
      size: A4; 
      margin: 10mm; 
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body { 
      background: white; 
      margin: 0; 
      padding: 0; 
      font-size: 10px;
    }
    table {
      font-size: 9px !important;
    }
    html, body {
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
    }
    .print-target {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
    }
  `;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <div 
      className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white fixed inset-0 z-[60] overflow-y-auto"
      onContextMenu={handleContextMenu}
    >
      {/* Barre de navigation (Masquée à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border shadow-sm transition-colors"
        >
          <ArrowLeft size={20} />
          Retour à la classe
        </button>

        <PrintButton
          targetRef={couponRef}
          title={`Coupon_${student.last_name}_${student.first_name}`}
          extraCss={printCss}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all font-medium"
        >
          <Printer size={20} />
          Imprimer le coupon
        </PrintButton>
      </div>

      {/* Zone du coupon isolée pour l'impression */}
      <div className="flex justify-center">
        <div ref={couponRef} className="print-target bg-white shadow-xl">
          <CouponContent
            student={student}
            classInfo={classInfo}
            subjects={subjects}
            grades={grades}
            schoolInfo={schoolInfo}
            academicYear={academicYear}
            ranks={ranks}
            totalStudents={totalStudents}
          />
        </div>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            {
              label: 'Ajouter une note',
              icon: <StickyNote size={18} />,
              onClick: () => setShowAddNoteModal(true)
            },
            { divider: true },
            {
              label: 'Imprimer (Standard)',
              icon: <Printer size={18} />,
              onClick: () => {
                setContextMenu(null);
                window.print(); 
              }
            }
          ]}
        />
      )}

      {showAddNoteModal && student && (
        <AddNoteModal
            onClose={() => setShowAddNoteModal(false)}
            onSuccess={() => {
                setShowAddNoteModal(false);
                toast.success('Note ajoutée à l\'élève');
            }}
            initialTargetType="student"
            initialTargetId={student.id}
        />
      )}
    </div>
  );
}