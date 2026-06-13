import React, { useEffect, useState } from 'react';
import { gradebookStore, getCellKey } from '../../../context/gradebookSelection';
import { Subject } from '../../../services/classService';
import { Student } from '../../../services/studentService';
import { CustomSort } from '../../../services/customSortService';
import StudentRow from './StudentRow';
import { ColumnStats, getVisibleGradeColumnCount } from './gradeUtils';

interface ClassGradeTableProps {
  displayedSubjects: Subject[];
  filteredAndSortedStudents: Student[];
  customSorts: CustomSort[];
  sortOrder: string;
  gradesMap: Map<string, number>;
  selectedPeriods: Set<string>;
  lockedPeriods: Set<string>;
  correctionMax: number | null;
  showStats: boolean;
  columnStats: ColumnStats;
  onContextMenu: (e: React.MouseEvent, student: Student) => void;
  onGradeUpdate: (studentId: number, subjectId: number, period: string, value: number | null) => Promise<void>;
}

const GradeStatCell = ({ statKey, columnStats, borderClass = 'border-r border-slate-200 dark:border-slate-700' }: {
  statKey: string;
  columnStats: ColumnStats;
  borderClass?: string;
}) => (
  <td className={`px-1 py-2 text-center ${borderClass} min-w-[50px]`}>
    {columnStats[statKey] ? (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{columnStats[statKey].avg.toFixed(1)}</span>
        <span className="text-[8px] font-black text-slate-400">{columnStats[statKey].min}–{columnStats[statKey].max}</span>
      </div>
    ) : <span className="text-[10px] text-slate-300">-</span>}
  </td>
);

