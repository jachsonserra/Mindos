export type ObjectiveStatus = 'active' | 'completed' | 'archived';

export interface Objective {
  id: string;
  userId: string;
  title: string;        // "O que" quero alcançar
  description?: string; // Contexto adicional
  why: string;          // "Por que" isso importa
  status: ObjectiveStatus;
  color?: string;
  orderIndex: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Relacionamentos carregados
  smarterGoals?: import('./smarterGoal.types').SmarterGoal[];
}
