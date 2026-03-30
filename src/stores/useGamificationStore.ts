import { create } from 'zustand';
import { GamificationRepository } from '../services/database/gamificationRepository';
import {
  calculateLevel,
  calculateCurrentLevelXP,
  calculateStreakBonus,
} from '../services/gamification/xpEngine';
import { MomentumEngine } from '../services/gamification/momentumEngine';
import {
  DAILY_MISSIONS,
  WEEKLY_MISSIONS,
  CHALLENGE_MISSIONS,
  getDailyExpiry,
  getWeeklyExpiry,
} from '../services/gamification/defaultMissions';
import { today } from '../utils/dateHelpers';
import type { UserXP, Mission, Reward } from '../types/gamification.types';

interface GamificationState {
  userXP: UserXP | null;
  missions: Mission[];
  rewards: Reward[];
  todayXPEarned: number;
  isLoading: boolean;

  loadData: (userId: string) => Promise<void>;
  addXP: (userId: string, amount: number, source: string, description?: string, sourceId?: string) => Promise<void>;
  completeMission: (missionId: string, userId: string) => Promise<void>;
  updateMissionProgress: (userId: string, requirementType: string, increment: number) => Promise<void>;
  generateDailyMissions: (userId: string, currentPhase: number) => Promise<void>;
  applyDailyDecay: (userId: string, daysMissed: number) => Promise<void>;
  createReward: (data: Omit<Reward, 'id' | 'createdAt'>) => Promise<void>;
  unlockReward: (rewardId: string, userId: string) => Promise<void>;
}

