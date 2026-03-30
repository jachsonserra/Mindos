import { getDatabase } from './db';
import { DailyCheckIn, PeriodEntry, CheckInPeriod } from '../../types/checkin.types';

function generateId(): string {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function rowToCheckIn(row: any): DailyCheckIn {
  const parse = (v: any) => {
    try { return JSON.parse(v ?? '[]'); } catch { return []; }
  };

  const buildPeriod = (prefix: string): PeriodEntry | undefined => {
    if (!row[`${prefix}_mood`]) return undefined;
    return {
      mood:        row[`${prefix}_mood`],
      feelings:    parse(row[`${prefix}_feelings`]),
      note:        row[`${prefix}_note`]    ?? '',
      answers:     parse(row[`${prefix}_answers`]),
      completedAt: row[`${prefix}_at`]      ?? '',
    };
  };

  return {
    id:        row.id,
    userId:    row.user_id,
    date:      row.date,
    morning:   buildPeriod('morning'),
    midday:    buildPeriod('midday'),
    evening:   buildPeriod('evening'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const CheckInRepository = {
  async getByDate(userId: string, date: string): Promise<DailyCheckIn | null> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM daily_checkins WHERE user_id = ? AND date = ? LIMIT 1',
      [userId, date],
    );
    return rows.length ? rowToCheckIn(rows[0]) : null;
  },

  async getByDateRange(userId: string, from: string, to: string): Promise<DailyCheckIn[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM daily_checkins WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date DESC',
      [userId, from, to],
    );
    return rows.map(rowToCheckIn);
  },

  async savePeriod(
    userId: string,
    date: string,
    period: CheckInPeriod,
    entry: PeriodEntry,
  ): Promise<DailyCheckIn> {
    const db   = await getDatabase();
    const now  = new Date().toISOString();
    const p    = period; // alias curto

    const existing = await this.getByDate(userId, date);

    if (existing) {
      await db.runAsync(
        `UPDATE daily_checkins SET
          ${p}_mood = ?, ${p}_feelings = ?, ${p}_note = ?,
          ${p}_answers = ?, ${p}_at = ?, updated_at = ?
         WHERE user_id = ? AND date = ?`,
        [
          entry.mood,
          JSON.stringify(entry.feelings),
          entry.note,
          JSON.stringify(entry.answers),
          entry.completedAt,
          now,
          userId, date,
        ],
      );
    } else {
      const id = generateId();
      await db.runAsync(
        `INSERT INTO daily_checkins
          (id, user_id, date, ${p}_mood, ${p}_feelings, ${p}_note, ${p}_answers, ${p}_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, userId, date,
          entry.mood,
          JSON.stringify(entry.feelings),
          entry.note,
          JSON.stringify(entry.answers),
          entry.completedAt,
          now, now,
        ],
      );
    }

    const updated = await this.getByDate(userId, date);
    return updated!;
  },
};
