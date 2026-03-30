import { getDatabase } from './db';
import { SmarterGoal, GoalCheckpoint, SmarterGoalStatus, ReviewFrequency } from '../../types/smarterGoal.types';
import { generateId } from '../../utils/dateHelpers';

function rowToGoal(row: any): SmarterGoal {
  return {
    id: row.id,
    userId: row.user_id,
    objectiveId: row.objective_id ?? undefined,
    title: row.title,
    specific: row.specific ?? '',
    metric: row.metric ?? '',
    baseline: row.baseline ?? 0,
    target: row.target ?? 0,
    metricUnit: row.metric_unit ?? '',
    achievable: row.achievable ?? '',
    relevant: row.relevant ?? '',
    deadline: row.deadline,
    emotional: row.emotional ?? '',
    reviewFrequency: (row.review_frequency ?? 'weekly') as ReviewFrequency,
    currentValue: row.current_value ?? 0,
    status: (row.status ?? 'active') as SmarterGoalStatus,
    color: row.color ?? undefined,
    orderIndex: row.order_index ?? 0,
    completedAt: row.completed_at ?? undefined,
    nextReviewAt: row.next_review_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToCheckpoint(row: any): GoalCheckpoint {
  return {
    id: row.id,
    goalId: row.goal_id,
    userId: row.user_id,
    scheduledDate: row.scheduled_date,
    notes: row.notes ?? undefined,
    valueAtCheckpoint: row.value_at_checkpoint ?? undefined,
    isCompleted: row.is_completed === 1,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

function generateCheckpoints(
  goalId: string,
  userId: string,
  deadline: string,
  frequency: ReviewFrequency
): Omit<GoalCheckpoint, 'id' | 'createdAt'>[] {
  const now = new Date();
  const end = new Date(deadline);
  const checkpoints: Omit<GoalCheckpoint, 'id' | 'createdAt'>[] = [];

  const daysByFreq: Record<ReviewFrequency, number> = {
    daily: 1, weekly: 7, biweekly: 14, monthly: 30,
  };
  const step = daysByFreq[frequency] || 7;
  const current = new Date(now);
  current.setDate(current.getDate() + step);

  while (current < end) {
    checkpoints.push({
      goalId,
      userId,
      scheduledDate: current.toISOString().split('T')[0],
      isCompleted: false,
    });
    current.setDate(current.getDate() + step);
    if (checkpoints.length >= 52) break; // máx 1 ano de checkpoints semanais
  }
  return checkpoints;
}

export const SmarterGoalRepository = {
  async create(data: Omit<SmarterGoal, 'id' | 'createdAt' | 'updatedAt' | 'checkpoints'>): Promise<SmarterGoal> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO smarter_goals
         (id, user_id, objective_id, title, specific, metric, baseline, target, metric_unit,
          achievable, relevant, deadline, emotional, review_frequency, current_value,
          status, color, order_index, next_review_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.userId, data.objectiveId ?? null, data.title,
        data.specific, data.metric, data.baseline, data.target, data.metricUnit,
        data.achievable, data.relevant, data.deadline, data.emotional,
        data.reviewFrequency, data.currentValue ?? data.baseline,
        data.status ?? 'active', data.color ?? null, data.orderIndex ?? 0,
        data.nextReviewAt ?? null, now, now,
      ]
    );

    // Gerar checkpoints automáticos
    const checkpointDraft = generateCheckpoints(id, data.userId, data.deadline, data.reviewFrequency);
    for (const cp of checkpointDraft) {
      const cpId = generateId();
      await db.runAsync(
        `INSERT INTO goal_checkpoints (id, goal_id, user_id, scheduled_date, is_completed, created_at)
         VALUES (?, ?, ?, ?, 0, ?)`,
        [cpId, cp.goalId, cp.userId, cp.scheduledDate, now]
      );
    }

    return { ...data, id, createdAt: now, updatedAt: now };
  },

  async getByUser(userId: string): Promise<SmarterGoal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM smarter_goals WHERE user_id = ? ORDER BY order_index ASC, created_at ASC`,
      [userId]
    );
    const goals = rows.map(rowToGoal);
    for (const goal of goals) {
      goal.checkpoints = await SmarterGoalRepository.getCheckpoints(goal.id);
    }
    return goals;
  },

  async getByObjective(objectiveId: string): Promise<SmarterGoal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM smarter_goals WHERE objective_id = ? ORDER BY order_index ASC`,
      [objectiveId]
    );
    return rows.map(rowToGoal);
  },

  async getActive(userId: string): Promise<SmarterGoal[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM smarter_goals WHERE user_id = ? AND status = 'active' ORDER BY order_index ASC`,
      [userId]
    );
    return rows.map(rowToGoal);
  },

  async getCheckpoints(goalId: string): Promise<GoalCheckpoint[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM goal_checkpoints WHERE goal_id = ? ORDER BY scheduled_date ASC`,
      [goalId]
    );
    return rows.map(rowToCheckpoint);
  },

  async update(id: string, data: Partial<SmarterGoal>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    const map: Record<string, string> = {
      title: 'title', specific: 'specific', metric: 'metric',
      baseline: 'baseline', target: 'target', metricUnit: 'metric_unit',
      achievable: 'achievable', relevant: 'relevant', deadline: 'deadline',
      emotional: 'emotional', reviewFrequency: 'review_frequency',
      currentValue: 'current_value', status: 'status', color: 'color',
      orderIndex: 'order_index', objectiveId: 'objective_id',
      nextReviewAt: 'next_review_at',
    };
    for (const [key, col] of Object.entries(map)) {
      if ((data as any)[key] !== undefined) {
        fields.push(`${col} = ?`);
        values.push((data as any)[key]);
      }
    }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE smarter_goals SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async updateProgress(id: string, currentValue: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE smarter_goals SET current_value = ?, updated_at = ? WHERE id = ?`,
      [currentValue, now, id]
    );
  },

  async complete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE smarter_goals SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );
  },

  async completeCheckpoint(checkpointId: string, value: number, notes?: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE goal_checkpoints SET is_completed = 1, value_at_checkpoint = ?, notes = ?, completed_at = ? WHERE id = ?`,
      [value, notes ?? null, now, checkpointId]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    // Remove checkpoints primeiro (sem FK cascade)
    await db.runAsync(`DELETE FROM goal_checkpoints WHERE goal_id = ?`, [id]);
    await db.runAsync(`DELETE FROM smarter_goals WHERE id = ?`, [id]);
  },
};
