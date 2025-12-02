import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, FileSpreadsheet, GraduationCap, 
  Download, Upload, TrendingUp, UserPlus, Trash2 
} from 'lucide-react';
import AddStudentModal from './AddStudentModal';
import Tutorial from './Tutorial';
import StudentTooltip from './StudentTooltip';
import AddSubjectModal from './AddSubjectModal';
import ContextMenu from './ContextMenu';
import DeleteConfirmModal from './DeleteConfirmModal';
import * as XLSX from 'xlsx';

interface ClassData {
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
  gender: string;
  birth_date: string;
  birthplace: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  max_score: number;
}

interface Grade {
  student_id: number;
  subject_id: number;
  period: string;
  value: number;
}

export default function ClassDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'students' | 'grades'>('students');
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [hoveredStudent, setHoveredStudent] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; studentId: number } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: number; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadClassData();
  }, [id]);

  const loadClassData = async () => {
    try {
      const [classes, studentData, subjectData, gradeData] = await Promise.all([
        window.api.db.query<ClassData>('SELECT * FROM classes WHERE id = ?', [Number(id)]),
        window.api.db.query<Student>('SELECT * FROM students WHERE class_id = ? ORDER BY last_name, first_name', [Number(id)]),
        window.api.db.query<Subject>(
  'SELECT * FROM subjects WHERE class_id = ? ORDER BY created_at DESC, name ASC',
  [Number(id)]),
        window.api.db.query<Grade>('SELECT * FROM grades g INNER JOIN students s ON g.student_id = s.id WHERE s.class_id = ?', [Number(id)]),
      ]);

      if (classes.length > 0) {
        setClassData(classes[0]);
      }
      setStudents(studentData);
      setSubjects(subjectData);
      setGrades(gradeData);
    } catch (error) {
      console.error('Failed to load class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGrade = (studentId: number, subjectId: number, period: string): number | null => {
    const grade = grades.find(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
    return grade ? grade.value : null;
  };

  const calculateSemesterTotal = (studentId: number, subjectId: number, semester: 1 | 2): number | null => {
    const p1 = semester === 1 ? 'P1' : 'P3';
    const p2 = semester === 1 ? 'P2' : 'P4';
    const exam = semester === 1 ? 'EXAM1' : 'EXAM2';

    const g1 = getGrade(studentId, subjectId, p1);
    const g2 = getGrade(studentId, subjectId, p2);
    const gExam = getGrade(studentId, subjectId, exam);

    if (g1 !== null && g2 !== null && gExam !== null) {
      return g1 + g2 + gExam;
    }
    return null;
  };

  const handleUpdateGrade = async (studentId: number, subjectId: number, period: string, value: number | null) => {
    try {
      // Check if grade exists
      const existing = grades.find(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
      
      if (existing) {
        if (value === null) {
          await window.api.db.execute(
            'DELETE FROM grades WHERE student_id = ? AND subject_id = ? AND period = ?',
            [studentId, subjectId, period]
          );
        } else {
          await window.api.db.execute(
            'UPDATE grades SET value = ? WHERE student_id = ? AND subject_id = ? AND period = ?',
            [value, studentId, subjectId, period]
          );
        }
      } else if (value !== null) {
        await window.api.db.execute(
          'INSERT INTO grades (student_id, subject_id, period, value) VALUES (?, ?, ?, ?)',
          [studentId, subjectId, period, value]
        );
      }

      // Refresh grades locally
      const newGrades = [...grades];
      const idx = newGrades.findIndex(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
      
      if (value === null) {
        if (idx !== -1) newGrades.splice(idx, 1);
      } else {
        if (idx !== -1) {
          newGrades[idx].value = value;
        } else {
          newGrades.push({ student_id: studentId, subject_id: subjectId, period, value });
        }
      }
      setGrades(newGrades);
    } catch (error) {
      console.error('Failed to update grade:', error);
      alert('Erreur lors de la sauvegarde de la note');
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteModal) return;
    try {
      await window.api.db.execute('DELETE FROM students WHERE id = ?', [deleteModal.id]);
      await loadClassData();
      setDeleteModal(null);
    } catch (error) {
      console.error('Failed to delete student:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, student: Student) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, studentId: student.id });
  };

  const handleImportStudents = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        let imported = 0;
        let duplicates = 0;
        
        for (const row of jsonData) {
          // Normalize gender: accept M/F, Masculin/Féminin, Male/Female
          let gender = 'M';
          const genderValue = String(row['Sexe'] || row['sexe'] || 'M').toLowerCase();
          if (genderValue.includes('f') || genderValue.includes('éminin')) {
            gender = 'F';
          }

          try {
            await window.api.db.execute(
              'INSERT INTO students (first_name, last_name, post_name, gender, birth_date, birthplace, class_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                row['Prénom'] || row['prenom'] || '',
                row['Nom'] || row['nom'] || '',
                row['Postnom'] || row['postnom'] || '',
                gender,
                row['Date de naissance'] || row['birth_date'] || null,
                row['Lieu de naissance'] || row['birthplace'] || '',
                Number(id)
              ]
            );
            imported++;
          } catch (err: any) {
            if (err.code === 'SQLITE_CONSTRAINT') {
              duplicates++;
            } else {
              throw err;
            }
          }
        }

        const message = `${imported} élève(s) importé(s) avec succès` + (duplicates > 0 ? `. ${duplicates} doublon(s) ignoré(s).` : '');
        alert(message);
        loadClassData();
      } catch (error) {
        console.error('Import error:', error);
        alert('Erreur lors de l\'importation. Vérifiez le format du fichier.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleExportStudents = () => {
    const data = students.map((s, idx) => ({
      '#': idx + 1,
      'Nom': s.last_name,
      'Postnom': s.post_name,
      'Prénom': s.first_name,
      'Sexe': s.gender === 'M' ? 'Masculin' : 'Féminin',
      'Date de naissance': s.birth_date ? new Date(s.birth_date).toLocaleDateString('fr-FR') : '',
      'Lieu de naissance': s.birthplace
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
    XLSX.writeFile(wb, `${classData?.name}_eleves.xlsx`);
  };

  // Don't show loading screen, just show content or empty state

  if (!classData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">Classe non trouvée</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Tutorial
        pageId="class-details"
        steps={[
          {
            title: "Bienvenue dans la gestion de classe !",
            content: "Cette page vous permet de gérer tous les aspects de votre classe.\n\nVous pouvez :\n• Voir et gérer la liste des élèves\n• Saisir les notes dans la grille Excel\n• Importer/Exporter des données\n• Générer des bulletins et palmarès"
          },
          {
            title: "Onglet Liste des Élèves",
            content: "Dans cet onglet, vous pouvez :\n\n• Ajouter des élèves manuellement un par un\n• Importer une liste complète depuis Excel/CSV\n• Exporter la liste au format Excel\n• Cliquer sur un élève pour voir son bulletin détaillé"
          },
          {
            title: "Onglet Grille de Notes",
            content: "La grille de notes fonctionne comme Excel :\n\n• P1, P2 = Périodes du 1er semestre\n• Exam1 = Examen 1er semestre\n• Sem1 = Total automatique (P1 + P2 + Exam1)\n\nMême structure pour le 2ème semestre (P3, P4, Exam2, Sem2)"
          },
          {
            title: "Actions rapides",
            content: "Dans l'en-tête, vous trouverez :\n\n• Importer : Charger des élèves depuis Excel\n• Exporter : Télécharger la liste\n• Palmarès : Classement des élèves par performance\n\nUtilisez ces boutons pour gagner du temps !"
          }
        ]}
        onComplete={() => {}}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        className="hidden"
      />
      {showAddModal && (
        <AddStudentModal
          classId={Number(id)}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => loadClassData()}
        />
      )}
      {showSubjectModal && (
        <AddSubjectModal
          classId={Number(id)}
          subjects={subjects}
          onClose={() => setShowSubjectModal(false)}
          onSuccess={() => loadClassData()}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            {
              label: 'Voir le bulletin',
              icon: <GraduationCap size={18} />,
              onClick: () => {
                const s = students.find(s => s.id === contextMenu.studentId);
                if (s) navigate(`/bulletin/${s.id}`);
              }
            },
            {
              label: 'Détails élève',
              icon: <Users size={18} />,
              onClick: () => {
                const s = students.find(s => s.id === contextMenu.studentId);
                if (s) navigate(`/student/${s.id}`);
              }
            },
            { divider: true },
            {
              label: 'Supprimer',
              icon: <div className="text-red-600"><Trash2 size={18} /></div>,
              danger: true,
              onClick: () => {
                const s = students.find(s => s.id === contextMenu.studentId);
                if (s) setDeleteModal({ id: s.id, name: `${s.last_name} ${s.first_name}` });
              }
            }
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}
      {deleteModal && (
        <DeleteConfirmModal
          title="Supprimer l'élève"
          message="Êtes-vous sûr de vouloir supprimer cet élève ? Ses notes seront également supprimées."
          itemName={deleteModal.name}
          onConfirm={handleDeleteStudent}
          onCancel={() => setDeleteModal(null)}
        />
      )}
    <div className="min-h-screen bg-slate-50">
      {/* Desktop-oriented Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg">
        <div className="max-w-[95%] mx-auto px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors text-white"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                  <GraduationCap className="text-white" size={32} />
                </div>
                <div className="text-white">
                  <h1 className="text-2xl font-bold">{classData.name}</h1>
                  <p className="text-blue-100 text-sm flex items-center gap-4 mt-1">
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {students.length} élève(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet size={16} />
                      {subjects.length} matière(s)
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSubjectModal(true)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
              >
                <FileSpreadsheet size={18} />
                <span className="font-medium">Matières</span>
              </button>
              <button 
                onClick={handleImportStudents}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors backdrop-blur-sm"
              >
                <Upload size={18} />
                <span className="font-medium">Importer</span>
              </button>
              <button 
                onClick={handleExportStudents}
                disabled={students.length === 0}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors backdrop-blur-sm disabled:opacity-50"
              >
                <Download size={18} />
                <span className="font-medium">Exporter</span>
              </button>
              <button className="flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors font-medium">
                <TrendingUp size={18} />
                <span>Palmares</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[95%] mx-auto px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('students')}
              className={`px-6 py-4 border-b-3 transition-all font-medium flex items-center gap-2 ${
                activeTab === 'students'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <Users size={20} />
              <span>Liste des Élèves</span>
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={`px-6 py-4 border-b-3 transition-all font-medium flex items-center gap-2 ${
                activeTab === 'grades'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet size={20} />
              <span>Grille de Notes</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-[95%] mx-auto px-8 py-6">
        {activeTab === 'students' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Liste des Élèves</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Cliquez sur un élève pour voir ses détails et bulletin
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                >
                  <UserPlus size={18} />
                  Ajouter
                </button>
                <button 
                  onClick={handleImportStudents}
                  className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2"
                >
                  <Upload size={18} />
                  Importer
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <div className="p-16 text-center">
                <Users className="mx-auto text-slate-300 mb-4" size={80} />
                <h3 className="text-xl font-medium text-slate-600 mb-2">Aucun élève</h3>
                <p className="text-slate-500 mb-6">
                  Cette classe n'a pas encore d'élèves enregistrés
                </p>
                
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 mx-auto"
                >
                  <UserPlus size={20} />
                  Ajouter un élève
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b-2 border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Nom
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Postnom
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Prénom
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Sexe
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Lieu naissance
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Date naissance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map((student, idx) => (
                      <tr
                        key={student.id}
                        className="hover:bg-blue-50 cursor-pointer transition-colors relative"
                        onClick={() => navigate(`/student/${student.id}`)}
                        onContextMenu={(e) => handleContextMenu(e, student)}
                        onMouseEnter={() => setHoveredStudent(student.id)}
                        onMouseLeave={() => setHoveredStudent(null)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900 relative group">
                          {student.last_name}
                          {hoveredStudent === student.id && (
                            <div className="absolute left-full top-0 ml-2 z-50">
                              <StudentTooltip student={student} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                          {student.post_name || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                          {student.first_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            student.gender === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                          }`}>
                            {student.gender === 'M' ? 'M' : 'F'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {student.birthplace || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {student.birth_date ? new Date(student.birth_date).toLocaleDateString('fr-FR') : '-'}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'grades' && (
          <GradeGrid 
            students={students}
            subjects={subjects}
            grades={grades}
            getGrade={getGrade}
            calculateSemesterTotal={calculateSemesterTotal}
            calculateSemesterTotal={calculateSemesterTotal}
            onUpdateGrade={handleUpdateGrade}
            onContextMenu={handleContextMenu}
          />
        )}
      </main>
    </div>
    </>
  );
}

// Grade Grid Component
interface GradeGridProps {
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  getGrade: (studentId: number, subjectId: number, period: string) => number | null;
  calculateSemesterTotal: (studentId: number, subjectId: number, semester: 1 | 2) => number | null;
  onUpdateGrade: (studentId: number, subjectId: number, period: string, value: number | null) => void;
  onContextMenu: (e: React.MouseEvent, student: Student) => void;
}

function GradeGrid({ students, subjects, getGrade, calculateSemesterTotal, onUpdateGrade, onContextMenu }: GradeGridProps) {
  if (students.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-16 text-center">
        <FileSpreadsheet className="mx-auto text-slate-300 mb-4" size={80} />
        <h3 className="text-xl font-medium text-slate-600 mb-2">Aucun élève</h3>
        <p className="text-slate-500">
          Ajoutez des élèves pour commencer à saisir les notes
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <h2 className="text-xl font-semibold text-slate-800">Grille de Notes - Excel Style</h2>
        <p className="text-sm text-slate-500 mt-1">
          Double-cliquez sur une cellule pour modifier la note
        </p>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-300px)]" style={{ scrollbarWidth: 'thin' }}>
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-white z-10">
            {/* Main Header Row */}
            <tr className="border-b-2 border-slate-300">
              <th rowSpan={2} className="sticky left-0 bg-blue-600 text-white px-4 py-3 text-left font-semibold border-r-2 border-blue-700 min-w-[200px]">
                Élève
              </th>
              {subjects.map(subject => (
                <th 
                  key={subject.id} 
                  colSpan={8}
                  className="bg-slate-100 px-2 py-2 text-center font-semibold text-slate-700 border-x border-slate-300"
                >
                  {subject.name} (/{subject.max_score})
                </th>
              ))}
            </tr>

            {/* Sub Header Row */}
            <tr className="border-b-2 border-slate-300 bg-slate-50">
              {subjects.map(subject => (
                <React.Fragment key={subject.id}>
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">P1</th>
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">P2</th>
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-300 bg-blue-50">Ex1</th>
                  <th className="px-2 py-2 text-xs font-semibold text-blue-700 border-r-2 border-slate-400 bg-blue-100">Sem1</th>
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">P3</th>
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">P4</th>
                  <th className="px-2 py-2 text-xs font-medium text-slate-600 border-r border-slate-300 bg-green-50">Ex2</th>
                  <th className="px-2 py-2 text-xs font-semibold text-green-700 border-r-2 border-slate-400 bg-green-100">Sem2</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>

          <tbody>
            {students.map((student, idx) => (
              <tr 
                key={student.id}
                className={`border-b border-slate-200 hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <td 
                  className="sticky left-0 bg-inherit px-4 py-3 font-medium text-slate-800 border-r-2 border-slate-300 cursor-pointer hover:text-blue-600"
                  onContextMenu={(e) => onContextMenu(e, student)}
                  onClick={() => window.location.hash = `#/student/${student.id}`} // Quick hack for navigation if needed, or better pass navigate
                >
                  {student.last_name} {student.first_name}
                </td>
                {subjects.map(subject => {
                  const sem1Total = calculateSemesterTotal(student.id, subject.id, 1);
                  const sem2Total = calculateSemesterTotal(student.id, subject.id, 2);

                  return (
                    <React.Fragment key={subject.id}>
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P1')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P1', val)}
                      />
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P2')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P2', val)}
                      />
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'EXAM1')} 
                        isExam 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM1', val)}
                      />
                      <td className="px-2 py-3 text-center font-bold text-blue-700 bg-blue-50 border-r-2 border-slate-400">
                        {sem1Total !== null ? sem1Total.toFixed(1) : '-'}
                      </td>
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P3')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P3', val)}
                      />
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'P4')} 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'P4', val)}
                      />
                      <GradeCell 
                        value={getGrade(student.id, subject.id, 'EXAM2')} 
                        isExam 
                        onChange={(val) => onUpdateGrade(student.id, subject.id, 'EXAM2', val)}
                      />
                      <td className="px-2 py-3 text-center font-bold text-green-700 bg-green-50 border-r-2 border-slate-400">
                        {sem2Total !== null ? sem2Total.toFixed(1) : '-'}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Grade Cell Component
function GradeCell({ value, isExam = false, onChange }: { value: number | null; isExam?: boolean; onChange: (val: number | null) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value?.toString() || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue.trim() === '') {
      onChange(null);
    } else {
      const num = parseFloat(editValue);
      if (!isNaN(num)) {
        onChange(num);
      } else {
        setEditValue(value?.toString() || '');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value?.toString() || '');
    }
  };

  if (isEditing) {
    return (
      <td className="p-0 border-r border-slate-200">
        <input
          ref={inputRef}
          type="number"
          className="w-full h-full px-1 py-3 text-center outline-none bg-blue-50 focus:bg-blue-100 font-medium"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
      </td>
    );
  }

  return (
    <td 
      className={`px-2 py-3 text-center border-r border-slate-200 cursor-pointer hover:bg-yellow-50 transition-colors ${
        isExam ? 'bg-slate-50 font-medium' : ''
      }`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <div className="min-w-[40px]">
        {value !== null ? value : '-'}
      </div>
    </td>
  );
}
