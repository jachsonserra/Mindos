export type HabitCategory = 'morning' | 'work' | 'health' | 'learning' | 'custom';

export type ToolType =
  | 'first_victory'
  | 'dopamine_block'
  | 'five_min_rule'
  | 'two_min_rule'
  | 'fudoshin'
  | 'mini_habit'
  | 'gradual_change'
  | 'anger_fuel'
  | 'acceptance'
  | 'custom';

export interface Habit {
  id: string;
  userId: string;
  title: string;
  description?: string;
  category: HabitCategory;
  phase: number;
  toolType: ToolType;
  xpReward: number;
  streakCount: number;
  bestStreak: number;
  isActive: boolean;
  durationMinutes?: number;
  orderIndex: number;
  // Loop do Hábito (Atomic Habits)
  trigger?: string;             // Gatilho: o que dispara este hábito?
  cue?: string;                 // Deixa específica (hora, lugar, ação anterior)
  desire?: string;              // Desejo/craving por trás
  implementation?: string;      // "Eu vou [AÇÃO] às [HORA] em [LOCAL]"
  twoMinuteVersion?: string;    // Versão de 2 minutos do hábito
  reward?: string;              // Recompensa ao completar
  relatedGoalId?: string;       // FK para SmarterGoal
  neverMissCount: number;       // Contador "Never Miss Twice"
  // Agendamento de notificação
  notificationId?: string;      // ID da notificação agendada
  notificationHour?: string;    // HH:MM para notificação diária
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  completedAt: string;
  date: string;
  durationActual?: number;
  moodAfter?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  xpEarned: number;
  // Sistema do "Fogo"
  isMissed?: boolean;           // true se foi um registro de falha
  missedReason?: string;        // Por que falhou (raiva construtiva)
}

export interface Routine {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'morning' | 'evening' | 'work' | 'custom';
  phase: number;
  triggerTime?: string;
  daysOfWeek: string;
  isActive: boolean;
  xpBonus: number;
  orderIndex: number;
  habits?: Habit[];
  createdAt: string;
  updatedAt: string;
}
