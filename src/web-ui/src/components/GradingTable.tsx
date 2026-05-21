import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, CheckCircle2, Search } from './iconsSvg';
import { Class, Subject, Student, Grade } from '../types';

interface GradingTableProps {
  selectedClass: Class;
  selectedSubject: Subject;
  // Liste complète des matières pour les onglets multi-matières
  subjects: Subject[];
  period: string;
  setPeriod: (period: string) => void;
  students: Student[];
  grades: Grade[];
  isPeriodDisabled: boolean;
  currentMax: number;
  onGradeChange: (studentId: number, subjectId: number, value: number) => void;
  onBack: () => void;
  // Pour changer de matière via les onglets
  onSelectSubject: (sub: Subject) => void;
  statusMessage: { text: string; type: 'info' | 'error' | 'success' } | null;
}

// ── Composant cellule de note tactile ──────────────────────
// Gros champ adapté au doigt, inputMode decimal, coloration conditionnelle, flash ✓
function GradeInput({ 
  value, max, disabled, onSave 
}: { 
  value: number | undefined; max: number; disabled: boolean; onSave: (val: number) => void;
}) {
  const [localVal, setLocalVal] = useState(value?.toString() ?? '');
  const [showSaved, setShowSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Synchroniser quand la prop change (ex: SSE temps réel)
  useEffect(() => {
    setLocalVal(value?.toString() ?? '');
  }, [value]);

  // Coloration conditionnelle : rouge < 50%, vert >= 80%, neutre sinon
  const percentage = (value !== undefined && max > 0) ? (value / max) * 100 : null;
  const colorClass = percentage !== null
    ? percentage < 50
      ? 'text-red-600 border-red-200 bg-red-50'
      : percentage >= 80
        ? 'text-emerald-600 border-emerald-200 bg-emerald-50'
        : 'text-slate-800 border-slate-200 bg-slate-50'
    : 'text-slate-400 border-slate-200 bg-slate-50';

  // Sauvegarder quand on quitte le champ
  const handleBlur = () => {
    const trimmed = localVal.trim();
    if (trimmed === '' || disabled) return;
    const num = parseFloat(trimmed);
    if (isNaN(num) || num < 0 || num > max) {
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
      {/* Flash vert de confirmation de sauvegarde */}
      {showSaved && (
        <span className="absolute inset-0 flex items-center justify-center text-emerald-500 text-sm font-bold bg-emerald-50/80 rounded-xl pointer-events-none"
          style={{ animation: 'fadeInOut 0.8s ease-out forwards' }}>
          ✓
        </span>
      )}
    </div>
  );
}

// ── Composant principal GradingTable ────────────────────────
export default function GradingTable({
  selectedClass,
  selectedSubject,
  subjects,
  period,
  setPeriod,
  students,
  grades,
  isPeriodDisabled,
  currentMax,
  onGradeChange,
  onBack,
  onSelectSubject,
  statusMessage
}: GradingTableProps) {
  // État de recherche d'élève
  const [searchQuery, setSearchQuery] = useState('');

  // Élèves filtrés par la recherche
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      `${s.last_name} ${s.post_name} ${s.first_name}`.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ── Sticky sub-header : info matière + onglets + recherche ── */}
      <div className="sticky top-[52px] z-20 bg-slate-50 pb-3 -mx-4 px-4 pt-1 md:-mx-6 md:px-6">
        {/* Bouton retour + info matière + recherche */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={onBack}
              className="p-1.5 hover:bg-white rounded-full text-slate-400 transition-colors active:scale-95 shrink-0"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-800 truncate">{selectedSubject.name}</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase">
                {selectedClass.name} • Max : {isPeriodDisabled ? 'N/A' : currentMax}
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

        {/* Onglets multi-matières — navigation rapide horizontale */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {subjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => { onSelectSubject(sub); setSearchQuery(''); }}
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
        {/* En-tête colonnes */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Élève ({filteredStudents.length})
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            pts / {isPeriodDisabled ? 'N/A' : currentMax}
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
                (g: Grade) => g.student_id === student.id && g.subject_id === selectedSubject.id && g.period === period
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

                  {/* Input de note tactile avec coloration et flash */}
                  <GradeInput
                    value={grade?.value}
                    max={currentMax}
                    disabled={isPeriodDisabled}
                    onSave={(val) => onGradeChange(student.id, selectedSubject.id, val)}
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
  );
}
