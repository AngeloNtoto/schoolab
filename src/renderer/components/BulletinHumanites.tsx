/**
 * BulletinHumanites.tsx
 * 
 * Composant "Smart" qui charge les données pour un seul élève
 * et délègue l'affichage à BulletinHumanitesContent.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import BulletinHumanitesContent from './BulletinHumanitesContent';

// Services
import { studentService, Student } from '../services/studentService';
import { classService, ClassData, Subject } from '../services/classService';
import { gradeService, Grade } from '../services/gradeService';
import { bulletinService, StudentRanks } from '../services/bulletinService';

export default function BulletinHumanites() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // États pour les données
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [studentRanks, setStudentRanks] = useState<StudentRanks>({
    p1: 0, p2: 0, ex1: 0, tot1: 0,
    p3: 0, p4: 0, ex2: 0, tot2: 0,
    tg: 0
  });
  const [totalStudents, setTotalStudents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // ============================================================================
  // CHARGEMENT DES DONNÉES
  // ============================================================================

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    if (!studentId) return;
    setLoading(true);

    try {
      // 1. Charger l'élève
      const studentData = await studentService.getStudentById(Number(studentId));
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

      // 3. Charger les matières
      const subjectData = await classService.getSubjectsByClass(studentData.class_id);
      setSubjects(subjectData);

      // 4. Charger les notes
      const gradeData = await gradeService.getGradesByStudent(Number(studentId));
      setGrades(gradeData);

      // 5. Charger les infos de l'école
      const sName = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_name']);
      const sCity = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_city']);
      
      if (sName && sName.length > 0) setSchoolName(sName[0].value);
      if (sCity && sCity.length > 0) setSchoolCity(sCity[0].value);

      // 6. Calculer les rangs
      const { ranks, totalStudents } = await bulletinService.calculateStudentRanks(studentData.class_id, Number(studentId));
      setStudentRanks(ranks);
      setTotalStudents(totalStudents);

    } catch (error) {
      console.error('Erreur lors du chargement des données du bulletin:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // AFFICHAGE
  // ============================================================================

  if (loading) {
    return <ProfessionalLoader message="Génération du bulletin..." subMessage="Calcul des moyennes et classements en cours" />;
  }

  if (!student || !classInfo) return <div>Données introuvables.</div>;

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

      {/* Contenu du bulletin */}
      <BulletinHumanitesContent
        student={student}
        classInfo={classInfo}
        subjects={subjects}
        grades={grades}
        schoolName={schoolName}
        schoolCity={schoolCity}
        studentRanks={studentRanks}
        totalStudents={totalStudents}
      />
    </div>
  );
}
