import { today } from '../../utils/dateHelpers';

export interface MissionTemplate {
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'challenge';
  xpReward: number;
  requirementType: 'habit_count' | 'streak_days' | 'xp_total' | 'time_tracked';
  requirementValue: number;
  phaseRequired: number;
}

export const DAILY_MISSIONS: MissionTemplate[] = [
  {
    title: 'Primeira Vitória do Dia',
    description: 'Complete seu hábito matinal principal',
    type: 'daily',
    xpReward: 50,
    requirementType: 'habit_count',
    requirementValue: 1,
    phaseRequired: 1,
  },
  {
    title: 'Dia Produtivo',
    description: 'Complete 3 hábitos hoje',
    type: 'daily',
    xpReward: 80,
    requirementType: 'habit_count',
    requirementValue: 3,
    phaseRequired: 1,
  },
  {
    title: 'Dia Completo',
    description: 'Complete 5 ou mais hábitos hoje',
    type: 'daily',
    xpReward: 120,
    requirementType: 'habit_count',
    requirementValue: 5,
    phaseRequired: 2,
  },
];

export const WEEKLY_MISSIONS: MissionTemplate[] = [
  {
    title: 'Sequência de 3 Dias',
    description: 'Mantenha um hábito por 3 dias seguidos',
    type: 'weekly',
    xpReward: 100,
    requirementType: 'streak_days',
    requirementValue: 3,
    phaseRequired: 1,
  },
  {
    title: 'Sequência de 7 Dias',
    description: 'Mantenha pelo menos 1 hábito por 7 dias seguidos',
    type: 'weekly',
    xpReward: 200,
    requirementType: 'streak_days',
    requirementValue: 7,
    phaseRequired: 2,
  },
  {
    title: 'Explorador da Segunda Mente',
    description: 'Faça 5 reflexões nesta semana',
    type: 'weekly',
    xpReward: 150,
    requirementType: 'habit_count',
    requirementValue: 5,
    phaseRequired: 3,
  },
];

export const CHALLENGE_MISSIONS: MissionTemplate[] = [
  {
    title: 'Guerreiro do Tempo',
    description: 'Rastreie 10 horas de trabalho produtivo',
    type: 'challenge',
    xpReward: 300,
    requirementType: 'time_tracked',
    requirementValue: 600,
    phaseRequired: 1,
  },
  {
    title: 'Mestre dos Hábitos',
    description: 'Alcance 500 XP total',
    type: 'challenge',
    xpReward: 200,
    requirementType: 'xp_total',
    requirementValue: 500,
    phaseRequired: 1,
  },
  {
    title: 'Samurai Mental',
    description: 'Mantenha uma sequência de 30 dias',
    type: 'challenge',
    xpReward: 500,
    requirementType: 'streak_days',
    requirementValue: 30,
    phaseRequired: 4,
  },
];

export function getDailyMissionsForToday(): MissionTemplate[] {
  const dayOfWeek = new Date().getDay();
  // Rotaciona missões diárias baseado no dia da semana
  return DAILY_MISSIONS.filter((_, i) => i <= dayOfWeek % 2);
}

export function getDailyExpiry(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export function getWeeklyExpiry(): string {
  const nextWeek = new Date();
  const daysUntilMonday = (8 - nextWeek.getDay()) % 7 || 7;
  nextWeek.setDate(nextWeek.getDate() + daysUntilMonday);
  nextWeek.setHours(0, 0, 0, 0);
  return nextWeek.toISOString();
}
