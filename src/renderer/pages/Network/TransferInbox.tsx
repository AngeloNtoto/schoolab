import React, { useState, useEffect } from 'react';
import { Inbox, FileJson, Check, X, Clock, AlertTriangle, Copy, Trash2, Merge } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { networkService } from '../../services/networkService';
import { dbService } from '../../services/databaseService';

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
    
    const removeListener = networkService.onFileReceived(() => {
      loadTransfers();
    });

    return () => removeListener();
  }, []);

  const loadTransfers = async () => {
    const list = await networkService.getInboundFiles();
    setTransfers(list || []);
  };

  const importClassData = async (data: any) => {
    const { classInfo, students, grades, subjects } = data;

    try {
      // Get active academic year
      const activeYear = (await dbService.query<any>('SELECT id FROM academic_years WHERE is_active = 1'))[0];
      const academicYearId = activeYear ? activeYear.id : classInfo.academic_year_id;

      // 1. Insert Class
      const resultClass = await dbService.query<any>(
        'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?) RETURNING id',
        [classInfo.name, classInfo.level, classInfo.option, classInfo.section, academicYearId]
      );
      const newClassId = resultClass[0].id;

      // 2. Insert Subjects & Map IDs
      const subjectIdMap = new Map();
      if (subjects && subjects.length > 0) {
        for (const sub of subjects) {
          const resultSub = await dbService.query<any>(
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
          const resultStu = await dbService.query<any>(
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
               await dbService.execute(
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
    const activeYear = (await dbService.query<any>('SELECT id FROM academic_years WHERE is_active = 1'))[0];
    const academicYearId = activeYear ? activeYear.id : classInfo.academic_year_id;

    const existing = await dbService.query<any>(
      'SELECT id FROM classes WHERE name = ? AND level = ? AND option = ? AND section = ? AND academic_year_id = ?',
      [classInfo.name, classInfo.level, classInfo.option, classInfo.section, academicYearId]
    );

    return existing.length > 0 ? existing[0].id : null;
  };

  const mergeClassData = async (existingClassId: number, data: any) => {
    const { classInfo, students, grades, subjects } = data;
    try {
      // 1. Update Class Info
      await dbService.execute(
        'UPDATE classes SET name = ?, level = ?, option = ?, section = ? WHERE id = ?',
        [classInfo.name, classInfo.level, classInfo.option, classInfo.section, existingClassId]
      );

      // 2. Merge Subjects
      const subjectIdMap = new Map();
      const existingSubjects = await dbService.query<any>('SELECT * FROM subjects WHERE class_id = ?', [existingClassId]);
      
      if (subjects && subjects.length > 0) {
        for (const sub of subjects) {
          const match = existingSubjects.find((es: any) => es.name === sub.name && es.code === sub.code);
          if (match) {
            // Update existing
            await dbService.execute(
              'UPDATE subjects SET max_p1=?, max_p2=?, max_exam1=?, max_p3=?, max_p4=?, max_exam2=?, domain_id=? WHERE id=?',
              [sub.max_p1, sub.max_p2, sub.max_exam1, sub.max_p3, sub.max_p4, sub.max_exam2, sub.domain_id, match.id]
            );
            subjectIdMap.set(sub.id, match.id);
          } else {
            // Insert new
            const resultSub = await dbService.query<any>(
              'INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
              [sub.name, sub.code, sub.max_p1, sub.max_p2, sub.max_exam1, sub.max_p3, sub.max_p4, sub.max_exam2, existingClassId, sub.domain_id]
            );
            subjectIdMap.set(sub.id, resultSub[0].id);
          }
        }
      }

      // 3. Merge Students
      const studentIdMap = new Map();
      const existingStudents = await dbService.query<any>('SELECT * FROM students WHERE class_id = ?', [existingClassId]);

      if (students && students.length > 0) {
        for (const stu of students) {
          const match = existingStudents.find((es: any) => 
            es.first_name === stu.first_name && 
            es.last_name === stu.last_name && 
            es.post_name === stu.post_name
          );

          if (match) {
            // Update existing (optional, but good for syncing details)
            await dbService.execute(
              'UPDATE students SET gender=?, birth_date=?, birthplace=? WHERE id=?',
              [stu.gender, stu.birth_date, stu.birthplace, match.id]
            );
            studentIdMap.set(stu.id, match.id);
          } else {
            // Insert new
            const resultStu = await dbService.query<any>(
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
            const existingGrade = await dbService.query<any>(
              'SELECT id FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?',
              [newStuId, newSubId, grade.period]
            );

            if (existingGrade.length > 0) {
              await dbService.execute(
                'UPDATE grades SET value = ? WHERE id = ?',
                [grade.value, existingGrade[0].id]
              );
            } else {
              await dbService.execute(
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
    const content = await networkService.acceptFile(filename);
    
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
            await networkService.rejectFile(filename);
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
      await dbService.execute('DELETE FROM classes WHERE id = ?', [conflict.existingClassId]);
      // Import as new
      success = await importClassData(conflict.data);
    } else if (action === 'merge') {
      success = await mergeClassData(conflict.existingClassId, conflict.data);
    }

    if (success) {
      toast.success(action === 'merge' ? 'Fusion terminée avec succès !' : 'Données écrasées et importées avec succès !');
      await networkService.rejectFile(conflict.filename);
      loadTransfers();
      setConflict(null);
    } else {
      toast.error('Une erreur est survenue.');
    }
  };

  const handleReject = async (filename: string) => {
    if (confirm('Supprimer ce transfert ?')) {
      await networkService.rejectFile(filename);
      loadTransfers();
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-3 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        Transferts en attente de validation
      </h2>

      {transfers.length === 0 ? (
        <div className="text-center py-24 text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-black/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/5">
          <div className="bg-white dark:bg-white/5 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl dark:shadow-none border border-slate-100 dark:border-white/5">
            <Inbox size={48} className="opacity-20 text-blue-500" />
          </div>
          <p className="font-black uppercase tracking-widest text-xs mb-2">Boîte de réception vide</p>
          <p className="text-[10px] font-bold max-w-xs mx-auto opacity-60 leading-relaxed">Les données envoyées par d'autres machines apparaîtront ici pour validation.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {transfers.map((item) => (
            <div key={item.filename} className="bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-[2rem] p-6 flex items-center justify-between hover:shadow-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 group overflow-hidden relative">
              {/* Subtle hover background effect */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-full pointer-events-none" />
              
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shadow-inner border border-blue-100 dark:border-blue-500/20 group-hover:scale-110 transition-transform duration-500">
                  <FileJson size={32} />
                </div>
                <div>
                  <div className="font-black text-slate-900 dark:text-white tracking-tight text-xl mb-1">{item.payload.description || 'Données sans titre'}</div>
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-6">
                    <span className="flex items-center gap-2"><div className="w-1 h-1 bg-blue-500 rounded-full" /> De: <strong className="text-blue-600 dark:text-blue-400 underline underline-offset-4 decoration-2">{item.payload.sender}</strong></span>
                    <span className="flex items-center gap-2 bg-slate-100 dark:bg-black/20 px-3 py-1.5 rounded-lg">
                      <Clock size={14} className="text-slate-400" />
                      {new Date(item.payload.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <button
                  onClick={() => handleReject(item.filename)}
                  className="p-4 text-slate-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 rounded-2xl transition-all border border-transparent active:scale-95"
                  title="Refuser / Supprimer"
                >
                  <Trash2 size={24} />
                </button>
                <button
                  onClick={() => handleAccept(item.filename)}
                  className="flex items-center gap-4 px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 border border-white/10"
                >
                  <Merge size={20} />
                  Valider l'importation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {conflict && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] max-w-xl w-full p-10 animate-in fade-in zoom-in slide-in-from-bottom-10 duration-500 border border-white/5">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="bg-amber-500/10 p-6 rounded-[2rem] text-amber-500 mb-6 border border-amber-500/20 shadow-2xl shadow-amber-500/10">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">Conflit de Données</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                La classe <span className="text-blue-600 dark:text-blue-400 font-black decoration-blue-500/30 underline underline-offset-4 decoration-2">{conflict.className}</span> existe déjà dans votre base de données locale.
              </p>
            </div>
            
            <div className="grid gap-4">
              <button
                onClick={() => resolveConflict('merge')}
                className="w-full flex items-center gap-6 p-6 border-2 border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-600/10 hover:border-blue-500/30 rounded-[2rem] transition-all group/btn active:scale-[0.98]"
              >
                <div className="bg-blue-600 text-white p-4 rounded-2xl shadow-xl shadow-blue-500/20 group-hover/btn:scale-110 transition-transform">
                  <Merge size={24} />
                </div>
                <div className="text-left">
                  <div className="font-black text-slate-900 dark:text-white text-lg leading-tight mb-1">Fusionner</div>
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Compléter les données manquantes</div>
                </div>
              </button>

              <button
                onClick={() => resolveConflict('overwrite')}
                className="w-full flex items-center gap-6 p-6 border-2 border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-600/10 hover:border-red-500/30 rounded-[2rem] transition-all group/btn active:scale-[0.98]"
              >
                <div className="bg-red-600 text-white p-4 rounded-2xl shadow-xl shadow-red-500/20 group-hover/btn:scale-110 transition-transform">
                  <Trash2 size={24} />
                </div>
                <div className="text-left">
                  <div className="font-black text-slate-900 dark:text-white text-lg leading-tight mb-1">Écraser</div>
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Remplacer totalement la classe</div>
                </div>
              </button>

              <button
                onClick={() => resolveConflict('cancel')}
                className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors mt-2"
              >
                Ignorer ce transfert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
