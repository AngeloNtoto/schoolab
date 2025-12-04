/**
 * CouponEleve.tsx
 * 
 * Composant "Smart" qui charge les données pour un seul élève
 * et délègue l'affichage à CouponContent.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import CouponContent, { SchoolInfo } from './CouponContent';

// Services
import { studentService, Student } from '../services/studentService';
import { classService, ClassData, Subject } from '../services/classService';
import { gradeService, Grade } from '../services/gradeService';

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

  // États pour les données
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({ name: '', city: '', pobox: '' });
  const [academicYear, setAcademicYear] = useState<string>('');
  const [loading, setLoading] = useState(true);

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
      // 1. Charger l'élève
      const studentData = await studentService.getStudentById(Number(id));
      if (!studentData) {
        console.error('Élève non trouvé');
        return;
      }
      setStudent(studentData);

      // 2. Charger la classe
      const classData = await classService.getClassById(studentData.class_id);
      if (classData) {
        setClassInfo(classData);
      }

      // 3. Charger les matières de la classe
      const subjectData = await classService.getSubjectsByClass(studentData.class_id);
      setSubjects(subjectData);

      // 4. Charger les notes de l'élève
      const gradeData = await gradeService.getGradesByStudent(Number(id));
      setGrades(gradeData);

      // 5. Charger les informations de l'école depuis les settings
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
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // AFFICHAGE
  // ============================================================================

  if (loading) {
    return <ProfessionalLoader message="Génération du coupon..." subMessage="Calcul des moyennes et classements en cours" />;
  }

  if (!student || !classInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-600">Données introuvables.</p>
        <button 
          onClick={() => navigate(-1)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Boutons de contrôle */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft size={20} />
          Retour
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer size={20} />
          Imprimer
        </button>
      </div>

      {/* Contenu du coupon */}
      <CouponContent
        student={student}
        classInfo={classInfo}
        subjects={subjects}
        grades={grades}
        schoolInfo={schoolInfo}
        academicYear={academicYear}
      />
    </div>
  );
}
