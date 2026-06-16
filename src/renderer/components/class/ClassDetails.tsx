import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ClassData, Subject } from '../../services/classService';
import { Student } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import AddStudentModal from './AddStudentModal';
import AddSubjectModal from './AddSubjectModal';
import CustomSortModal from './CustomSortModal';
import { CustomSort, customSortService } from '../../services/customSortService';
import ClassDetailsHeader from './classDetails/ClassDetailsHeader';
import ClassGradeTable from './classDetails/ClassGradeTable';
import { ALL_PERIODS } from './classDetails/gradeUtils';
import { useContextMenu } from '../../workbench/ContextMenuLayer';

interface ClassDetailsProps {
  classInfo: ClassData;
  subjects: Subject[];
  students: Student[];
  gradesMap: Map<string, number>;
  editingSubject: Subject | null;
  loading?: boolean;
  onEditStudent: (studentId: number) => void;
  onOpenBulletin: (studentId: number) => void;
  onOpenBulkPrint: () => void;
  onOpenCouponsPrint: () => void;
  onOpenPalmares: () => void;
  onUpdateGrade: (studentId: number, subjectId: number, period: string, value: number | null) => Promise<void>;
  onAddStudent: (student: Partial<Student>) => Promise<void>;
  onDeleteStudent: (studentId: number) => Promise<void>;
  onImportStudents: (students: Partial<Student>[]) => Promise<void>;
  onRefreshSubjects: () => Promise<void>;
  onRefreshAll: () => Promise<void>;
  onSetEditingSubject: (subject: Subject | null) => void;
  onOpenRepechage: (studentId: number) => void;
}

