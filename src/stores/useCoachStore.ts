import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatMessage, streamMessage } from '../services/ai/AnthropicService';
import { CoachContextService } from '../services/ai/CoachContextService';
import { User } from '../types/user.types';
import { DailyCheckIn } from '../types/checkin.types';
import { UserInsightProfile } from '../types/insight.types';
import { Habit } from '../types/habit.types';
import { Objective } from '../types/objective.types';

const HISTORY_MAX = 60; // máximo de mensagens persistidas por usuário

export interface CoachChatMessage extends ChatMessage {
  id: string;
  timestamp: string;
  isStreaming?: boolean;
}

interface CoachState {
  messages: CoachChatMessage[];
  isStreaming: boolean;
  error: string | null;
  systemPrompt: string;

  // Inicializa o coach com contexto do usuário
  initContext: (params: {
    user: User;
    habits: Habit[];
    objectives: Objective[];
    recentCheckIns: DailyCheckIn[];
    insightProfile: UserInsightProfile | null;
  }) => void;

  // Envia mensagem e inicia streaming
  send: (text: string) => Promise<void>;

  // Limpa histórico (mantém contexto)
  clearHistory: () => void;

  // Adiciona mensagem de abertura do coach (primeira vez)
  addOpeningMessage: (user: User, insightProfile: UserInsightProfile | null) => void;

  // Persiste/restaura histórico de mensagens no AsyncStorage
  loadHistory: (userId: string) => Promise<void>;
  persistHistory: (userId: string, msgs: CoachChatMessage[]) => Promise<void>;
}

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now(): string {
  return new Date().toISOString();
}

export const useCoachStore = create<CoachState>((set, get) => ({
  messages:     [],
  isStreaming:  false,
  error:        null,
  systemPrompt: '',

  initContext: ({ user, habits, objectives, recentCheckIns, insightProfile }) => {
    const systemPrompt = CoachContextService.buildSystemPrompt({
      user, habits, objectives, recentCheckIns, insightProfile,
    });
    set({ systemPrompt });
  },

  addOpeningMessage: (user, insightProfile) => {
    const { messages } = get();
    if (messages.length > 0) return; // já tem mensagens

    // Gera abertura baseada nos dados disponíveis
    const hasMood = (insightProfile?.moodAvgLast7 ?? 0) > 0;
    const hasHabits = (insightProfile?.longestCurrentStreak ?? 0) > 0;
    const hasObjectives = (insightProfile?.activeObjectivesCount ?? 0) > 0;
    const topFeeling = insightProfile?.topFeelings?.[0];

    let opening = `Olá, ${user.name}. `;

    if (!hasMood && !hasHabits) {
      // Primeiro uso
      opening += `Sou seu coach no MindOS. Conheço sua âncora — "${user.whyAnchor}" — e estou aqui para te ajudar a transformar isso em realidade, não em intenção.\n\nPor onde você quer começar hoje?`;
    } else if (topFeeling && ['Ansioso', 'Estressado', 'Sobrecarregado', 'Irritado', 'Cansado'].includes(topFeeling)) {
      opening += `Notei que você tem estado "${topFeeling.toLowerCase()}" com frequência ultimamente. Isso é dado, não fraqueza.\n\nO que está acontecendo de verdade por trás disso?`;
    } else if (hasHabits && (insightProfile?.longestCurrentStreak ?? 0) >= 5) {
      const streak = insightProfile?.longestCurrentStreak ?? 0;
      opening += `${streak} dias em sequência é real. Muita gente fala sobre disciplina — você está vivendo isso.\n\nComo você está usando essa energia? O que está avançando junto com os hábitos?`;
    } else if (hasObjectives) {
      opening += `Você tem objetivos ativos e está trabalhando nisso. Mas objetivos sem honestidade são só wishlist.\n\nO que está travando mais o seu progresso real agora?`;
    } else {
      opening += `Tenho seu histórico aqui. Dados não mentem — e eles mostram onde você está de verdade.\n\nO que está passando pela sua cabeça agora?`;
    }

    const openingMsg: CoachChatMessage = {
      id:        makeId(),
      role:      'assistant',
      content:   opening,
      timestamp: now(),
    };

    set({ messages: [openingMsg] });
  },

  send: async (text: string) => {
    const { messages, systemPrompt, isStreaming } = get();
    if (isStreaming || !text.trim()) return;

    const userMsg: CoachChatMessage = {
      id:        makeId(),
      role:      'user',
      content:   text.trim(),
      timestamp: now(),
    };

    // Placeholder da resposta (vai ser preenchida pelo streaming)
    const assistantMsgId = makeId();
    const assistantMsg: CoachChatMessage = {
      id:          assistantMsgId,
      role:        'assistant',
      content:     '',
      timestamp:   now(),
      isStreaming: true,
    };

    set(s => ({
      messages:    [...s.messages, userMsg, assistantMsg],
      isStreaming: true,
      error:       null,
    }));

    // Histórico para a API (sem IDs e timestamps, só role + content)
    const apiMessages: ChatMessage[] = [...messages, userMsg].map(m => ({
      role:    m.role,
      content: m.content,
    }));

    await streamMessage(
      systemPrompt,
      apiMessages,
      // onChunk: atualiza o conteúdo da mensagem assistente em tempo real
      (chunk) => {
        set(s => ({
          messages: s.messages.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + chunk }
              : m
          ),
        }));
      },
      // onDone
      (_fullText) => {
        set(s => ({
          messages: s.messages.map(m =>
            m.id === assistantMsgId
              ? { ...m, isStreaming: false }
              : m
          ),
          isStreaming: false,
        }));
      },
      // onError
      (err) => {
        set(s => ({
          messages: s.messages.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: `Erro ao conectar com o coach: ${err.message}`, isStreaming: false }
              : m
          ),
          isStreaming: false,
          error: err.message,
        }));
      },
    );
  },

  clearHistory: () => {
    set({ messages: [], error: null });
  },

  loadHistory: async (userId: string) => {
    try {
      const raw = await AsyncStorage.getItem(`coachHistory:${userId}`);
      if (!raw) return;
      const msgs: CoachChatMessage[] = JSON.parse(raw);
      if (Array.isArray(msgs) && msgs.length > 0) {
        set({ messages: msgs });
      }
    } catch { /* silencioso */ }
  },

  persistHistory: async (userId: string, msgs: CoachChatMessage[]) => {
    try {
      const toSave = msgs.slice(-HISTORY_MAX);
      await AsyncStorage.setItem(`coachHistory:${userId}`, JSON.stringify(toSave));
    } catch { /* silencioso */ }
  },
}));
