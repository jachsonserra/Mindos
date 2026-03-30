import { create } from 'zustand';
import { SecondMindRepository } from '../services/database/secondMindRepository';
import type { Note, PrimingItem, PersonalMetric, MetricEntry } from '../types/secondMind.types';

interface SecondMindState {
  notes: Note[];
  primingItems: PrimingItem[];
  metrics: PersonalMetric[];
  isLoading: boolean;

  loadData: (userId: string) => Promise<void>;
  createNote: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Note>;
  updateNote: (id: string, data: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  searchNotes: (userId: string, query: string) => Promise<Note[]>;

  createPrimingItem: (data: Omit<PrimingItem, 'id' | 'createdAt'>) => Promise<void>;
  deletePrimingItem: (id: string) => Promise<void>;

  createMetric: (data: Omit<PersonalMetric, 'id' | 'createdAt'>) => Promise<void>;
  addMetricEntry: (data: Omit<MetricEntry, 'id' | 'createdAt'>) => Promise<MetricEntry>;
  getMetricEntries: (userId: string, metricId: string, days?: number) => Promise<MetricEntry[]>;
}

export const useSecondMindStore = create<SecondMindState>((set, get) => ({
  notes: [],
  primingItems: [],
  metrics: [],
  isLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    const [notes, primingItems, metrics] = await Promise.all([
      SecondMindRepository.getNotes(userId),
      SecondMindRepository.getPrimingItems(userId),
      SecondMindRepository.getMetrics(userId),
    ]);
    set({ notes, primingItems, metrics, isLoading: false });
  },

  createNote: async (data) => {
    const note = await SecondMindRepository.createNote(data);
    set(state => ({ notes: [note, ...state.notes] }));
    return note;
  },

  updateNote: async (id, data) => {
    await SecondMindRepository.updateNote(id, data);
    set(state => ({
      notes: state.notes.map(n => n.id === id ? { ...n, ...data } : n),
    }));
  },

  deleteNote: async (id) => {
    await SecondMindRepository.deleteNote(id);
    set(state => ({ notes: state.notes.filter(n => n.id !== id) }));
  },

  searchNotes: async (userId, query) => {
    return SecondMindRepository.searchNotes(userId, query);
  },

  createPrimingItem: async (data) => {
    const item = await SecondMindRepository.createPrimingItem(data);
    set(state => ({ primingItems: [...state.primingItems, item] }));
  },

  deletePrimingItem: async (id) => {
    await SecondMindRepository.deletePrimingItem(id);
    set(state => ({ primingItems: state.primingItems.filter(p => p.id !== id) }));
  },

  createMetric: async (data) => {
    const metric = await SecondMindRepository.createMetric(data);
    set(state => ({ metrics: [...state.metrics, metric] }));
  },

  addMetricEntry: async (data) => {
    return SecondMindRepository.addMetricEntry(data);
  },

  getMetricEntries: async (userId, metricId, days) => {
    return SecondMindRepository.getMetricEntries(userId, metricId, days);
  },
}));
