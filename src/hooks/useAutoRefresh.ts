/**
 * useAutoRefresh — Assina eventos do eventBus e recarrega stores relevantes.
 *
 * CORREÇÕES aplicadas nesta versão:
 *
 * 1. STALE CLOSURE de todayStr corrigido:
 *    Antes: todayStr era calculado UMA VEZ na montagem do hook e capturado
 *    no closure dos listeners. Após a meia-noite, o valor ficava stale
 *    (ontem) mas os listeners continuavam usando o valor antigo.
 *    Agora: cada callback chama today() no momento da execução do evento,
 *    garantindo sempre a data atual independente de quando o hook montou.
 *
 * 2. DEPENDENCY ARRAY do useEffect corrigido:
 *    Antes: [user?.id] apenas — funções como loadHabits, loadAgenda
 *    não estavam na dependency array, causando stale closure nelas também.
 *    Agora: todas as funções usadas dentro do effect estão nas dependências.
 *
 * O QUE É STALE CLOSURE?
 * É quando uma função "lembra" um valor antigo de uma variável
 * porque ela foi criada antes de a variável mudar.
 *
 * Exemplo didático:
 * let date = "2026-03-23";
 * const fn = () => console.log(date); // captura date = "2026-03-23"
 * date = "2026-03-24"; // muda no módulo, mas fn não sabe
 * fn(); // ainda imprime "2026-03-23" — STALE!
 *
 * Com today() DENTRO do callback, a data é calculada na HORA do evento,
 * não na hora em que o hook foi criado.
 *
 * Chame este hook UMA VEZ no _layout.tsx (raiz da navegação).
 */

import { useEffect } from 'react';
import { eventBus } from '../utils/eventBus';
import { useUserStore } from '../stores/useUserStore';
import { useObjectiveStore } from '../stores/useObjectiveStore';
import { useSmarterGoalStore } from '../stores/useSmarterGoalStore';
import { useTaskStore } from '../stores/useTaskStore';
import { useHabitStore } from '../stores/useHabitStore';
import { useAgendaStore } from '../stores/useAgendaStore';
import { today } from '../utils/dateHelpers'; // Função pura — sempre retorna a data atual.

export function useAutoRefresh() {
  const { user } = useUserStore();

  // Pegamos as funções dos stores com seletores estáveis.
  // Usar seletores (s => s.loadData) garante que só re-renderizamos quando
  // a FUNÇÃO muda, não quando qualquer dado do store muda.
  const loadObjectives = useObjectiveStore(s => s.loadData);
  const loadGoals      = useSmarterGoalStore(s => s.loadData);
  const loadTasks      = useTaskStore(s => s.loadData);
  const loadHabits     = useHabitStore(s => s.loadData);
  const loadAgenda     = useAgendaStore(s => s.loadByDate);

  useEffect(() => {
    if (!user?.id) return; // Sem usuário logado, não registramos listeners.

    const uid = user.id;

    // CORREÇÃO: não capturamos todayStr aqui.
    // Cada callback chama today() no momento do evento para sempre usar a data atual.
    // Se o app ficar aberto após meia-noite, o próximo evento de agenda
    // vai buscar os dados do dia CORRETO, não do dia anterior.

    const unsubs = [
      // "objective:changed" → recarrega apenas os objetivos.
      eventBus.on('objective:changed', () => loadObjectives(uid)),

      // "goal:changed" → recarrega apenas as metas SMARTER.
      eventBus.on('goal:changed', () => loadGoals(uid)),

      // "task:changed" → recarrega apenas as tarefas.
      eventBus.on('task:changed', () => loadTasks(uid)),

      // "habit:changed" → recarrega apenas os hábitos.
      eventBus.on('habit:changed', () => loadHabits(uid)),

      // "agenda:changed" → CORREÇÃO: today() chamado dentro do callback.
      // Antes: loadAgenda(uid, todayStr) usava a data capturada no closure.
      // Agora: today() calcula a data no momento em que o evento dispara.
      eventBus.on('agenda:changed', () => loadAgenda(uid, today())),

      // "refresh:all" → recarrega tudo (ex: após sync com Supabase).
      eventBus.on('refresh:all', () => {
        loadObjectives(uid);
        loadGoals(uid);
        loadTasks(uid);
        loadHabits(uid);
        loadAgenda(uid, today()); // today() fresco a cada chamada de 'refresh:all'.
      }),
    ];

    // Cleanup: remove todos os listeners quando o componente desmonta
    // ou quando user.id muda (ex: logout → login de outro usuário).
    // Sem esse cleanup, listeners "fantasmas" continuariam escutando
    // e tentando carregar dados para o usuário antigo.
    return () => unsubs.forEach(u => u());

  // CORREÇÃO: incluímos todas as funções usadas dentro do effect.
  // Se loadHabits ou loadAgenda mudarem de referência (ex: o store foi
  // reinicializado), o effect re-executa e registra listeners com a versão nova.
  }, [user?.id, loadObjectives, loadGoals, loadTasks, loadHabits, loadAgenda]);
}
