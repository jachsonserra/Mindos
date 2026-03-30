/**
 * useStaleLoader — hook para cache stale-time em stores Zustand.
 *
 * Evita que o Dashboard (e outras telas) recarreguem todos os stores
 * em cada foco, causando N queries desnecessárias ao banco.
 *
 * Uso:
 *   const { shouldLoad, markLoaded } = useStaleLoader('habits', 2 * 60 * 1000);
 *   if (shouldLoad) { await loadHabits(uid); markLoaded(); }
 */

import { useRef, useCallback } from 'react';

/** Mapa global de timestamps do último carregamento por chave */
const lastLoadedAt: Record<string, number> = {};

interface StaleLoaderResult {
  /** true se os dados ainda não foram carregados ou estão fora do período de validade */
  shouldLoad: boolean;
  /** Marca o momento atual como o último carregamento */
  markLoaded: () => void;
  /** Força a invalidação do cache (útil após mutations) */
  invalidate: () => void;
}

/**
 * @param key       Identificador único do store/recurso (ex: 'habits:user123')
 * @param staleMs   Período de validade em ms (default: 2 minutos)
 */
export function useStaleLoader(key: string, staleMs = 2 * 60 * 1000): StaleLoaderResult {
  const keyRef = useRef(key);
  keyRef.current = key;

  const shouldLoad = !lastLoadedAt[key] || (Date.now() - lastLoadedAt[key]) > staleMs;

  const markLoaded = useCallback(() => {
    lastLoadedAt[keyRef.current] = Date.now();
  }, []);

  const invalidate = useCallback(() => {
    delete lastLoadedAt[keyRef.current];
  }, []);

  return { shouldLoad, markLoaded, invalidate };
}

/** Invalida todos os caches — útil após sync com Supabase */
export function invalidateAllCaches(): void {
  for (const key of Object.keys(lastLoadedAt)) {
    delete lastLoadedAt[key];
  }
}
