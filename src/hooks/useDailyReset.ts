import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useHabitStore } from '../stores/useHabitStore';
import { useGamificationStore } from '../stores/useGamificationStore';
import { useUserStore } from '../stores/useUserStore';
import { today } from '../utils/dateHelpers';

const LAST_RESET_KEY = 'mindos_last_reset';

async function getLastResetDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_RESET_KEY);
  } catch {
    return null;
  }
}

async function setLastResetDate(date: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_RESET_KEY, date);
  } catch {}
}

export function useDailyReset() {
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const user = useUserStore(s => s.user);
  const resetDailyCompletion = useHabitStore(s => s.resetDailyCompletion);
  const applyDailyDecay = useGamificationStore(s => s.applyDailyDecay);
  const generateDailyMissions = useGamificationStore(s => s.generateDailyMissions);

  const checkAndReset = async () => {
    if (!user) return;

    // CORREÇÃO: adicionado try-catch para toda a função.
    // Antes: qualquer falha em resetDailyCompletion, applyDailyDecay ou
    // generateDailyMissions propagaria uma exceção não tratada, quebrando
    // o useEffect e impedindo que o app funcionasse normalmente.
    //
    // Estratégia: logar o erro mas NÃO re-throw — o daily reset é uma
    // operação de background que não deve bloquear o uso do app.
    // Se falhar hoje, a próxima abertura tentará novamente.
    try {
      const lastReset = await getLastResetDate();
      const todayStr = today();

      // Se já fizemos o reset hoje, não precisamos fazer nada.
      // "===" compara strings exatas: "2026-03-23" === "2026-03-23".
      if (lastReset === todayStr) return;

      // Calcula quantos dias se passaram desde o último reset.
      // Exemplo: lastReset = "2026-03-20", todayStr = "2026-03-23" → daysMissed = 3.
      // "new Date(str).getTime()" converte data para timestamp em milissegundos.
      // Dividir por (1000 * 60 * 60 * 24) converte ms para dias.
      // Math.floor arredonda para baixo (parcial de dia não conta).
      const daysMissed = lastReset
        ? Math.floor(
            (new Date(todayStr).getTime() - new Date(lastReset).getTime()) /
            (1000 * 60 * 60 * 24)
          )
        : 0; // Primeira abertura sem histórico = sem dias perdidos.

      // Reseta os hábitos completados hoje para "não completados".
      // (Cada dia começa com todos os hábitos em aberto.)
      await resetDailyCompletion(user.id);

      // Aplica decay de momentum pelos dias sem atividade.
      // Se ficou 3 dias sem usar o app, o momentum cai progressivamente.
      if (daysMissed > 0) {
        await applyDailyDecay(user.id, daysMissed);
      }

      // Gera novas missões para o dia (missions expiram à meia-noite).
      await generateDailyMissions(user.id, user.currentPhase);

      // Salva o timestamp do reset — próxima chamada retorna early acima.
      await setLastResetDate(todayStr);

    } catch (error) {
      // Logamos para debugging mas não interrompemos o fluxo do app.
      // O usuário vai continuar usando normalmente; o reset tentará de novo
      // na próxima abertura do app ou quando sair do background.
      console.error('[useDailyReset] Falha no reset diário:', error);
    }
  };

  useEffect(() => {
    checkAndReset();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        checkAndReset();
      }
      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [user?.id]);
}
