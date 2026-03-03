import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { GraduationCap, Users, BookOpen, ChevronLeft, Loader2, Smartphone, Monitor, CheckCircle2, Search } from "../src/components/iconsSvg"

// ── Types ──────────────────────────────────────────────────

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

// ── Composant cellule de note tactile ──────────────────────
// Grosse cellule adaptée au doigt, inputMode decimal, flash vert de sauvegarde
function GradeInput({ 
  value, 
  max, 
  disabled, 
  onSave 
}: { 
  value: number | undefined; 
  max: number; 
  disabled: boolean; 
  onSave: (val: number) => void;
}) {
  const [localVal, setLocalVal] = useState(value?.toString() ?? '');
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchroniser quand la prop change (ex: SSE)
  useEffect(() => {
    setLocalVal(value?.toString() ?? '');
  }, [value]);

  // Calculer le pourcentage pour la coloration conditionnelle
  const percentage = (value !== undefined && max > 0) ? (value / max) * 100 : null;
  // Coloration conditionnelle : rouge < 50%, vert >= 80%, sinon neutre
  const colorClass = percentage !== null
    ? percentage < 50
      ? 'text-red-600 border-red-200 bg-red-50'
      : percentage >= 80
        ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
        : 'text-slate-800 border-slate-200 bg-slate-50'
    : 'text-slate-400 border-slate-200 bg-slate-50';

  // Quand l'utilisateur quitte le champ, on sauvegarde
  const handleBlur = () => {
    const trimmed = localVal.trim();
    if (trimmed === '' || disabled) return;
    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0) {
      setLocalVal(value?.toString() ?? '');
      return;
    }
    if (num > max) {
      setLocalVal(value?.toString() ?? '');
      return;
    }
    if (num !== value) {
      onSave(num);
      // Flash vert "✓" pendant 800ms
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 800);
    }
  };

  // Filtrer pour n'accepter que chiffres et point
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^[0-9]*\.?[0-9]*$/.test(raw)) {
      setLocalVal(raw);
    }
  };

  // Enter = sauvegarder et blur
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={localVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={disabled ? "N/A" : "-"}
        className={`w-20 h-12 text-center text-lg font-bold rounded-xl border-2 outline-none transition-all
          ${disabled 
            ? 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed' 
            : `${colorClass} focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:bg-white`
          }`}
      />
      {/* Flash vert "sauvé" */}
      {showSaved && (
        <span className="absolute inset-0 flex items-center justify-center text-emerald-500 text-sm font-bold bg-emerald-50/80 rounded-xl pointer-events-none"
          style={{ animation: 'fadeInOut 0.8s ease-out forwards' }}>
          ✓
        </span>
      )}
    </div>
  );
}

// ── App principale ─────────────────────────────────────────

