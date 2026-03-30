export interface GratitudeEntry {
  id: string;
  userId: string;
  date: string;                 // YYYY-MM-DD
  gratitudes: string[];         // Lista de itens de gratidão
  emotion?: string;             // Como se sentiu hoje
  highlight?: string;           // Melhor momento do dia
  linkedNoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CookieJarEntry {
  id: string;
  userId: string;
  title: string;                // Nome da vitória
  description: string;          // Detalhes da conquista
  date: string;                 // YYYY-MM-DD
  emotionScore?: 1 | 2 | 3 | 4 | 5;
  imageUri?: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const EMOTION_EMOJIS: Record<string, string> = {
  Grato: '🙏',
  Animado: '🔥',
  Calmo: '😌',
  Focado: '🎯',
  Orgulhoso: '💪',
  Esperançoso: '✨',
  Determinado: '🏆',
};

export const EMOTION_OPTIONS = Object.keys(EMOTION_EMOJIS);
