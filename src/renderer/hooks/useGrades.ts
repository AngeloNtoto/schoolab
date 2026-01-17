import { useState, useEffect, useCallback, useMemo } from 'react';
import { gradeService, Grade } from '../services/gradeService';
import { useCache } from '../context/CacheContext';
import { networkService } from '../services/networkService';

import { listen } from '@tauri-apps/api/event';

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

      // Listen for database changes (global DOM event triggered by App.tsx)
      const handleDbChange = (e: any) => {
        const payload = e.detail;
        console.log('[useGrades] Database changed event received:', payload);
        
        // Granular update if possible
        if (payload?.type === 'grade_update' && Array.isArray(payload.updates)) {
          setGrades(prev => {
            const newGrades = [...prev];
            for (const update of payload.updates) {
              const idx = newGrades.findIndex(
                g => g.student_id === update.student_id && g.subject_id === update.subject_id && g.period === update.period
              );
              if (idx !== -1) {
                newGrades[idx] = { ...newGrades[idx], value: update.value };
              } else {
                newGrades.push({ 
                  student_id: update.student_id, 
                  subject_id: update.subject_id, 
                  period: update.period, 
                  value: update.value 
                });
              }
            }
            cache.set(cacheKey, newGrades);
            setGradesMap(buildMap(newGrades));
            return newGrades;
          });
        } else {
          // Fallback to full refresh
          loadGrades(true);
        }
      };

      window.addEventListener('db:changed', handleDbChange);
      
      return () => {
        window.removeEventListener('db:changed', handleDbChange);
      };
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
        
        cache.set(cacheKey, newGrades);
        
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
      
      // Notifier le serveur web (mobile) du changement effectué sur l'ordinateur
      console.log('[useGrades] Broadcasting grade update to mobile...');
      try {
        await networkService.broadcastDbChange({
          type: 'grade_update',
          updates: [{ student_id: studentId, subject_id: subjectId, period, value }],
          senderId: 'desktop'
        });
        console.log('[useGrades] Broadcast successful!');
      } catch (e) {
        console.warn('[useGrades] Failed to broadcast update to mobile:', e);
      }
    } catch (err) {
      console.error('Failed to update grade:', err);
      throw err;
    }
  };

  return { grades, gradesMap, loading, refresh: memoizedRefresh, updateGrade };
}
