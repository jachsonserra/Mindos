import React, { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/constants';
import { useHabitStore } from '../../src/stores/useHabitStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { HabitRepository } from '../../src/services/database/habitRepository';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

function heatColor(done: boolean, isToday: boolean): string {
  if (isToday && done) return COLORS.primary;
  if (isToday)        return `${COLORS.primary}30`;
  if (done)           return `${COLORS.primary}C0`;
  return COLORS.border;
}

const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DOW_SHORT   = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

// ── Tool type labels ─────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  first_victory: '🏆 Primeira vitória',
  dopamine_block: '🔒 Bloqueio de dopamina',
  five_min_rule: '⏱ Regra dos 5min',
  two_min_rule: '2️⃣ Regra dos 2min',
  fudoshin: '🧘 Fudoshin',
  mini_habit: '🌱 Mini hábito',
  gradual_change: '📈 Mudança gradual',
  anger_fuel: '🔥 Combustível da raiva',
  acceptance: '🤝 Aceitação',
  custom: '✨ Personalizado',
};

// ── Tela ─────────────────────────────────────────────────────────────────────

export default function HabitDetailScreen() {
  const router = useRouter();
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const { user } = useUserStore();
  const { habits } = useHabitStore();

  const habit = habits.find(h => h.id === habitId);

  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Busca histórico de 84 dias para o hábito específico
  useEffect(() => {
    if (!habitId) return;
    HabitRepository.getCompletionDatesByHabit(habitId, 84).then(dates => {
      setCompletedDates(dates);
      setLoading(false);
    });
  }, [habitId]);

  const heatDays = useMemo(() => getLastNDays(84), []);
  const todayStr = new Date().toISOString().split('T')[0];

  // Taxa de conclusão por dia da semana
  const byDow = useMemo(() => {
    const counts = Array(7).fill(0);
    const totals = Array(7).fill(0);
    heatDays.forEach(d => {
      const dow = new Date(d + 'T12:00:00').getDay();
      totals[dow]++;
      if (completedDates.has(d)) counts[dow]++;
    });
    return DOW_LABELS.map((label, i) => ({
      label,
      pct: totals[i] > 0 ? Math.round((counts[i] / totals[i]) * 100) : 0,
    }));
  }, [completedDates, heatDays]);

  const completedCount = completedDates.size;
  const maxDowPct = Math.max(...byDow.map(d => d.pct), 1);

  if (!habit) {
    return (
      <SafeAreaView style={s.screen} edges={['top']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Hábito</Text>
        </View>
        <View style={s.empty}>
          <Text style={s.emptyText}>Hábito não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{habit.title}</Text>
        <View style={[s.statusDot, { backgroundColor: habit.isActive ? COLORS.success : COLORS.textMuted }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>

        {/* ── Stats principais ── */}
        <View style={s.statsGrid}>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>🔥</Text>
            <Text style={s.statVal}>{habit.streakCount}</Text>
            <Text style={s.statLbl}>Streak atual</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>🏆</Text>
            <Text style={s.statVal}>{habit.bestStreak}</Text>
            <Text style={s.statLbl}>Melhor streak</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>✅</Text>
            <Text style={s.statVal}>{completedCount}</Text>
            <Text style={s.statLbl}>Completado (84d)</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statEmoji}>💎</Text>
            <Text style={s.statVal}>{habit.neverMissCount}</Text>
            <Text style={s.statLbl}>Nunca perdeu</Text>
          </View>
        </View>

        {/* ── Ferramenta + recompensa ── */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>FERRAMENTA</Text>
            <Text style={s.infoValue}>{TOOL_LABELS[habit.toolType] ?? habit.toolType}</Text>
          </View>
          {habit.reward && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>RECOMPENSA</Text>
              <Text style={s.infoValue}>{habit.reward}</Text>
            </View>
          )}
          {habit.twoMinuteVersion && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>VERSÃO 2 MIN</Text>
              <Text style={s.infoValue}>{habit.twoMinuteVersion}</Text>
            </View>
          )}
          {habit.implementation && (
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>INTENÇÃO DE IMPLEMENTAÇÃO</Text>
              <Text style={s.infoValue}>{habit.implementation}</Text>
            </View>
          )}
        </View>

        {/* ── Calendário 12 semanas ── */}
        <Text style={s.sectionTitle}>Calendário (12 semanas)</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={s.calendarCard}>
            <View style={s.dowRow}>
              {DOW_SHORT.map((d, i) => (
                <Text key={i} style={s.dowLabel}>{d}</Text>
              ))}
            </View>
            <View style={s.heatGrid}>
              {Array.from({ length: 12 }, (_, weekIdx) => (
                <View key={weekIdx} style={s.heatCol}>
                  {Array.from({ length: 7 }, (_, dayIdx) => {
                    const idx  = weekIdx * 7 + dayIdx;
                    const date = heatDays[idx] ?? '';
                    const done = completedDates.has(date);
                    const isToday = date === todayStr;
                    return (
                      <View
                        key={dayIdx}
                        style={[
                          s.heatCell,
                          { backgroundColor: heatColor(done, isToday) },
                          isToday && s.heatCellToday,
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={s.heatLegend}>
              <Text style={s.heatLegendLabel}>Não feito</Text>
              <View style={[s.heatLegendCell, { backgroundColor: COLORS.border }]} />
              <View style={[s.heatLegendCell, { backgroundColor: `${COLORS.primary}C0` }]} />
              <View style={[s.heatLegendCell, { backgroundColor: COLORS.primary }]} />
              <Text style={s.heatLegendLabel}>Feito</Text>
            </View>
          </View>
        )}

        {/* ── Taxa por dia da semana ── */}
        <Text style={s.sectionTitle}>Taxa por dia da semana</Text>
        <View style={s.dowChart}>
          {byDow.map((d, i) => (
            <View key={i} style={s.dowChartCol}>
              <Text style={s.dowChartPct}>{d.pct}%</Text>
              <View style={s.dowChartBarWrap}>
                <View
                  style={[
                    s.dowChartBar,
                    { height: Math.max(4, (d.pct / maxDowPct) * 80), backgroundColor: COLORS.primary },
                  ]}
                />
              </View>
              <Text style={s.dowChartLabel}>{d.label.slice(0, 3)}</Text>
            </View>
          ))}
        </View>

        {/* ── Trigger / Gatilho ── */}
        {(habit.trigger || habit.cue) && (
          <View style={s.loopCard}>
            <Text style={s.sectionTitle}>Loop do Hábito</Text>
            {habit.trigger && (
              <View style={s.loopRow}>
                <View style={[s.loopDot, { backgroundColor: COLORS.warning }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.loopLabel}>Gatilho</Text>
                  <Text style={s.loopValue}>{habit.trigger}</Text>
                </View>
              </View>
            )}
            {habit.desire && (
              <View style={s.loopRow}>
                <View style={[s.loopDot, { backgroundColor: COLORS.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.loopLabel}>Desejo</Text>
                  <Text style={s.loopValue}>{habit.desire}</Text>
                </View>
              </View>
            )}
            {habit.reward && (
              <View style={s.loopRow}>
                <View style={[s.loopDot, { backgroundColor: COLORS.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.loopLabel}>Recompensa</Text>
                  <Text style={s.loopValue}>{habit.reward}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textMuted },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, marginTop: 4,
  },

  // Stats
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statEmoji: { fontSize: 18 },
  statVal:   { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLbl:   { fontSize: 9, color: COLORS.textMuted, textAlign: 'center' },

  // Info card
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, gap: 12, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoRow:   { gap: 2 },
  infoLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 0.8, textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  // Calendar / heatmap
  calendarCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  dowRow:    { flexDirection: 'row', marginBottom: 4 },
  dowLabel:  { width: 14, textAlign: 'center', fontSize: 9, color: COLORS.textMuted, marginHorizontal: 2 },
  heatGrid:  { flexDirection: 'row', gap: 3 },
  heatCol:   { flexDirection: 'column', gap: 3 },
  heatCell:  { width: 14, height: 14, borderRadius: 3 },
  heatCellToday: { borderWidth: 2, borderColor: COLORS.warning },
  heatLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' },
  heatLegendLabel: { fontSize: 10, color: COLORS.textMuted },
  heatLegendCell:  { width: 12, height: 12, borderRadius: 2 },

  // Weekday chart
  dowChart: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: 14, padding: 16, gap: 4,
    marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
  },
  dowChartCol:    { flex: 1, alignItems: 'center', gap: 4 },
  dowChartPct:    { fontSize: 9, color: COLORS.textMuted, fontWeight: '600' },
  dowChartBarWrap: { height: 80, justifyContent: 'flex-end' },
  dowChartBar:    { width: 14, borderRadius: 3, minHeight: 3 },
  dowChartLabel:  { fontSize: 9, color: COLORS.textSecondary, fontWeight: '600' },

  // Habit loop
  loopCard: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  loopRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  loopDot:   { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  loopLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  loopValue: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
});
