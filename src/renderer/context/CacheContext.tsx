import React, { createContext, useContext, useRef, useCallback } from 'react';

interface CacheContextType {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, data: T) => void;
  invalidate: (keyPattern: string) => void;
  clear: () => void;
}

const CacheContext = createContext<CacheContextType | null>(null);

/**
 * Provider pour le système de cache en mémoire.
 * Permet de stocker des données temporairement pour éviter des appels BDD redondants.
 */
export function CacheProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<Map<string, any>>(new Map());

  const get = useCallback(<T,>(key: string): T | null => {
    if (cache.current.has(key)) {
      // console.log(`[Cache] Hit: ${key}`);
      return cache.current.get(key) as T;
    }
    // console.log(`[Cache] Miss: ${key}`);
    return null;
  }, []);

  const set = useCallback(<T,>(key: string, data: T) => {
    // console.log(`[Cache] Set: ${key}`);
    cache.current.set(key, data);
  }, []);

  const invalidate = useCallback((keyPattern: string) => {
    // console.log(`[Cache] Invalidate pattern: ${keyPattern}`);
    const regex = new RegExp(keyPattern);
    for (const key of cache.current.keys()) {
      if (regex.test(key)) {
        cache.current.delete(key);
      }
    }
  }, []);

  const clear = useCallback(() => {
    cache.current.clear();
  }, []);

  return (
    <CacheContext.Provider value={{ get, set, invalidate, clear }}>
      {children}
    </CacheContext.Provider>
  );
}

/**
 * Hook pour utiliser le cache.
 */
export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
}
