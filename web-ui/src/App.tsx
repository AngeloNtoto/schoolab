import React, { useState, useEffect, useTransition } from 'react';
import { GraduationCap, Users, BookOpen, ChevronLeft, Loader2, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';

// Types
interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  post_name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  max_p1: number;
  max_p2: number;
  max_exam1: number;
  max_p3: number;
  max_p4: number;
  max_exam2: number;
}

interface Grade {
  student_id: number;
  subject_id: number;
  period: string;
  value: number;
}

export default function App() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [period, setPeriod] = useState<string>('P1');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // ID client unique pour identifier la source des changements
  const clientId = React.useMemo(() => Math.random().toString(36).substring(7), []);

  // États pour le tableau de notes actuel
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  const loadClassData = async (clsId: number) => {
    try {
      const res = await fetch(`/api/classes/${clsId}/full`);
      const data = await res.json();
      setStudents(data.students);
      setSubjects(data.subjects);
      setGrades(data.grades);
    } catch (e) {
      console.error('Échec du chargement des données de la classe', e);
    }
  };

  useEffect(() => {
    fetchClasses();

    // Synchronisation en temps réel (SSE)
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'db:changed') {
          // Optimisation : ignorer si nous sommes l'émetteur
          if (payload.senderId === clientId) return;

          console.log('[SYNC] Database changed event received:', payload);
          
          // Granular update if possible
          if (payload.type === 'grade_update' && Array.isArray(payload.updates)) {
            setGrades(prev => {
              const newGrades = [...prev];
              for (const update of payload.updates) {
                const idx = newGrades.findIndex(
                  g => g.student_id === update.student_id && g.subject_id === update.subject_id && g.period === update.period
                );
                if (idx !== -1) {
                  newGrades[idx] = { ...newGrades[idx], value: update.value };
                } else {
                  newGrades.push({ 
                    student_id: update.student_id, 
                    subject_id: update.subject_id, 
                    period: update.period, 
                    value: update.value 
                  });
                }
              }
              return newGrades;
            });
          } else if (payload.type === 'student_update' || payload.event === 'db:changed') {
            // Full refresh for student updates or generic changes
            console.log('[SYNC] Structural change detected, full refresh...');
            if (selectedClass) {
              loadClassData(selectedClass.id);
            } else {
              fetchClasses();
            }
          }
        }
      } catch (e) {
        console.error('[SYNC] Échec de l\'analyse de l\'événement SSE', e);
      }
    };

    return () => eventSource.close();
  }, [selectedClass, clientId]);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      setClasses(data);
    } catch (e) {
      console.error('Échec de la récupération des classes', e);
    } finally {
      setLoading(false);
    }
  };

  const selectClass = (cls: Class) => {
    setSelectedClass(cls);
    setSelectedSubject(null);
    startTransition(() => {
      loadClassData(cls.id);
    });
  };

  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

  /**
   * Récupère le maximum possible pour la période sélectionnée
   */
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

  /**
   * Gère le changement d'une note
   */
  const handleGradeChange = async (studentId: number, subjectId: number, value: number) => {
    const currentMax = getCurrentMax();
    
    // Vérification si la note dépasse le maximum
    if (value > currentMax) {
       setStatusMessage({ text: `Valeur trop grande (Max : ${currentMax})`, type: 'error' });
       return;
    }

    const newGrade = { student_id: studentId, subject_id: subjectId, period, value };
    
    // 1. Mise à jour immédiate de l'état (optimisme local)
    setGrades(prev => {
      const index = prev.findIndex(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
      if (index > -1) {
        const newState = [...prev];
        newState[index] = newGrade;
        return newState;
      }
      return [...prev, newGrade];
    });

    // 2. Synchronisation avec le serveur
    try {
      const res = await fetch('/api/grades/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          updates: [newGrade],
          senderId: clientId 
        })
      });
      
      if (!res.ok) throw new Error('Échec de l\'enregistrement');
      
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

  // Vérification si la période actuelle est un examen désactivé (max = 0)
  const isPeriodDisabled = getCurrentMax() === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* En-tête */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap size={28} />
            <span className="text-xl font-extrabold tracking-tight">Schoolab <span className="text-blue-200 font-medium">Marking Board</span></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-100">
            <Monitor size={14} className="hidden md:inline" />
            <Smartphone size={14} className="md:hidden" />
            Connecté
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6">
        {!selectedClass ? (
          /* Sélection de la Classe */
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Sélectionnez une classe</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => selectClass(cls)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left group"
                >
                  <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                    <Users className="text-blue-600" size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{cls.name}</h3>
                  <p className="text-slate-500 font-medium">{cls.level} • {cls.option} {cls.section}</p>
                </button>
              ))}
            </div>
          </div>
        ) : !selectedSubject ? (
          /* Sélection de la Matière */
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSelectedClass(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-2xl font-bold text-slate-800">{selectedClass.name} - Matières</h1>
            </div>
            {isPending ? (
              <div className="flex items-center gap-3 text-blue-600 font-medium py-10">
                <Loader2 className="animate-spin" /> Chargement des matières...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-white group-hover:text-blue-600 transition-colors">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{sub.name}</div>
                        <div className="text-xs text-slate-500 font-medium uppercase">{sub.code}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Grille de Notation */
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedSubject(null)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">{selectedSubject.name}</h1>
                  <p className="text-slate-500 text-sm">
                    {selectedClass.name} • Max {period.toUpperCase()} : {isPeriodDisabled ? 'N/A' : getCurrentMax()}
                  </p>
                </div>
              </div>

              {/* Sélecteur de Période (incluant les Examens) */}
              <div className="flex bg-slate-200 p-1 rounded-xl overflow-x-auto max-w-full">
                {['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                      period === p ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Élève</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Points / {isPeriodDisabled ? 'N/A' : getCurrentMax()}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map(student => {
                    const grade = grades.find(g => g.student_id === student.id && g.subject_id === selectedSubject.id && g.period === period);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                            {student.last_name} {student.post_name} {student.first_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <input
                            type="number"
                            min="0"
                            max={getCurrentMax()}
                            step="0.5"
                            value={grade?.value ?? ''}
                            disabled={isPeriodDisabled}
                            onChange={(e) => handleGradeChange(student.id, selectedSubject.id, parseFloat(e.target.value) || 0)}
                            className={`w-24 p-2 text-right border-none rounded-lg font-bold outline-none transition-all ${
                              isPeriodDisabled 
                                ? 'bg-slate-50 text-slate-400 cursor-not-allowed' 
                                : 'bg-slate-100 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white'
                            }`}
                            placeholder={isPeriodDisabled ? "N/A" : "-"}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-4">
               {statusMessage && (
                 <div className={`text-sm font-bold flex items-center gap-2 px-4 py-2 rounded-full border ${
                   statusMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
                   statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' :
                   'bg-blue-50 text-blue-600 border-blue-100'
                 }`}>
                   {statusMessage.type === 'error' ? '⚠️' : '✅'} {statusMessage.text}
                 </div>
               )}
               <div className="flex items-center gap-2 text-green-600 text-sm font-bold bg-green-50 px-4 py-2 rounded-full border border-green-100 ml-auto">
                  <CheckCircle2 size={16} /> Enregistrement automatique activé
               </div>
            </div>
          </div>
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
