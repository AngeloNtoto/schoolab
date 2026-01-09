/**
 * CouponEleve.tsx
 * * Composant "Smart" qui charge les données pour un seul élève
 * et délègue l'affichage à CouponContent.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, StickyNote } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import CouponContent, { SchoolInfo } from './CouponContent';
import ContextMenu from './ContextMenu';
import AddNoteModal from './AddNoteModal';
import { useToast } from '../context/ToastContext';

// Système d'impression
import PrintButton from './PrintWrapper';

// Services
import { studentService, Student } from '../services/studentService';
import { classService, ClassData, Subject } from '../services/classService';
import { gradeService, Grade } from '../services/gradeService';
import { bulletinService, StudentRanks } from '../services/bulletinService';

// Types
interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: number;
}

export default function CouponEleve() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // Réf pour l'impression isolée
  const couponRef = useRef<HTMLDivElement>(null);

  // États pour les données
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({ name: '', city: '', pobox: '' });
  const [academicYear, setAcademicYear] = useState<string>('');
  const [ranks, setRanks] = useState<StudentRanks | undefined>(undefined);
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

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
    @page { 
      size: A4; 
      margin: 10mm; 
    }
    html, body {
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden; /* Empêche le contenu de "baver" sur une 2e page */
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-target {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
  `;

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const studentData = await studentService.getStudentById(Number(id));
      if (!studentData) return;
      setStudent(studentData);

      const classData = await classService.getClassById(studentData.class_id);
      if (classData) setClassInfo(classData);

      const subjectData = await classService.getSubjectsByClass(studentData.class_id);
      setSubjects(subjectData);

      const gradeData = await gradeService.getGradesByStudent(Number(id));
      setGrades(gradeData);

      const [nameResult, cityResult, poboxResult] = await Promise.all([
        window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_name']),
        window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_city']),
        window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_pobox'])
      ]);

      setSchoolInfo({
        name: nameResult?.[0]?.value || '',
        city: cityResult?.[0]?.value || '',
        pobox: poboxResult?.[0]?.value || ''
      });

      const yearResult = await window.api.db.query<AcademicYear>(
        'SELECT * FROM academic_years WHERE is_active = 1 LIMIT 1'
      );
      if (yearResult?.[0]) setAcademicYear(yearResult[0].name);

      const { ranks: studentRanks, totalStudents: count } = await bulletinService.calculateStudentRanks(
        studentData.class_id,
        Number(id)
      );
      setRanks(studentRanks);
      setTotalStudents(count);

    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  if (loading) {
    return <ProfessionalLoader message="Génération du coupon..." subMessage="Calcul des moyennes en cours" />;
  }

  if (!student || !classInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-600">Données introuvables.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Retour</button>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white"
      onContextMenu={handleContextMenu}
    >
      {/* Barre de navigation (Masquée à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <PrintButton
          targetRef={couponRef}
          title={`Coupon_${student.last_name}_${student.first_name}`}
          extraCss={printCss}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all"
        >
          <Printer size={20} />
          Imprimer le coupon
        </PrintButton>
      </div>

      {/* Zone du coupon isolée pour l'impression */}
      <div ref={couponRef} className="print-target">
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
                // On peut soit déclencher le printButton par ref, 
                // soit garder window.print() ici si on accepte les menus dans l'impression
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