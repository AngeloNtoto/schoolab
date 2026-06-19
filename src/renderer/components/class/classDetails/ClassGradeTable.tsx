import React, { useEffect, useState } from 'react';
import { gradebookStore, getCellKey } from '../../../context/gradebookSelection';
import { Subject } from '../../../services/classService';
import { Student } from '../../../services/studentService';
import { CustomSort } from '../../../services/customSortService';
import { repechageService } from '../../../services/repechageService';
import { useContextMenu } from '../../../workbench/ContextMenuLayer';
import { useToast } from '../../../context/ToastContext';
import StudentRow from './StudentRow';
import { ColumnStats, getVisibleGradeColumnCount } from './gradeUtils';
import BulkRepechageModal from './BulkRepechageModal';

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
  // Sélection multiple desktop-style (CTRL+clic)
  selectedStudentIds: Set<number>;
  onToggleSelectStudent: (studentId: number, withCtrl: boolean) => void;
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
  onGradeUpdate,
  selectedStudentIds,
  onToggleSelectStudent
}: ClassGradeTableProps) {
  const { showContextMenu } = useContextMenu();
  const toast = useToast();
  const visibleGradeColumnCount = getVisibleGradeColumnCount(selectedPeriods);
  const orderMap = sortOrder.startsWith('custom_')
    ? (() => {
        const profile = customSorts.find(s => s.id === parseInt(sortOrder.replace('custom_', ''), 10));
        return profile ? JSON.parse(profile.student_order) : {};
      })()
    : {};

  const [pasteIntent, setPasteIntent] = useState<{ values: string[], cells: string[] } | null>(null);
  const [repechageModalSubject, setRepechageModalSubject] = useState<Subject | null>(null);

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

  const handleHeaderContextMenu = (e: React.MouseEvent, subject: Subject, period: string, max: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (max <= 0) return;

    const state = gradebookStore.getState();
    const selectedCells = state.selectedCells.size > 0 ? Array.from(state.selectedCells) : [];
    
    const selectedColsSet = new Set<string>();
    selectedCells.forEach(key => {
      const [, sb, p] = key.split('-');
      selectedColsSet.add(`${sb}-${p}`);
    });

    const clickedColKey = `${subject.id}-${period}`;
    const targetCols = selectedColsSet.has(clickedColKey) 
      ? Array.from(selectedColsSet) 
      : [clickedColKey];

    const isMulti = targetCols.length > 1;
    const titleLabel = isMulti 
      ? `${targetCols.length} colonnes sélectionnées` 
      : `Colonne: ${subject.name} - ${period} (/ ${max})`;

    showContextMenu(e, [
      { label: titleLabel, action: () => {} },
      { separator: true, label: '' },
      { 
        label: isMulti ? 'Mettre la note maximum partout' : 'Mettre la note maximum à tous', 
        action: async () => {
          if (await toast.confirm({ title: 'Confirmation', message: `Voulez-vous vraiment attribuer le maximum à tous les élèves pour ${isMulti ? 'ces colonnes' : 'cette colonne'} ?` })) {
            for (const colKey of targetCols) {
              const [sbStr, p] = colKey.split('-');
              const sbId = parseInt(sbStr, 10);
              const subj = displayedSubjects.find(s => s.id === sbId);
              if (!subj) continue;
              let colMax = 0;
              switch (p) {
                case 'P1': colMax = subj.max_p1; break;
                case 'P2': colMax = subj.max_p2; break;
                case 'EXAM1': colMax = subj.max_exam1; break;
                case 'P3': colMax = subj.max_p3; break;
                case 'P4': colMax = subj.max_p4; break;
                case 'EXAM2': colMax = subj.max_exam2; break;
              }
              if (colMax > 0) {
                for (const s of activeStudents) await onGradeUpdate(s.id, sbId, p, colMax);
              }
            }
          }
        } 
      },
      { 
        label: 'Attribuer une note spécifique...', 
        action: async () => {
          const val = await toast.prompt({ title: 'Note spécifique', message: `Saisissez la note à attribuer :` });
          if (val !== null) {
            const numVal = parseFloat(val.replace(',', '.'));
            if (!isNaN(numVal) && numVal >= 0) {
              for (const colKey of targetCols) {
                const [sbStr, p] = colKey.split('-');
                const sbId = parseInt(sbStr, 10);
                const subj = displayedSubjects.find(s => s.id === sbId);
                if (!subj) continue;
                let colMax = 0;
                switch (p) {
                  case 'P1': colMax = subj.max_p1; break;
                  case 'P2': colMax = subj.max_p2; break;
                  case 'EXAM1': colMax = subj.max_exam1; break;
                  case 'P3': colMax = subj.max_p3; break;
                  case 'P4': colMax = subj.max_p4; break;
                  case 'EXAM2': colMax = subj.max_exam2; break;
                }
                if (numVal <= colMax) {
                  for (const s of activeStudents) await onGradeUpdate(s.id, sbId, p, numVal);
                }
              }
            } else {
              await toast.alert('Erreur', 'Valeur invalide');
            }
          }
        } 
      },
      { 
        label: isMulti ? 'Vider les colonnes' : 'Vider la colonne', 
        action: async () => {
          if (await toast.confirm({ title: 'Attention', message: `Effacer toutes les notes de ${isMulti ? 'ces colonnes' : 'cette colonne'} ? Cette action est irréversible.`, variant: 'danger' })) {
            for (const colKey of targetCols) {
              const [sbStr, p] = colKey.split('-');
              const sbId = parseInt(sbStr, 10);
              for (const s of activeStudents) await onGradeUpdate(s.id, sbId, p, null);
            }
          }
        }, 
        danger: true 
      },
      { separator: true, label: '' },
      { 
        label: 'Décaler les notes vers le bas ↓', 
        action: async () => {
          for (const colKey of targetCols) {
            const [sbStr, p] = colKey.split('-');
            const sbId = parseInt(sbStr, 10);
            for (let i = activeStudents.length - 1; i > 0; i--) {
              const prevVal = gradesMap.get(getCellKey({studentId: activeStudents[i-1].id, subjectId: sbId, period: p}));
              await onGradeUpdate(activeStudents[i].id, sbId, p, prevVal ?? null);
            }
            await onGradeUpdate(activeStudents[0].id, sbId, p, null);
          }
        } 
      },
      { 
        label: 'Décaler les notes vers le haut ↑', 
        action: async () => {
          for (const colKey of targetCols) {
            const [sbStr, p] = colKey.split('-');
            const sbId = parseInt(sbStr, 10);
            for (let i = 0; i < activeStudents.length - 1; i++) {
              const nextVal = gradesMap.get(getCellKey({studentId: activeStudents[i+1].id, subjectId: sbId, period: p}));
              await onGradeUpdate(activeStudents[i].id, sbId, p, nextVal ?? null);
            }
            await onGradeUpdate(activeStudents[activeStudents.length - 1].id, sbId, p, null);
          }
        } 
      }
    ]);
  };

  // Menu contextuel riche pour le nom du cours (matière) dans l'en-tête de la grille
  const handleSubjectContextMenu = (e: React.MouseEvent, subject: Subject) => {
    e.preventDefault();
    e.stopPropagation();

    // Calcul rapide des statistiques du cours pour l'affichage dans le menu
    const allPeriods = Array.from(selectedPeriods);
    const totalMax = allPeriods.reduce((sum, p) => {
      switch (p) {
        case 'P1': return sum + subject.max_p1;
        case 'P2': return sum + subject.max_p2;
        case 'EXAM1': return sum + subject.max_exam1;
        case 'P3': return sum + subject.max_p3;
        case 'P4': return sum + subject.max_p4;
        case 'EXAM2': return sum + subject.max_exam2;
        default: return sum;
      }
    }, 0);

    // Compter les notes remplies et vides pour ce cours
    let filledCount = 0;
    let emptyCount = 0;
    for (const p of allPeriods) {
      for (const s of activeStudents) {
        const key = getCellKey({ studentId: s.id, subjectId: subject.id, period: p });
        if (gradesMap.has(key)) filledCount++;
        else emptyCount++;
      }
    }

    showContextMenu(e, [
      // En-tête informatif avec statistiques rapides
      { label: `📘 ${subject.name} (max total: ${totalMax})`, action: () => {} },
      { label: `   ${filledCount} notes saisies · ${emptyCount} vides`, action: () => {} },
      { separator: true, label: '' },

      // --- Sélection ---
      {
        label: '✅ Sélectionner toutes les colonnes du cours',
        action: () => {
          // Sélectionne toutes les périodes visibles de ce cours
          for (const p of allPeriods) {
            let max = 0;
            switch (p) {
              case 'P1': max = subject.max_p1; break;
              case 'P2': max = subject.max_p2; break;
              case 'EXAM1': max = subject.max_exam1; break;
              case 'P3': max = subject.max_p3; break;
              case 'P4': max = subject.max_p4; break;
              case 'EXAM2': max = subject.max_exam2; break;
            }
            if (max > 0) {
              gradebookStore.selectColumn(subject.id, p, activeStudents.map(s => s.id), true);
            }
          }
        }
      },
      { separator: true, label: '' },

      // --- Repêchage ---
      {
        label: 'Examen de repêchage...',
        action: () => handleRepechageForSubject(subject)
      },
      { separator: true, label: '' },

      // --- Remplissage ---
      {
        label: 'Mettre le maximum à tout le cours',
        action: async () => {
          if (await toast.confirm({ title: 'Confirmation', message: `Attribuer le maximum à TOUTES les périodes pour ${subject.name} ?` })) {
            for (const p of allPeriods) {
              let max = 0;
              switch (p) {
                case 'P1': max = subject.max_p1; break;
                case 'P2': max = subject.max_p2; break;
                case 'EXAM1': max = subject.max_exam1; break;
                case 'P3': max = subject.max_p3; break;
                case 'P4': max = subject.max_p4; break;
                case 'EXAM2': max = subject.max_exam2; break;
              }
              if (max > 0) {
                for (const s of activeStudents) await onGradeUpdate(s.id, subject.id, p, max);
              }
            }
          }
        }
      },
      {
        label: 'Remplir uniquement les cases vides...',
        action: async () => {
          const val = await toast.prompt({ title: 'Remplir', message: `Saisissez la note à attribuer aux cases vides de ${subject.name} :` });
          if (val !== null) {
            const numVal = parseFloat(val.replace(',', '.'));
            if (!isNaN(numVal) && numVal >= 0) {
              for (const p of allPeriods) {
                let max = 0;
                switch (p) {
                  case 'P1': max = subject.max_p1; break;
                  case 'P2': max = subject.max_p2; break;
                  case 'EXAM1': max = subject.max_exam1; break;
                  case 'P3': max = subject.max_p3; break;
                  case 'P4': max = subject.max_p4; break;
                  case 'EXAM2': max = subject.max_exam2; break;
                }
                if (max > 0 && numVal <= max) {
                  for (const s of activeStudents) {
                    const key = getCellKey({ studentId: s.id, subjectId: subject.id, period: p });
                    // Ne remplir que si la cellule est vide
                    if (!gradesMap.has(key)) {
                      await onGradeUpdate(s.id, subject.id, p, numVal);
                    }
                  }
                }
              }
            } else {
              await toast.alert('Erreur', 'Valeur invalide');
            }
          }
        }
      },
      { separator: true, label: '' },

      // --- Vidage sélectif ---
      {
        label: 'Vider le Semestre 1 (P1 + P2 + Ex1)',
        action: async () => {
          if (await toast.confirm({ title: 'Attention', message: `Effacer les notes du Sem.1 pour ${subject.name} ?`, variant: 'danger' })) {
            for (const p of ['P1', 'P2', 'EXAM1']) {
              if (selectedPeriods.has(p)) {
                for (const s of activeStudents) await onGradeUpdate(s.id, subject.id, p, null);
              }
            }
          }
        },
        danger: true
      },
      {
        label: 'Vider le Semestre 2 (P3 + P4 + Ex2)',
        action: async () => {
          if (await toast.confirm({ title: 'Attention', message: `Effacer les notes du Sem.2 pour ${subject.name} ?`, variant: 'danger' })) {
            for (const p of ['P3', 'P4', 'EXAM2']) {
              if (selectedPeriods.has(p)) {
                for (const s of activeStudents) await onGradeUpdate(s.id, subject.id, p, null);
              }
            }
          }
        },
        danger: true
      },
      {
        label: 'Vider complètement ce cours',
        action: async () => {
          if (await toast.confirm({ title: 'Attention', message: `Effacer TOUTES les notes de TOUTES les périodes pour ${subject.name} ? Cette action est irréversible.`, variant: 'danger' })) {
            for (const p of allPeriods) {
              for (const s of activeStudents) {
                await onGradeUpdate(s.id, subject.id, p, null);
              }
            }
          }
        },
        danger: true
      },
      { separator: true, label: '' },

      // --- Copie entre périodes ---
      {
        label: 'Copier P1 → P2',
        action: async () => {
          if (subject.max_p1 > 0 && subject.max_p2 > 0) {
            if (await toast.confirm({ title: 'Copie', message: `Copier les notes de P1 vers P2 pour ${subject.name} ? Les notes existantes en P2 seront écrasées.` })) {
              for (const s of activeStudents) {
                const val = gradesMap.get(getCellKey({ studentId: s.id, subjectId: subject.id, period: 'P1' })) ?? null;
                await onGradeUpdate(s.id, subject.id, 'P2', val);
              }
            }
          } else {
            await toast.alert('Erreur', 'P1 ou P2 n\'est pas configuré pour ce cours.');
          }
        }
      },
      {
        label: 'Copier P3 → P4',
        action: async () => {
          if (subject.max_p3 > 0 && subject.max_p4 > 0) {
            if (await toast.confirm({ title: 'Copie', message: `Copier les notes de P3 vers P4 pour ${subject.name} ? Les notes existantes en P4 seront écrasées.` })) {
              for (const s of activeStudents) {
                const val = gradesMap.get(getCellKey({ studentId: s.id, subjectId: subject.id, period: 'P3' })) ?? null;
                await onGradeUpdate(s.id, subject.id, 'P4', val);
              }
            }
          } else {
            await toast.alert('Erreur', 'P3 ou P4 n\'est pas configuré pour ce cours.');
          }
        }
      },
      {
        label: 'Copier Sem.1 → Sem.2',
        action: async () => {
          if (await toast.confirm({ title: 'Copie', message: `Dupliquer P1→P3, P2→P4 et Ex1→Ex2 pour ${subject.name} ?` })) {
            const mapping: [string, string][] = [['P1', 'P3'], ['P2', 'P4'], ['EXAM1', 'EXAM2']];
            for (const [from, to] of mapping) {
              for (const s of activeStudents) {
                const val = gradesMap.get(getCellKey({ studentId: s.id, subjectId: subject.id, period: from })) ?? null;
                await onGradeUpdate(s.id, subject.id, to, val);
              }
            }
          }
        }
      }
    ]);
  };

  // ============================================================================
  // REPECHAGE — Ouvre le nouveau modal
  // ============================================================================
  const handleRepechageForSubject = (subject: Subject) => {
    setRepechageModalSubject(subject);
  };

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

  const handleBodyContextMenu = (e: React.MouseEvent) => {
    // Si on a une sélection de cellules
    const state = gradebookStore.getState();
    const selectedCells = state.selectedCells.size > 0 ? Array.from(state.selectedCells) : [];
    
    if (selectedCells.length > 0) {
      e.preventDefault();
      e.stopPropagation();

      showContextMenu(e, [
        { label: `${selectedCells.length} cellules sélectionnées`, action: () => {} },
        { separator: true, label: '' },
        {
          label: 'Vider la sélection',
          action: async () => {
            if (await toast.confirm({ title: 'Attention', message: `Effacer les notes des ${selectedCells.length} cellules ?`, variant: 'danger' })) {
              for (const cellKey of selectedCells) {
                const [studentIdStr, subjectIdStr, period] = cellKey.split('-');
                await onGradeUpdate(parseInt(studentIdStr, 10), parseInt(subjectIdStr, 10), period, null);
              }
            }
          },
          danger: true
        },
        {
          label: 'Attribuer une note...',
          action: async () => {
            const val = await toast.prompt({ title: 'Note', message: `Saisissez la note pour ces ${selectedCells.length} cellules :` });
            if (val !== null) {
              const numVal = parseFloat(val.replace(',', '.'));
              if (!isNaN(numVal) && numVal >= 0) {
                for (const cellKey of selectedCells) {
                  const [studentIdStr, subjectIdStr, period] = cellKey.split('-');
                  // Note: Il faudrait vérifier max, on laisse passer pour plus de flexibilité dans la sélection
                  await onGradeUpdate(parseInt(studentIdStr, 10), parseInt(subjectIdStr, 10), period, numVal);
                }
              }
            }
          }
        },
        { separator: true, label: '' },
        {
          label: 'Décaler la sélection vers le bas ↓',
          action: async () => {
            // Pour chaque cellule, on déplace la valeur au student_id suivant
            // On traite les étudiants de bas en haut pour ne pas écraser les valeurs
            const cellsByCol = new Map<string, {studentId: number, subjectId: number, period: string, val: number | null}>();
            selectedCells.forEach(key => {
              const [st, sb, p] = key.split('-');
              cellsByCol.set(key, { studentId: parseInt(st, 10), subjectId: parseInt(sb, 10), period: p, val: gradesMap.get(key) ?? null });
            });

            // Grouper par colonne (subject-period)
            const cols = new Map<string, number[]>();
            selectedCells.forEach(key => {
              const [st, sb, p] = key.split('-');
              const colKey = `${sb}-${p}`;
              if (!cols.has(colKey)) cols.set(colKey, []);
              cols.get(colKey)!.push(parseInt(st, 10));
            });

            for (const [colKey, studentIds] of cols.entries()) {
              const [sb, p] = colKey.split('-');
              const subjectId = parseInt(sb, 10);
              // Trier les studentIds selon leur ordre d'affichage (pour décaler de haut en bas)
              const sortedIdx = studentIds.map(id => activeStudents.findIndex(s => s.id === id)).filter(idx => idx !== -1).sort((a, b) => b - a); // Inverse pour descendre
              
              for (const idx of sortedIdx) {
                if (idx < activeStudents.length - 1) {
                  const currentStId = activeStudents[idx].id;
                  const nextStId = activeStudents[idx + 1].id;
                  const currentVal = gradesMap.get(getCellKey({ studentId: currentStId, subjectId, period: p })) ?? null;
                  await onGradeUpdate(nextStId, subjectId, p, currentVal);
                  await onGradeUpdate(currentStId, subjectId, p, null); // Vide l'ancienne case
                }
              }
            }
          }
        },
        {
          label: 'Décaler la sélection vers le haut ↑',
          action: async () => {
            const cols = new Map<string, number[]>();
            selectedCells.forEach(key => {
              const [st, sb, p] = key.split('-');
              const colKey = `${sb}-${p}`;
              if (!cols.has(colKey)) cols.set(colKey, []);
              cols.get(colKey)!.push(parseInt(st, 10));
            });

            for (const [colKey, studentIds] of cols.entries()) {
              const [sb, p] = colKey.split('-');
              const subjectId = parseInt(sb, 10);
              // Trier normal (de haut en bas) pour remonter sans écraser
              const sortedIdx = studentIds.map(id => activeStudents.findIndex(s => s.id === id)).filter(idx => idx !== -1).sort((a, b) => a - b);
              
              for (const idx of sortedIdx) {
                if (idx > 0) {
                  const currentStId = activeStudents[idx].id;
                  const prevStId = activeStudents[idx - 1].id;
                  const currentVal = gradesMap.get(getCellKey({ studentId: currentStId, subjectId, period: p })) ?? null;
                  await onGradeUpdate(prevStId, subjectId, p, currentVal);
                  await onGradeUpdate(currentStId, subjectId, p, null); // Vide l'ancienne case
                }
              }
            }
          }
        }
      ]);
    }
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
              onContextMenu={(e) => handleSubjectContextMenu(e, subject)}
              className="bg-slate-100 dark:bg-slate-800 px-2 py-2 text-center font-semibold text-slate-700 dark:text-slate-200 border-x border-slate-300 dark:border-slate-700 whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
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
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P1', activeStudents.map(s => s.id), e.shiftKey || e.ctrlKey || e.metaKey)}
                    onContextMenu={(e) => handleHeaderContextMenu(e, subject, 'P1', subject.max_p1)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P1<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p1}</span>
                  </th>
                )}

                {selectedPeriods.has('P2') && (
                  <th 
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P2', activeStudents.map(s => s.id), e.shiftKey || e.ctrlKey || e.metaKey)}
                    onContextMenu={(e) => handleHeaderContextMenu(e, subject, 'P2', subject.max_p2)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P2<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p2}</span>
                  </th>
                )}

                {selectedPeriods.has('EXAM1') && (
                  <th 
                    onClick={(e) => hasExam1 && gradebookStore.selectColumn(subject.id, 'EXAM1', activeStudents.map(s => s.id), e.shiftKey || e.ctrlKey || e.metaKey)}
                    onContextMenu={(e) => hasExam1 && handleHeaderContextMenu(e, subject, 'EXAM1', subject.max_exam1)}
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
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P3', activeStudents.map(s => s.id), e.shiftKey || e.ctrlKey || e.metaKey)}
                    onContextMenu={(e) => handleHeaderContextMenu(e, subject, 'P3', subject.max_p3)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P3<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p3}</span>
                  </th>
                )}

                {selectedPeriods.has('P4') && (
                  <th 
                    onClick={(e) => gradebookStore.selectColumn(subject.id, 'P4', activeStudents.map(s => s.id), e.shiftKey || e.ctrlKey || e.metaKey)}
                    onContextMenu={(e) => handleHeaderContextMenu(e, subject, 'P4', subject.max_p4)}
                    className="px-2 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 min-w-[50px] cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    P4<br/><span className="text-[10px] text-slate-400 dark:text-slate-500">/{subject.max_p4}</span>
                  </th>
                )}

                {selectedPeriods.has('EXAM2') && (
                  <th 
                    onClick={(e) => hasExam2 && gradebookStore.selectColumn(subject.id, 'EXAM2', activeStudents.map(s => s.id), e.shiftKey || e.ctrlKey || e.metaKey)}
                    onContextMenu={(e) => hasExam2 && handleHeaderContextMenu(e, subject, 'EXAM2', subject.max_exam2)}
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

      <tbody onContextMenu={handleBodyContextMenu}>
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
            selectedStudentIds={selectedStudentIds}
            onToggleSelectStudent={onToggleSelectStudent}
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
                selectedStudentIds={selectedStudentIds}
                onToggleSelectStudent={onToggleSelectStudent}
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

      {/* Modal de Repêchage */}
      <BulkRepechageModal
        isOpen={!!repechageModalSubject}
        onClose={() => setRepechageModalSubject(null)}
        subject={repechageModalSubject}
        students={activeStudents}
      />
    </>
  );
}
