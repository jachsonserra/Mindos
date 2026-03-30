import { create } from 'zustand';
import { Objective, ObjectiveStatus } from '../types/objective.types';
import { ObjectiveRepository } from '../services/database/objectiveRepository';
import { eventBus, EVENTS } from '../utils/eventBus';

interface ObjectiveState {
  objectives: Objective[];
  isLoading: boolean;
  loadData: (userId: string) => Promise<void>;
  createObjective: (
    data: Omit<Objective, 'id' | 'createdAt' | 'updatedAt' | 'smarterGoals'>
  ) => Promise<Objective>;
  updateObjective: (id: string, data: Partial<Objective>) => Promise<void>;
  completeObjective: (id: string) => Promise<void>;
  archiveObjective: (id: string) => Promise<void>;
  deleteObjective: (id: string) => Promise<void>;
}

export const useObjectiveStore = create<ObjectiveState>((set, get) => ({
  objectives: [],
  isLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    try {
      const objectives = await ObjectiveRepository.getByUser(userId);
      set({ objectives });
    } catch (e) {
      console.error('[ObjectiveStore] loadData:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  createObjective: async (data) => {
    const created = await ObjectiveRepository.create(data);
    set((s) => ({ objectives: [...s.objectives, created] }));
    eventBus.emit(EVENTS.OBJECTIVE_CHANGED);
    return created;
  },

  updateObjective: async (id, data) => {
    await ObjectiveRepository.update(id, data);
    set((s) => ({
      objectives: s.objectives.map((o) => (o.id === id ? { ...o, ...data } : o)),
    }));
    eventBus.emit(EVENTS.OBJECTIVE_CHANGED);
  },

  completeObjective: async (id) => {
    await ObjectiveRepository.complete(id);
    const now = new Date().toISOString();
    set((s) => ({
      objectives: s.objectives.map((o) =>
        o.id === id ? { ...o, status: 'completed' as ObjectiveStatus, completedAt: now } : o
      ),
    }));
    eventBus.emit(EVENTS.OBJECTIVE_CHANGED);
  },

  archiveObjective: async (id) => {
    await ObjectiveRepository.archive(id);
    set((s) => ({
      objectives: s.objectives.map((o) =>
        o.id === id ? { ...o, status: 'archived' as ObjectiveStatus } : o
      ),
    }));
    eventBus.emit(EVENTS.OBJECTIVE_CHANGED);
  },

  deleteObjective: async (id) => {
    await ObjectiveRepository.delete(id);
    set((s) => ({ objectives: s.objectives.filter((o) => o.id !== id) }));
    eventBus.emit(EVENTS.OBJECTIVE_CHANGED);
  },
}));
