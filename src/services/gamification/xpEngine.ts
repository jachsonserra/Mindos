import { XP_VALUES, LEVEL_TITLES } from '../../utils/constants';

export { XP_VALUES };

export function calculateLevel(totalXP: number): number {
  let level = 1;
  let xpRequired = 100;
  let accumulated = 0;

  while (accumulated + xpRequired <= totalXP) {
    accumulated += xpRequired;
    level++;
    xpRequired = Math.floor(xpRequired * 1.2);
  }
  return level;
}

export function calculateCurrentLevelXP(totalXP: number): number {
  let xpRequired = 100;
  let accumulated = 0;

  while (accumulated + xpRequired <= totalXP) {
    accumulated += xpRequired;
    xpRequired = Math.floor(xpRequired * 1.2);
  }
  return totalXP - accumulated;
}

export function getXPForNextLevel(currentLevel: number): number {
  return Math.floor(100 * Math.pow(1.2, currentLevel - 1));
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)];
}

export function calculateStreakBonus(streakDays: number): number {
  if (streakDays >= 30) return XP_VALUES.STREAK_BONUS_30;
  if (streakDays >= 7) return XP_VALUES.STREAK_BONUS_7;
  if (streakDays >= 3) return XP_VALUES.STREAK_BONUS_3;
  return 0;
}

export function getLevelProgressPercent(totalXP: number): number {
  const level = calculateLevel(totalXP);
  const currentLevelXP = calculateCurrentLevelXP(totalXP);
  const nextLevelXP = getXPForNextLevel(level);
  return Math.min(100, Math.floor((currentLevelXP / nextLevelXP) * 100));
}
