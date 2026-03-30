import { create } from 'zustand';
import { GratitudeEntry, CookieJarEntry } from '../types/gratitude.types';
import { GratitudeRepository, CookieJarRepository } from '../services/database/gratitudeRepository';
import { today, getLast30Days } from '../utils/dateHelpers';

interface GratitudeState {
  todayEntry: GratitudeEntry | null;
  entries: GratitudeEntry[];
  cookieJar: CookieJarEntry[];
  isLoading: boolean;
  loadData: (userId: string) => Promise<void>;
  saveEntry: (userId: string, data: Omit<GratitudeEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  addCookieJarEntry: (data: Omit<CookieJarEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  toggleCookieJarPin: (id: string) => Promise<void>;
  deleteCookieJarEntry: (id: string) => Promise<void>;
}

export const useGratitudeStore = create<GratitudeState>((set, get) => ({
  todayEntry: null,
  entries: [],
  cookieJar: [],
  isLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    try {
      const days = getLast30Days();
      const startDate = days[0]; // Primeiro dia dos últimos 30 (data local)

      const [todayEntry, entries, cookieJar] = await Promise.all([
        GratitudeRepository.getByDate(userId, today()),
        GratitudeRepository.getByDateRange(userId, startDate, today()),
        CookieJarRepository.getByUser(userId),
      ]);
      set({ todayEntry, entries, cookieJar });
    } catch (e) {
      console.error('[GratitudeStore] loadData:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  saveEntry: async (userId, data) => {
    const saved = await GratitudeRepository.createOrUpdate(data);
    set((s) => ({
      todayEntry: data.date === today() ? saved : s.todayEntry,
      entries: s.entries.some((e) => e.date === data.date)
        ? s.entries.map((e) => (e.date === data.date ? saved : e))
        : [saved, ...s.entries],
    }));
  },

  addCookieJarEntry: async (data) => {
    const created = await CookieJarRepository.create(data);
    set((s) => ({
      cookieJar: [created, ...s.cookieJar],
    }));
  },

  toggleCookieJarPin: async (id) => {
    await CookieJarRepository.togglePin(id);
    set((s) => ({
      cookieJar: s.cookieJar
        .map((c) => (c.id === id ? { ...c, isPinned: !c.isPinned } : c))
        .sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
    }));
  },

  deleteCookieJarEntry: async (id) => {
    await CookieJarRepository.delete(id);
    set((s) => ({ cookieJar: s.cookieJar.filter((c) => c.id !== id) }));
  },
}));
