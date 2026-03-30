import { create } from 'zustand';
import { SmarterGoal, GoalCheckpoint, SmarterGoalStatus } from '../types/smarterGoal.types';
import { SmarterGoalRepository } from '../services/database/smarterGoalRepository';
import { eventBus, EVENTS } from '../utils/eventBus';

interface SmarterGoalState {
  goals: SmarterGoal[];
  isLoading: boolean;
  loadData: (userId: string) => Promise<void>;
  createGoal: (
    data: Omit<SmarterGoal, 'id' | 'createdAt' | 'updatedAt' | 'checkpoints'>
  ) => Promise<SmarterGoal>;
  updateGoal: (id: string, data: Partial<SmarterGoal>) => Promise<void>;
  updateProgress: (id: string, currentValue: number) => Promise<void>;
  completeGoal: (id: string) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  completeCheckpoint: (goalId: string, checkpointId: string, value: number, notes?: string) => Promise<void>;
  getByObjective: (objectiveId: string) => SmarterGoal[];
}

export const useSmarterGoalStore = create<SmarterGoalState>((set, get) => ({
  goals: [],
  isLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    try {
      const goals = await SmarterGoalRepository.getByUser(userId);
      set({ goals });
    } catch (e) {
      console.error('[SmarterGoalStore] loadData:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createGoal: async (data) => {
    const created = await SmarterGoalRepository.create(data);
    set((s) => ({ goals: [...s.goals, created] }));
    eventBus.emit(EVENTS.GOAL_CHANGED);
    return created;
  },

  updateGoal: async (id, data) => {
    await SmarterGoalRepository.update(id, data);
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, ...data } : g)),
    }));
    eventBus.emit(EVENTS.GOAL_CHANGED);
  },

  updateProgress: async (id, currentValue) => {
    await SmarterGoalRepository.updateProgress(id, currentValue);
    set((s) => ({
      goals: s.goals.map((g) => (g.id === id ? { ...g, currentValue } : g)),
    }));
    eventBus.emit(EVENTS.GOAL_CHANGED);
  },

  completeGoal: async (id) => {
    await SmarterGoalRepository.complete(id);
    const now = new Date().toISOString();
    set((s) => ({
      goals: s.goals.map((g) =>
        g.id === id ? { ...g, status: 'completed' as SmarterGoalStatus, completedAt: now } : g
      ),
    }));
    eventBus.emit(EVENTS.GOAL_CHANGED);
  },

  deleteGoal: async (id) => {
    await SmarterGoalRepository.delete(id);
    set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
    eventBus.emit(EVENTS.GOAL_CHANGED);
  },

  completeCheckpoint: async (goalId, checkpointId, value, notes) => {
    await SmarterGoalRepository.completeCheckpoint(checkpointId, value, notes);
    const now = new Date().toISOString();
    set((s) => ({
      goals: s.goals.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          checkpoints: (g.checkpoints ?? []).map((cp) =>
            cp.id === checkpointId
              ? { ...cp, isCompleted: true, valueAtCheckpoint: value, notes, completedAt: now }
              : cp
          ),
        };
      }),
    }));
    eventBus.emit(EVENTS.GOAL_CHANGED);
  },

  getByObjective: (objectiveId) => {
    return get().goals.filter((g) => g.objectiveId === objectiveId);
  },
}));
