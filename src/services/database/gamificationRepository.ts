import { getDatabase } from './db';
import { generateId, today } from '../../utils/dateHelpers';
import type { UserXP, XPHistory, Mission, Reward } from '../../types/gamification.types';

export const GamificationRepository = {
  async getUserXP(userId: string): Promise<UserXP | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM user_xp WHERE user_id = ?',
      [userId]
    );
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      totalXp: row.total_xp,
      level: row.level,
      currentLevelXp: row.current_level_xp,
      momentumScore: row.momentum_score,
      longestStreak: row.longest_streak,
      currentOverallStreak: row.current_overall_streak,
      updatedAt: row.updated_at,
    };
  },

  async createUserXP(userId: string): Promise<UserXP> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO user_xp (id, user_id, total_xp, level, current_level_xp, momentum_score, longest_streak, current_overall_streak, updated_at)
       VALUES (?, ?, 0, 1, 0, 0.0, 0, 0, ?)`,
      [id, userId, now]
    );

    return {
      id,
      userId,
      totalXp: 0,
      level: 1,
      currentLevelXp: 0,
      momentumScore: 0,
      longestStreak: 0,
      currentOverallStreak: 0,
      updatedAt: now,
    };
  },

  async updateUserXP(userId: string, data: Partial<UserXP>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.totalXp !== undefined) { updates.push('total_xp = ?'); values.push(data.totalXp); }
    if (data.level !== undefined) { updates.push('level = ?'); values.push(data.level); }
    if (data.currentLevelXp !== undefined) { updates.push('current_level_xp = ?'); values.push(data.currentLevelXp); }
    if (data.momentumScore !== undefined) { updates.push('momentum_score = ?'); values.push(data.momentumScore); }
    if (data.longestStreak !== undefined) { updates.push('longest_streak = ?'); values.push(data.longestStreak); }
    if (data.currentOverallStreak !== undefined) { updates.push('current_overall_streak = ?'); values.push(data.currentOverallStreak); }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(userId);

    if (updates.length > 1) {
      await db.runAsync(`UPDATE user_xp SET ${updates.join(', ')} WHERE user_id = ?`, values);
    }
  },

  async addXPHistory(entry: Omit<XPHistory, 'id' | 'createdAt'>): Promise<void> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO xp_history (id, user_id, xp_amount, source, source_id, description, date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, entry.userId, entry.xpAmount, entry.source, entry.sourceId ?? null,
       entry.description ?? null, entry.date, now]
    );
  },

  async getXPHistory(userId: string, days: number = 30): Promise<XPHistory[]> {
    const db = await getDatabase();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromStr = fromDate.toISOString().split('T')[0];

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM xp_history WHERE user_id = ? AND date >= ? ORDER BY created_at ASC`,
      [userId, fromStr]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      xpAmount: r.xp_amount,
      source: r.source,
      sourceId: r.source_id,
      description: r.description,
      date: r.date,
      createdAt: r.created_at,
    }));
  },

  async getTodayXP(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      'SELECT COALESCE(SUM(xp_amount), 0) as total FROM xp_history WHERE user_id = ? AND date = ?',
      [userId, today()]
    );
    return row?.total ?? 0;
  },

  async getMissions(userId: string, status?: string): Promise<Mission[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM missions WHERE user_id = ?';
    const params: any[] = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY type ASC, created_at DESC';
    const rows = await db.getAllAsync<any>(query, params);

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      type: r.type,
      status: r.status,
      xpReward: r.xp_reward,
      requirementType: r.requirement_type,
      requirementValue: r.requirement_value,
      requirementCurrent: r.requirement_current,
      phaseRequired: r.phase_required,
      expiresAt: r.expires_at,
      completedAt: r.completed_at,
      createdAt: r.created_at,
    }));
  },

  async createMission(data: Omit<Mission, 'id' | 'createdAt'>): Promise<Mission> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO missions (id, user_id, title, description, type, status, xp_reward,
        requirement_type, requirement_value, requirement_current, phase_required, expires_at, completed_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title, data.description, data.type, data.status, data.xpReward,
       data.requirementType, data.requirementValue, data.requirementCurrent, data.phaseRequired,
       data.expiresAt ?? null, data.completedAt ?? null, now]
    );

    return { ...data, id, createdAt: now };
  },

  async updateMission(id: string, data: Partial<Mission>): Promise<void> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.requirementCurrent !== undefined) { updates.push('requirement_current = ?'); values.push(data.requirementCurrent); }
    if (data.completedAt !== undefined) { updates.push('completed_at = ?'); values.push(data.completedAt); }

    values.push(id);
    await db.runAsync(`UPDATE missions SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async getRewards(userId: string): Promise<Reward[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM rewards WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      description: r.description,
      imageUri: r.image_uri,
      xpCost: r.xp_cost,
      isUnlocked: Boolean(r.is_unlocked),
      unlockedAt: r.unlocked_at,
      type: r.type,
      createdAt: r.created_at,
    }));
  },

  async createReward(data: Omit<Reward, 'id' | 'createdAt'>): Promise<Reward> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO rewards (id, user_id, title, description, image_uri, xp_cost, is_unlocked, unlocked_at, type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title, data.description ?? null, data.imageUri ?? null,
       data.xpCost ?? null, data.isUnlocked ? 1 : 0, data.unlockedAt ?? null, data.type, now]
    );

    return { ...data, id, createdAt: now };
  },

  async unlockReward(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE rewards SET is_unlocked = 1, unlocked_at = ? WHERE id = ?',
      [new Date().toISOString(), id]
    );
  },
};
