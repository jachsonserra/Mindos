import { getDatabase } from './db';
import { Objective, ObjectiveStatus } from '../../types/objective.types';
import { generateId } from '../../utils/dateHelpers';

function rowToObjective(row: any): Objective {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description ?? undefined,
    why: row.why ?? '',
    status: row.status as ObjectiveStatus,
    color: row.color ?? undefined,
    orderIndex: row.order_index ?? 0,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const ObjectiveRepository = {
  async create(data: Omit<Objective, 'id' | 'createdAt' | 'updatedAt' | 'smarterGoals'>): Promise<Objective> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO objectives (id, user_id, title, description, why, status, color, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title, data.description ?? null, data.why, data.status ?? 'active', data.color ?? null, data.orderIndex ?? 0, now, now]
    );
    return { ...data, id, createdAt: now, updatedAt: now };
  },

  async getByUser(userId: string): Promise<Objective[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM objectives WHERE user_id = ? ORDER BY order_index ASC, created_at ASC`,
      [userId]
    );
    return rows.map(rowToObjective);
  },

  async getActive(userId: string): Promise<Objective[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM objectives WHERE user_id = ? AND status = 'active' ORDER BY order_index ASC`,
      [userId]
    );
    return rows.map(rowToObjective);
  },

  async update(id: string, data: Partial<Objective>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: any[] = [];
    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.why !== undefined) { fields.push('why = ?'); values.push(data.why); }
    if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
    if (data.color !== undefined) { fields.push('color = ?'); values.push(data.color); }
    if (data.orderIndex !== undefined) { fields.push('order_index = ?'); values.push(data.orderIndex); }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);
    await db.runAsync(`UPDATE objectives SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async complete(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE objectives SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id]
    );
  },

  async archive(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE objectives SET status = 'archived', updated_at = ? WHERE id = ?`,
      [now, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    // Desvincular metas SMARTER antes de deletar (evita FOREIGN KEY constraint)
    await db.runAsync(`UPDATE smarter_goals SET objective_id = NULL WHERE objective_id = ?`, [id]);
    await db.runAsync(`DELETE FROM objectives WHERE id = ?`, [id]);
  },
};
