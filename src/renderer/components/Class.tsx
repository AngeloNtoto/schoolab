import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import ClassDetails from "./ClassDetails";
import { Activity } from "react";
import { classService, ClassData, Subject } from "../services/classService";
import { useStudents } from "../hooks/useStudents";
import { useGrades } from "../hooks/useGrades";
import { Student } from "../services/studentService";
import { domainService, Domain } from "../services/domainService";
import ProfessionalLoader from "./ProfessionalLoader";

import EditEleve from "./EditEleve";
import Bulletin from "./Bulletin";
import ClassBulletins from "./ClassBulletins";

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
    const [editModal, setEditModal] = useState(false);
    const [bulletinModal, setBulletinModal] = useState(false);
    const [bulkPrintModal, setBulkPrintModal] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
    
    // États pour les données de la classe
    const [classInfo, setClassInfo] = useState<ClassData | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [domains, setDomains] = useState<Domain[]>([]); // Domaines pour le primaire
    const [classLoading, setClassLoading] = useState(true);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    
    // États pour les paramètres de l'école (pour les bulletins)
    const [schoolSettings, setSchoolSettings] = useState<{name: string, city: string}>({name: '', city: ''});
    
    // Hooks personnalisés pour les élèves et notes (avec cache)
    const { students, loading: studentsLoading, addStudent, deleteStudent, importStudents, updateStudent, refresh: refreshStudents } = useStudents(Number(id));
    const { grades, gradesMap, loading: gradesLoading, updateGrade } = useGrades(Number(id));
    
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
                const sName = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_name']);
                const sCity = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_city']);
                
                setSchoolSettings({
                    name: sName?.[0]?.value || '',
                    city: sCity?.[0]?.value || ''
                });

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
        setSelectedStudentId(studentId);
        setBulletinModal(true);
    }, []);

    // Callback pour fermer le bulletin
    const handleCloseBulletin = useCallback(() => {
        setBulletinModal(false);
        setSelectedStudentId(null);
    }, []);

    // Callbacks pour l'impression en masse
    const handleOpenBulkPrint = useCallback(() => {
        setBulkPrintModal(true);
    }, []);

    const handleCloseBulkPrint = useCallback(() => {
        setBulkPrintModal(false);
    }, []);

    const loading = classLoading || gradesLoading || studentsLoading;

    // Afficher le loader pendant le chargement initial
    if (loading) {
        return <ProfessionalLoader message="Chargement des données de la classe..." />;
    }

    if (!classInfo) {
        return <div className="p-8 text-center text-slate-500">Aucune classe trouvée.</div>;
    }

    return (
        <div>
            {/* Modal d'édition d'élève */}
            <Activity mode={editModal ? "visible" : "hidden"}>
                {editModal && (
                    <EditEleve 
                        studentId={selectedStudentId} 
                        initialData={students.find(s => s.id === selectedStudentId)}
                        onClose={handleCloseEditModal} 
                    />
                )}
            </Activity>

            {/* Modal de bulletin */}
            <Activity mode={bulletinModal ? "visible" : "hidden"}>
                {bulletinModal && (
                    <Bulletin 
                        studentId={selectedStudentId}
                        classInfo={classInfo}
                        students={students}
                        subjects={subjects}
                        domains={domains}
                        grades={grades}
                        schoolName={schoolSettings.name}
                        schoolCity={schoolSettings.city}
                        onClose={handleCloseBulletin}
                    />
                )}
            </Activity>

            {/* Vue d'impression en masse (ClassBulletins) - INSTANTANÉ */}
            <Activity mode={bulkPrintModal ? "visible" : "hidden"}>
                {bulkPrintModal && (
                    <ClassBulletins
                        classInfo={classInfo}
                        students={students}
                        subjects={subjects}
                        domains={domains}
                        grades={grades}
                        schoolName={schoolSettings.name}
                        schoolCity={schoolSettings.city}
                        onClose={handleCloseBulkPrint}
                    />
                )}
            </Activity>

            {/* Vue principale de la classe */}
            <Activity mode={editModal || bulletinModal || bulkPrintModal ? "hidden" : "visible"}>
                <ClassDetails 
                    // Données pré-chargées
                    classInfo={classInfo}
                    subjects={subjects}
                    students={students}
                    gradesMap={gradesMap}
                    editingSubject={editingSubject}
                    
                    // Actions
                    onEditStudent={handleEditStudent}
                    onOpenBulletin={handleOpenBulletin}
                    onOpenBulkPrint={handleOpenBulkPrint}
                    onUpdateGrade={updateGrade}
                    onAddStudent={addStudent}
                    onDeleteStudent={deleteStudent}
                    onImportStudents={importStudents}
                    onRefreshSubjects={refreshSubjects}
                    onSetEditingSubject={setEditingSubject}
                />
            </Activity>
        </div>
    );
}
