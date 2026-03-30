/**
 * useAgendaWithSWR — Hook que integra SWR para agenda
 *
 * CORREÇÕES aplicadas nesta versão:
 *
 * 1. LOOP INFINITO corrigido em useDashboardDataWithSWR:
 *    O bug: `agendaLoader` era um objeto novo a cada render, então
 *    incluí-lo na dependency array do useEffect causava re-render infinito.
 *    A fix: usar `agendaLoader.isInitialLoading` (primitivo booleano) como
 *    dependência, não o objeto inteiro.
 *
 * 2. STALE CLOSURE corrigido em useAgendaWithSWR:
 *    O bug: `loadByDate` e `markLoaded` não estavam na dependency array
 *    do useEffect. Se elas mudassem entre renders, o effect usaria versões
 *    antigas (closure stale = função capturada no passado).
 *    A fix: incluir ambas na dependency array.
 *
 * O QUE É STALE CLOSURE?
 * Closures em JavaScript capturam variáveis pelo REFERÊNCIA, mas funções
 * memoizadas com useCallback criam novas referências quando dependências mudam.
 * Se uma função fica de fora da dependency array, o effect sempre usa a
 * versão inicial dela — comportamento como se fosse congelada no tempo.
 *
 * EXEMPLO:
 * let count = 0;
 * const fn = () => console.log(count); // captura count = 0
 * count = 5;
 * fn(); // ainda imprime 0 — stale closure!
 */

import { useCallback, useEffect } from "react";
import { useAgendaStore } from "../stores/useAgendaStore";
import { useUserStore } from "../stores/useUserStore";
import { today } from "../utils/dateHelpers";
import { useStaleWhileRevalidate } from "./useStaleWhileRevalidate";
import type { AgendaEvent } from "../types/agenda.types";

