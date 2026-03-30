// ─── Tipos para check-ins diários por período ─────────────────────────────────

export type MoodLevel = 1 | 2 | 3 | 4 | 5;
export type CheckInPeriod = 'morning' | 'midday' | 'evening';

export const MOOD_OPTIONS: { level: MoodLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: '😢', label: 'Muito mal'  },
  { level: 2, emoji: '😕', label: 'Mal'         },
  { level: 3, emoji: '😐', label: 'Neutro'      },
  { level: 4, emoji: '🙂', label: 'Bem'         },
  { level: 5, emoji: '😄', label: 'Ótimo'       },
];

export const FEELING_TAGS = [
  'Ansioso', 'Focado', 'Cansado', 'Motivado', 'Irritado',
  'Feliz', 'Estressado', 'Calmo', 'Confiante', 'Triste',
  'Energizado', 'Grato', 'Sobrecarregado', 'Tranquilo', 'Produtivo',
];

export const PERIOD_CONFIG: Record<CheckInPeriod, {
  label: string; emoji: string;
  greeting: string; startHour: number; endHour: number;
}> = {
  morning: {
    label: 'Manhã', emoji: '🌅',
    greeting: 'Bom dia! Como você está se sentindo agora?',
    startHour: 5, endHour: 12,
  },
  midday: {
    label: 'Tarde', emoji: '☀️',
    greeting: 'Como você está se sentindo agora?',
    startHour: 12, endHour: 18,
  },
  evening: {
    label: 'Noite', emoji: '🌙',
    greeting: 'Como foi o seu dia? Como está se sentindo?',
    startHour: 18, endHour: 24,
  },
};

export const MORNING_QUESTIONS = [
  'Pelo que você é grato hoje de manhã?',
];

export const MIDDAY_QUESTIONS = [
  'O que está ocupando mais sua mente agora?',
  'O que você realizou até aqui hoje?',
];

export const EVENING_QUESTIONS = [
  'Qual foi o melhor momento do seu dia?',
  'O que você aprendeu hoje?',
  'O que faria diferente amanhã?',
];

export interface PeriodEntry {
  mood: MoodLevel;
  feelings: string[];
  note: string;
  answers: string[]; // respostas às perguntas do período
  completedAt: string; // ISO timestamp
}

export interface DailyCheckIn {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  morning?: PeriodEntry;
  midday?: PeriodEntry;
  evening?: PeriodEntry;
  createdAt: string;
  updatedAt: string;
}

// Retorna o período atual baseado na hora
export function getCurrentPeriod(): CheckInPeriod | null {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'midday';
  if (hour >= 18)              return 'evening';
  return null; // madrugada — sem check-in
}

export function getMoodEmoji(level?: MoodLevel | null): string {
  if (!level) return '⬜';
  return MOOD_OPTIONS.find(m => m.level === level)?.emoji ?? '⬜';
}
