/**
 * BatchPrintModal.tsx
 * 
 * Modal de configuration pour l'impression en masse des coupons.
 * Permet de sélectionner la période, les élèves et le nombre de coupons par page.
 */

import React, { useState, useMemo } from 'react';
import { X, Printer, Users, Calendar, LayoutGrid, CheckSquare, Square, Search } from '../iconsSvg';
import { Student } from '../../services/studentService';

// Types de périodes disponibles
export type PeriodType = 'P1' | 'P2' | 'P3' | 'P4' | 'S1' | 'S2' | 'YEAR';

export interface PrintConfig {
  period: PeriodType;
  selectedStudentIds: number[];
  couponsPerPage: 1 | 2 | 4 | 6;
}

interface BatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  onConfirm: (config: PrintConfig) => void;
  className: string;
}

// Configuration des périodes
const PERIODS = [
  { value: 'P1' as PeriodType, label: 'Période 1', couponsPerPage: 4 as const },
  { value: 'P2' as PeriodType, label: 'Période 2', couponsPerPage: 4 as const },
  { value: 'P3' as PeriodType, label: 'Période 3', couponsPerPage: 4 as const },
  { value: 'P4' as PeriodType, label: 'Période 4', couponsPerPage: 4 as const },
  { value: 'S1' as PeriodType, label: 'Semestre 1 (P1 + P2 + Exam)', couponsPerPage: 2 as const },
  { value: 'S2' as PeriodType, label: 'Semestre 2 (P3 + P4 + Exam)', couponsPerPage: 2 as const },
  { value: 'YEAR' as PeriodType, label: 'Année complète', couponsPerPage: 1 as const },
];

export default function BatchPrintModal({
  isOpen,
  onClose,
  students,
  onConfirm,
  className,
}: BatchPrintModalProps) {
  // États
  const [period, setPeriod] = useState<PeriodType>('S1');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>(
    students.map(s => s.id)
  );
  const [couponsPerPage, setCouponsPerPage] = useState<1 | 2 | 4 | 6>(2);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyAbandons, setOnlyAbandons] = useState(false);

  // Filtrer les élèves par recherche
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(s => 
      s.first_name.toLowerCase().includes(term) ||
      s.last_name.toLowerCase().includes(term) ||
      (s.post_name && s.post_name.toLowerCase().includes(term))
    );
  }, [students, searchTerm]);

  // Calculer le nombre de pages
  const pageCount = useMemo(() => {
    return Math.ceil(selectedStudentIds.length / couponsPerPage);
  }, [selectedStudentIds.length, couponsPerPage]);

  // Gérer le changement de période (ajuste automatiquement couponsPerPage)
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    const periodConfig = PERIODS.find(p => p.value === newPeriod);
    if (periodConfig) {
      setCouponsPerPage(periodConfig.couponsPerPage);
    }
  };

  // Sélectionner/désélectionner tous les élèves
  const toggleAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map(s => s.id));
    }
  };

  // Sélectionner/désélectionner un élève
  const toggleStudent = (studentId: number) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Confirmer et lancer l'impression
  const handleConfirm = () => {
    onConfirm({
      period,
      selectedStudentIds,
      couponsPerPage,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Configuration d'impression</h2>
            <p className="text-sm text-slate-500">{className}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Sélection de période */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar size={16} />
              Période à imprimer
            </label>
            <select
              value={period}
              onChange={(e) => handlePeriodChange(e.target.value as PeriodType)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PERIODS.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Coupons par page */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <LayoutGrid size={16} />
              Coupons par page
            </label>
            <div className="flex gap-2">
              {[1, 2, 4, 6].map(count => (
                <button
                  key={count}
                  onClick={() => setCouponsPerPage(count as 1 | 2 | 4 | 6)}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                    couponsPerPage === count
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {period === 'YEAR' && couponsPerPage > 1 && (
                <span className="text-amber-600">
                  ⚠️ Les coupons année complète sont grands, 1 par page est recommandé.
                </span>
              )}
              {(period === 'S1' || period === 'S2') && couponsPerPage > 2 && (
                <span className="text-amber-600">
                  ⚠️ Les coupons semestre sont moyens, 2 par page est recommandé.
                </span>
              )}
            </p>
          </div>

          {/* Sélection des élèves */}
          <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedStudentIds(students.filter(s => !((s as Student).is_abandoned)).map(s => s.id))}
                    className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  >
                    Exclure les abandons
                  </button>
                </div>
                <div className="text-sm text-slate-500">{selectedStudentIds.length} sélectionné(s)</div>
              </div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Users size={16} />
                Élèves à imprimer
              </label>
              <button
                onClick={toggleAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {selectedStudentIds.length === students.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>

            {/* Recherche */}
            <div className="relative mb-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un élève..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Liste des élèves */}
            <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredStudents.map(student => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggleStudent(student.id)}
                    className="text-slate-400 hover:text-blue-600"
                  >
                    {selectedStudentIds.includes(student.id) ? (
                      <CheckSquare size={20} className="text-blue-600" />
                    ) : (
                      <Square size={20} />
                    )}
                  </button>
                  <span className="text-sm text-slate-700">
                    {student.last_name} {student.post_name} {student.first_name}
                  </span>
                </label>
              ))}
              {filteredStudents.length === 0 && (
                <p className="p-4 text-center text-slate-500 text-sm">
                  Aucun élève trouvé
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            <span className="font-medium">{selectedStudentIds.length}</span> élève(s) sélectionné(s) • 
            <span className="font-medium"> {pageCount}</span> page(s) à imprimer
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedStudentIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Printer size={18} />
              Imprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
