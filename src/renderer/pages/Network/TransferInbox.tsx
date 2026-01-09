import React, { useState, useEffect } from 'react';
import { Inbox, FileJson, Check, X, Clock, AlertTriangle, Copy, Trash2, Merge } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function TransferInbox() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [conflict, setConflict] = useState<{
    filename: string;
    data: any;
    existingClassId: number;
    className: string;
  } | null>(null);
  const toast = useToast();

  useEffect(() => {
    loadTransfers();
    
    const removeListener = window.api.network.onTransferReceived(() => {
      loadTransfers();
    });

    return () => removeListener();
  }, []);

  const loadTransfers = async () => {
    const list = await window.api.network.getPendingTransfers();
    setTransfers(list || []);
  };

  const importClassData = async (data: any) => {
    const { classInfo, students, grades, subjects } = data;

    try {
      // Get active academic year
      const activeYear = (await window.api.db.query('SELECT id FROM academic_years WHERE is_active = 1'))[0];
      const academicYearId = activeYear ? activeYear.id : classInfo.academic_year_id;

      // 1. Insert Class
      const resultClass = await window.api.db.query(
        'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?) RETURNING id',
        [classInfo.name, classInfo.level, classInfo.option, classInfo.section, academicYearId]
      );
      const newClassId = resultClass[0].id;

      // 2. Insert Subjects & Map IDs
      const subjectIdMap = new Map();
      if (subjects && subjects.length > 0) {
        for (const sub of subjects) {
          const resultSub = await window.api.db.query(
            'INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
            [sub.name, sub.code, sub.max_p1, sub.max_p2, sub.max_exam1, sub.max_p3, sub.max_p4, sub.max_exam2, newClassId, sub.domain_id]
          );
          subjectIdMap.set(sub.id, resultSub[0].id);
        }
      }

      // 3. Insert Students & Map IDs
      const studentIdMap = new Map();
      if (students && students.length > 0) {
        for (const stu of students) {
          const resultStu = await window.api.db.query(
            'INSERT INTO students (first_name, last_name, post_name, gender, birth_date, birthplace, class_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
            [stu.first_name, stu.last_name, stu.post_name, stu.gender, stu.birth_date, stu.birthplace, newClassId]
          );
          studentIdMap.set(stu.id, resultStu[0].id);
        }
      }

      // 4. Insert Grades
      if (grades && grades.length > 0) {
        for (const grade of grades) {
          const newStuId = studentIdMap.get(grade.student_id);
          const newSubId = subjectIdMap.get(grade.subject_id);
          
          if (newStuId && newSubId) {
               await window.api.db.execute(
                  'INSERT INTO grades (student_id, subject_id, period, value) VALUES (?, ?, ?, ?)',
                  [newStuId, newSubId, grade.period, grade.value]
              );
          }
        }
      }
      // Notify other views that DB changed (new class)
      try {
        console.debug('[TransferInbox] dispatch db:changed newClass', { classId: newClassId });
        window.dispatchEvent(new CustomEvent('db:changed', { detail: { classId: newClassId } }));
      } catch (e) {
        console.error('Failed to dispatch db:changed (newClass)', e);
      }
      return true;
    } catch (error) {
      console.error('Import error:', error);
      return false;
    }
  };

  const checkClassExists = async (classInfo: any) => {
    const activeYear = (await window.api.db.query('SELECT id FROM academic_years WHERE is_active = 1'))[0];
    const academicYearId = activeYear ? activeYear.id : classInfo.academic_year_id;

    const existing = await window.api.db.query(
      'SELECT id FROM classes WHERE name = ? AND level = ? AND option = ? AND section = ? AND academic_year_id = ?',
      [classInfo.name, classInfo.level, classInfo.option, classInfo.section, academicYearId]
    );

    return existing.length > 0 ? existing[0].id : null;
  };

  const mergeClassData = async (existingClassId: number, data: any) => {
    const { classInfo, students, grades, subjects } = data;
    try {
      // 1. Update Class Info
      await window.api.db.execute(
        'UPDATE classes SET name = ?, level = ?, option = ?, section = ? WHERE id = ?',
        [classInfo.name, classInfo.level, classInfo.option, classInfo.section, existingClassId]
      );

      // 2. Merge Subjects
      const subjectIdMap = new Map();
      const existingSubjects = await window.api.db.query('SELECT * FROM subjects WHERE class_id = ?', [existingClassId]);
      
      if (subjects && subjects.length > 0) {
        for (const sub of subjects) {
          const match = existingSubjects.find((es: any) => es.name === sub.name && es.code === sub.code);
          if (match) {
            // Update existing
            await window.api.db.execute(
              'UPDATE subjects SET max_p1=?, max_p2=?, max_exam1=?, max_p3=?, max_p4=?, max_exam2=?, domain_id=? WHERE id=?',
              [sub.max_p1, sub.max_p2, sub.max_exam1, sub.max_p3, sub.max_p4, sub.max_exam2, sub.domain_id, match.id]
            );
            subjectIdMap.set(sub.id, match.id);
          } else {
            // Insert new
            const resultSub = await window.api.db.query(
              'INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
              [sub.name, sub.code, sub.max_p1, sub.max_p2, sub.max_exam1, sub.max_p3, sub.max_p4, sub.max_exam2, existingClassId, sub.domain_id]
            );
            subjectIdMap.set(sub.id, resultSub[0].id);
          }
        }
      }

      // 3. Merge Students
      const studentIdMap = new Map();
      const existingStudents = await window.api.db.query('SELECT * FROM students WHERE class_id = ?', [existingClassId]);

      if (students && students.length > 0) {
        for (const stu of students) {
          const match = existingStudents.find((es: any) => 
            es.first_name === stu.first_name && 
            es.last_name === stu.last_name && 
            es.post_name === stu.post_name
          );

          if (match) {
            // Update existing (optional, but good for syncing details)
            await window.api.db.execute(
              'UPDATE students SET gender=?, birth_date=?, birthplace=? WHERE id=?',
              [stu.gender, stu.birth_date, stu.birthplace, match.id]
            );
            studentIdMap.set(stu.id, match.id);
          } else {
            // Insert new
            const resultStu = await window.api.db.query(
              'INSERT INTO students (first_name, last_name, post_name, gender, birth_date, birthplace, class_id) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
              [stu.first_name, stu.last_name, stu.post_name, stu.gender, stu.birth_date, stu.birthplace, existingClassId]
            );
            studentIdMap.set(stu.id, resultStu[0].id);
          }
        }
      }

      // 4. Merge Grades (Upsert)
      if (grades && grades.length > 0) {
        for (const grade of grades) {
          const newStuId = studentIdMap.get(grade.student_id);
          const newSubId = subjectIdMap.get(grade.subject_id);
          
          if (newStuId && newSubId) {
            // Check if grade exists
            const existingGrade = await window.api.db.query(
              'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?',
              [newStuId, newSubId, grade.period]
            );

            if (existingGrade.length > 0) {
              await window.api.db.execute(
                'UPDATE grades SET value = ? WHERE id = ?',
                [grade.value, existingGrade[0].id]
              );
            } else {
              await window.api.db.execute(
                'INSERT INTO grades (student_id, subject_id, period, value) VALUES (?, ?, ?, ?)',
                [newStuId, newSubId, grade.period, grade.value]
              );
            }
          }
        }
      }
      // Notify other views that DB changed (merged class)
      try {
        console.debug('[TransferInbox] dispatch db:changed mergedClass', { classId: existingClassId });
        window.dispatchEvent(new CustomEvent('db:changed', { detail: { classId: existingClassId } }));
      } catch (e) {
        console.error('Failed to dispatch db:changed (mergedClass)', e);
      }
      return true;
    } catch (error) {
      console.error('Merge error:', error);
      return false;
    }
    
  };


  const handleAccept = async (filename: string) => {
    const content = await window.api.network.acceptTransfer(filename);
    
    if (content.type === 'CLASS_DATA') {
      const existingId = await checkClassExists(content.data.classInfo);
      
      if (existingId) {
        setConflict({
          filename,
          data: content.data,
          existingClassId: existingId,
          className: content.data.classInfo.name
        });
      } else {
        if (confirm('Voulez-vous vraiment importer ces données ?')) {
          const success = await importClassData(content.data);
          if (success) {
            toast.success('Données importées avec succès !');
            await window.api.network.rejectTransfer(filename);
            loadTransfers();
          } else {
            toast.error('Erreur lors de l\'importation.');
          }
        }
      }
    } else {
      toast.error('Type de données non supporté.');
    }
  };

  const resolveConflict = async (action: 'merge' | 'overwrite' | 'cancel') => {
    if (!conflict) return;

    if (action === 'cancel') {
      setConflict(null);
      return;
    }

    let success = false;
    if (action === 'overwrite') {
      // Hard delete existing class (cascades to students, subjects, grades)
      await window.api.db.execute('DELETE FROM classes WHERE id = ?', [conflict.existingClassId]);
      // Import as new
      success = await importClassData(conflict.data);
    } else if (action === 'merge') {
      success = await mergeClassData(conflict.existingClassId, conflict.data);
    }

    if (success) {
      toast.success(action === 'merge' ? 'Fusion terminée avec succès !' : 'Données écrasées et importées avec succès !');
      await window.api.network.rejectTransfer(conflict.filename);
      loadTransfers();
      setConflict(null);
    } else {
      toast.error('Une erreur est survenue.');
    }
  };

  const handleReject = async (filename: string) => {
    if (confirm('Supprimer ce transfert ?')) {
      await window.api.network.rejectTransfer(filename);
      loadTransfers();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Inbox size={20} className="text-blue-600" />
        Transferts en attente
      </h2>

      {transfers.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Inbox size={48} className="mx-auto mb-2 opacity-50" />
          <p>Aucun transfert en attente.</p>
          <p className="text-sm">Les données reçues apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transfers.map((item) => (
            <div key={item.filename} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
                  <FileJson size={24} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{item.payload.description || 'Données sans titre'}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-2">
                    <span>De: <strong className="text-slate-700">{item.payload.sender}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.payload.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(item.filename)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Refuser / Supprimer"
                >
                  <X size={20} />
                </button>
                <button
                  onClick={() => handleAccept(item.filename)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Check size={18} />
                  Importer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {conflict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-bold">Conflit détecté</h3>
            </div>
            
            <p className="text-slate-600 mb-6">
              La classe <strong>{conflict.className}</strong> existe déjà dans votre base de données.
              Que souhaitez-vous faire ?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => resolveConflict('merge')}
                className="w-full flex items-center justify-between p-4 border border-blue-200 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-200 p-2 rounded-lg text-blue-700">
                    <Merge size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-blue-900">Fusionner</div>
                    <div className="text-sm text-blue-700">Mettre à jour les données existantes et ajouter les nouvelles</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => resolveConflict('overwrite')}
                className="w-full flex items-center justify-between p-4 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-red-200 p-2 rounded-lg text-red-700">
                    <Trash2 size={20} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-red-900">Écraser</div>
                    <div className="text-sm text-red-700">Supprimer la classe existante et la remplacer</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => resolveConflict('cancel')}
                className="w-full p-3 text-slate-500 hover:text-slate-700 font-medium mt-2"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
