import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Services
import { studentService } from '../services/studentService';
import { classService, ClassData } from '../services/classService';

// Bulletin Components
import BulletinHumanites from './BulletinHumanites';
import BulletinPrimaire from './BulletinPrimaire';

export default function Bulletin() {
  const { studentId } = useParams<{ studentId: string }>();
  const [classInfo, setClassInfo] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClassInfo();
  }, [studentId]);

  const loadClassInfo = async () => {
    if (!studentId) return;
    setLoading(true);

    try {
      const studentData = await studentService.getStudentById(Number(studentId));
      if (!studentData) {
        console.error('Student not found');
        setLoading(false);
        return;
      }

      const classData = await classService.getClassById(studentData.class_id);
      setClassInfo(classData);
    } catch (error) {
      console.error('Failed to load class info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Chargement du bulletin...</p>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-600">Classe introuvable.</p>
      </div>
    );
  }

  // Détermine si c'est une classe primaire (7ème ou 8ème)
  const isPrimaire = classInfo.level === '7ème' || classInfo.level === '8ème';

  // Rendre le bulletin approprié selon le niveau
  if (isPrimaire) {
    return <BulletinPrimaire />;
  } else {
    return <BulletinHumanites />;
  }
}
