import { getDatabase } from './db';
import { GratitudeEntry, CookieJarEntry } from '../../types/gratitude.types';
import { generateId } from '../../utils/dateHelpers';

function rowToEntry(row: any): GratitudeEntry {
  return {
    id: row.id, userId: row.user_id, date: row.date,
    gratitudes: JSON.parse(row.gratitudes ?? '[]'),
    emotion: row.emotion ?? undefined, highlight: row.highlight ?? undefined,
    linkedNoteId: row.linked_note_id ?? undefined,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function rowToCookieJar(row: any): CookieJarEntry {
  return {
    id: row.id, userId: row.user_id, title: row.title,
    description: row.description, date: row.date,
    emotionScore: row.emotion_score ?? undefined,
    imageUri: row.image_uri ?? undefined,
    tags: JSON.parse(row.tags ?? '[]'),
    isPinned: row.is_pinned === 1,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const GratitudeRepository = {
  async createOrUpdate(data: Omit<GratitudeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<GratitudeEntry> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await db.getFirstAsync<any>(
      `SELECT id FROM gratitude_entries WHERE user_id = ? AND date = ?`,
      [data.userId, data.date]
    );
    if (existing) {
      await db.runAsync(
        `UPDATE gratitude_entries SET gratitudes = ?, emotion = ?, highlight = ?, updated_at = ? WHERE id = ?`,
        [JSON.stringify(data.gratitudes), data.emotion ?? null, data.highlight ?? null, now, existing.id]
      );
      return { ...data, id: existing.id, createdAt: now, updatedAt: now };
    } else {
      const id = generateId();
      await db.runAsync(
        `INSERT INTO gratitude_entries (id, user_id, date, gratitudes, emotion, highlight, linked_note_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, data.userId, data.date, JSON.stringify(data.gratitudes), data.emotion ?? null,
         data.highlight ?? null, data.linkedNoteId ?? null, now, now]
      );
      return { ...data, id, createdAt: now, updatedAt: now };
    }
  },

  async getByDate(userId: string, date: string): Promise<GratitudeEntry | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<any>(
      `SELECT * FROM gratitude_entries WHERE user_id = ? AND date = ?`,
      [userId, date]
    );
    return row ? rowToEntry(row) : null;
  },

  async getByDateRange(userId: string, startDate: string, endDate: string): Promise<GratitudeEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM gratitude_entries WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC`,
      [userId, startDate, endDate]
    );
    return rows.map(rowToEntry);
  },
};

export const CookieJarRepository = {
  async create(data: Omit<CookieJarEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<CookieJarEntry> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO cookie_jar (id, user_id, title, description, date, emotion_score, image_uri, tags, is_pinned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title, data.description, data.date,
       data.emotionScore ?? null, data.imageUri ?? null,
       JSON.stringify(data.tags ?? []), data.isPinned ? 1 : 0, now, now]
    );
    return { ...data, id, createdAt: now, updatedAt: now };
  },

  async getByUser(userId: string): Promise<CookieJarEntry[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM cookie_jar WHERE user_id = ? ORDER BY is_pinned DESC, created_at DESC`,
      [userId]
    );
    return rows.map(rowToCookieJar);
  },

  async togglePin(id: string): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE cookie_jar SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?`,
      [now, id]
    );
  },

  async update(id: string, data: Partial<CookieJarEntry>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE cookie_jar SET title = COALESCE(?, title), description = COALESCE(?, description), updated_at = ? WHERE id = ?`,
      [data.title ?? null, data.description ?? null, now, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM cookie_jar WHERE id = ?`, [id]);
  },
};