export default function ClassGradeTable({
  displayedSubjects,
  filteredAndSortedStudents,
  customSorts,
  sortOrder,
  gradesMap,
  selectedPeriods,
  lockedPeriods,
  correctionMax,
  showStats,
  columnStats,
  onContextMenu,
  onGradeUpdate
}: ClassGradeTableProps) {
  const visibleGradeColumnCount = getVisibleGradeColumnCount(selectedPeriods);
  const orderMap = sortOrder.startsWith('custom_')
    ? (() => {
        const profile = customSorts.find(s => s.id === parseInt(sortOrder.replace('custom_', ''), 10));
        return profile ? JSON.parse(profile.student_order) : {};
      })()
    : {};

  const [pasteIntent, setPasteIntent] = useState<{ values: string[], cells: string[] } | null>(null);

  const activeStudents = filteredAndSortedStudents.filter(s => orderMap[s.id] !== -1);
  const withdrawnStudents = filteredAndSortedStudents.filter(s => orderMap[s.id] === -1);

  // Copier-coller global pour le Gradebook
  useEffect(() => {
    const handleGlobalCopy = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'c') {
        // Ne pas intercepter si on est en train d'éditer ou de sélectionner du texte normal
        if (gradebookStore.getState().isEditing) return;
        
        const state = gradebookStore.getState();
        const active = state.activeCell;
        
        if (state.selectedCells.size > 0 || active) {
          e.preventDefault();
          const cells = state.selectedCells.size > 0 ? Array.from(state.selectedCells) : [getCellKey(active!)];
          
          const exportData = cells.map(key => {
             const val = gradesMap.get(key);
             return val !== undefined ? val : '';
          }).join('\t');
          
          navigator.clipboard.writeText(exportData);
          // Petite notification ou indication visuelle (idéalement via Toast)
        }
      }
    };
    const handleGlobalPaste = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'v') {
        if (gradebookStore.getState().isEditing) return;
        
        const state = gradebookStore.getState();
        if (state.selectedCells.size > 0 || state.activeCell) {
          try {
            const text = await navigator.clipboard.readText();
            if (!text) return;

            const values = text.split(/[\t\n\r]+/).filter(v => v !== '');
            const cells = state.selectedCells.size > 0 ? Array.from(state.selectedCells) : [getCellKey(state.activeCell!)];

            if (values.length > 1) {
              setPasteIntent({ values, cells });
            } else {
              // Appliquer une seule valeur
              const cellKey = cells[0];
              const [studentIdStr, subjectIdStr, period] = cellKey.split('-');
              const valNum = parseFloat(values[0].replace(',', '.'));
              if (!isNaN(valNum)) {
                onGradeUpdate(parseInt(studentIdStr, 10), parseInt(subjectIdStr, 10), period, valNum);
              } else if (values[0].trim() === '-' || values[0].trim() === '') {
                onGradeUpdate(parseInt(studentIdStr, 10), parseInt(subjectIdStr, 10), period, null);
              }
            }
          } catch (err) {
            console.error('Erreur de collage', err);
          }
        }
      }
    };
    
    window.addEventListener('keydown', handleGlobalCopy);
    window.addEventListener('keydown', handleGlobalPaste);
    return () => {
      window.removeEventListener('keydown', handleGlobalCopy);
      window.removeEventListener('keydown', handleGlobalPaste);
    };
  }, [gradesMap, onGradeUpdate]);

  // Écoute des commandes venant de la Command Palette
  useEffect(() => {
    const handleClearCell = () => {
      const state = gradebookStore.getState();
      if (state.activeCell) {
        onGradeUpdate(state.activeCell.studentId, state.activeCell.subjectId, state.activeCell.period, null);
      }
    };

    const handleMaxCell = () => {
      const state = gradebookStore.getState();
      if (state.activeCell) {
        // Trouver la matière pour obtenir le max
        const subject = displayedSubjects.find(s => s.id === state.activeCell!.subjectId);
        if (subject) {
          let max = 0;
          switch (state.activeCell.period) {
            case 'P1': max = subject.max_p1; break;
            case 'P2': max = subject.max_p2; break;
            case 'P3': max = subject.max_p3; break;
            case 'P4': max = subject.max_p4; break;
            case 'EXAM1': max = subject.max_exam1; break;
            case 'EXAM2': max = subject.max_exam2; break;
          }
          if (max > 0) {
            onGradeUpdate(state.activeCell.studentId, state.activeCell.subjectId, state.activeCell.period, max);
          }
        }
      }
    };

    window.addEventListener('gradebook:clearCell', handleClearCell);
    window.addEventListener('gradebook:maxCell', handleMaxCell);
    
    return () => {
      window.removeEventListener('gradebook:clearCell', handleClearCell);
      window.removeEventListener('gradebook:maxCell', handleMaxCell);
    };
  }, [onGradeUpdate, displayedSubjects]);

  const executePaste = (overwrite: boolean) => {
    if (!pasteIntent) return;
    const { values, cells } = pasteIntent;

    for (let i = 0; i < Math.min(values.length, cells.length); i++) {
      const cellKey = cells[i];
      const [studentIdStr, subjectIdStr, period] = cellKey.split('-');
      
      // Si on ne doit pas écraser, on vérifie si la cellule a déjà une valeur
      if (!overwrite && gradesMap.has(cellKey)) {
        continue;
      }

      const valNum = parseFloat(values[i].replace(',', '.'));
      if (!isNaN(valNum)) {
        onGradeUpdate(parseInt(studentIdStr, 10), parseInt(subjectIdStr, 10), period, valNum);
      } else if (values[i].trim() === '-' || values[i].trim() === '') {
        onGradeUpdate(parseInt(studentIdStr, 10), parseInt(subjectIdStr, 10), period, null);
      }
    }
    setPasteIntent(null);
  };

  return (
    <>
      <table className="w-full border-collapse min-w-max">
      <thead className="sticky top-0 z-20 shadow-sm">
        <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700">
          <th className="sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 px-2 py-2 text-center font-black uppercase tracking-widest text-[9px] text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[40px] w-[40px]">
            #
          </th>
          <th className="sticky left-[40px] z-40 bg-slate-100 dark:bg-slate-800 px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-200 border-r-2 border-slate-300 dark:border-slate-600 min-w-[200px] whitespace-nowrap">
            Élèves ({filteredAndSortedStudents.length})
          </th>

          {displayedSubjects.map(subject => (
            <th
              key={subject.id}
              colSpan={visibleGradeColumnCount}
              className="bg-slate-100 dark:bg-slate-800 px-2 py-2 text-center font-semibold text-slate-700 dark:text-slate-200 border-x border-slate-300 dark:border-slate-700 whitespace-nowrap"
            >
              {subject.name}
            </th>
          ))}
        </tr>

        <tr className="border-b-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900">
          <th className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 text-center px-1 font-black text-slate-400 text-[9px] min-w-[40px] w-[40px]">
            #
          </th>
          <th className="sticky left-[40px] z-30 bg-slate-50 dark:bg-slate-900 border-r-2 border-slate-300 dark:border-slate-600 text-left px-4 py-3 font-bold text-blue-700 dark:text-blue-400">
            Nom et PostNom
          </th>
          {displayedSubjects.map(subject => {
            const hasExam1 = subject.max_exam1 > 0;
            const hasExam2 = subject.max_exam2 > 0;

            return (
              <React.Fragment key={subject.id}>
                {selectedPeriods.has('P1') && (
                  <th 
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P1', activeStudents.map(s => s.id), e.shiftKey)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p1}</span>
                  </th>
                )}

                {selectedPeriods.has('P2') && (
                  <th 
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P2', activeStudents.map(s => s.id), e.shiftKey)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p2}</span>
                  </th>
                )}

                {selectedPeriods.has('EXAM1') && (
                  <th 
                    onClick={(e) => hasExam1 && gradebookStore.selectColumn(subject.id, 'EXAM1', activeStudents.map(s => s.id), e.shiftKey)}
                    className={`px-2 py-2 text-xs font-medium border-r border-slate-300 dark:border-slate-600 min-w-[50px] ${
                    hasExam1
                      ? 'text-slate-600 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/30 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors'
                      : 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 opacity-60'
                  }`}>
                    Ex1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {hasExam1 ? `/${subject.max_exam1}` : 'N/A'}
                    </span>
                  </th>
                )}

                {(selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1')) && (
                  <th className="px-2 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 border-r-2 border-slate-400 dark:border-slate-500 bg-blue-100 dark:bg-blue-900/40 min-w-[60px]">
                    Sem1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p1 + subject.max_p2 + subject.max_exam1}</span>
                  </th>
                )}

                {selectedPeriods.has('P3') && (
                  <th 
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P3', activeStudents.map(s => s.id), e.shiftKey)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P3<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p3}</span>
                  </th>
                )}

                {selectedPeriods.has('P4') && (
                  <th 
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P4', activeStudents.map(s => s.id), e.shiftKey)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P4<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p4}</span>
                  </th>
                )}

                {selectedPeriods.has('EXAM2') && (
                  <th 
                    onClick={(e) => hasExam2 && gradebookStore.selectColumn(subject.id, 'EXAM2', activeStudents.map(s => s.id), e.shiftKey)}
                    className={`px-2 py-2 text-xs font-medium border-r border-slate-300 dark:border-slate-600 min-w-[50px] ${
                    hasExam2
                      ? 'text-slate-600 dark:text-slate-300 bg-green-50 dark:bg-green-900/30 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors'
                      : 'text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800 opacity-60'
                  }`}>
                    Ex2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {hasExam2 ? `/${subject.max_exam2}` : 'N/A'}
                    </span>
                  </th>
                )}

                {(selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2')) && (
                  <th className="px-2 py-2 text-xs font-semibold text-green-700 dark:text-green-400 border-r-2 border-slate-400 dark:border-slate-500 bg-green-100 dark:bg-green-900/40 min-w-[60px]">
                    Sem2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p3 + subject.max_p4 + subject.max_exam2}</span>
                  </th>
                )}
              </React.Fragment>
            );
          })}
        </tr>
      </thead>

      <tbody>
        {activeStudents.map((student, idx) => (
          <StudentRow
            key={student.id}
            student={student}
            idx={idx}
            subjects={displayedSubjects}
            gradesMap={gradesMap}
            onContextMenu={onContextMenu}
            onUpdateGrade={onGradeUpdate}
            selectedPeriods={selectedPeriods}
            lockedPeriods={lockedPeriods}
            correctionMax={correctionMax}
          />
        ))}
        {withdrawnStudents.length > 0 && (
          <>
            <tr>
              <td colSpan={2 + displayedSubjects.length * visibleGradeColumnCount} className="bg-red-50/50 dark:bg-red-900/10 px-4 py-2 border-y border-red-200 dark:border-red-900/30">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">
                    Retrait temporaire ({withdrawnStudents.length})
                  </span>
                </div>
              </td>
            </tr>
            {withdrawnStudents.map((student, idx) => (
              <StudentRow
                key={student.id}
                student={student}
                idx={activeStudents.length + idx}
                subjects={displayedSubjects}
                gradesMap={gradesMap}
                onContextMenu={onContextMenu}
                onUpdateGrade={onGradeUpdate}
                selectedPeriods={selectedPeriods}
                lockedPeriods={lockedPeriods}
                correctionMax={correctionMax}
              />
            ))}
          </>
        )}
      </tbody>

      {showStats && (
        <tfoot className="sticky bottom-0 z-10 bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-600 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <tr>
            <td className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 px-1 py-2 text-center border-r border-slate-200 dark:border-slate-700">
              <span className="text-[9px] font-black text-slate-400 uppercase">Σ</span>
            </td>
            <td className="sticky left-[40px] z-20 bg-slate-100 dark:bg-slate-800 px-4 py-2 border-r-2 border-slate-300 dark:border-slate-600">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Moy / Min / Max</span>
            </td>
            {displayedSubjects.map(subject => (
              <React.Fragment key={subject.id}>
                {selectedPeriods.has('P1') && <GradeStatCell statKey={`${subject.id}-P1`} columnStats={columnStats} />}
                {selectedPeriods.has('P2') && <GradeStatCell statKey={`${subject.id}-P2`} columnStats={columnStats} />}
                {selectedPeriods.has('EXAM1') && (
                  <GradeStatCell
                    statKey={`${subject.id}-EXAM1`}
                    columnStats={columnStats}
                    borderClass="border-r border-slate-300 dark:border-slate-600"
                  />
                )}
                {(selectedPeriods.has('P1') && selectedPeriods.has('P2') && selectedPeriods.has('EXAM1')) && (
                  <td className="px-1 py-2 border-r-2 border-slate-400 dark:border-slate-500 bg-blue-50/50 dark:bg-blue-900/20 min-w-[60px]" />
                )}
                {selectedPeriods.has('P3') && <GradeStatCell statKey={`${subject.id}-P3`} columnStats={columnStats} />}
                {selectedPeriods.has('P4') && <GradeStatCell statKey={`${subject.id}-P4`} columnStats={columnStats} />}
                {selectedPeriods.has('EXAM2') && (
                  <GradeStatCell
                    statKey={`${subject.id}-EXAM2`}
                    columnStats={columnStats}
                    borderClass="border-r border-slate-300 dark:border-slate-600"
                  />
                )}
                {(selectedPeriods.has('P3') && selectedPeriods.has('P4') && selectedPeriods.has('EXAM2')) && (
                  <td className="px-1 py-2 border-r-2 border-slate-400 dark:border-slate-500 bg-green-50/50 dark:bg-green-900/20 min-w-[60px]" />
                )}
              </React.Fragment>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
      {pasteIntent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Options de collage</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Vous êtes sur le point de coller {Math.min(pasteIntent.values.length, pasteIntent.cells.length)} valeur(s). Comment souhaitez-vous procéder ?
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => executePaste(true)}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span>Tout écraser</span>
                <span className="text-blue-200 text-xs font-normal group-hover:text-blue-100">Remplace les notes existantes</span>
              </button>
              
              <button
                onClick={() => executePaste(false)}
                className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span>Remplir les vides uniquement</span>
                <span className="text-slate-500 dark:text-slate-400 text-xs font-normal">Ignore les cases déjà remplies</span>
              </button>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setPasteIntent(null)}
                className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
