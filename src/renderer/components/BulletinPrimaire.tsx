import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import ProfessionalLoader from './ProfessionalLoader';
import BulletinPrimaireContent from './BulletinPrimaireContent';

// Import du système d'impression
import PrintButton from './PrintWrapper';

// Services
import { studentService, Student } from '../services/studentService';
import { classService, ClassData, Subject } from '../services/classService';
import { gradeService, Grade } from '../services/gradeService';
import { domainService, Domain } from '../services/domainService';

export default function BulletinPrimaire() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();

  // Ref pour isoler la zone d'impression
  const bulletinRef = useRef<HTMLDivElement>(null);

  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [loading, setLoading] = useState(true);

  // Configuration CSS pour l'impression (Format A4 + Couleurs forcées)
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
    }
    .print-target {
      box-shadow: none !important;
      margin: 0 !important;
      width: 100% !important;
      max-width: none !important;
    }
  `;

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    if (!studentId) return;
    setLoading(true);

    try {
      const studentData = await studentService.getStudentById(Number(studentId));
      if (!studentData) return;
      setStudent(studentData);

      const classData = await classService.getClassById(studentData.class_id);
      if (classData) setClassInfo(classData);

      const subjectData = await classService.getSubjectsByClass(studentData.class_id);
      setSubjects(subjectData);

      const domainData = await domainService.getAllDomains();
      setDomains(domainData);

      const gradeData = await gradeService.getGradesByStudent(Number(studentId));
      setGrades(gradeData);

      const sName = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_name']);
      const sCity = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_city']);
      
      if (sName?.length) setSchoolName(sName[0].value);
      if (sCity?.length) setSchoolCity(sCity[0].value);

    } catch (error) {
      console.error('Failed to load bulletin data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ProfessionalLoader message="Génération du bulletin..." subMessage="Calcul des moyennes en cours" />;
  }

  if (!student || !classInfo) return <div className="p-8 text-center">Données introuvables.</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-8 print:p-0 print:bg-white">
      
      {/* Barre d'outils - Masquée lors de l'impression */}
      <div className="max-w-[210mm] mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
          Retour
        </button>

        <PrintButton
          targetRef={bulletinRef}
          title={`Bulletin Primaire - ${student.last_name} ${student.first_name}`}
          extraCss={printCss}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all"
        >
          <Printer size={20} />
          Imprimer le bulletin
        </PrintButton>
      </div>

      {/* Zone du contenu avec REF pour l'impression isolée */}
      <div ref={bulletinRef} className="print-target">
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
    </div>
  );
}