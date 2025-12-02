import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, MapPin, GraduationCap, FileSpreadsheet } from 'lucide-react';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  post_name: string;
  gender: string;
  birth_date: string;
  birthplace: string;
  class_id: number;
}

interface ClassInfo {
  id: number;
  name: string;
}

export default function StudentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);

  useEffect(() => {
    loadStudentData();
  }, [id]);

  const loadStudentData = async () => {
    try {
      const [studentData] = await window.api.db.query<Student>(
        'SELECT * FROM students WHERE id = ?',
        [Number(id)]
      );

      if (studentData) {
        setStudent(studentData);
        
        // Load class info
        const [classData] = await window.api.db.query<ClassInfo>(
          'SELECT id, name FROM classes WHERE id = ?',
          [studentData.class_id]
        );
        if (classData) {
          setClassInfo(classData);
        }
      }
    } catch (error) {
      console.error('Failed to load student:', error);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Élève non trouvé</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-blue-500 rounded-lg transition-colors text-white"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                <User className="text-white" size={32} />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">
                  {student.last_name} {student.post_name} {student.first_name}
                </h1>
                <p className="text-blue-100 text-sm mt-1">
                  {classInfo?.name || 'Chargement...'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Informations personnelles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <User className="text-slate-400" size={24} />
              <div>
                <p className="text-sm text-slate-500">Sexe</p>
                <p className="font-medium text-slate-800">
                  {student.gender === 'M' ? 'Masculin' : 'Féminin'}
                </p>
              </div>
            </div>

            {student.birth_date && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <Calendar className="text-slate-400" size={24} />
                <div>
                  <p className="text-sm text-slate-500">Date de naissance</p>
                  <p className="font-medium text-slate-800">
                    {new Date(student.birth_date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            )}

            {student.birthplace && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <MapPin className="text-slate-400" size={24} />
                <div>
                  <p className="text-sm text-slate-500">Lieu de naissance</p>
                  <p className="font-medium text-slate-800">{student.birthplace}</p>
                </div>
              </div>
            )}

            {classInfo && (
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                <GraduationCap className="text-slate-400" size={24} />
                <div>
                  <p className="text-sm text-slate-500">Classe</p>
                  <p className="font-medium text-slate-800">{classInfo.name}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Placeholder for grades and bulletin */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-800">Notes et Bulletin</h2>
            <button
              onClick={() => navigate(`/bulletin/${student.id}`)}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              <FileSpreadsheet size={18} />
              Voir le bulletin
            </button>
          </div>
          <p className="text-slate-500">Cliquez sur le bouton ci-dessus pour voir le bulletin complet...</p>
        </div>
      </main>
    </div>
  );
}
