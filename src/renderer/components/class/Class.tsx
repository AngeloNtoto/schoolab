import { useState, useEffect, useCallback } from "react";
import { dbService } from "../../services/databaseService";
import { useParams } from "react-router-dom";
import ClassDetails from "./ClassDetails";
import { classService, ClassData, Subject } from "../../services/classService";
import { useStudents } from "../../hooks/useStudents";
import { useGrades } from "../../hooks/useGrades";
import { Student } from "../../services/studentService";
import { domainService, Domain } from "../../services/domainService";
import EditEleve from "./EditEleve";
import Bulletin from "../print/Bulletin";
import ClassBulletins from "../print/ClassBulletins";
import ClassCoupons from "../print/ClassCoupons";
import Palmares from "../print/Palmares";

import { useWorkbench } from "../../workbench/WorkbenchProvider";

// Animations CSS gérées par classes animate-in

/**
 * Composant principal Class - Centralise tous les fetches de données
 * 
 * Ce composant agit comme un conteneur intelligent qui:
 * 1. Charge toutes les données une seule fois au montage
 * 2. Partage ces données avec ClassDetails, EditEleve et Bulletin
 * 3. Évite les re-fetches lors du basculement entre les vues
 * 4. Gère les mises à jour centralisées
 */
export default function Class() {
    const { id } = useParams<{ id: string }>();
    const { openPanel, updatePanelProps, panels } = useWorkbench();
    
    const [editModal, setEditModal] = useState(false);

    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    
    // États pour les données de la classe
    const [classInfo, setClassInfo] = useState<ClassData | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [domains, setDomains] = useState<Domain[]>([]); // Domaines pour le primaire
    const [classLoading, setClassLoading] = useState(true);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    
    // États pour les paramètres de l'école (pour les bulletins/coupons/palmares)
    const [schoolSettings, setSchoolSettings] = useState<{name: string, city: string, pobox: string}>({name: '', city: '', pobox: ''});
    const [academicYear, setAcademicYear] = useState<string>('');
    
    // Hooks personnalisés pour les élèves et notes (avec cache)
    const { students, loading: studentsLoading, addStudent, deleteStudent, importStudents, updateStudent, refresh: refreshStudents } = useStudents(Number(id));
    const { grades, gradesMap, loading: gradesLoading, updateGrade, refresh: refreshGrades } = useGrades(Number(id));
    
    // Chargement initial des données de la classe et paramètres école
    useEffect(() => {
        const loadClassData = async () => {
            if (!id) return;
            try {
                const cData = await classService.getClassById(Number(id));
                if (cData) setClassInfo(cData);
                
                const sData = await classService.getSubjectsByClass(Number(id));
                setSubjects(sData);

                // Charger les domaines (pour primaire)
                const dData = await domainService.getAllDomains();
                setDomains(dData);

                // Charger les paramètres de l'école une seule fois
                const sName = await dbService.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_name']);
                const sCity = await dbService.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_city']);
                const sPoBox = await dbService.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_pobox']);
                
                setSchoolSettings({
                    name: sName?.[0]?.value || '',
                    city: sCity?.[0]?.value || '',
                    pobox: sPoBox?.[0]?.value || ''
                });

                // Charger l'année scolaire active
                const yearResult = await dbService.query<{ name: string }>('SELECT name FROM academic_years WHERE is_active = 1 LIMIT 1');
                if (yearResult?.[0]) setAcademicYear(yearResult[0].name);

            } catch (error) {
                console.error('Failed to load class data:', error);
            } finally {
                setClassLoading(false);
            }
        };
        loadClassData();
    }, [id]);

    // Callback pour rafraîchir les matières (après ajout/modification)
    const refreshSubjects = useCallback(async () => {
        if (!id) return;
        const sData = await classService.getSubjectsByClass(Number(id));
        setSubjects(sData);
    }, [id]);

    // Callback pour tout rafraîchir d'un coup (matières + élèves + notes) sans redemander le mdp
    const refreshAll = useCallback(async () => {
        await Promise.all([
            refreshStudents(),
            refreshGrades(),
            refreshSubjects()
        ]);
    }, [refreshStudents, refreshGrades, refreshSubjects]);

    // Hot-reload synchronization with side panels
    useEffect(() => {
        if (!id) return;
        panels.forEach(p => {
            if (
                p.id.startsWith('bulletin-') || 
                p.id === `class-bulletins-${id}` || 
                p.id === `class-coupons-${id}` || 
                p.id === `palmares-${id}`
            ) {
                updatePanelProps(p.id, {
                    classInfo,
                    students,
                    subjects,
                    domains,
                    grades,
                    allGrades: grades, // ClassCoupons uses allGrades
                    schoolInfo: schoolSettings,
                    schoolName: schoolSettings.name,
                    schoolCity: schoolSettings.city,
                    academicYear
                });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [grades, students, subjects]);

    // Callback pour ouvrir le modal d'édition avec un élève spécifique
    const handleEditStudent = useCallback((studentId: number) => {
        setSelectedStudentId(studentId);
        setEditModal(true);
    }, []);

    // Callback pour fermer le modal d'édition
    // Accepte optionnellement l'élève mis à jour pour une mise à jour optimisée
    const handleCloseEditModal = useCallback((updatedStudent?: Student) => {
        setEditModal(false);
        setSelectedStudentId(null);
        
        // Si on a reçu l'élève mis à jour, on met à jour seulement cet élève
        // SANS recharger toute la liste (optimisation performance)
        if (updatedStudent) {
            updateStudent(updatedStudent);
        }
    }, [updateStudent]);

    // Callback pour ouvrir le bulletin d'un élève
    const handleOpenBulletin = useCallback((studentId: number) => {
        const student = students.find(s => s.id === studentId);
        openPanel({
            id: `bulletin-${studentId}`,
            type: 'print.bulletin',
            title: `Bulletin - ${student?.first_name}`,
            props: {
                studentId,
                classInfo,
                students,
                subjects,
                domains,
                grades,
                schoolName: schoolSettings.name,
                schoolCity: schoolSettings.city,
                academicYear
            }
        });
    }, [students, classInfo, subjects, domains, grades, schoolSettings, academicYear, openPanel]);



    // Callbacks pour l'impression en masse
    const handleOpenBulkPrint = useCallback(() => {
        openPanel({
            id: `class-bulletins-${id}`,
            type: 'print.classBulletins',
            title: `Bulletins Classe`,
            props: {
                classInfo,
                students,
                subjects,
                domains,
                grades,
                schoolName: schoolSettings.name,
                schoolCity: schoolSettings.city,
                academicYear
            }
        });
    }, [id, classInfo, students, subjects, domains, grades, schoolSettings, academicYear, openPanel]);

    const handleOpenCoupons = useCallback(() => {
        openPanel({
            id: `class-coupons-${id}`,
            type: 'print.classCoupons',
            title: `Coupons Classe`,
            props: {
                classInfo,
                students,
                subjects,
                allGrades: grades,
                schoolInfo: schoolSettings,
                academicYear
            }
        });
    }, [id, classInfo, students, subjects, grades, schoolSettings, academicYear, openPanel]);

    const handleOpenPalmares = useCallback(() => {
        openPanel({
            id: `palmares-${id}`,
            type: 'print.palmares',
            title: `Palmarès`,
            props: {
                classInfo,
                students,
                subjects,
                grades,
                schoolName: schoolSettings.name,
                schoolCity: schoolSettings.city,
                schoolPoBox: schoolSettings.pobox
            }
        });
    }, [id, classInfo, students, subjects, grades, schoolSettings, openPanel]);

    const loading = classLoading || gradesLoading || studentsLoading;

    return (
        <div className="h-full flex flex-col">
            {/* Modal d'édition d'élève */}
            {editModal && (
                <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4 sm:p-8 animate-in fade-in duration-300">
                    <div className="animate-in zoom-in-95 duration-300">
                        <EditEleve 
                            studentId={selectedStudentId} 
                            initialData={students.find(s => s.id === selectedStudentId)}
                            onClose={handleCloseEditModal} 
                        />
                    </div>
                </div>
            )}



            <div className={`h-full ${editModal ? 'opacity-30 scale-98 pointer-events-none' : ''} transition-all duration-500`}>
                <ClassDetails 
                    classInfo={classInfo}
                    subjects={subjects}
                    students={students}
                    gradesMap={gradesMap}
                    editingSubject={editingSubject}
                    loading={loading}
                    onEditStudent={handleEditStudent}
                    onOpenBulletin={handleOpenBulletin}

                    onOpenBulkPrint={handleOpenBulkPrint}
                    onOpenCouponsPrint={handleOpenCoupons}
                    onOpenPalmares={handleOpenPalmares}
                    onUpdateGrade={updateGrade}
                    onAddStudent={addStudent}
                    onDeleteStudent={deleteStudent}
                    onImportStudents={importStudents}
                    onRefreshSubjects={refreshSubjects}
                    onRefreshAll={refreshAll}
                    onSetEditingSubject={setEditingSubject}
                />
            </div>
        </div>
    );
}
