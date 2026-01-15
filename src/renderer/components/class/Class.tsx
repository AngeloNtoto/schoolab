import { useState, useEffect, useCallback,Activity } from "react";
import { useParams } from "react-router-dom";
import ClassDetails from "./ClassDetails";
import { classService, ClassData, Subject } from "../../services/classService";
import { useStudents } from "../../hooks/useStudents";
import { useGrades } from "../../hooks/useGrades";
import { Student } from "../../services/studentService";
import { domainService, Domain } from "../../services/domainService";
import { motion, AnimatePresence } from "framer-motion";

import EditEleve from "./EditEleve";
import Bulletin from "../print/Bulletin";
import ClassBulletins from "../print/ClassBulletins";
import ClassCoupons from "../print/ClassCoupons";
import Palmares from "../print/Palmares";
import RepechageModal from "./RepechageModal";

// Variantes d'animation partagées pour un look premium et fluide
const modalVariants = {
    hidden: { 
        opacity: 0, 
        scale: 0.98,
        y: 10,
        filter: "blur(4px)"
    },
    visible: { 
        opacity: 1, 
        scale: 1,
        y: 0,
        filter: "blur(0px)",
        transition: { 
            type: "spring" as const,
            damping: 25,
            stiffness: 300,
            duration: 0.3
        }
    },
    exit: { 
        opacity: 0, 
        scale: 0.98,
        y: 10,
        filter: "blur(4px)",
        transition: { duration: 0.2 }
    }
} as const;

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
    const [couponsModal, setCouponsModal] = useState(false);
    const [palmaresModal, setPalmaresModal] = useState(false);
    const [repechageModal, setRepechageModal] = useState(false);
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
                const sPoBox = await window.api.db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['school_pobox']);
                
                setSchoolSettings({
                    name: sName?.[0]?.value || '',
                    city: sCity?.[0]?.value || '',
                    pobox: sPoBox?.[0]?.value || ''
                });

                // Charger l'année scolaire active
                const yearResult = await window.api.db.query<{ name: string }>('SELECT name FROM academic_years WHERE is_active = 1 LIMIT 1');
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

    // Callback pour ouvrir le repêchage
    const handleOpenRepechage = useCallback((studentId: number) => {
        setSelectedStudentId(studentId);
        setRepechageModal(true);
    }, []);

    const handleCloseRepechage = useCallback(() => {
        setRepechageModal(false);
        setSelectedStudentId(null);
    }, []);

    // Callbacks pour l'impression en masse
    const handleOpenBulkPrint = useCallback(() => {
        setBulkPrintModal(true);
    }, []);

    const handleCloseBulkPrint = useCallback(() => {
        setBulkPrintModal(false);
    }, []);

    const handleOpenCoupons = useCallback(() => {
        setCouponsModal(true);
    }, []);

    const handleCloseCoupons = useCallback(() => {
        setCouponsModal(false);
    }, []);

    const handleOpenPalmares = useCallback(() => {
        setPalmaresModal(true);
    }, []);

    const handleClosePalmares = useCallback(() => {
        setPalmaresModal(false);
    }, []);

    const loading = classLoading || gradesLoading || studentsLoading;

    return (
        <div className="h-full flex flex-col">
            {/* Modal d'édition d'élève */}
            <Activity mode={editModal ? "visible" : "hidden"}>
                <AnimatePresence>
                    {editModal && (
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/40 backdrop-blur-sm p-4 sm:p-8"
                        >
                                <EditEleve 
                                    studentId={selectedStudentId} 
                                    initialData={students.find(s => s.id === selectedStudentId)}
                                    onClose={handleCloseEditModal} 
                                />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Activity>

            {/* Modal de bulletin */}
            <Activity mode={bulletinModal ? "visible" : "hidden"}>
                <AnimatePresence>
                    {bulletinModal && (
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 z-[80] overflow-y-auto bg-slate-100"
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </Activity>

            {/* Vue d'impression en masse (ClassBulletins) - INSTANTANÉ */}
            <Activity mode={bulkPrintModal ? "visible" : "hidden"}>
                <AnimatePresence>
                    {bulkPrintModal && (
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 z-[80] overflow-y-auto bg-slate-100"
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </Activity>

            {/* Vue d'impression des coupons (ClassCoupons) - INSTANTANÉ */}
            <Activity mode={couponsModal ? "visible" : "hidden"}>
                <AnimatePresence>
                    {couponsModal && (
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 z-[80] overflow-y-auto bg-slate-100"
                        >
                            <ClassCoupons
                                classInfo={classInfo}
                                students={students}
                                subjects={subjects}
                                allGrades={grades}
                                schoolInfo={schoolSettings}
                                academicYear={academicYear}
                                onClose={handleCloseCoupons}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Activity>

            {/* Vue du Palmarès (Palmares) - INSTANTANÉ */}
            <Activity mode={palmaresModal ? "visible" : "hidden"}>
                <AnimatePresence>
                    {palmaresModal && (
                        <motion.div
                            variants={modalVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            className="fixed inset-0 z-[80] overflow-y-auto bg-slate-100"
                        >
                            <Palmares
                                classInfo={classInfo}
                                students={students}
                                subjects={subjects}
                                grades={grades}
                                schoolName={schoolSettings.name}
                                schoolCity={schoolSettings.city}
                                schoolPoBox={schoolSettings.pobox}
                                onClose={handleClosePalmares}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Activity>

            <Activity mode={editModal || bulletinModal || bulkPrintModal || couponsModal || palmaresModal ? "hidden" : "visible"}>
                <motion.div 
                    animate={{ 
                        opacity: (editModal || bulletinModal || bulkPrintModal || couponsModal || palmaresModal || repechageModal) ? 0.3 : 1,
                        scale: (editModal || bulletinModal || bulkPrintModal || couponsModal || palmaresModal || repechageModal) ? 0.98 : 1,
                        filter: (editModal || bulletinModal || bulkPrintModal || couponsModal || palmaresModal || repechageModal) ? "blur(4px)" : "blur(0px)"
                    }}
                    transition={{ duration: 0.4 }}
                    className="h-full"
                >
                    <ClassDetails 
                        // Données pré-chargées
                    classInfo={classInfo}
                    subjects={subjects}
                    students={students}
                    gradesMap={gradesMap}
                    editingSubject={editingSubject}
                    loading={loading}
                    
                    // Actions
                    onEditStudent={handleEditStudent}
                    onOpenBulletin={handleOpenBulletin}
                    onOpenRepechage={handleOpenRepechage}
                    onOpenBulkPrint={handleOpenBulkPrint}
                    onOpenCouponsPrint={handleOpenCoupons}
                    onOpenPalmares={handleOpenPalmares}
                    onUpdateGrade={updateGrade}
                    onAddStudent={addStudent}
                    onDeleteStudent={deleteStudent}
                    onImportStudents={importStudents}
                    onRefreshSubjects={refreshSubjects}
                    onSetEditingSubject={setEditingSubject}
                />
                </motion.div>
            </Activity>
        </div>
    );
}
