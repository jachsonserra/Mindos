import { getDatabase } from './db';
import { generateId, today } from '../../utils/dateHelpers';
import type { AgendaEvent } from '../../types/agenda.types';
import type { Task } from '../../types/task.types';

function parseEvent(row: any): AgendaEvent {
  return {
    id: row.id,
    userId: row.user_id,
    taskId: row.task_id,
    routineId: row.routine_id,
    title: row.title,
    description: row.description,
    startTime: row.start_time,
    endTime: row.end_time,
    date: row.date,
    type: row.type ?? 'custom',
    color: row.color,
    isCompleted: Boolean(row.is_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const AgendaRepository = {
  async create(data: Omit<AgendaEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgendaEvent> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO agenda_events (id, user_id, task_id, routine_id, title, description,
        start_time, end_time, date, type, color, is_completed, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.taskId ?? null, data.routineId ?? null, data.title,
       data.description ?? null, data.startTime, data.endTime ?? null, data.date,
       data.type, data.color ?? null, 0, now, now]
    );

    return { ...data, id, isCompleted: false, createdAt: now, updatedAt: now };
  },

  // Cria evento automaticamente a partir de uma Task agendada
  async createFromTask(task: Task): Promise<AgendaEvent | null> {
    if (!task.scheduledDate || !task.scheduledHour) return null;

    return AgendaRepository.create({
      userId: task.userId,
      taskId: task.id,
      title: task.title,
      description: task.description,
      startTime: task.scheduledHour,
      date: task.scheduledDate,
      type: 'task',
      color: '#8B6F47',
      isCompleted: false,
    });
  },

  async getByDate(userId: string, date: string): Promise<AgendaEvent[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM agenda_events WHERE user_id = ? AND date = ?
       ORDER BY start_time ASC`,
      [userId, date]
    );
    return rows.map(parseEvent);
  },

  async getToday(userId: string): Promise<AgendaEvent[]> {
    return AgendaRepository.getByDate(userId, today());
  },

  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<AgendaEvent[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM agenda_events WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date ASC, start_time ASC`,
      [userId, startDate, endDate]
    );
    return rows.map(parseEvent);
  },

  async update(id: string, data: Partial<AgendaEvent>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.startTime !== undefined) { updates.push('start_time = ?'); values.push(data.startTime); }
    if (data.endTime !== undefined) { updates.push('end_time = ?'); values.push(data.endTime); }
    if (data.date !== undefined) { updates.push('date = ?'); values.push(data.date); }
    if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }
    if (data.isCompleted !== undefined) { updates.push('is_completed = ?'); values.push(data.isCompleted ? 1 : 0); }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(`UPDATE agenda_events SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async toggleComplete(id: string): Promise<void> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>('SELECT is_completed FROM agenda_events WHERE id = ?', [id]);
    const newVal = row ? (row.is_completed ? 0 : 1) : 1;
    await db.runAsync(
      'UPDATE agenda_events SET is_completed = ?, updated_at = ? WHERE id = ?',
      [newVal, new Date().toISOString(), id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM agenda_events WHERE id = ?', [id]);
  },
};
