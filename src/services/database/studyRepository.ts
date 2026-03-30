import { getDatabase } from './db';
import { StudySubject, StudySession, StudyNote, StudyNoteType } from '../../types/study.types';
import { generateId } from '../../utils/dateHelpers';

function rowToSubject(row: any): StudySubject {
  return {
    id: row.id, userId: row.user_id, title: row.title,
    description: row.description ?? undefined, color: row.color ?? '#4A7A9B',
    totalMinutes: row.total_minutes ?? 0, orderIndex: row.order_index ?? 0,
    linkedGoalId: row.linked_goal_id ?? undefined, isActive: row.is_active === 1,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function rowToSession(row: any): StudySession {
  return {
    id: row.id, userId: row.user_id, subjectId: row.subject_id,
    title: row.title ?? undefined, plannedMinutes: row.planned_minutes ?? 25,
    actualMinutes: row.actual_minutes ?? 0, pomodoroCount: row.pomodoro_count ?? 0,
    date: row.date, startedAt: row.started_at ?? undefined, endedAt: row.ended_at ?? undefined,
    notes: row.notes ?? undefined, linkedNoteId: row.linked_note_id ?? undefined,
    createdAt: row.created_at,
  };
}

function rowToNote(row: any): StudyNote {
  return {
    id: row.id, userId: row.user_id, subjectId: row.subject_id,
    sessionId: row.session_id ?? undefined, title: row.title ?? undefined,
    content: row.content, type: (row.type ?? 'note') as StudyNoteType,
    mediaUri: row.media_uri ?? undefined, tags: JSON.parse(row.tags ?? '[]'),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export const StudySubjectRepository = {
  async create(data: Omit<StudySubject, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudySubject> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO study_subjects (id, user_id, title, description, color, total_minutes, order_index, linked_goal_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)`,
      [id, data.userId, data.title, data.description ?? null, data.color, data.orderIndex ?? 0, data.linkedGoalId ?? null, now, now]
    );
    return { ...data, id, totalMinutes: 0, isActive: true, createdAt: now, updatedAt: now };
  },

  async getByUser(userId: string): Promise<StudySubject[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM study_subjects WHERE user_id = ? AND is_active = 1 ORDER BY order_index ASC, title ASC`,
      [userId]
    );
    return rows.map(rowToSubject);
  },

  async update(id: string, data: Partial<StudySubject>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE study_subjects SET title = COALESCE(?, title), description = COALESCE(?, description),
       color = COALESCE(?, color), order_index = COALESCE(?, order_index), updated_at = ? WHERE id = ?`,
      [data.title ?? null, data.description ?? null, data.color ?? null, data.orderIndex ?? null, now, id]
    );
  },

  async addTime(id: string, minutes: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE study_subjects SET total_minutes = total_minutes + ?, updated_at = ? WHERE id = ?`,
      [minutes, now, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`UPDATE study_subjects SET is_active = 0 WHERE id = ?`, [id]);
  },
};

export const StudySessionRepository = {
  async create(data: Omit<StudySession, 'id' | 'createdAt'>): Promise<StudySession> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO study_sessions (id, user_id, subject_id, title, planned_minutes, actual_minutes, pomodoro_count, date, started_at, ended_at, notes, linked_note_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.subjectId, data.title ?? null, data.plannedMinutes ?? 25,
       data.actualMinutes ?? 0, data.pomodoroCount ?? 0, data.date,
       data.startedAt ?? null, data.endedAt ?? null, data.notes ?? null,
       data.linkedNoteId ?? null, now]
    );
    return { ...data, id, createdAt: now };
  },

  async getByDate(userId: string, date: string): Promise<StudySession[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM study_sessions WHERE user_id = ? AND date = ? ORDER BY created_at DESC`,
      [userId, date]
    );
    return rows.map(rowToSession);
  },

  async getBySubject(subjectId: string): Promise<StudySession[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM study_sessions WHERE subject_id = ? ORDER BY date DESC`,
      [subjectId]
    );
    return rows.map(rowToSession);
  },

  async complete(id: string, actualMinutes: number, pomodoroCount: number): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE study_sessions SET actual_minutes = ?, pomodoro_count = ?, ended_at = ? WHERE id = ?`,
      [actualMinutes, pomodoroCount, now, id]
    );
  },
};

export const StudyNoteRepository = {
  async create(data: Omit<StudyNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudyNote> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO study_notes (id, user_id, subject_id, session_id, title, content, type, media_uri, tags, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.subjectId, data.sessionId ?? null, data.title ?? null,
       data.content, data.type, data.mediaUri ?? null, JSON.stringify(data.tags ?? []), now, now]
    );
    return { ...data, id, createdAt: now, updatedAt: now };
  },

  async getBySubject(subjectId: string): Promise<StudyNote[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM study_notes WHERE subject_id = ? ORDER BY created_at DESC`,
      [subjectId]
    );
    return rows.map(rowToNote);
  },

  async getBySession(sessionId: string): Promise<StudyNote[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM study_notes WHERE session_id = ? ORDER BY created_at ASC`,
      [sessionId]
    );
    return rows.map(rowToNote);
  },

  async update(id: string, data: Partial<StudyNote>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE study_notes SET title = COALESCE(?, title), content = COALESCE(?, content), updated_at = ? WHERE id = ?`,
      [data.title ?? null, data.content ?? null, now, id]
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM study_notes WHERE id = ?`, [id]);
  },
};
