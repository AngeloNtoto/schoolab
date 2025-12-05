/**
 * BulletinPrimaire.tsx
 * 
 * Composant "Smart" qui charge les données pour un seul élève du primaire (7ème/8ème)
 * et délègue l'affichage à BulletinPrimaireContent.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import BulletinPrimaireContent from './BulletinPrimaireContent';

// Services
import { studentService, Student } from '../services/studentService';
import { classService, ClassData, Subject } from '../services/classService';
import { gradeService, Grade } from '../services/gradeService';
import { domainService, Domain } from '../services/domainService';

export default function BulletinPrimaire() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    if (!studentId) return;
    setLoading(true);

    try {
      // 1. Load Student
      const studentData = await studentService.getStudentById(Number(studentId));
      if (!studentData) {
        console.error('Student not found');
        return;
      }
      setStudent(studentData);

      // 2. Load Class
      const classData = await classService.getClassById(studentData.class_id);
      if (classData) {
        setClassInfo(classData);
      }

      // 3. Load Subjects
      const subjectData = await classService.getSubjectsByClass(studentData.class_id);
      setSubjects(subjectData);

      // 4. Load Domains
      const domainData = await domainService.getAllDomains();
      setDomains(domainData);

      // 5. Load Grades
      const gradeData = await gradeService.getGradesByStudent(Number(studentId));
      setGrades(gradeData);

      // 6. Load School Info
      const sName = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_name']);
      const sCity = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_city']);
      
      if (sName && sName.length > 0) setSchoolName(sName[0].value);
      if (sCity && sCity.length > 0) setSchoolCity(sCity[0].value);

    } catch (error) {
      console.error('Failed to load bulletin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ProfessionalLoader message="Génération du bulletin..." subMessage="Calcul des moyennes en cours" />;
  }

  if (!student || !classInfo) return <div>Données introuvables.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Print Controls */}
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

      <BulletinPrimaireContent
        student={student}
        classInfo={classInfo}
        subjects={subjects}
        grades={grades}
        domains={domains}
        schoolName={schoolName}
        schoolCity={schoolCity}
      />
    </div>
  );
}