export const useGamificationStore = create<GamificationState>((set, get) => ({
  userXP: null,
  missions: [],
  rewards: [],
  todayXPEarned: 0,
  isLoading: false,

  loadData: async (userId) => {
    set({ isLoading: true });
    let userXP = await GamificationRepository.getUserXP(userId);
    if (!userXP) {
      userXP = await GamificationRepository.createUserXP(userId);
    }

    const [missions, rewards, todayXP] = await Promise.all([
      GamificationRepository.getMissions(userId),
      GamificationRepository.getRewards(userId),
      GamificationRepository.getTodayXP(userId),
    ]);

    set({ userXP, missions, rewards, todayXPEarned: todayXP, isLoading: false });
  },

  addXP: async (userId, amount, source, description, sourceId) => {
    const { userXP } = get();
    if (!userXP) return;

    const newTotal = userXP.totalXp + amount;
    const newLevel = calculateLevel(newTotal);
    const newLevelXP = calculateCurrentLevelXP(newTotal);
    const newMomentum = MomentumEngine.addBoost(userXP.momentumScore, amount);

    const updatedXP = {
      ...userXP,
      totalXp: newTotal,
      level: newLevel,
      currentLevelXp: newLevelXP,
      momentumScore: newMomentum,
    };

    set(state => ({
      userXP: updatedXP,
      todayXPEarned: state.todayXPEarned + amount,
    }));

    await Promise.all([
      GamificationRepository.updateUserXP(userId, updatedXP),
      GamificationRepository.addXPHistory({
        userId,
        xpAmount: amount,
        source: source as any,
        sourceId,
        description,
        date: today(),
      }),
    ]);

    // Verificar progresso de missões
    await get().updateMissionProgress(userId, 'xp_total', amount);
  },

  completeMission: async (missionId, userId) => {
    const { missions } = get();
    const mission = missions.find(m => m.id === missionId);
    if (!mission || mission.status !== 'active') return;

    const now = new Date().toISOString();
    await GamificationRepository.updateMission(missionId, {
      status: 'completed',
      completedAt: now,
    });

    set(state => ({
      missions: state.missions.map(m =>
        m.id === missionId ? { ...m, status: 'completed', completedAt: now } : m
      ),
    }));

    await get().addXP(userId, mission.xpReward, 'mission', mission.title, missionId);
  },

  updateMissionProgress: async (userId, requirementType, increment) => {
    const { missions } = get();
    const activeMissions = missions.filter(
      m => m.status === 'active' && m.requirementType === requirementType
    );

    for (const mission of activeMissions) {
      const newCurrent = Math.min(
        mission.requirementCurrent + increment,
        mission.requirementValue
      );

      await GamificationRepository.updateMission(mission.id, { requirementCurrent: newCurrent });

      set(state => ({
        missions: state.missions.map(m =>
          m.id === mission.id ? { ...m, requirementCurrent: newCurrent } : m
        ),
      }));

      if (newCurrent >= mission.requirementValue) {
        await get().completeMission(mission.id, userId);
      }
    }
  },

  generateDailyMissions: async (userId, currentPhase) => {
    const { missions } = get();
    const today_ = today();

    const existingDaily = missions.filter(
      m => m.type === 'daily' &&
      m.status === 'active' &&
      m.expiresAt &&
      new Date(m.expiresAt) > new Date()
    );

    if (existingDaily.length > 0) return; // Já gerou hoje

    const templates = DAILY_MISSIONS.filter(t => t.phaseRequired <= currentPhase);
    const selected = templates.slice(0, 2);

    const newMissions: Mission[] = [];
    for (const template of selected) {
      const mission = await GamificationRepository.createMission({
        userId,
        title: template.title,
        description: template.description,
        type: template.type,
        status: 'active',
        xpReward: template.xpReward,
        requirementType: template.requirementType as any,
        requirementValue: template.requirementValue,
        requirementCurrent: 0,
        phaseRequired: template.phaseRequired,
        expiresAt: getDailyExpiry(),
      });
      newMissions.push(mission);
    }

    // Verificar se precisa de missões semanais
    const existingWeekly = missions.filter(
      m => m.type === 'weekly' && m.status === 'active'
    );

    if (existingWeekly.length === 0) {
      const weeklyTemplates = WEEKLY_MISSIONS.filter(t => t.phaseRequired <= currentPhase);
      for (const template of weeklyTemplates.slice(0, 1)) {
        const mission = await GamificationRepository.createMission({
          userId,
          title: template.title,
          description: template.description,
          type: template.type,
          status: 'active',
          xpReward: template.xpReward,
          requirementType: template.requirementType as any,
          requirementValue: template.requirementValue,
          requirementCurrent: 0,
          phaseRequired: template.phaseRequired,
          expiresAt: getWeeklyExpiry(),
        });
        newMissions.push(mission);
      }
    }

    // Challenges se não tiver
    const existingChallenges = missions.filter(m => m.type === 'challenge' && m.status === 'active');
    if (existingChallenges.length === 0) {
      const challengeTemplates = CHALLENGE_MISSIONS.filter(t => t.phaseRequired <= currentPhase);
      for (const template of challengeTemplates.slice(0, 2)) {
        const mission = await GamificationRepository.createMission({
          userId,
          title: template.title,
          description: template.description,
          type: template.type,
          status: 'active',
          xpReward: template.xpReward,
          requirementType: template.requirementType as any,
          requirementValue: template.requirementValue,
          requirementCurrent: 0,
          phaseRequired: template.phaseRequired,
        });
        newMissions.push(mission);
      }
    }

    set(state => ({ missions: [...state.missions, ...newMissions] }));
  },

  applyDailyDecay: async (userId, daysMissed) => {
    const { userXP } = get();
    if (!userXP) return;

    const newMomentum = MomentumEngine.calculateDailyDecay(userXP.momentumScore, daysMissed);
    const updatedXP = { ...userXP, momentumScore: newMomentum };

    set({ userXP: updatedXP });
    await GamificationRepository.updateUserXP(userId, { momentumScore: newMomentum });
  },

  createReward: async (data) => {
    const reward = await GamificationRepository.createReward(data);
    set(state => ({ rewards: [reward, ...state.rewards] }));
  },

  unlockReward: async (rewardId, userId) => {
    const { userXP, rewards } = get();
    if (!userXP) return;

    const reward = rewards.find(r => r.id === rewardId);
    if (!reward || reward.isUnlocked) return;
    if (reward.xpCost && userXP.totalXp < reward.xpCost) return;

    await GamificationRepository.unlockReward(rewardId);
    set(state => ({
      rewards: state.rewards.map(r =>
        r.id === rewardId ? { ...r, isUnlocked: true, unlockedAt: new Date().toISOString() } : r
      ),
    }));
  },
}));
