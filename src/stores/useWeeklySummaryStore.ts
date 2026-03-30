import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendMessage } from '../services/ai/AnthropicService';
import { AnthropicKeyService } from '../services/ai/AnthropicKeyService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getWeekKey(): string {
  const d = new Date();
  // ISO week: year + week number
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function isSunday(): boolean {
  return new Date().getDay() === 0;
}

function isAfternoon(): boolean {
  return new Date().getHours() >= 16;
}

const STORAGE_KEY = 'weeklySummary:v1';

interface StoredSummary {
  text: string;
  weekKey: string;
  generatedAt: string;
}

// ── State ─────────────────────────────────────────────────────────────────────

interface WeeklySummaryState {
  summary: string | null;
  weekKey: string | null;
  generatedAt: string | null;
  isLoading: boolean;

  loadFromStorage: () => Promise<void>;
  generate: (userId: string, contextText: string) => Promise<void>;
  shouldShowSummary: () => boolean;
  shouldAutoGenerate: () => boolean;
}

export const useWeeklySummaryStore = create<WeeklySummaryState>((set, get) => ({
  summary: null,
  weekKey: null,
  generatedAt: null,
  isLoading: false,

  loadFromStorage: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored: StoredSummary = JSON.parse(raw);
      // Only load if from current week
      if (stored.weekKey === getWeekKey()) {
        set({ summary: stored.text, weekKey: stored.weekKey, generatedAt: stored.generatedAt });
      }
    } catch { /* silencioso */ }
  },

  generate: async (userId: string, contextText: string) => {
    const configured = await AnthropicKeyService.isConfigured();
    if (!configured) return;
    if (get().isLoading) return;

    set({ isLoading: true });
    try {
      const systemPrompt = `Você é um coach de desenvolvimento pessoal. Seja direto, empático e conciso.
Escreva APENAS o resumo semanal — sem introduções, sem "Aqui está", sem "Claro!".
O formato deve ser: 1 parágrafo de celebração do que foi conquistado + 1 parágrafo de onde focar na próxima semana.
Máximo 120 palavras. Tom: coach honesto, não terapeuta.`;

      const userMsg = `Com base nos dados desta semana do usuário, escreva um resumo motivacional de fim de semana:\n\n${contextText}`;

      const text = await sendMessage(systemPrompt, [
        { role: 'user', content: userMsg },
      ]);

      if (!text) return;

      const stored: StoredSummary = {
        text,
        weekKey: getWeekKey(),
        generatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      set({ summary: text, weekKey: stored.weekKey, generatedAt: stored.generatedAt, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  // Mostra se há um resumo desta semana
  shouldShowSummary: () => {
    const { summary, weekKey } = get();
    return !!summary && weekKey === getWeekKey();
  },

  // Auto-gera se for domingo à tarde e ainda não tiver resumo desta semana
  shouldAutoGenerate: () => {
    const { weekKey, isLoading } = get();
    return isSunday() && isAfternoon() && weekKey !== getWeekKey() && !isLoading;
  },
}));
