export type TaskStatus = 'pending' | 'completed' | 'cancelled';
export type EnergyLevel = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  userId: string;
  goalId?: string;
  smarterGoalId?: string;      // FK para SmarterGoal
  routineId?: string;          // FK para Routine (opcional)
  habitId?: string;            // FK para Habit (opcional)
  title: string;
  description?: string;
  reward?: string;             // Recompensa definida pelo usuário
  rewardUnlocked: boolean;
  rewardPoints?: number;
  rewardType?: 'xp' | 'custom' | 'trophy';
  scheduledDate?: string;      // YYYY-MM-DD
  scheduledHour?: string;      // HH:MM
  isCompleted: boolean;
  completedAt?: string;
  status: TaskStatus;
  orderIndex: number;
  // Pareto 80/20
  isPareto: boolean;
  difficultyLevel?: 1 | 2 | 3 | 4 | 5;
  energyRequired?: EnergyLevel;
  createdAt: string;
  updatedAt: string;
}
