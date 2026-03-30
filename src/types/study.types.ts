export type PomodoroStatus = 'idle' | 'running' | 'paused' | 'break';
export type StudyNoteType = 'note' | 'summary' | 'link' | 'image';

export interface StudySubject {
  id: string;
  userId: string;
  title: string;
  description?: string;
  color: string;
  totalMinutes: number;       // Acumulado de sessões
  orderIndex: number;
  linkedGoalId?: string;      // FK para SmarterGoal
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string;
  title?: string;
  plannedMinutes: number;
  actualMinutes: number;
  pomodoroCount: number;
  date: string;               // YYYY-MM-DD
  startedAt?: string;
  endedAt?: string;
  notes?: string;
  linkedNoteId?: string;
  createdAt: string;
}

export interface StudyNote {
  id: string;
  userId: string;
  subjectId: string;
  sessionId?: string;
  title?: string;
  content: string;
  type: StudyNoteType;
  mediaUri?: string;          // Para imagens e links
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PomodoroState {
  status: PomodoroStatus;
  elapsedSeconds: number;
  sessionId?: string;
  subjectId?: string;
  startedAt?: number;         // timestamp ms para calcular ao voltar do background
}

export const POMODORO_WORK_MINUTES = 25;
export const POMODORO_SHORT_BREAK = 5;
export const POMODORO_LONG_BREAK = 15;
export const POMODORO_CYCLES_BEFORE_LONG = 4;

export const SUBJECT_COLORS = [
  '#4A7A9B', '#8B6F47', '#5A8A5A', '#C4882A',
  '#9B4A7A', '#4A9B7A', '#B85C45', '#7A4A9B',
];
