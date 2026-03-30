export type SmarterGoalStatus = 'active' | 'completed' | 'paused' | 'archived';
export type ReviewFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface SmarterGoal {
  id: string;
  userId: string;
  objectiveId?: string;       // FK para Objective (opcional)
  title: string;
  // Campos SMARTER
  specific: string;           // S - O que exatamente vai ser feito
  metric: string;             // M - Como será medido
  baseline: number;           // Ponto de partida atual
  target: number;             // Alvo a atingir
  metricUnit: string;         // Unidade (kg, R$, livros, etc.)
  achievable: string;         // A - Por que é atingível
  relevant: string;           // R - Por que é relevante agora
  deadline: string;           // T - YYYY-MM-DD
  emotional: string;          // E - Fator emocional/engajador
  reviewFrequency: ReviewFrequency; // R - Frequência de revisão
  // Progresso
  currentValue: number;
  status: SmarterGoalStatus;
  color?: string;
  orderIndex: number;
  // Metadata
  completedAt?: string;
  nextReviewAt?: string;
  createdAt: string;
  updatedAt: string;
  // Relacionamentos carregados
  checkpoints?: GoalCheckpoint[];
}

export interface GoalCheckpoint {
  id: string;
  goalId: string;
  userId: string;
  scheduledDate: string;        // YYYY-MM-DD
  notes?: string;
  valueAtCheckpoint?: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

// Frase SMARTER gerada automaticamente
export function buildSmarterPhrase(goal: Partial<SmarterGoal>): string {
  return `Vou alcançar ${goal.target ?? '?'} ${goal.metricUnit ?? ''} em ${goal.metric ?? '?'}, saindo de ${goal.baseline ?? '?'} para ${goal.target ?? '?'}, até ${goal.deadline ?? '?'}, porque ${goal.emotional ?? '?'}, revisando a cada ${reviewFrequencyLabel(goal.reviewFrequency)}.`;
}

export function reviewFrequencyLabel(freq?: ReviewFrequency): string {
  switch (freq) {
    case 'daily': return 'dia';
    case 'weekly': return 'semana';
    case 'biweekly': return '2 semanas';
    case 'monthly': return 'mês';
    default: return 'semana';
  }
}

export function progressPercent(goal: SmarterGoal): number {
  if (goal.target === goal.baseline) return 0;
  const p = ((goal.currentValue - goal.baseline) / (goal.target - goal.baseline)) * 100;
  return Math.max(0, Math.min(100, Math.round(p)));
}
