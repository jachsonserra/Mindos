import { create } from 'zustand';
import { UserInsightService } from '../services/insights/UserInsightService';
import { Insight, UserInsightProfile } from '../types/insight.types';

interface InsightState {
  profile: UserInsightProfile | null;
  isLoading: boolean;
  error: string | null;
  lastUserId: string | null;

  // Insights ordenados por força
  insights: Insight[];
  // Top 2 para preview no home
  topInsights: Insight[];

  generate: (userId: string, force?: boolean) => Promise<void>;
}

// Cache por sessão: não regenera se já foi feito nos últimos 30min
let _lastGeneratedAt: number = 0;
const CACHE_MS = 30 * 60 * 1000;

export const useInsightStore = create<InsightState>((set, get) => ({
  profile:      null,
  isLoading:    false,
  error:        null,
  lastUserId:   null,
  insights:     [],
  topInsights:  [],

  generate: async (userId, force = false) => {
    const now = Date.now();
    const isCached = !force
      && get().lastUserId === userId
      && _lastGeneratedAt > 0
      && (now - _lastGeneratedAt) < CACHE_MS;

    if (isCached) return;

    set({ isLoading: true, error: null });
    try {
      const profile = await UserInsightService.generate(userId);
      _lastGeneratedAt = Date.now();
      set({
        profile,
        insights:    profile.insights,
        topInsights: profile.insights.slice(0, 2),
        lastUserId:  userId,
      });
    } catch (e: any) {
      console.error('[InsightStore] generate:', e);
      set({ error: e?.message ?? 'Falha ao gerar insights' });
    } finally {
      set({ isLoading: false });
    }
  },
}));
