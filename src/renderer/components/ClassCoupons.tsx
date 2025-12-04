/**
 * ClassCoupons.tsx
 * 
 * Page pour imprimer tous les coupons d'une classe en une seule fois.
 * Charge toutes les données nécessaires en masse pour optimiser les performances.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import CouponContent, { SchoolInfo } from './CouponContent';

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
      // Optimisation majeure par rapport au chargement individuel
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

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Boutons de contrôle */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={20} />
            Retour
          </button>
          <span className="text-slate-500 text-sm">
            {students.length} coupons prêts à imprimer
          </span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Printer size={20} />
          Imprimer Tout
        </button>
      </div>

      {/* Liste des coupons */}
      <div>
        {students.map((student) => {
          // Filtrer les notes pour cet élève spécifique
          const studentGrades = allGrades.filter(g => g.student_id === student.id);

          return (
            <CouponContent
              key={student.id}
              student={student}
              classInfo={classInfo}
              subjects={subjects}
              grades={studentGrades}
              schoolInfo={schoolInfo}
              academicYear={academicYear}
            />
          );
        })}
      </div>
    </div>
  );
}
