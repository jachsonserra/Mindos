import { getDatabase } from './db';
import { generateId } from '../../utils/dateHelpers';
import type { Note, PrimingItem, PersonalMetric, MetricEntry } from '../../types/secondMind.types';

function parseNote(row: any): Note {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    type: row.type,
    tags: JSON.parse(row.tags || '[]'),
    phase: row.phase,
    isPinned: Boolean(row.is_pinned),
    imageUris: JSON.parse(row.image_uris || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const SecondMindRepository = {
  async createNote(data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO notes (id, user_id, title, content, type, tags, phase, is_pinned, image_uris, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title ?? null, data.content, data.type,
       JSON.stringify(data.tags), data.phase ?? null,
       data.isPinned ? 1 : 0, JSON.stringify(data.imageUris), now, now]
    );

    return { ...data, id, createdAt: now, updatedAt: now };
  },

  async getNotes(userId: string, type?: string): Promise<Note[]> {
    const db = await getDatabase();
    let query = 'SELECT * FROM notes WHERE user_id = ?';
    const params: any[] = [userId];

    if (type) {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY is_pinned DESC, updated_at DESC';
    const rows = await db.getAllAsync<any>(query, params);
    return rows.map(parseNote);
  },

  async searchNotes(userId: string, query: string): Promise<Note[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM notes WHERE user_id = ?
       AND (title LIKE ? OR content LIKE ? OR tags LIKE ?)
       ORDER BY updated_at DESC`,
      [userId, `%${query}%`, `%${query}%`, `%${query}%`]
    );
    return rows.map(parseNote);
  },

  async updateNote(id: string, data: Partial<Note>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.content !== undefined) { updates.push('content = ?'); values.push(data.content); }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.isPinned !== undefined) { updates.push('is_pinned = ?'); values.push(data.isPinned ? 1 : 0); }
    if (data.imageUris !== undefined) { updates.push('image_uris = ?'); values.push(JSON.stringify(data.imageUris)); }

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(`UPDATE notes SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async deleteNote(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
  },

  async getPrimingItems(userId: string): Promise<PrimingItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM priming_items WHERE user_id = ? AND is_active = 1 ORDER BY order_index ASC',
      [userId]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      title: r.title,
      imageUri: r.image_uri,
      affirmation: r.affirmation,
      category: r.category,
      orderIndex: r.order_index,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
    }));
  },

  async createPrimingItem(data: Omit<PrimingItem, 'id' | 'createdAt'>): Promise<PrimingItem> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO priming_items (id, user_id, title, image_uri, affirmation, category, order_index, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title, data.imageUri, data.affirmation ?? null,
       data.category, data.orderIndex, data.isActive ? 1 : 0, now]
    );

    return { ...data, id, createdAt: now };
  },

  async deletePrimingItem(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE priming_items SET is_active = 0 WHERE id = ?', [id]);
  },

  async getMetrics(userId: string): Promise<PersonalMetric[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM personal_metrics WHERE user_id = ? AND is_active = 1 ORDER BY order_index ASC',
      [userId]
    );

    return rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      metricName: r.metric_name,
      metricType: r.metric_type,
      unit: r.unit,
      isActive: Boolean(r.is_active),
      orderIndex: r.order_index,
      createdAt: r.created_at,
    }));
  },

  async createMetric(data: Omit<PersonalMetric, 'id' | 'createdAt'>): Promise<PersonalMetric> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO personal_metrics (id, user_id, metric_name, metric_type, unit, is_active, order_index, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.metricName, data.metricType, data.unit ?? null,
       data.isActive ? 1 : 0, data.orderIndex, now]
    );

    return { ...data, id, createdAt: now };
  },

  async addMetricEntry(data: Omit<MetricEntry, 'id' | 'createdAt'>): Promise<MetricEntry> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO metric_entries (id, metric_id, user_id, value, date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.metricId, data.userId, data.value, data.date, data.notes ?? null, now]
    );

    return { ...data, id, createdAt: now };
  },

  async getMetricEntries(userId: string, metricId: string, days: number = 30): Promise<MetricEntry[]> {
    const db = await getDatabase();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromStr = fromDate.toISOString().split('T')[0];

    const rows = await db.getAllAsync<any>(
      `SELECT * FROM metric_entries WHERE user_id = ? AND metric_id = ? AND date >= ? ORDER BY date ASC`,
      [userId, metricId, fromStr]
    );

    return rows.map(r => ({
      id: r.id,
      metricId: r.metric_id,
      userId: r.user_id,
      value: r.value,
      date: r.date,
      notes: r.notes,
      createdAt: r.created_at,
    }));
  },
};
