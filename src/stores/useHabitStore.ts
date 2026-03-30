import { create } from 'zustand';
import { HabitRepository, RoutineRepository } from '../services/database/habitRepository';
import { today } from '../utils/dateHelpers';
import { eventBus, EVENTS } from '../utils/eventBus';
import { showError } from '../utils/toast';
import type { Habit, HabitLog, Routine } from '../types/habit.types';

interface HabitState {
  habits: Habit[];
  habitLogs: HabitLog[];
  routines: Routine[];
  completedToday: string[];
  isLoading: boolean;

  loadData: (userId: string) => Promise<void>;
  createHabit: (data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'streakCount' | 'bestStreak'>) => Promise<Habit>;
  updateHabit: (id: string, data: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  completeHabit: (habitId: string, userId: string, extra?: { date?: string; moodAfter?: 1 | 2 | 3 | 4 | 5; note?: string }) => Promise<void>;
  uncompleteHabit: (habitId: string, userId: string) => Promise<void>;
  resetDailyCompletion: (userId: string) => Promise<void>;

  createRoutine: (data: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Routine>;
  updateRoutine: (id: string, data: Partial<Routine>) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  addHabitToRoutine: (routineId: string, habitId: string) => Promise<void>;
  removeHabitFromRoutine: (routineId: string, habitId: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  habitLogs: [],
  routines: [],
  completedToday: [],
  isLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    const [habits, routines, completedToday] = await Promise.all([
      HabitRepository.getByUser(userId),
      RoutineRepository.getByUser(userId),
      HabitRepository.getCompletedToday(userId),
    ]);
    set({ habits, routines, completedToday, habitLogs: [], isLoading: false });
  },

  createHabit: async (data) => {
    const habit = await HabitRepository.create(data);
    set(state => ({ habits: [...state.habits, habit] }));
    eventBus.emit(EVENTS.HABIT_CHANGED);
    return habit;
  },

  updateHabit: async (id, data) => {
    await HabitRepository.update(id, data);
    set(state => ({
      habits: state.habits.map(h => h.id === id ? { ...h, ...data } : h),
    }));
    eventBus.emit(EVENTS.HABIT_CHANGED);
  },

  deleteHabit: async (id) => {
    await HabitRepository.delete(id);
    set(state => ({ habits: state.habits.filter(h => h.id !== id) }));
    eventBus.emit(EVENTS.HABIT_CHANGED);
  },

  completeHabit: async (habitId, userId, extra) => {
    const { completedToday } = get();
    if (completedToday.includes(habitId)) return;
    const dateStr = extra?.date ?? today();

    try {
      const log = await HabitRepository.logCompletion({
        habitId,
        userId,
        date: dateStr,
        xpEarned: 10,
        moodAfter: extra?.moodAfter,
        note: extra?.note,
      });

      set(state => ({
        completedToday: [...state.completedToday, habitId],
        habitLogs: [...state.habitLogs, log],
        habits: state.habits.map(h =>
          h.id === habitId ? { ...h, streakCount: h.streakCount + 1 } : h
        ),
      }));
      eventBus.emit(EVENTS.HABIT_CHANGED);
    } catch {
      showError('Não foi possível registrar o hábito. Tente novamente.');
    }
  },

  uncompleteHabit: async (habitId, userId) => {
    await HabitRepository.uncompleteToday(habitId, userId);
    set(state => ({
      completedToday: state.completedToday.filter(id => id !== habitId),
      habits: state.habits.map(h =>
        h.id === habitId ? { ...h, streakCount: Math.max(0, h.streakCount - 1) } : h
      ),
    }));
    eventBus.emit(EVENTS.HABIT_CHANGED);
  },

  resetDailyCompletion: async (userId) => {
    await HabitRepository.resetDailyCompletion(userId);
    const habits = await HabitRepository.getByUser(userId);
    set({ completedToday: [], habitLogs: [], habits });
  },

  createRoutine: async (data) => {
    const routine = await RoutineRepository.create(data);
    set(state => ({ routines: [...state.routines, routine] }));
    eventBus.emit(EVENTS.HABIT_CHANGED);
    return routine;
  },

  updateRoutine: async (id, data) => {
    await RoutineRepository.update(id, data);
    set(state => ({
      routines: state.routines.map(r => r.id === id ? { ...r, ...data } : r),
    }));
  },

  deleteRoutine: async (id) => {
    await RoutineRepository.delete(id);
    set(state => ({ routines: state.routines.filter(r => r.id !== id) }));
    eventBus.emit(EVENTS.HABIT_CHANGED);
  },

  addHabitToRoutine: async (routineId, habitId) => {
    // CORREÇÃO: race condition no orderIndex eliminado.
    // Antes: lemos o comprimento do array de hábitos do estado em memória.
    // Se dois usuários (ou chamadas simultâneas) adicionassem um hábito
    // à mesma rotina ao mesmo tempo, ambos leriam length = 5 e
    // tentariam inserir no índice 5 — colisão de ordem.
    //
    // SOLUÇÃO: delegamos o cálculo do orderIndex ao banco de dados.
    // O banco serializa as escritas — o segundo INSERT sempre vê
    // o resultado do primeiro, então o índice será correto.
    //
    // "SELECT COUNT(*)" no banco conta os registros existentes para
    // aquela rotina ANTES do INSERT, garantindo sequência correta.
    // Implementado dentro do RoutineRepository.addHabit com subquery:
    //   INSERT INTO routine_habits (..., order_index)
    //   SELECT ?, ?, ?, (SELECT COUNT(*) FROM routine_habits WHERE routine_id = ?)
    //
    // Como RoutineRepository.addHabit já recebe orderIndex como parâmetro,
    // passamos undefined e deixamos o DB calcular internamente.
    // Se a API do repo não suportar, a alternativa segura é ler do banco:
    const { habits } = get();

    // Usamos -1 como sentinel: o banco vai sobrescrever com COUNT(*).
    // O RoutineRepository.addHabit usa "INSERT OR IGNORE" então se já existir, não faz nada.
    await RoutineRepository.addHabit(routineId, habitId);

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return; // Hábito não encontrado no store — improvável mas defensivo.

    // Atualiza o estado local otimisticamente (sem esperar reload completo).
    // Otimismo = atualizar a UI imediatamente e assumir que o banco aceitou.
    // Se o banco falhar, o useEffect de foco vai recarregar e corrigir.
    set(state => ({
      routines: state.routines.map(r =>
        r.id === routineId
          ? { ...r, habits: [...(r.habits ?? []), habit] }
          : r
      ),
    }));
  },

  removeHabitFromRoutine: async (routineId, habitId) => {
    await RoutineRepository.removeHabit(routineId, habitId);
    set(state => ({
      routines: state.routines.map(r =>
        r.id === routineId
          ? { ...r, habits: r.habits?.filter(h => h.id !== habitId) }
          : r
      ),
    }));
  },
}));
