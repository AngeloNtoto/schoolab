import { useState, useEffect, useCallback } from 'react';
import { gradeService, Grade } from '../services/gradeService';
import { useCache } from '../context/CacheContext';

/**
 * Hook personnalisé pour gérer les notes d'une classe.
 */
export function useGrades(classId: number) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradesMap, setGradesMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const cache = useCache();

  const cacheKey = `grades_class_${classId}`;

  // Helper to build map from array
  const buildMap = (data: Grade[]) => {
    const map = new Map<string, number>();
    data.forEach(g => {
      map.set(`${g.student_id}-${g.subject_id}-${g.period}`, g.value);
    });
    return map;
  };

  const loadGrades = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (!forceRefresh) {
        const cachedData = cache.get<Grade[]>(cacheKey);
        if (cachedData) {
          setGrades(cachedData);
          setGradesMap(buildMap(cachedData));
          setLoading(false);
          return;
        }
      }

      const data = await gradeService.getGradesByClass(classId);
      setGrades(data);
      setGradesMap(buildMap(data));
      cache.set(cacheKey, data);
    } catch (err) {
      console.error('Failed to load grades:', err);
    } finally {
      setLoading(false);
    }
  }, [classId, cache, cacheKey]);

  useEffect(() => {
    if (classId) {
      loadGrades();
    }
  }, [classId, loadGrades]);

  const refresh = () => loadGrades(true);

  // Memoize refresh so its reference is stable across renders
  const memoizedRefresh = useCallback(() => loadGrades(true), [loadGrades]);

  // Helper pour mettre à jour une note localement et dans la BDD
  const updateGrade = async (studentId: number, subjectId: number, period: string, value: number | null) => {
    try {
      await gradeService.updateGrade(studentId, subjectId, period, value);
      
      // Mettre à jour l'état local pour une réactivité immédiate
      setGrades(prev => {
        const newGrades = [...prev];
        const idx = newGrades.findIndex(g => g.student_id === studentId && g.subject_id === subjectId && g.period === period);
        
        if (value === null) {
          if (idx !== -1) newGrades.splice(idx, 1);
        } else {
          if (idx !== -1) {
            newGrades[idx] = { ...newGrades[idx], value };
          } else {
            newGrades.push({ student_id: studentId, subject_id: subjectId, period, value });
          }
        }
        
        // Mettre à jour le cache
        cache.set(cacheKey, newGrades);
        
        // Mettre à jour la map
        setGradesMap(prevMap => {
          const newMap = new Map(prevMap);
          const key = `${studentId}-${subjectId}-${period}`;
          if (value === null) {
            newMap.delete(key);
          } else {
            newMap.set(key, value);
          }
          return newMap;
        });

        return newGrades;
      });
    } catch (err) {
      console.error('Failed to update grade:', err);
      throw err;
    }
  };

  return { grades, gradesMap, loading, refresh: memoizedRefresh, updateGrade };
}
