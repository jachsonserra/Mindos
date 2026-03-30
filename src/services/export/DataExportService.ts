/**
 * DataExportService
 *
 * Coleta dados do usuário (hábitos, logs, check-ins, objetivos, metas)
 * e exporta como JSON via Share nativo ou download (web).
 */

import { Platform, Share } from 'react-native';
import { getDatabase } from '../database/db';
import { CheckInRepository } from '../database/checkinRepository';
import { useUserStore } from '../../stores/useUserStore';
import { useObjectiveStore } from '../../stores/useObjectiveStore';
import { useSmarterGoalStore } from '../../stores/useSmarterGoalStore';
import { useHabitStore } from '../../stores/useHabitStore';
import { useTaskStore } from '../../stores/useTaskStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const DataExportService = {
  /**
   * Gera o payload de exportação e dispara o Share nativo (ou download na web).
   */
  async exportAll(): Promise<void> {
    const { user }       = useUserStore.getState();
    const { objectives } = useObjectiveStore.getState();
    const { goals }      = useSmarterGoalStore.getState();
    const { habits }     = useHabitStore.getState();
    const { tasks }      = useTaskStore.getState();

    if (!user) throw new Error('Usuário não encontrado');

    const db = await getDatabase();

    // ── Logs de hábitos (últimos 90 dias) ────────────────────────────────────
    const habitLogs = await db.getAllAsync<any>(
      `SELECT habit_id, date, is_missed, missed_reason, mood_after, note, xp_earned
       FROM habit_logs
       WHERE user_id = ? AND date >= ?
       ORDER BY date DESC`,
      [user.id, nDaysAgo(90)],
    );

    // ── Check-ins (últimos 90 dias) ───────────────────────────────────────────
    const checkIns = await CheckInRepository.getByDateRange(user.id, nDaysAgo(90), today());

    // ── Payload ───────────────────────────────────────────────────────────────
    const payload = {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0',
      user: {
        name:  user.name,
        phase: user.currentPhase,
        whyAnchor: user.whyAnchor,
      },
      habits: habits.map(h => ({
        id:            h.id,
        title:         h.title,
        category:      h.category,
        toolType:      h.toolType,
        streakCount:   h.streakCount,
        bestStreak:    h.bestStreak,
        neverMissCount:h.neverMissCount,
        isActive:      h.isActive,
        relatedGoalId: h.relatedGoalId,
        trigger:       h.trigger,
        desire:        h.desire,
        reward:        h.reward,
      })),
      habitLogs: habitLogs.map(l => ({
        habitId:      l.habit_id,
        date:         l.date,
        isMissed:     Boolean(l.is_missed),
        missedReason: l.missed_reason,
        moodAfter:    l.mood_after,
        note:         l.note,
        xpEarned:     l.xp_earned,
      })),
      checkIns: checkIns.map(c => ({
        date:    c.date,
        morning: c.morning,
        midday:  c.midday,
        evening: c.evening,
      })),
      objectives: objectives.map(o => ({
        id:     o.id,
        title:  o.title,
        why:    o.why,
        status: o.status,
        color:  o.color,
      })),
      goals: goals.map(g => ({
        id:          g.id,
        objectiveId: g.objectiveId,
        title:       g.title,
        target:      g.target,
        currentValue:g.currentValue,
        baseline:    g.baseline,
        metricUnit:  g.metricUnit,
        deadline:    g.deadline,
        status:      g.status,
      })),
      tasks: tasks.map(t => ({
        id:           t.id,
        title:        t.title,
        status:       t.status,
        scheduledDate:t.scheduledDate,
        smarterGoalId:t.smarterGoalId,
      })),
    };

    const json = JSON.stringify(payload, null, 2);
    const filename = `mindos-export-${today()}.json`;

    if (Platform.OS === 'web') {
      // ── Web: cria blob e faz download ────────────────────────────────────
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // ── Mobile: usa Share nativo ──────────────────────────────────────────
      await Share.share({
        title:   filename,
        message: json,
      });
    }
  },
};