export default function App() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [period, setPeriod] = useState<string>('P1');
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  // Recherche d'élève
  const [searchQuery, setSearchQuery] = useState('');

  // ID client unique pour filtrer les événements SSE qu'on a soi-même envoyés
  const clientId = React.useMemo(() => Math.random().toString(36).substring(7), []);

  // Données de la classe sélectionnée
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);

  // Message de statut global (erreur / succès)
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

  // Charger les données complètes d'une classe
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

  // Charger la liste des classes au démarrage + écouter les événements SSE
  useEffect(() => {
    fetchClasses();

    // Synchronisation temps réel via Server-Sent Events
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'db:changed') {
          // Ignorer nos propres changements (on les a déjà appliqués localement)
          if (payload.senderId === clientId) return;

          // Mise à jour granulaire si c'est juste des notes
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
          } else {
            // Changement structurel → on recharge tout
            if (selectedClass) {
              loadClassData(selectedClass.id);
            } else {
              fetchClasses();
            }
          }
        }
      } catch (e) {
        console.error('[SYNC] Échec parsing événement SSE', e);
      }
    };

    return () => eventSource.close();
  }, [selectedClass, clientId]);

  // Récupérer la liste des classes
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

  // Sélectionner une classe et charger ses données
  const selectClass = (cls: Class) => {
    setSelectedClass(cls);
    setSelectedSubject(null);
    setSearchQuery('');
    startTransition(() => {
      loadClassData(cls.id);
    });
  };

  // Récupérer le max de la période active pour la matière sélectionnée
  const getCurrentMax = (subject?: Subject | null) => {
    const sub = subject || selectedSubject;
    if (!sub) return 10;
    switch(period) {
      case 'P1': return sub.max_p1;
      case 'P2': return sub.max_p2;
      case 'EXAM1': return sub.max_exam1;
      case 'P3': return sub.max_p3;
      case 'P4': return sub.max_p4;
      case 'EXAM2': return sub.max_exam2;
      default: return 10;
    }
  };

  // Sauvegarder une note (optimistic update + envoi serveur)
  const handleGradeChange = async (studentId: number, subjectId: number, value: number) => {
    const sub = subjects.find(s => s.id === subjectId);
    const currentMax = getCurrentMax(sub);
    
    if (value > currentMax) {
      setStatusMessage({ text: `Max dépassé (${currentMax})`, type: 'error' });
      setTimeout(() => setStatusMessage(prev => prev?.type === 'error' ? null : prev), 2000);
      return;
    }

    const newGrade = { student_id: studentId, subject_id: subjectId, period, value };
    
    // 1. Mise à jour locale immédiate (optimistic)
    setGrades(prev => {
      const index = prev.findIndex(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
      if (index > -1) {
        const copy = [...prev];
        copy[index] = newGrade;
        return copy;
      }
      return [...prev, newGrade];
    });

    // 2. Envoi au serveur
    try {
      const res = await fetch('/api/grades/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [newGrade], senderId: clientId })
      });
      if (!res.ok) throw new Error('Échec');
    } catch (e) {
      console.error('Erreur sauvegarde:', e);
      setStatusMessage({ text: 'Erreur de connexion', type: 'error' });
      setTimeout(() => setStatusMessage(prev => prev?.type === 'error' ? null : prev), 3000);
    }
  };

  // Élèves filtrés par la recherche
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      `${s.last_name} ${s.post_name} ${s.first_name}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Vérifier si la période est désactivée pour la matière sélectionnée
  const isPeriodDisabled = getCurrentMax() === 0;

  // ── Écran de chargement initial ──
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-blue-600 to-blue-800 text-white">
        <Loader2 className="animate-spin" size={32} />
        <span className="font-bold text-lg">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* ── En-tête sticky ── */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <GraduationCap size={24} />
            <span className="text-lg font-extrabold tracking-tight">
              Schoolab <span className="text-blue-200 font-medium text-sm">Marking Board</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-100">
            <Monitor size={12} className="hidden md:inline" />
            <Smartphone size={12} className="md:hidden" />
            Connecté
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4">

        {/* ═══════════════════════════════════════════════════ */}
        {/* ÉTAPE 1 : Sélection de la classe                  */}
        {/* ═══════════════════════════════════════════════════ */}
        {!selectedClass ? (
          <div className="space-y-5">
            <h1 className="text-xl font-bold text-slate-800">Sélectionnez une classe</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classes.map(cls => (
                <button
                  key={cls.id}
                  onClick={() => selectClass(cls)}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left group active:scale-[0.98]"
                >
                  <div className="bg-blue-50 w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                    <Users className="text-blue-600" size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{cls.name}</h3>
                  <p className="text-slate-500 font-medium text-sm">{cls.level} • {cls.option} {cls.section}</p>
                </button>
              ))}
            </div>
          </div>

        /* ═══════════════════════════════════════════════════ */
        /* ÉTAPE 2 : Sélection de la matière                  */
        /* ═══════════════════════════════════════════════════ */
        ) : !selectedSubject ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedClass(null)}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors active:scale-95"
              >
                <ChevronLeft size={22} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{selectedClass.name}</h1>
                <p className="text-slate-500 text-xs font-medium">Sélectionnez une matière pour coter</p>
              </div>
            </div>
            {isPending ? (
              <div className="flex items-center gap-3 text-blue-600 font-medium py-10">
                <Loader2 className="animate-spin" /> Chargement des matières...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubject(sub)}
                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left flex items-center gap-3 group active:scale-[0.98]"
                  >
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600 group-hover:bg-white group-hover:text-blue-600 transition-colors shrink-0">
                      <BookOpen size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 truncate">{sub.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{sub.code}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

        /* ═══════════════════════════════════════════════════ */
        /* ÉTAPE 3 : Grille de notation                       */
        /* ═══════════════════════════════════════════════════ */
        ) : (
          <div className="space-y-4">

            {/* ── Sticky sub-header : matière info + onglets matières ── */}
            <div className="sticky top-[52px] z-20 bg-slate-100 pb-3 -mx-4 px-4 pt-1">

              {/* Bouton retour + info matière */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <button 
                    onClick={() => setSelectedSubject(null)}
                    className="p-1.5 hover:bg-white rounded-full text-slate-400 transition-colors active:scale-95 shrink-0"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-base font-bold text-slate-800 truncate">{selectedSubject.name}</h1>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">
                      {selectedClass.name} • Max : {isPeriodDisabled ? 'N/A' : getCurrentMax()}
                    </p>
                  </div>
                </div>

                {/* Barre de recherche compacte */}
                <div className="relative shrink-0">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Chercher..."
                    className="pl-8 pr-3 py-2 w-36 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Onglets de matières — navigation rapide horizontale */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                {subjects.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => { setSelectedSubject(sub); setSearchQuery(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                      selectedSubject.id === sub.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>

              {/* Sélecteur de période */}
              <div className="flex bg-white p-1 rounded-xl mt-2 border border-slate-200 overflow-x-auto no-scrollbar">
                {['P1', 'P2', 'EXAM1', 'P3', 'P4', 'EXAM2'].map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`flex-1 min-w-[48px] px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                      period === p 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.replace('EXAM', 'Ex.')}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Liste des élèves avec inputs tactiles ── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* En-tête colonne */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Élève ({filteredStudents.length})
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  pts / {isPeriodDisabled ? 'N/A' : getCurrentMax()}
                </span>
              </div>

              {/* Lignes élèves */}
              <div className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm font-medium">
                    {searchQuery ? 'Aucun élève trouvé' : 'Aucun élève dans cette classe'}
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const grade = grades.find(
                      g => g.student_id === student.id && g.subject_id === selectedSubject.id && g.period === period
                    );
                    return (
                      <div 
                        key={student.id} 
                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                      >
                        {/* Nom de l'élève */}
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="font-bold text-sm text-slate-800 truncate">
                            {student.last_name} {student.post_name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {student.first_name}
                          </div>
                        </div>

                        {/* Input de note tactile */}
                        <GradeInput
                          value={grade?.value}
                          max={getCurrentMax()}
                          disabled={isPeriodDisabled}
                          onSave={(val) => handleGradeChange(student.id, selectedSubject.id, val)}
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Message de statut */}
            {statusMessage && (
              <div className={`text-sm font-bold flex items-center gap-2 px-4 py-2.5 rounded-xl border ${
                statusMessage.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' :
                statusMessage.type === 'success' ? 'bg-green-50 text-green-600 border-green-100' :
                'bg-blue-50 text-blue-600 border-blue-100'
              }`}>
                {statusMessage.type === 'error' ? '⚠️' : '✅'} {statusMessage.text}
              </div>
            )}

            {/* Badge auto-save */}
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 px-3 py-2 rounded-xl border border-green-100 w-fit ml-auto">
              <CheckCircle2 size={14} /> Auto-save
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-auto border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-slate-400 text-xs font-medium">
          &copy; 2026 Schoolab - Système de gestion scolaire
        </div>
      </footer>
    </div>
  );
}
