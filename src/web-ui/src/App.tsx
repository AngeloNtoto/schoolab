import React, { useState, useEffect, useTransition } from 'react';
import Header from './components/Header';
import ClassSelector from './components/ClassSelector';
import SubjectSelector from './components/SubjectSelector';
import GradingTable from './components/GradingTable';
import { api } from './services/api';
import { Class, Subject, Student, Grade } from './types';

export default function App() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [period, setPeriod] = useState<string>('P1');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const clientId = React.useMemo(() => Math.random().toString(36).substring(7), []);

  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

  const loadClassData = async (clsId: number) => {
    try {
      const data = await api.fetchClassData(clsId);
      setStudents(data.students);
      setSubjects(data.subjects);
      setGrades(data.grades);
    } catch (e) {
      console.error('Échec du chargement des données de la classe', e);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await api.fetchClasses();
      setClasses(data);
    } catch (e) {
      console.error('Échec de la récupération des classes', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();

    const eventSource = api.getEventSource();
    eventSource.onmessage = (event) => {
      console.log('[SSE] Raw message received:', event.data);
      try {
        const parsed = JSON.parse(event.data);
        console.log('[SSE] Parsed:', parsed);
        const { event: eventName, senderId } = parsed;
        console.log('[SSE] eventName:', eventName, 'senderId:', senderId, 'clientId:', clientId);
        if (eventName === 'db:changed') {
          if (senderId === clientId) {
            console.log('[SSE] Ignoring own message');
            return;
          }

          console.log('[SYNC] Base de données modifiée, rafraîchissement...');
          if (selectedClass) {
            loadClassData(selectedClass.id);
          } else {
            fetchClasses();
          }
        }
      } catch (e) {
        console.error('[SYNC] Échec de l\'analyse de l\'événement SSE', e);
      }
    };

    return () => eventSource.close();
  }, [selectedClass, clientId]);

  const selectClass = (cls: Class) => {
    setSelectedClass(cls);
    setSelectedSubject(null);
    startTransition(() => {
      loadClassData(cls.id);
    });
  };

  const getCurrentMax = () => {
    if (!selectedSubject) return 10;
    switch(period) {
      case 'P1': return selectedSubject.max_p1;
      case 'P2': return selectedSubject.max_p2;
      case 'EXAM1': return selectedSubject.max_exam1;
      case 'P3': return selectedSubject.max_p3;
      case 'P4': return selectedSubject.max_p4;
      case 'EXAM2': return selectedSubject.max_exam2;
      default: return 10;
    }
  };

  const handleGradeChange = async (studentId: number, subjectId: number, value: number) => {
    const currentMax = getCurrentMax();
    
    if (value > currentMax) {
       setStatusMessage({ text: `Valeur trop grande (Max : ${currentMax})`, type: 'error' });
       return;
    }

    const newGrade = { student_id: studentId, subject_id: subjectId, period, value };
    
    setGrades(prev => {
      const index = prev.findIndex(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
      if (index > -1) {
        const newState = [...prev];
        newState[index] = newGrade;
        return newState;
      }
      return [...prev, newGrade];
    });

    try {
      await api.saveGrades([newGrade], clientId);
      setStatusMessage({ text: 'Enregistré', type: 'success' });
      setTimeout(() => setStatusMessage(prev => prev?.type === 'success' ? null : prev), 2000);
    } catch (e) {
      console.error('Échec de la sauvegarde de la note', e);
      setStatusMessage({ text: 'Erreur de connexion', type: 'error' });
    }
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center font-bold text-blue-600">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        {!selectedClass ? (
          <ClassSelector classes={classes} onSelect={selectClass} />
        ) : !selectedSubject ? (
          <SubjectSelector 
            selectedClass={selectedClass} 
            subjects={subjects} 
            isLoading={isPending} 
            onSelect={setSelectedSubject} 
            onBack={() => setSelectedClass(null)} 
          />
        ) : (
          <GradingTable 
            selectedClass={selectedClass}
            selectedSubject={selectedSubject}
            period={period}
            setPeriod={setPeriod}
            students={students}
            grades={grades}
            isPeriodDisabled={getCurrentMax() === 0}
            currentMax={getCurrentMax()}
            onGradeChange={handleGradeChange}
            onBack={() => setSelectedSubject(null)}
            statusMessage={statusMessage}
          />
        )}
      </main>
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-slate-400 text-sm font-medium">
          &copy; 2026 Schoolab - Système de gestion scolaire d'excellence.
        </div>
      </footer>
    </div>
  );
}