export default function ClassDetails({
  classInfo,
  subjects,
  students,
  gradesMap,
  editingSubject,
  loading,
  onEditStudent,
  onOpenBulletin,
  onOpenBulkPrint,
  onOpenCouponsPrint,
  onOpenPalmares,
  onUpdateGrade,
  onAddStudent,
  onDeleteStudent,
  onImportStudents,
  onRefreshSubjects,
  onRefreshAll,
  onSetEditingSubject,
  onOpenRepechage
}: ClassDetailsProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const popoverRef = useRef<HTMLDivElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  const [customSorts, setCustomSorts] = useState<CustomSort[]>([]);
  const [showCustomSortModal, setShowCustomSortModal] = useState(false);
  const [editingCustomSort, setEditingCustomSort] = useState<CustomSort | null>(null);
  const [showOnlyAbandons, setShowOnlyAbandons] = useState(false);
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set(ALL_PERIODS));
  const [lockedPeriods, setLockedPeriods] = useState<Set<string>>(new Set());
  const [focusedSubject, setFocusedSubject] = useState<number | 'all'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFiltersPopover, setShowFiltersPopover] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [correctionMaxInput, setCorrectionMaxInput] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const { showContextMenu } = useContextMenu();

  // État de la sélection multiple desktop-style (CTRL+clic sur les lignes)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());

  const loadCustomSorts = useCallback(async () => {
    if (!classInfo) return;
    try {
      const sorts = await customSortService.getByClass(classInfo.id);
      setCustomSorts(sorts);
    } catch (err) {
      console.error('Failed to load custom sorts', err);
    }
  }, [classInfo]);

  useEffect(() => {
    loadCustomSorts();
  }, [loadCustomSorts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowFiltersPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowFiltersPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const correctionMax = useMemo(() => {
    const parsed = parseFloat(correctionMaxInput);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [correctionMaxInput]);

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    if (showOnlyAbandons) {
      result = result.filter(s => Boolean((s as Student).is_abandoned));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.last_name.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        (s.post_name && s.post_name.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => {
      if (sortOrder.startsWith('custom_')) {
        const customId = parseInt(sortOrder.replace('custom_', ''), 10);
        const sortProfile = customSorts.find(s => s.id === customId);
        if (sortProfile) {
          try {
            const orderMap = JSON.parse(sortProfile.student_order);
            const posA = orderMap[a.id] ?? 9999;
            const posB = orderMap[b.id] ?? 9999;
            const isWithdrawnA = posA === -1;
            const isWithdrawnB = posB === -1;

            if (isWithdrawnA && !isWithdrawnB) return 1;
            if (!isWithdrawnA && isWithdrawnB) return -1;
            if (posA !== posB) return posA - posB;
          } catch (e) {}
        }
      }

      const nameA = `${a.last_name} ${a.post_name}`;
      const nameB = `${b.last_name} ${b.post_name}`;
      return sortOrder === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
    });

    return result;
  }, [students, showOnlyAbandons, searchQuery, sortOrder, customSorts]);

  const displayedSubjects = useMemo(() => {
    if (focusedSubject === 'all') return subjects;
    return subjects.filter(s => s.id === focusedSubject);
  }, [subjects, focusedSubject]);

  const progressData = useMemo(() => {
    const data: Record<string, { filled: number; total: number }> = {};
    for (const period of ALL_PERIODS) {
      let filled = 0;
      let total = 0;
      for (const student of filteredAndSortedStudents) {
        for (const subject of displayedSubjects) {
          const isExamDisabled = (period === 'EXAM1' && subject.max_exam1 === 0) || (period === 'EXAM2' && subject.max_exam2 === 0);
          if (isExamDisabled) continue;
          total++;
          const val = gradesMap.get(`${student.id}-${subject.id}-${period}`);
          if (val !== undefined) filled++;
        }
      }
      data[period] = { filled, total };
    }
    return data;
  }, [filteredAndSortedStudents, displayedSubjects, gradesMap]);

  const columnStats = useMemo(() => {
    const stats: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    const targetPeriods = Array.from(selectedPeriods);
    for (const subject of displayedSubjects) {
      for (const period of targetPeriods) {
        const key = `${subject.id}-${period}`;
        const values: number[] = [];
        for (const student of filteredAndSortedStudents) {
          const val = gradesMap.get(`${student.id}-${subject.id}-${period}`);
          if (val !== undefined) values.push(val);
        }
        if (values.length > 0) {
          stats[key] = {
            avg: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length
          };
        }
      }
    }
    return stats;
  }, [displayedSubjects, filteredAndSortedStudents, gradesMap, selectedPeriods]);

  const toggleLockPeriod = (period: string) => {
    setLockedPeriods(prev => {
      const next = new Set(prev);
      if (next.has(period)) next.delete(period);
      else next.add(period);
      return next;
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshAll();
      toast.success('Données actualisées');
    } catch {
      toast.error('Erreur lors de l\'actualisation');
    } finally {
      setRefreshing(false);
    }
  };

  const handleExportCSV = () => {
    if (!classInfo) return;
    const periods = ALL_PERIODS.filter(p => selectedPeriods.has(p));
    let csv = 'N°,Nom,Prénom';
    for (const subject of displayedSubjects) {
      for (const period of periods) {
        csv += `,${subject.name} ${period}`;
      }
    }
    csv += '\n';

    filteredAndSortedStudents.forEach((student, idx) => {
      csv += `${idx + 1},${student.last_name},${student.first_name}`;
      for (const subject of displayedSubjects) {
        for (const period of periods) {
          const val = gradesMap.get(`${student.id}-${subject.id}-${period}`);
          csv += `,${val !== undefined ? val : ''}`;
        }
      }
      csv += '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classInfo.name}_notes.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const onGradeUpdate = useCallback(async (studentId: number, subjectId: number, period: string, value: number | null) => {
    try {
      await onUpdateGrade(studentId, subjectId, period, value);
    } catch (error) {
      console.error('Failed to update grade:', error);
      toast.error('Erreur lors de la mise à jour de la note');
    }
  }, [onUpdateGrade, toast]);

  // Gestion CTRL+clic sur les lignes d'élèves (sélection multiple)
  const handleToggleSelectStudent = useCallback((studentId: number, withCtrl: boolean) => {
    if (withCtrl) {
      // CTRL+clic : ajoute/retire de la sélection
      setSelectedStudentIds(prev => {
        const next = new Set(prev);
        if (next.has(studentId)) {
          next.delete(studentId);
        } else {
          next.add(studentId);
        }
        return next;
      });
    } else {
      // Clic simple sans CTRL : vide la sélection (on laisse le gradebook gérer la sélection cellules)
      setSelectedStudentIds(new Set());
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, student: Student) => {
    e.preventDefault();

    // Si cet élève fait partie de la sélection multiple, le menu s'applique à tous
    const targetIds = selectedStudentIds.has(student.id) && selectedStudentIds.size > 1
      ? Array.from(selectedStudentIds)
      : [student.id];
    const isMulti = targetIds.length > 1;

    showContextMenu(e, [
      // En-tête du menu (titre non-cliquable)
      {
        label: isMulti ? `${targetIds.length} élèves sélectionnés` : `${student.first_name} ${student.last_name}`,
        action: () => {}
      },
      { separator: true, label: '' },
      // Actions individu uniquement
      ...(!isMulti ? [
        { label: 'Modifier l\'information', action: () => onEditStudent(student.id) },
        { label: 'Voir le bulletin', action: () => onOpenBulletin(student.id) },
        { label: 'Examen de repêchage', action: () => onOpenRepechage(student.id) },
        { separator: true, label: '' }
      ] : []),
      // Action de suppression (s'applique à tous)
      {
        label: isMulti ? `Supprimer les ${targetIds.length} élèves` : 'Supprimer l\'entrée',
        danger: true,
        action: async () => {
          const confirmed = await toast.confirm({
            title: 'Supprimer',
            message: isMulti
              ? `Supprimer définitivement ces ${targetIds.length} élèves et toutes leurs notes ?`
              : `Supprimer ${student.last_name} définitivement ? Cette action est irréversible.`,
            confirmLabel: 'Supprimer',
            cancelLabel: 'Annuler',
            variant: 'danger'
          });
          if (confirmed) {
            for (const id of targetIds) await onDeleteStudent(id);
            setSelectedStudentIds(new Set());
          }
        }
      }
    ]);
  }, [showContextMenu, onEditStudent, onOpenBulletin, onOpenRepechage, onDeleteStudent, toast, selectedStudentIds]);

  const handleCreateCustomSort = () => {
    setEditingCustomSort(null);
    setShowCustomSortModal(true);
  };

  const handleEditCustomSort = (sort: CustomSort) => {
    setEditingCustomSort(sort);
    setShowCustomSortModal(true);
  };

  const handleDeleteCustomSort = async (customId: number) => {
    const confirmed = await toast.confirm({
      title: 'Supprimer le tri',
      message: 'Êtes-vous sûr de vouloir supprimer ce profil de tri ?',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger'
    });
    if (!confirmed) return;

    await customSortService.delete(customId);
    await loadCustomSorts();
    setSortOrder('asc');
  };

  return (
    <div className={`flex-1 flex flex-col h-full bg-slate-50/50 dark:bg-[#020617] min-h-0 transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[100]' : ''}`}>
      {classInfo && (
        <ClassDetailsHeader
          classInfo={classInfo}
          students={students}
          subjects={subjects}
          refreshing={refreshing}
          searchQuery={searchQuery}
          sortOrder={sortOrder}
          customSorts={customSorts}
          selectedPeriods={selectedPeriods}
          lockedPeriods={lockedPeriods}
          focusedSubject={focusedSubject}
          showFiltersPopover={showFiltersPopover}
          showOnlyAbandons={showOnlyAbandons}
          showStats={showStats}
          isFullscreen={isFullscreen}
          correctionMax={correctionMax}
          correctionMaxInput={correctionMaxInput}
          progressData={progressData}
          popoverRef={popoverRef}
          setSearchQuery={setSearchQuery}
          setSortOrder={setSortOrder}
          setSelectedPeriods={setSelectedPeriods}
          setFocusedSubject={setFocusedSubject}
          setShowFiltersPopover={setShowFiltersPopover}
          setShowOnlyAbandons={setShowOnlyAbandons}
          setShowStats={setShowStats}
          setCorrectionMaxInput={setCorrectionMaxInput}
          toggleLockPeriod={toggleLockPeriod}
          onBack={() => navigate('/dashboard')}
          onRefresh={handleRefresh}
          onOpenPalmares={onOpenPalmares}
          onOpenCouponsPrint={onOpenCouponsPrint}
          onOpenBulkPrint={onOpenBulkPrint}
          onExportCSV={handleExportCSV}
          onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
          onShowAddSubject={() => setShowAddSubjectModal(true)}
          onShowAddStudent={() => setShowAddModal(true)}
          onCreateCustomSort={handleCreateCustomSort}
          onEditCustomSort={handleEditCustomSort}
          onDeleteCustomSort={handleDeleteCustomSort}
          onPredictionsApplied={handleRefresh}
        />
      )}

      <div className="flex-1 overflow-auto relative">
        {loading && students.length === 0 ? (
          <div className="absolute top-0 left-0 right-0 z-40">
            <div className="h-0.5 w-full bg-blue-500/20 overflow-hidden">
              <div className="h-full bg-blue-500 animate-loading" style={{ width: '30%' }}></div>
            </div>
          </div>
        ) : !classInfo ? (
          <div className="p-8 text-center text-slate-500">Aucune donnée trouvée pour cette classe.</div>
        ) : (
          <>
            {loading && (
              <div className="absolute top-0 left-0 right-0 z-40">
                <div className="h-0.5 w-full bg-blue-500/20 overflow-hidden">
                  <div className="h-full bg-blue-500 animate-loading" style={{ width: '30%' }}></div>
                </div>
              </div>
            )}

            <ClassGradeTable
              displayedSubjects={displayedSubjects}
              filteredAndSortedStudents={filteredAndSortedStudents}
              customSorts={customSorts}
              sortOrder={sortOrder}
              gradesMap={gradesMap}
              selectedPeriods={selectedPeriods}
              lockedPeriods={lockedPeriods}
              correctionMax={correctionMax}
              showStats={showStats}
              columnStats={columnStats}
              onContextMenu={handleContextMenu}
              onGradeUpdate={onGradeUpdate}
              selectedStudentIds={selectedStudentIds}
              onToggleSelectStudent={handleToggleSelectStudent}
            />
          </>
        )}
      </div>

      {showAddModal && (
        <AddStudentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAddStudent={onAddStudent}
          onImportStudents={onImportStudents}
          classId={Number(id)}
          currentStudentCount={students.length}
        />
      )}

      {showAddSubjectModal && (
        <AddSubjectModal
          classId={Number(id)}
          classLevel={classInfo?.level || ''}
          subjects={subjects}
          editingSubject={editingSubject}
          onSelectSubject={(subject) => {
            onSetEditingSubject(subject);
            setShowAddSubjectModal(true);
          }}
          onClose={() => {
            onSetEditingSubject(null);
            setShowAddSubjectModal(false);
          }}
          onSuccess={() => {
            onRefreshSubjects();
            onSetEditingSubject(null);
          }}
        />
      )}

      {showCustomSortModal && (
        <CustomSortModal
          isOpen={showCustomSortModal}
          onClose={() => setShowCustomSortModal(false)}
          students={students}
          existingSorts={customSorts}
          initialProfile={editingCustomSort}
          onSave={async (name, sortMap) => {
            if (!classInfo) return;
            if (editingCustomSort) {
              await customSortService.update(editingCustomSort.id, name, sortMap);
              await loadCustomSorts();
              setSortOrder(`custom_${editingCustomSort.id}`);
            } else {
              const newId = await customSortService.create(classInfo.id, name, sortMap);
              await loadCustomSorts();
              setSortOrder(`custom_${newId}`);
            }
          }}
        />
      )}
    </div>
  );
}
