import { getDatabase } from './db';
import { generateId, today, yesterdayStr } from '../../utils/dateHelpers';
import type { Habit, HabitLog, Routine } from '../../types/habit.types';

function parseHabit(row: any): Habit {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    phase: row.phase,
    toolType: row.tool_type,
    xpReward: row.xp_reward,
    streakCount: row.streak_count ?? 0,
    bestStreak: row.best_streak ?? 0,
    isActive: Boolean(row.is_active),
    durationMinutes: row.duration_minutes,
    orderIndex: row.order_index,
    // Loop do Hábito (Atomic Habits)
    trigger: row.trigger ?? undefined,
    cue: row.cue ?? undefined,
    desire: row.desire ?? undefined,
    implementation: row.implementation ?? undefined,
    twoMinuteVersion: row.two_minute_version ?? undefined,
    reward: row.reward ?? undefined,
    relatedGoalId: row.related_goal_id ?? undefined,
    neverMissCount: row.never_miss_count ?? 0,
    // Notificação
    notificationId: row.notification_id ?? undefined,
    notificationHour: row.notification_hour ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseRoutine(row: any): Routine {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    type: row.type,
    phase: row.phase,
    triggerTime: row.trigger_time,
    daysOfWeek: row.days_of_week,
    isActive: Boolean(row.is_active),
    xpBonus: row.xp_bonus,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const HabitRepository = {
  async create(data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'streakCount' | 'bestStreak'>): Promise<Habit> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO habits (
        id, user_id, title, description, category, phase, tool_type, xp_reward,
        is_active, duration_minutes, order_index,
        trigger, cue, desire, implementation, two_minute_version, reward,
        related_goal_id, never_miss_count, notification_id, notification_hour,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.userId, data.title, data.description ?? null,
        data.category, data.phase, data.toolType, data.xpReward,
        data.isActive ? 1 : 0, data.durationMinutes ?? null, data.orderIndex,
        data.trigger ?? null, data.cue ?? null, data.desire ?? null,
        data.implementation ?? null, data.twoMinuteVersion ?? null, data.reward ?? null,
        data.relatedGoalId ?? null, data.neverMissCount ?? 0,
        data.notificationId ?? null, data.notificationHour ?? null,
        now, now,
      ]
    );

    return { ...data, id, streakCount: 0, bestStreak: 0, neverMissCount: data.neverMissCount ?? 0, createdAt: now, updatedAt: now };
  },

  async getByUser(userId: string): Promise<Habit[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM habits WHERE user_id = ? AND is_active = 1 ORDER BY order_index ASC',
      [userId]
    );
    return rows.map(parseHabit);
  },

  async update(id: string, data: Partial<Habit>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description ?? null); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    if (data.streakCount !== undefined) { updates.push('streak_count = ?'); values.push(data.streakCount); }
    if (data.bestStreak !== undefined) { updates.push('best_streak = ?'); values.push(data.bestStreak); }
    if (data.orderIndex !== undefined) { updates.push('order_index = ?'); values.push(data.orderIndex); }
    if (data.durationMinutes !== undefined) { updates.push('duration_minutes = ?'); values.push(data.durationMinutes ?? null); }
    // Loop do hábito
    if ('trigger' in data) { updates.push('trigger = ?'); values.push(data.trigger ?? null); }
    if ('cue' in data) { updates.push('cue = ?'); values.push(data.cue ?? null); }
    if ('desire' in data) { updates.push('desire = ?'); values.push(data.desire ?? null); }
    if ('implementation' in data) { updates.push('implementation = ?'); values.push(data.implementation ?? null); }
    if ('twoMinuteVersion' in data) { updates.push('two_minute_version = ?'); values.push(data.twoMinuteVersion ?? null); }
    if ('reward' in data) { updates.push('reward = ?'); values.push(data.reward ?? null); }
    if ('relatedGoalId' in data) { updates.push('related_goal_id = ?'); values.push(data.relatedGoalId ?? null); }
    if (data.neverMissCount !== undefined) { updates.push('never_miss_count = ?'); values.push(data.neverMissCount); }
    // Notificação
    if ('notificationId' in data) { updates.push('notification_id = ?'); values.push(data.notificationId ?? null); }
    if ('notificationHour' in data) { updates.push('notification_hour = ?'); values.push(data.notificationHour ?? null); }

    if (updates.length === 0) return; // Nada a atualizar

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(`UPDATE habits SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE habits SET is_active = 0 WHERE id = ?', [id]);
  },

  async logCompletion(data: Omit<HabitLog, 'id' | 'completedAt'>): Promise<HabitLog> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO habit_logs (id, habit_id, user_id, completed_at, date, duration_actual, mood_after, note, xp_earned, is_missed, missed_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.habitId, data.userId, now, data.date,
        data.durationActual ?? null, data.moodAfter ?? null,
        data.note ?? null, data.xpEarned,
        data.isMissed ? 1 : 0, data.missedReason ?? null,
      ]
    );

    // Atualiza streak apenas se não for log de falha
    if (!data.isMissed) {
      await db.runAsync(
        'UPDATE habits SET streak_count = streak_count + 1, updated_at = ? WHERE id = ?',
        [now, data.habitId]
      );
    }

    return { ...data, id, completedAt: now };
  },

  async uncompleteToday(habitId: string, userId: string): Promise<void> {
    const db = await getDatabase();
    const dateStr = today();
    await db.runAsync(
      'DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND date = ? AND (is_missed = 0 OR is_missed IS NULL)',
      [habitId, userId, dateStr]
    );
    // CORREÇÃO: MAX() é função de agregação no SQLite — não funciona em SET.
    // Usamos CASE WHEN que é suportado e resolve o mesmo problema:
    // se streak já é 1 (ou menos), vai para 0. Caso contrário, decrementa 1.
    await db.runAsync(
      `UPDATE habits
       SET streak_count = CASE WHEN streak_count <= 1 THEN 0 ELSE streak_count - 1 END,
           updated_at   = ?
       WHERE id = ?`,
      [new Date().toISOString(), habitId]
    );
  },

  async getCompletedToday(userId: string): Promise<string[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<any>(
      'SELECT habit_id FROM habit_logs WHERE user_id = ? AND date = ? AND (is_missed = 0 OR is_missed IS NULL)',
      [userId, today()]
    );
    return rows.map(r => r.habit_id);
  },

  /** Retorna set de datas em que um hábito específico foi completado nos últimos `days` dias. */
  async getCompletionDatesByHabit(habitId: string, days: number): Promise<Set<string>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ date: string }>(
      `SELECT DISTINCT date FROM habit_logs
       WHERE habit_id = ? AND (is_missed = 0 OR is_missed IS NULL)
         AND date >= date('now', '-' || ? || ' days')`,
      [habitId, days]
    );
    return new Set(rows.map((r: any) => r.date));
  },

  /** Retorna {date: count} de completions distintos por dia nos últimos `days` dias. */
  async getCompletionsByDate(userId: string, days: number): Promise<Record<string, number>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ date: string; count: number }>(
      `SELECT date, COUNT(DISTINCT habit_id) AS count
       FROM habit_logs
       WHERE user_id = ? AND (is_missed = 0 OR is_missed IS NULL)
         AND date >= date('now', '-' || ? || ' days')
       GROUP BY date`,
      [userId, days]
    );
    const result: Record<string, number> = {};
    rows.forEach((r: any) => { result[r.date] = r.count; });
    return result;
  },

  async resetDailyCompletion(userId: string): Promise<void> {
    // Reset de streaks para hábitos não completados no dia anterior
    const db = await getDatabase();
    const yStr = yesterdayStr();

    const completedYesterday = await db.getAllAsync<any>(
      'SELECT DISTINCT habit_id FROM habit_logs WHERE user_id = ? AND date = ? AND (is_missed = 0 OR is_missed IS NULL)',
      [userId, yStr]
    );
    const completedIds = completedYesterday.map((r: any) => r.habit_id);

    const now = new Date().toISOString();

    if (completedIds.length === 0) {
      await db.runAsync(
        'UPDATE habits SET streak_count = 0, updated_at = ? WHERE user_id = ? AND is_active = 1',
        [now, userId]
      );
    } else {
      await db.runAsync(
        `UPDATE habits SET streak_count = 0, updated_at = ?
         WHERE user_id = ? AND is_active = 1 AND id NOT IN (${completedIds.map(() => '?').join(',')})`,
        [now, userId, ...completedIds]
      );
    }
  },
};

export const RoutineRepository = {
  async create(data: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>): Promise<Routine> {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO routines (id, user_id, title, description, type, phase, trigger_time, days_of_week, is_active, xp_bonus, order_index, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.userId, data.title, data.description ?? null, data.type, data.phase,
       data.triggerTime ?? null, data.daysOfWeek, data.isActive ? 1 : 0,
       data.xpBonus, data.orderIndex, now, now]
    );

    return { ...data, id, createdAt: now, updatedAt: now };
  },

  async getByUser(userId: string): Promise<Routine[]> {
    const db = await getDatabase();

    // CORREÇÃO: N+1 queries → 1 query com LEFT JOIN.
    //
    // O QUE ERA N+1?
    // Antes: 1 query para buscar N rotinas + N queries para buscar hábitos de cada.
    // Com 5 rotinas = 6 queries. Com 20 rotinas = 21 queries.
    // Cada query tem custo de abertura de transação SQLite (~1-5ms).
    // 21 queries × 3ms = ~63ms desnecessários no startup.
    //
    // AGORA: 1 única query com LEFT JOIN que traz rotinas E seus hábitos juntos.
    // LEFT JOIN = inclui rotinas mesmo sem hábitos (hábitos serão NULL).
    // A query retorna uma linha por HÁBITO em cada rotina (produto cartesiano filtrado).
    // Agrupamos as linhas por routine_id no JS depois.
    //
    // Prefixamos colunas para evitar colisão de nomes:
    // "r.id AS r_id" evita ambiguidade com "h.id AS h_id".
    const rows = await db.getAllAsync<any>(
      `SELECT
         r.id          AS r_id,
         r.user_id     AS r_user_id,
         r.title       AS r_title,
         r.description AS r_description,
         r.type        AS r_type,
         r.phase       AS r_phase,
         r.trigger_time AS r_trigger_time,
         r.days_of_week AS r_days_of_week,
         r.is_active   AS r_is_active,
         r.xp_bonus    AS r_xp_bonus,
         r.order_index AS r_order_index,
         r.created_at  AS r_created_at,
         r.updated_at  AS r_updated_at,
         h.id          AS h_id,
         h.user_id     AS h_user_id,
         h.title       AS h_title,
         h.description AS h_description,
         h.category    AS h_category,
         h.phase       AS h_phase,
         h.tool_type   AS h_tool_type,
         h.xp_reward   AS h_xp_reward,
         h.streak_count AS h_streak_count,
         h.best_streak AS h_best_streak,
         h.is_active   AS h_is_active,
         h.duration_minutes AS h_duration_minutes,
         h.order_index AS h_order_index,
         h.trigger     AS h_trigger,
         h.cue         AS h_cue,
         h.desire      AS h_desire,
         h.implementation AS h_implementation,
         h.two_minute_version AS h_two_minute_version,
         h.reward      AS h_reward,
         h.related_goal_id AS h_related_goal_id,
         h.never_miss_count AS h_never_miss_count,
         h.notification_id AS h_notification_id,
         h.notification_hour AS h_notification_hour,
         h.created_at  AS h_created_at,
         h.updated_at  AS h_updated_at,
         rh.order_index AS rh_order_index
       FROM routines r
       LEFT JOIN routine_habits rh ON r.id = rh.routine_id
       LEFT JOIN habits h ON rh.habit_id = h.id
       WHERE r.user_id = ?
       ORDER BY r.order_index ASC, rh.order_index ASC`,
      [userId]
    );

    // Agrupamos as linhas pelo ID da rotina usando um Map.
    // Map preserva a ordem de inserção — importante para manter order_index.
    // Chave: routine_id. Valor: objeto Routine com array habits[].
    const routineMap = new Map<string, Routine & { habits: ReturnType<typeof parseHabit>[] }>();

    for (const row of rows) {
      // Se essa rotina ainda não foi vista, adicionamos ao mapa.
      if (!routineMap.has(row.r_id)) {
        routineMap.set(row.r_id, {
          ...parseRoutine({
            id: row.r_id, user_id: row.r_user_id, title: row.r_title,
            description: row.r_description, type: row.r_type, phase: row.r_phase,
            trigger_time: row.r_trigger_time, days_of_week: row.r_days_of_week,
            is_active: row.r_is_active, xp_bonus: row.r_xp_bonus,
            order_index: row.r_order_index, created_at: row.r_created_at,
            updated_at: row.r_updated_at,
          }),
          habits: [], // Começa vazio — populamos abaixo.
        });
      }

      // Se esta linha tem hábito (LEFT JOIN pode retornar NULL para rotinas sem hábitos).
      // h_id NULL significa que a rotina não tem hábitos — pulamos.
      if (row.h_id) {
        const routine = routineMap.get(row.r_id)!;
        routine.habits.push(parseHabit({
          id: row.h_id, user_id: row.h_user_id, title: row.h_title,
          description: row.h_description, category: row.h_category,
          phase: row.h_phase, tool_type: row.h_tool_type, xp_reward: row.h_xp_reward,
          streak_count: row.h_streak_count, best_streak: row.h_best_streak,
          is_active: row.h_is_active, duration_minutes: row.h_duration_minutes,
          order_index: row.h_order_index, trigger: row.h_trigger, cue: row.h_cue,
          desire: row.h_desire, implementation: row.h_implementation,
          two_minute_version: row.h_two_minute_version, reward: row.h_reward,
          related_goal_id: row.h_related_goal_id, never_miss_count: row.h_never_miss_count,
          notification_id: row.h_notification_id, notification_hour: row.h_notification_hour,
          created_at: row.h_created_at, updated_at: row.h_updated_at,
        }));
      }
    }

    // Converte o Map em Array — mantém a ordem de inserção (= order_index).
    return Array.from(routineMap.values());
  },

  async addHabit(routineId: string, habitId: string, orderIndex: number = 0): Promise<void> {
    const db = await getDatabase();
    const id = generateId();
    await db.runAsync(
      'INSERT OR IGNORE INTO routine_habits (id, routine_id, habit_id, order_index) VALUES (?, ?, ?, ?)',
      [id, routineId, habitId, orderIndex]
    );
  },

  async removeHabit(routineId: string, habitId: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM routine_habits WHERE routine_id = ? AND habit_id = ?',
      [routineId, habitId]
    );
  },

  async update(id: string, data: Partial<Routine>): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description ?? null); }
    if (data.triggerTime !== undefined) { updates.push('trigger_time = ?'); values.push(data.triggerTime ?? null); }
    if (data.daysOfWeek !== undefined) { updates.push('days_of_week = ?'); values.push(data.daysOfWeek); }
    if (data.isActive !== undefined) { updates.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }
    if (data.xpBonus !== undefined) { updates.push('xp_bonus = ?'); values.push(data.xpBonus); }
    if (data.orderIndex !== undefined) { updates.push('order_index = ?'); values.push(data.orderIndex); }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now);
    values.push(id);

    await db.runAsync(`UPDATE routines SET ${updates.join(', ')} WHERE id = ?`, values);
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM routines WHERE id = ?', [id]);
  },
};
