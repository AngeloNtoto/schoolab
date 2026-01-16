import { useState, useEffect, useCallback } from 'react';
import { studentService, Student } from '../services/studentService';
import { useCache } from '../context/CacheContext';
import { networkService } from '../services/networkService';
/**
 * Hook personnalisé pour gérer les élèves d'une classe.
 * Utilise le cache pour optimiser les performances.
 */
export function useStudents(classId: number) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cache = useCache();

  const cacheKey = `students_class_${classId}`;

  const loadStudents = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // Vérifier le cache d'abord
      if (!forceRefresh) {
        const cachedData = cache.get<Student[]>(cacheKey);
        if (cachedData) {
          setStudents(cachedData);
          setLoading(false);
          return;
        }
      }

      // Charger depuis la BDD
      const data = await studentService.getStudentsByClass(classId);
      setStudents(data);
      cache.set(cacheKey, data);
    } catch (err: any) {
      console.error('Failed to load students:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [classId, cache, cacheKey]);

  useEffect(() => {
    if (classId) {
      loadStudents();
    }

    const handleDbChange = (e: any) => {
      const payload = e.detail;
      // Ne recharger les élèves que si c'est un changement d'élève ou un changement générique
      if (!payload?.type || payload.type === 'student_update') {
        console.log('[useStudents] Database changed, refreshing students...');
        loadStudents(true);
      }
    };

    window.addEventListener('db:changed', handleDbChange);
    return () => window.removeEventListener('db:changed', handleDbChange);
  }, [classId, loadStudents]);

  /**
   * Force le rechargement des élèves depuis la base de données.
   * Invalide le cache et recharge les données fraîches.
   */
  const refresh = () => loadStudents(true);

  // Memoize refresh so its reference is stable across renders
  const memoizedRefresh = useCallback(() => loadStudents(true), [loadStudents]);

  /**
   * Wrapper autour de studentService.importStudents avec gestion du cache.
   * 
   * PRINCIPE DE MODULARITÉ - RÔLE DU HOOK :
   * Le hook agit comme un ORCHESTRATEUR entre le service (logique métier) et le composant (UI).
   * Il ajoute des comportements spécifiques à l'UI sans polluer le service :
   * - Gestion du cache (invalidation après import)
   * - Rafraîchissement automatique de la liste affichée
   * - Ajout automatique du class_id aux données
   * 
   * FLUX DE DONNÉES :
   * 1. Le composant appelle cette fonction avec les données brutes des élèves
   * 2. Le hook enrichit chaque élève avec le class_id (car le composant ne le connaît pas toujours)
   * 3. Le hook délègue l'insertion au service
   * 4. Le hook invalide le cache pour forcer un rechargement
   * 5. Le hook rafraîchit la liste pour montrer les nouveaux élèves à l'utilisateur
   * 
   * @param students Tableau d'élèves à importer (sans class_id ni id)
   * @returns Promise qui se résout quand l'importation est terminée
   * @throws Error si l'importation échoue
   */
  const importStudents = async (
    students: Array<{
      first_name: string;
      last_name: string;
      post_name: string;
      gender: 'M' | 'F';
      birth_date: string;
      birthplace: string;
    }>
  ): Promise<void> => {
    // ENRICHISSEMENT DES DONNÉES :
    // Les données venant du composant (fichier Excel) ne contiennent pas le class_id
    // Le hook ajoute cette information car il connaît la classe courante via ses props
    const studentsWithClassId = students.map(student => ({
      ...student,              // Copie tous les champs de l'élève (spread operator)
      class_id: classId        // Ajout du class_id manquant
    }));

    // DÉLÉGATION AU SERVICE :
    // On passe la responsabilité de l'insertion au service
    // Le service ne connaît rien du cache ou de l'UI, il fait juste son travail
    await studentService.importStudents(studentsWithClassId);

    // INVALIDATION DU CACHE :
    // Après l'import, les données en cache sont obsolètes
    // On les supprime pour forcer un rechargement depuis la BDD
    cache.invalidate(cacheKey);

    // RAFRAÎCHISSEMENT DE LA LISTE :
    // On recharge immédiatement la liste pour montrer les nouveaux élèves
    // Cela améliore l'expérience utilisateur (feedback immédiat)
    // Notify other components and mobile devices that students changed
    try { 
      window.dispatchEvent(new CustomEvent('db:changed', { detail: { classId, type: 'student_update' } })); 
      await networkService.broadcastDbChange({
        type: 'student_update',
        classId: classId,
        senderId: 'desktop'
      });
    } catch (e) { 
      console.error('dispatch student_update failed', e); 
    }

    await loadStudents(true);
  };

  /**
   * Wrapper autour de studentService.createStudent avec gestion du cache.
   * 
   * PROBLÈME RÉSOLU :
   * Avant, on utilisait directement studentService.createStudent, ce qui causait :
   * - Aucun feedback visuel après l'ajout
   * - L'élève n'apparaissait pas dans la liste (il fallait actualiser)
   * 
   * SOLUTION :
   * Ce wrapper ajoute le comportement d'UI nécessaire :
   * - Invalidation du cache après l'ajout
   * - Rafraîchissement automatique de la liste
   * - L'élève apparaît immédiatement dans l'interface
   * 
   * @param student Données de l'élève à créer (avec class_id)
   * @returns Promise<void> - Se résout quand l'ajout ET le refresh sont terminés
   */
  const addStudent = async (student: Omit<Student, 'id'>): Promise<void> => {
    // DÉLÉGATION AU SERVICE :
    // Insertion de l'élève dans la base de données
    await studentService.createStudent(student);

    // INVALIDATION DU CACHE :
    // Les données en cache sont obsolètes, on les supprime
    cache.invalidate(cacheKey);

    // RAFRAÎCHISSEMENT IMMÉDIAT :
    // On recharge la liste pour montrer le nouvel élève
    // Cela donne un feedback visuel immédiat à l'utilisateur
    // Notify other components and mobile devices
    try { 
      window.dispatchEvent(new CustomEvent('db:changed', { detail: { classId, type: 'student_update' } })); 
      await networkService.broadcastDbChange({
        type: 'student_update',
        classId: classId,
        senderId: 'desktop'
      });
    } catch (e) { 
      console.error('dispatch student_update failed', e); 
    }
    await loadStudents(true);
  };

  /**
   * Wrapper autour de studentService.deleteStudent avec gestion du cache.
   * 
   * Même principe que addStudent : on invalide le cache et on rafraîchit
   * pour que l'élève disparaisse immédiatement de l'interface.
   * 
   * @param id ID de l'élève à supprimer
   * @returns Promise<void> - Se résout quand la suppression ET le refresh sont terminés
   */
  const deleteStudent = async (id: number): Promise<void> => {
    // SUPPRESSION DE L'ÉLÈVE :
    await studentService.deleteStudent(id);

    // INVALIDATION DU CACHE :
    cache.invalidate(cacheKey);

    // RAFRAÎCHISSEMENT IMMÉDIAT :
    try { 
      window.dispatchEvent(new CustomEvent('db:changed', { detail: { classId, type: 'student_update' } })); 
      await networkService.broadcastDbChange({
        type: 'student_update',
        classId: classId,
        senderId: 'desktop'
      });
    } catch (e) { 
      console.error('dispatch student_update failed', e); 
    }
    await loadStudents(true);
  };

  /**
   * Met à jour un élève spécifique dans le state local et le cache
   * SANS recharger tous les élèves depuis la base de données.
   * 
   * OPTIMISATION :
   * Au lieu de faire un refresh complet (qui recharge tous les élèves),
   * cette fonction met à jour uniquement l'élève modifié dans le state.
   * 
   * @param updatedStudent L'élève mis à jour avec toutes ses données
   */
  const updateStudent = useCallback((updatedStudent: Student) => {
    setStudents(prevStudents => {
      // Trouver et remplacer l'élève modifié
      const newStudents = prevStudents.map(student =>
        student.id === updatedStudent.id ? updatedStudent : student
      );
      
      // Mettre à jour le cache également
      cache.set(cacheKey, newStudents);
      
      return newStudents;
    });
  }, [cache, cacheKey]);

  // RETOUR DES FONCTIONS EXPOSÉES :
  // Le hook expose uniquement ce dont le composant a besoin
  // TOUTES les fonctions de mutation (add, delete, import) ont maintenant des wrappers
  // qui gèrent automatiquement le cache et le rafraîchissement
  // Cela garantit que l'UI est toujours à jour après chaque opération
  return { 
    deleteStudent,      // Fonction wrappée avec gestion du cache
    addStudent,         // Fonction wrappée avec gestion du cache
    importStudents,     // Fonction wrappée avec gestion du cache
    updateStudent,      // Fonction pour mettre à jour un élève sans tout recharger
    students,           // État : liste des élèves
    loading,            // État : chargement en cours
    error,              // État : erreur éventuelle
    refresh: memoizedRefresh,             // Fonction : forcer le rechargement manuel si besoin
  };
}
