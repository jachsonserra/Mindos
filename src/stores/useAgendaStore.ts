import { create } from 'zustand';
import { AgendaRepository } from '../services/database/agendaRepository';
import { today } from '../utils/dateHelpers';
import { eventBus, EVENTS } from '../utils/eventBus';
import type { AgendaEvent } from '../types/agenda.types';
import type { Task } from '../types/task.types';

interface AgendaState {
  events: AgendaEvent[];
  selectedDate: string;
  isLoading: boolean;

  loadByDate: (userId: string, date: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  createEvent: (data: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AgendaEvent>;
  createFromTask: (task: Task) => Promise<AgendaEvent | null>;
  updateEvent: (id: string, data: Partial<AgendaEvent>) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useAgendaStore = create<AgendaState>((set, get) => ({
  events: [],
  selectedDate: today(),
  isLoading: false,

  loadByDate: async (userId: string, date: string) => {
    set({ isLoading: true });
    try {
      const events = await AgendaRepository.getByDate(userId, date);
      set({ events, selectedDate: date });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedDate: (date: string) => {
    set({ selectedDate: date });
  },

  createEvent: async (data) => {
    const event = await AgendaRepository.create(data);
    set(state => ({
      events: [...state.events, event].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      ),
    }));
    eventBus.emit(EVENTS.AGENDA_CHANGED);
    return event;
  },

  createFromTask: async (task: Task) => {
    const event = await AgendaRepository.createFromTask(task);
    if (event && event.date === get().selectedDate) {
      set(state => ({
        events: [...state.events, event].sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        ),
      }));
    }
    eventBus.emit(EVENTS.AGENDA_CHANGED);
    return event;
  },

  updateEvent: async (id, data) => {
    await AgendaRepository.update(id, data);
    set(state => ({
      events: state.events.map(e => e.id === id ? { ...e, ...data } : e),
    }));
    eventBus.emit(EVENTS.AGENDA_CHANGED);
  },

  toggleComplete: async (id) => {
    await AgendaRepository.toggleComplete(id);
    set(state => ({
      events: state.events.map(e =>
        e.id === id ? { ...e, isCompleted: !e.isCompleted } : e
      ),
    }));
    eventBus.emit(EVENTS.AGENDA_CHANGED);
  },

  deleteEvent: async (id) => {
    await AgendaRepository.delete(id);
    set(state => ({
      events: state.events.filter(e => e.id !== id),
    }));
    eventBus.emit(EVENTS.AGENDA_CHANGED);
  },
}));
