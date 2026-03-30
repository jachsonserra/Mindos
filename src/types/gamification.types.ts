export interface UserXP {
  id: string;
  userId: string;
  totalXp: number;
  level: number;
  currentLevelXp: number;
  momentumScore: number;
  longestStreak: number;
  currentOverallStreak: number;
  updatedAt: string;
}

export interface XPHistory {
  id: string;
  userId: string;
  xpAmount: number;
  source: 'habit' | 'routine' | 'mission' | 'streak_bonus' | 'phase_unlock' | 'note' | 'time_tracked';
  sourceId?: string;
  description?: string;
  date: string;
  createdAt: string;
}

export interface Mission {
  id: string;
  userId: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'challenge' | 'phase';
  status: 'active' | 'completed' | 'failed' | 'locked';
  xpReward: number;
  requirementType: 'habit_count' | 'streak_days' | 'xp_total' | 'time_tracked' | 'phase_unlock';
  requirementValue: number;
  requirementCurrent: number;
  phaseRequired: number;
  expiresAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Reward {
  id: string;
  userId: string;
  title: string;
  description?: string;
  imageUri?: string;
  xpCost?: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  type: 'custom' | 'system';
  createdAt: string;
}