// Exportamos o tipo de retorno para que outros hooks/telas possam tipar corretamente.
// "any[]" foi substituído por "AgendaEvent[]" — ganhamos type safety completo.
export interface UseAgendaWithSwrResult {
  events: AgendaEvent[]; // Antes era any[] — agora tem tipos corretos
  isLoading: boolean;
  isRevalidating: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Carrega agenda com cache SWR (stale-while-revalidate).
 *
 * Benefício: Dashboard renderiza eventos antigos enquanto busca novos
 * sem nunca mostrar tela vazia ("loading falso").
 *
 * @param dateStr Data no formato YYYY-MM-DD (default: hoje)
 */
export function useAgendaWithSWR(dateStr?: string): UseAgendaWithSwrResult {
  // Pegamos as funções do store da agenda.
  // "events" são os dados em memória do Zustand.
  // "loadByDate" é a função que busca no banco e atualiza o store.
  const { events, loadByDate } = useAgendaStore();

  // Precisamos do ID do usuário para fazer a query correta.
  const { user } = useUserStore();

  // Data que vamos carregar — usa "hoje" se nenhuma for fornecida.
  const date = dateStr || today();

  // Chave única de cache para este usuário + data.
  // Ex: "agenda:user-123:2026-03-23"
  // Chaves únicas garantem que caches diferentes não se misturem.
  const cacheKey = `agenda:${user?.id}:${date}`;

  // useCallback garante que a função "revalidateFn" tenha referência ESTÁVEL.
  // Se não usarmos useCallback aqui, uma nova função seria criada a cada render,
  // causando que o useStaleWhileRevalidate enxergue uma "nova" onRevalidate
  // e dispare revalidação desnecessária toda vez.
  const revalidateFn = useCallback(async () => {
    if (!user?.id) return; // Sem usuário logado, não carrega nada.
    await loadByDate(user.id, date);
  }, [user?.id, date, loadByDate]); // Dependências: muda quando usuário ou data muda.

  // Hook SWR: gerencia o cache, stale detection e revalidação em background.
  const {
    shouldRenderStale,  // true se temos dados em cache (mesmo que velhos)
    isRevalidating,     // true se está buscando dados novos em background
    isInitialLoading,   // true se NUNCA carregou (primeira vez)
    markLoaded,         // função para marcar como carregado
    revalidate,         // função para forçar refresh manual
  } = useStaleWhileRevalidate(
    cacheKey,
    5 * 60 * 1000, // 5 minutos de cache — após isso, revalida em background
    revalidateFn,  // função de refetch (memoizada acima)
  );

  // Efeito de carregamento inicial.
  // CORREÇÃO: incluímos loadByDate e markLoaded na dependency array.
  // Sem isso, se essas funções mudassem (ex: novo usuário logado), o effect
  // continuaria usando as versões antigas = stale closure.
  useEffect(() => {
    if (!user?.id) return; // Sem usuário, não carrega.

    if (isInitialLoading) {
      // Primeira carga: não temos dados em cache, precisamos buscar agora.
      // .then(markLoaded) marca o timestamp do carregamento após o fetch completar.
      loadByDate(user.id, date).then(() => markLoaded());
    }
    // Se "shouldRenderStale && isRevalidating" — o useStaleWhileRevalidate já
    // iniciou a revalidação em background automaticamente. Não precisamos fazer nada aqui.
  }, [user?.id, date, loadByDate, markLoaded, isInitialLoading]); // ← dependências completas

  return {
    events,             // Dados do store Zustand (já atualizados após loadByDate)
    isLoading: isInitialLoading, // true apenas na primeira carga (sem dados em cache)
    isRevalidating,     // true quando busca novos dados em background
    error: null,        // TODO: propagar erros quando revalidateFn lançar exceção
    refetch: revalidate, // Expõe a função de refresh manual para a tela
  };
}

/**
 * Hook para carregar múltiplas seções do dashboard com SWR.
 *
 * CORREÇÃO DO LOOP INFINITO:
 * O bug original usava "agendaLoader" (objeto) na dependency array do useEffect.
 * Como objetos são comparados por referência em JS, um novo objeto a cada render
 * = effect roda a cada render = loop infinito.
 *
 * A regra geral: NUNCA coloque objetos ou arrays na dependency array
 * sem memoizá-los com useMemo/useCallback. Use primitivos (string, number, boolean).
 */
export function useDashboardDataWithSWR(userId: string | null) {
  const { loadByDate } = useAgendaStore();

  // Memoizamos a função de revalidação da agenda para evitar instabilidade.
  const agendaRevalidate = useCallback(() => {
    if (!userId) return Promise.resolve();
    // today() é chamado dentro do callback — sempre usa a data atual,
    // não uma data "congelada" no momento em que o hook foi criado.
    return loadByDate(userId, today());
  }, [userId, loadByDate]);

  // SWR para a agenda do dashboard com 2 minutos de validade.
  const agendaLoader = useStaleWhileRevalidate(
    `agenda:${userId}:${today()}`,
    2 * 60 * 1000,   // 2 minutos de cache
    agendaRevalidate, // função memoizada e estável
  );

  // CORREÇÃO: usamos "agendaLoader.isInitialLoading" (boolean primitivo)
  // como dependência, NÃO o objeto "agendaLoader" inteiro.
  // Primitivos são comparados por VALOR — só causa re-run quando muda de true para false.
  // Objetos são comparados por REFERÊNCIA — sempre "diferentes" a cada render.
  useEffect(() => {
    if (!userId) return;

    if (agendaLoader.isInitialLoading) {
      // Primeira carga: busca dados e marca como carregado.
      loadByDate(userId, today()).then(() => agendaLoader.markLoaded());
    }
  }, [userId, loadByDate, agendaLoader.isInitialLoading, agendaLoader.markLoaded]);
  // ↑ Usamos os CAMPOS primitivos do objeto, não o objeto em si.

  return {
    agendaLoader,
  };
}
