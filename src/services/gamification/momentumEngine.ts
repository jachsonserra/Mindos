import { COLORS } from '../../utils/constants';

export const MomentumEngine = {
  calculateDailyDecay(currentMomentum: number, daysMissed: number): number {
    const decayRate = 0.08;
    return Math.max(0, currentMomentum * Math.pow(1 - decayRate, daysMissed));
  },

  calculateGain(habitsCompleted: number, routineCompleted: boolean): number {
    let gain = habitsCompleted * 3;
    if (routineCompleted) gain += 10;
    return Math.min(gain, 25);
  },

  addBoost(currentMomentum: number, xpAmount: number): number {
    const boost = Math.min(xpAmount * 0.5, 20);
    return Math.min(100, currentMomentum + boost);
  },

  getMomentumLabel(score: number): string {
    if (score >= 80) return 'Em Chamas';
    if (score >= 60) return 'Acelerado';
    if (score >= 40) return 'Em Movimento';
    if (score >= 20) return 'Aquecendo';
    return 'Parado';
  },

  getMomentumColor(score: number): string {
    if (score >= 80) return COLORS.momentum.fire;
    if (score >= 60) return COLORS.momentum.fast;
    if (score >= 40) return COLORS.momentum.moving;
    if (score >= 20) return COLORS.momentum.warming;
    return COLORS.momentum.stopped;
  },

  getMomentumEmoji(score: number): string {
    if (score >= 80) return '🔥';
    if (score >= 60) return '⚡';
    if (score >= 40) return '💧';
    if (score >= 20) return '🌱';
    return '⬜';
  },
};
