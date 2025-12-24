/**
 * ClassCoupons.tsx
 * * Page pour imprimer les coupons d'une classe.
 * Supporte l'impression par période avec mise en page multi-coupons
 * pour économiser le papier.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Settings2 } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import { SchoolInfo } from './CouponContent';
import BatchPrintModal, { PrintConfig, PeriodType } from './BatchPrintModal';
import PrintLayout from './PrintLayout';

// Système d'impression
import PrintButton from './PrintWrapper';

// Services
import { Student } from '../services/studentService';
import { classService, ClassData, Subject } from '../services/classService';
import { Grade } from '../services/gradeService';

// Types
interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: number;
}

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

export default function ClassCoupons() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  // Réf pour capturer la zone d'impression
  const printAreaRef = useRef<HTMLDivElement>(null);

  // États pour les données
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({ name: '', city: '', pobox: '' });
  const [academicYear, setAcademicYear] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // États pour la configuration d'impression
  const [showModal, setShowModal] = useState(false);
  const [printConfig, setPrintConfig] = useState<PrintConfig | null>(null);

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
    }
    /* Éviter de couper un coupon en deux entre deux pages */
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

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    if (!classId) return;
    setLoading(true);

    try {
      const cData = await classService.getClassById(Number(classId));
      if (!cData) return;
      setClassInfo(cData);

      const studentsData = await window.api.db.query<Student>(
        'SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name',
        [Number(classId)]
      );
      setStudents(studentsData);

      const subjectData = await classService.getSubjectsByClass(Number(classId));
      setSubjects(subjectData);

      const gradesData = await window.api.db.query<Grade>(
        `SELECT g.* FROM grades g 
         INNER JOIN students s ON g.student_id = s.id 
         WHERE s.class_id = ?`,
        [Number(classId)]
      );
      setAllGrades(gradesData);

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

    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintConfig = (config: PrintConfig) => {
    setPrintConfig(config);
    setShowModal(false);
  };

  const selectedStudents = printConfig
    ? students.filter(s => printConfig.selectedStudentIds.includes(s.id))
    : students;

  const className = classInfo ? `${classInfo.level} ${classInfo.option} ${classInfo.section}` : '';

  if (loading) {
    return <ProfessionalLoader message="Préparation de l'impression..." subMessage={`Traitement pour ${students.length} élèves`} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Barre de contrôle (Masquée à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 print:hidden">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
                <ArrowLeft size={20} />
                Retour
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
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
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
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-all"
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
      {printConfig ? (
        <div ref={printAreaRef} className="print-container-reset">
          <PrintLayout
            students={selectedStudents}
            classInfo={classInfo!}
            subjects={subjects}
            allGrades={allGrades}
            schoolInfo={schoolInfo}
            academicYear={academicYear}
            period={printConfig.period}
            couponsPerPage={printConfig.couponsPerPage}
          />
        </div>
      ) : (
        <div className="max-w-[210mm] mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
            <Settings2 size={48} className="mx-auto mb-4 text-slate-300" />
            <h2 className="text-lg font-medium text-slate-700">Prêt pour l'impression</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
              Choisissez la période et le nombre de coupons par feuille pour générer l'aperçu.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all shadow-md"
            >
              <Settings2 size={18} />
              Lancer la configuration
            </button>
          </div>
        </div>
      )}

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