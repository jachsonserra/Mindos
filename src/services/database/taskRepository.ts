import { getDatabase } from './db';
import { generateId, today } from '../../utils/dateHelpers';
import type { Task } from '../../types/task.types';

function parseTask(row: any): Task {
  return {
    id: row.id,
    userId: row.user_id,
    goalId: row.goal_id ?? undefined,
    smarterGoalId: row.smarter_goal_id ?? undefined,
    routineId: row.routine_id ?? undefined,
    habitId: row.habit_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    reward: row.reward ?? undefined,
    rewardUnlocked: Boolean(row.reward_unlocked),
    rewardPoints: row.reward_points ?? undefined,
    rewardType: row.reward_type ?? undefined,
    scheduledDate: row.scheduled_date ?? undefined,
    scheduledHour: row.scheduled_hour ?? undefined,
    isCompleted: Boolean(row.is_completed),
    completedAt: row.completed_at ?? undefined,
    status: row.status ?? 'pending',
    orderIndex: row.order_index ?? 0,
    isPareto: Boolean(row.is_pareto),
    difficultyLevel: row.difficulty_level ?? undefined,
    energyRequired: row.energy_required ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const TaskRepository = {
  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO tasks (
        id, user_id, goal_id, smarter_goal_id, routine_id, habit_id, title, description,
        reward, reward_unlocked, reward_points, reward_type,
        scheduled_date, scheduled_hour, is_completed, status,
        order_index, is_pareto, difficulty_level, energy_required,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.userId, data.goalId ?? null, data.smarterGoalId ?? null,
        data.routineId ?? null, data.habitId ?? null,
        data.title, data.description ?? null,
        data.reward ?? null, 0, data.rewardPoints ?? null, data.rewardType ?? null,
        data.scheduledDate ?? null, data.scheduledHour ?? null,
        0, 'pending',
        data.orderIndex, data.isPareto ? 1 : 0,
        data.difficultyLevel ?? null, data.energyRequired ?? null,
        now, now,
      ]
    );

    return {
      ...data,
      id,
      rewardUnlocked: false,
      isCompleted: false,
      status: 'pending',
      isPareto: data.isPareto ?? false,
      createdAt: now,
      updatedAt: now,
    };
  },

  async getByUser(userId: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM tasks WHERE user_id = ? AND status != 'cancelled'
       ORDER BY scheduled_date ASC, scheduled_hour ASC, order_index ASC`,
      [userId]
    );
    return rows.map(parseTask);
  },

  async getByDate(userId: string, date: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM tasks WHERE user_id = ? AND scheduled_date = ? AND status != 'cancelled'
       ORDER BY is_pareto DESC, scheduled_hour ASC, order_index ASC`,
      [userId, date]
    );
    return rows.map(parseTask);
  },

  async getToday(userId: string): Promise<Task[]> {
    return TaskRepository.getByDate(userId, today());
  },

  async getByGoal(userId: string, goalId: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM tasks WHERE user_id = ? AND goal_id = ? AND status != 'cancelled'
       ORDER BY is_pareto DESC, created_at ASC`,
      [userId, goalId]
    );
    return rows.map(parseTask);
  },

  async getByRoutine(routineId: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM tasks WHERE routine_id = ? AND status != 'cancelled'
       ORDER BY scheduled_date ASC, scheduled_hour ASC, order_index ASC`,
      [routineId]
    );
    return rows.map(parseTask);
  },

  async getBySmarterGoal(userId: string, smarterGoalId: string): Promise<Task[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM tasks WHERE user_id = ? AND smarter_goal_id = ? AND status != 'cancelled'
       ORDER BY created_at ASC`,
      [userId, smarterGoalId]
    );
    return rows.map(parseTask);
  },

  async update(id: string, data: Partial<Task>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description ?? null); }
    if ('goalId' in data) { updates.push('goal_id = ?'); values.push(data.goalId ?? null); }
    if ('smarterGoalId' in data) { updates.push('smarter_goal_id = ?'); values.push(data.smarterGoalId ?? null); }
    if ('routineId' in data) { updates.push('routine_id = ?'); values.push(data.routineId ?? null); }
    if ('habitId' in data) { updates.push('habit_id = ?'); values.push(data.habitId ?? null); }
    if (data.reward !== undefined) { updates.push('reward = ?'); values.push(data.reward ?? null); }
    if (data.rewardPoints !== undefined) { updates.push('reward_points = ?'); values.push(data.rewardPoints ?? null); }
    if (data.rewardType !== undefined) { updates.push('reward_type = ?'); values.push(data.rewardType ?? null); }
    if ('scheduledDate' in data) { updates.push('scheduled_date = ?'); values.push(data.scheduledDate ?? null); }
    if ('scheduledHour' in data) { updates.push('scheduled_hour = ?'); values.push(data.scheduledHour ?? null); }
    if (data.isPareto !== undefined) { updates.push('is_pareto = ?'); values.push(data.isPareto ? 1 : 0); }
    if (data.difficultyLevel !== undefined) { updates.push('difficulty_level = ?'); values.push(data.difficultyLevel ?? null); }
    if (data.energyRequired !== undefined) { updates.push('energy_required = ?'); values.push(data.energyRequired ?? null); }
    if (data.orderIndex !== undefined) { updates.push('order_index = ?'); values.push(data.orderIndex); }
    // Permite reabrir uma tarefa (isCompleted, status, completedAt)
    if (data.isCompleted !== undefined) { updates.push('is_completed = ?'); values.push(data.isCompleted ? 1 : 0); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if ('completedAt' in data) { updates.push('completed_at = ?'); values.push(data.completedAt ?? null); }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async complete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET is_completed = 1, completed_at = ?, status = 'completed', updated_at = ? WHERE id = ?`,
      [now, now, id]
    );
  },

  async unlockReward(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET reward_unlocked = 1, updated_at = ? WHERE id = ?`,
      [now, id]
    );
  },

  async cancel(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE tasks SET status = 'cancelled', updated_at = ? WHERE id = ?`,
      [now, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
  },
};
