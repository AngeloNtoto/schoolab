/**
 * ClassCoupons.tsx
 * 
 * Page pour imprimer les coupons d'une classe.
 * Supporte l'impression par période avec mise en page multi-coupons
 * pour économiser le papier.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Settings2 } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import { SchoolInfo } from './CouponContent';
import BatchPrintModal, { PrintConfig, PeriodType } from './BatchPrintModal';
import PrintLayout from './PrintLayout';

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

  // ============================================================================
  // CHARGEMENT DES DONNÉES EN MASSE
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [classId]);

  const loadData = async () => {
    if (!classId) return;
    setLoading(true);

    try {
      // 1. Charger la classe
      const cData = await classService.getClassById(Number(classId));
      if (!cData) {
        console.error('Classe non trouvée');
        return;
      }
      setClassInfo(cData);

      // 2. Charger tous les élèves de la classe
      const studentsData = await window.api.db.query<Student>(
        'SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name',
        [Number(classId)]
      );
      setStudents(studentsData);

      // 3. Charger les matières de la classe
      const subjectData = await classService.getSubjectsByClass(Number(classId));
      setSubjects(subjectData);

      // 4. Charger TOUTES les notes de la classe en une seule requête
      const gradesData = await window.api.db.query<Grade>(
        `SELECT g.* FROM grades g 
         INNER JOIN students s ON g.student_id = s.id 
         WHERE s.class_id = ?`,
        [Number(classId)]
      );
      setAllGrades(gradesData);

      // 5. Charger les informations de l'école
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

      // 6. Charger l'année académique active
      const yearResult = await window.api.db.query<AcademicYear>(
        'SELECT * FROM academic_years WHERE is_active = 1 LIMIT 1'
      );
      if (yearResult?.[0]) {
        setAcademicYear(yearResult[0].name);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données de la classe:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // GESTION DE L'IMPRESSION
  // ============================================================================

  const handlePrintConfig = (config: PrintConfig) => {
    setPrintConfig(config);
    setShowModal(false);
  };

  const handleResetConfig = () => {
    setPrintConfig(null);
  };

  // Filtrer les élèves selon la configuration
  const selectedStudents = printConfig
    ? students.filter(s => printConfig.selectedStudentIds.includes(s.id))
    : students;

  // ============================================================================
  // AFFICHAGE
  // ============================================================================

  if (loading) {
    return <ProfessionalLoader message="Préparation de l'impression..." subMessage={`Chargement des données pour ${students.length > 0 ? students.length + ' élèves' : 'la classe'}`} />;
  }

  if (!classInfo || students.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-600">Aucun élève trouvé dans cette classe.</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Retour
        </button>
      </div>
    );
  }

  const className = `${classInfo.level} ${classInfo.option} ${classInfo.section}`;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Barre de contrôle */}
      <div className="max-w-[210mm] mx-auto mb-6 print:hidden">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft size={20} />
                Retour
              </button>
              <div>
                <h1 className="font-bold text-slate-900">{className}</h1>
                <p className="text-sm text-slate-500">Impression des coupons</p>
              </div>
            </div>
          </div>

          {/* Configuration actuelle */}
          <div className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
            {printConfig ? (
              <>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-slate-600">
                    <span className="font-medium text-slate-900">{PERIOD_LABELS[printConfig.period]}</span>
                  </span>
                  <span className="text-slate-600">
                    <span className="font-medium text-slate-900">{printConfig.selectedStudentIds.length}</span> élève(s)
                  </span>
                  <span className="text-slate-600">
                    <span className="font-medium text-slate-900">{printConfig.couponsPerPage}</span> par page
                  </span>
                  <span className="text-slate-600">
                    <span className="font-medium text-slate-900">
                      {Math.ceil(printConfig.selectedStudentIds.length / printConfig.couponsPerPage)}
                    </span> page(s)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetConfig}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    <Printer size={16} />
                    Imprimer
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-sm text-slate-500">
                  {students.length} élèves • Configurez l'impression pour commencer
                </span>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  <Settings2 size={16} />
                  Configurer l'impression
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Zone d'impression */}
      {printConfig ? (
        <PrintLayout
          students={selectedStudents}
          classInfo={classInfo}
          subjects={subjects}
          allGrades={allGrades}
          schoolInfo={schoolInfo}
          academicYear={academicYear}
          period={printConfig.period}
          couponsPerPage={printConfig.couponsPerPage}
        />
      ) : (
        <div className="max-w-[210mm] mx-auto">
          <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-slate-200">
            <Settings2 size={48} className="mx-auto mb-4 text-slate-300" />
            <h2 className="text-lg font-medium text-slate-700 mb-2">Configuration requise</h2>
            <p className="text-sm text-slate-500 mb-4">
              Cliquez sur "Configurer l'impression" pour choisir la période,<br />
              les élèves et le format d'impression.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              <Settings2 size={18} />
              Configurer l'impression
            </button>
          </div>
        </div>
      )}

      {/* Modal de configuration */}
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
