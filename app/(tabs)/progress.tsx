import React, { useEffect, useState, useMemo } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../../src/stores/useUserStore';
import { useHabitStore } from '../../src/stores/useHabitStore';
import { useGamificationStore } from '../../src/stores/useGamificationStore';
import { COLORS, PHASES } from '../../src/utils/constants';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { Badge } from '../../src/components/ui/Badge';
import { GamificationRepository } from '../../src/services/database/gamificationRepository';
import { HabitRepository } from '../../src/services/database/habitRepository';
import { CheckInRepository } from '../../src/services/database/checkinRepository';
import type { DailyCheckIn } from '../../src/types/checkin.types';
import { getLevelTitle, getXPForNextLevel, calculateCurrentLevelXP, getLevelProgressPercent } from '../../src/services/gamification/xpEngine';
import { MomentumEngine } from '../../src/services/gamification/momentumEngine';
import { getLast30Days } from '../../src/utils/dateHelpers';
import type { XPHistory } from '../../src/types/gamification.types';

type PeriodType = '7d' | '30d' | '90d';

// ── Heatmap helper ────────────────────────────────────────────────────────────

/** Gera os últimos `days` dias em formato YYYY-MM-DD */
function getLastNDays(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

/** Cor do heatmap de hábitos: 0 = sem completions, intensidade cresce com contagem */
function heatColor(count: number, maxCount: number): string {
  if (count === 0) return COLORS.border;
  const intensity = Math.min(count / Math.max(maxCount, 1), 1);
  if (intensity < 0.25) return `${COLORS.primary}40`;
  if (intensity < 0.5)  return `${COLORS.primary}70`;
  if (intensity < 0.75) return `${COLORS.primary}A0`;
  return COLORS.primary;
}

/** Cor do heatmap de humor por nível (1-5) */
function moodHeatColor(avgMood: number | undefined): string {
  if (!avgMood) return COLORS.border;
  if (avgMood < 2) return '#ef444480'; // vermelho
  if (avgMood < 2.5) return '#f97316A0'; // laranja escuro
  if (avgMood < 3) return '#f97316D0'; // laranja
  if (avgMood < 3.5) return `${COLORS.warning}90`; // âmbar
  if (avgMood < 4) return `${COLORS.warning}D0`;
  if (avgMood < 4.5) return `${COLORS.success}90`; // verde claro
  return COLORS.success; // verde
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const user = useUserStore(s => s.user);
  const { habits } = useHabitStore();
  const { userXP, missions, todayXPEarned } = useGamificationStore();
  const [xpHistory, setXpHistory] = useState<XPHistory[]>([]);
  const [heatmap, setHeatmap] = useState<Record<string, number>>({});
  const [moodHeatmap, setMoodHeatmap] = useState<Record<string, number>>({}); // date → avg mood
  const [period, setPeriod] = useState<PeriodType>('30d');

  const level = userXP?.level ?? 1;
  const totalXP = userXP?.totalXp ?? 0;
  const momentum = userXP?.momentumScore ?? 0;
  const streak = userXP?.currentOverallStreak ?? 0;
  const longestStreak = userXP?.longestStreak ?? 0;
  const levelTitle = getLevelTitle(level);
  const levelPercent = getLevelProgressPercent(totalXP);
  const xpToNext = getXPForNextLevel(level);
  const currentLevelXP = calculateCurrentLevelXP(totalXP);
  const xpToday = todayXPEarned ?? 0;

  const completedMissions = missions.filter(m => m.status === 'completed').length;
  const maxStreak = Math.max(...habits.map(h => h.bestStreak), 0);

  useEffect(() => {
    if (!user?.id) return;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    GamificationRepository.getXPHistory(user.id, days).then(setXpHistory);
  }, [user?.id, period]);

  useEffect(() => {
    if (!user?.id) return;
    HabitRepository.getCompletionsByDate(user.id, 84).then(setHeatmap);
  }, [user?.id]);

  // Busca check-ins para o mapa de humor
  useEffect(() => {
    if (!user?.id) return;
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 83 * 86400000).toISOString().split('T')[0];
    CheckInRepository.getByDateRange(user.id, from, to).then((checkins: DailyCheckIn[]) => {
      const map: Record<string, number> = {};
      for (const ci of checkins) {
        const moods: number[] = [];
        if (ci.morning?.mood) moods.push(ci.morning.mood);
        if (ci.midday?.mood)  moods.push(ci.midday.mood);
        if (ci.evening?.mood) moods.push(ci.evening.mood);
        if (moods.length > 0) {
          map[ci.date] = moods.reduce((a, b) => a + b, 0) / moods.length;
        }
      }
      setMoodHeatmap(map);
    });
  }, [user?.id]);

  // XP por dia para o gráfico de barras
  const xpByDay = useMemo(() => {
    const map: Record<string, number> = {};
    xpHistory.forEach(h => { map[h.date] = (map[h.date] ?? 0) + h.xpAmount; });
    return map;
  }, [xpHistory]);

  const chartDays = useMemo(() => {
    const n = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return getLastNDays(n);
  }, [period]);

  const maxDayXP = Math.max(...chartDays.map(d => xpByDay[d] ?? 0), 1);

  // Heatmap: 12 semanas × 7 dias = 84 células, coluna = semana, linha = dia
  const heatDays = useMemo(() => getLastNDays(84), []);
  const maxHeat = Math.max(...heatDays.map(d => heatmap[d] ?? 0), 1);
  const totalHabits = habits.length;
  const heatDaysWithActivity = heatDays.filter(d => (heatmap[d] ?? 0) > 0).length;
  const moodDaysWithData = heatDays.filter(d => moodHeatmap[d] !== undefined).length;
  const moodAvgAll = moodDaysWithData > 0
    ? heatDays.filter(d => moodHeatmap[d]).reduce((s, d) => s + (moodHeatmap[d] ?? 0), 0) / moodDaysWithData
    : 0;

  const phases = [1, 2, 3, 4, 5, 6];
  const currentPhase = user?.currentPhase ?? 1;
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Insights acionáveis ────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const list: { icon: string; text: string; action: string }[] = [];

    if (streak === 0) {
      list.push({
        icon: '🔥',
        text: 'Seu streak está zerado.',
        action: 'Marque 1 hábito hoje para reacender a sequência.',
      });
    } else if (streak < 3 && longestStreak >= 7) {
      list.push({
        icon: '📉',
        text: `Você já chegou a ${longestStreak} dias seguidos.`,
        action: 'Rebuild: marque seus hábitos agora para reconquistar o ritmo.',
      });
    }

    if (momentum < 40) {
      list.push({
        icon: '⚡',
        text: `Momentum em ${Math.floor(momentum)}% — abaixo do ideal.`,
        action: 'Reduza a dificuldade de 1 hábito para ganhar consistência.',
      });
    }

    const droppedHabit = habits.find(
      h => h.isActive && h.bestStreak >= 5 && h.streakCount < Math.floor(h.bestStreak * 0.5),
    );
    if (droppedHabit) {
      list.push({
        icon: '🔁',
        text: `"${droppedHabit.title}" teve ${droppedHabit.bestStreak} dias de streak.`,
        action: 'Retome esse hábito — seu melhor é prova que você consegue.',
      });
    }

    const todayXPFromHistory = xpByDay[todayStr] ?? 0;
    const hourNow = new Date().getHours();
    if (todayXPFromHistory === 0 && xpToday === 0 && hourNow >= 16) {
      list.push({
        icon: '🎯',
        text: 'Você ainda não ganhou XP hoje.',
        action: 'Marque 1 hábito para ativar o streak e acumular pontos.',
      });
    }

    return list.slice(0, 3);
  }, [streak, longestStreak, momentum, habits, xpByDay, xpToday, todayStr]);

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.content}>
        <Text style={st.pageTitle}>📈 Progresso</Text>

        {/* ── Nível + XP ── */}
        <Card style={st.levelCard} variant="elevated">
          <View style={st.levelRow}>
            <View style={st.levelBadge}>
              <Text style={st.levelBadgeNum}>{level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.levelTitle}>{levelTitle}</Text>
              <Text style={st.levelSub}>Nível {level} · {totalXP} XP total</Text>
            </View>
            <View style={st.xpTodayBadge}>
              <Text style={st.xpTodayText}>+{xpToday} XP</Text>
              <Text style={st.xpTodayLabel}>hoje</Text>
            </View>
          </View>
          <ProgressBar
            value={currentLevelXP}
            max={xpToNext}
            color={COLORS.primary}
            height={8}
            showLabel
            label={`${currentLevelXP} / ${xpToNext} XP para Nível ${level + 1}`}
            style={st.levelBar}
          />
        </Card>

        {/* ── Stats Grid ── */}
        <View style={st.statsGrid}>
          <View style={st.statCard}>
            <Text style={st.statEmoji}>🔥</Text>
            <Text style={st.statVal}>{streak}</Text>
            <Text style={st.statLbl}>Streak atual</Text>
          </View>
          <View style={st.statCard}>
            <Text style={st.statEmoji}>🏆</Text>
            <Text style={st.statVal}>{longestStreak}</Text>
            <Text style={st.statLbl}>Maior streak</Text>
          </View>
          <View style={st.statCard}>
            <Text style={st.statEmoji}>✅</Text>
            <Text style={st.statVal}>{completedMissions}</Text>
            <Text style={st.statLbl}>Missões</Text>
          </View>
          <View style={st.statCard}>
            <Text style={st.statEmoji}>⚡</Text>
            <Text style={[st.statVal, { color: MomentumEngine.getMomentumColor(momentum) }]}>
              {Math.floor(momentum)}
            </Text>
            <Text style={st.statLbl}>Momentum</Text>
          </View>
        </View>

        {/* ── Insights acionáveis ── */}
        {insights.length > 0 && (
          <>
            <Text style={[st.sectionTitle, { marginTop: 4, marginBottom: 8 }]}>💡 O que fazer agora</Text>
            {insights.map((ins, i) => (
              <View key={i} style={st.insightCard}>
                <Text style={st.insightIcon}>{ins.icon}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={st.insightText}>{ins.text}</Text>
                  <Text style={st.insightAction}>{ins.action}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ── Mapa de humor (12 semanas) ── */}
        {moodDaysWithData > 0 && (
          <>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>Mapa de Humor (12 semanas)</Text>
              <View style={st.moodAvgBadge}>
                <Text style={st.moodAvgText}>{moodAvgAll.toFixed(1)} ⌀</Text>
              </View>
            </View>
            <Card style={st.heatCard} variant="bordered">
              <View style={st.heatDowRow}>
                {['S','T','Q','Q','S','S','D'].map((d, i) => (
                  <Text key={i} style={st.heatDow}>{d}</Text>
                ))}
              </View>
              <View style={st.heatGrid}>
                {Array.from({ length: 12 }, (_, weekIdx) => (
                  <View key={weekIdx} style={st.heatWeekCol}>
                    {Array.from({ length: 7 }, (_, dayIdx) => {
                      const cellIdx = weekIdx * 7 + dayIdx;
                      const date = heatDays[cellIdx] ?? '';
                      const avg  = moodHeatmap[date];
                      const isToday = date === todayStr;
                      return (
                        <View
                          key={dayIdx}
                          style={[
                            st.heatCell,
                            { backgroundColor: moodHeatColor(avg) },
                            isToday && st.heatCellToday,
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
              {/* Legenda */}
              <View style={st.heatLegend}>
                <Text style={st.heatLegendLabel}>Baixo</Text>
                {['#ef444480','#f97316D0',`${COLORS.warning}D0`,`${COLORS.success}90`, COLORS.success].map((c, i) => (
                  <View key={i} style={[st.heatLegendCell, { backgroundColor: c }]} />
                ))}
                <Text style={st.heatLegendLabel}>Alto</Text>
              </View>
            </Card>
          </>
        )}

        {/* ── Heatmap de hábitos ── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Consistência (12 semanas)</Text>
          <Text style={st.sectionSub}>{heatDaysWithActivity} dias ativos</Text>
        </View>
        <Card style={st.heatCard} variant="bordered">
          {/* Legenda dos dias da semana */}
          <View style={st.heatDowRow}>
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
              <Text key={i} style={st.heatDow}>{d}</Text>
            ))}
          </View>
          {/* Grade: 12 colunas (semanas) × 7 linhas (dias) */}
          <View style={st.heatGrid}>
            {Array.from({ length: 12 }, (_, weekIdx) => (
              <View key={weekIdx} style={st.heatWeekCol}>
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const cellIdx = weekIdx * 7 + dayIdx;
                  const date = heatDays[cellIdx] ?? '';
                  const count = heatmap[date] ?? 0;
                  const isToday = date === todayStr;
                  return (
                    <View
                      key={dayIdx}
                      style={[
                        st.heatCell,
                        { backgroundColor: heatColor(count, maxHeat) },
                        isToday && st.heatCellToday,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          {/* Legenda de intensidade */}
          <View style={st.heatLegend}>
            <Text style={st.heatLegendLabel}>Menos</Text>
            {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
              <View
                key={i}
                style={[st.heatLegendCell, { backgroundColor: heatColor(v * maxHeat, maxHeat) }]}
              />
            ))}
            <Text style={st.heatLegendLabel}>Mais</Text>
          </View>
        </Card>

        {/* ── Gráfico XP por dia ── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>XP por dia</Text>
          <View style={st.periodBtns}>
            {(['7d', '30d', '90d'] as PeriodType[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[st.periodBtn, period === p && st.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[st.periodBtnTxt, period === p && st.periodBtnTxtActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Card style={st.chartCard} variant="bordered">
          <View style={st.chartBars}>
            {chartDays.map((date, i) => {
              const xp = xpByDay[date] ?? 0;
              const barH = xp > 0 ? Math.max(5, (xp / maxDayXP) * 80) : 3;
              const isToday = date === todayStr;
              const showLabel = i === 0 || i === Math.floor(chartDays.length / 2) || i === chartDays.length - 1;
              return (
                <View key={date} style={st.barWrap}>
                  <View
                    style={[
                      st.bar,
                      { height: barH, backgroundColor: isToday ? COLORS.warning : xp > 0 ? COLORS.primary : COLORS.border },
                    ]}
                  />
                  {showLabel && (
                    <Text style={st.barLabel}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
          <View style={st.chartLegend}>
            <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={st.legendTxt}>XP</Text></View>
            <View style={st.legendItem}><View style={[st.legendDot, { backgroundColor: COLORS.warning }]} /><Text style={st.legendTxt}>Hoje</Text></View>
          </View>
        </Card>

        {/* ── Jornada das Fases ── */}
        <Text style={[st.sectionTitle, { marginTop: 4 }]}>Jornada das Fases</Text>
        <Card style={st.phasesCard} variant="bordered">
          {phases.map(phase => {
            const phaseData = PHASES[phase as keyof typeof PHASES];
            const unlocked = phase <= currentPhase;
            const active = phase === currentPhase;
            return (
              <View key={phase} style={[st.phaseItem, !unlocked && st.phaseItemLocked]}>
                <View style={[st.phaseCircle, unlocked && { backgroundColor: phaseData.color }]}>
                  {unlocked
                    ? <Text style={st.phaseNum}>{phase}</Text>
                    : <Text style={st.phaseLock}>🔒</Text>
                  }
                </View>
                {phase < 6 && (
                  <View style={[st.phaseConnector, unlocked && phase < currentPhase && { backgroundColor: phaseData.color }]} />
                )}
                <View style={st.phaseInfo}>
                  <Text style={[st.phaseName, !unlocked && st.phaseNameLocked]}>{phaseData.name}</Text>
                  <Text style={st.phaseDesc}>{phaseData.description}</Text>
                  {active && <Badge label="Atual" color={phaseData.color} size="sm" />}
                </View>
              </View>
            );
          })}
        </Card>

        {/* ── Melhores streaks ── */}
        {habits.filter(h => h.bestStreak > 0).length > 0 && (
          <>
            <Text style={[st.sectionTitle, { marginTop: 4 }]}>Melhores streaks</Text>
            {habits
              .filter(h => h.bestStreak > 0)
              .sort((a, b) => b.bestStreak - a.bestStreak)
              .slice(0, 5)
              .map(habit => (
                <Card key={habit.id} style={st.streakCard} variant="bordered">
                  <View style={st.streakRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.streakName}>{habit.title}</Text>
                      <Text style={st.streakCurrent}>Atual: {habit.streakCount} dias</Text>
                    </View>
                    <View style={st.streakBadge}>
                      <Text style={st.streakBadgeTxt}>🔥 {habit.bestStreak}</Text>
                      <Text style={st.streakBadgeLbl}>melhor</Text>
                    </View>
                  </View>
                  <ProgressBar
                    value={habit.streakCount}
                    max={Math.max(habit.bestStreak, 1)}
                    color={COLORS.primary}
                    height={4}
                    style={{ marginTop: 8 } as any}
                  />
                </Card>
              ))}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 16 },

  // Level card
  levelCard: { marginBottom: 14 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  levelBadge: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  levelBadgeNum: { fontSize: 22, fontWeight: '900', color: '#fff' },
  levelTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text },
  levelSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  xpTodayBadge: { alignItems: 'center', backgroundColor: `${COLORS.warning}18`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  xpTodayText: { fontSize: 14, fontWeight: '800', color: COLORS.warning },
  xpTodayLabel: { fontSize: 10, color: COLORS.warning, fontWeight: '600' },
  levelBar: { marginBottom: 0 } as any,

  // Stats grid
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 12, alignItems: 'center', gap: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statEmoji: { fontSize: 20 },
  statVal: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLbl: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center' },

  // Insights
  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  insightIcon: { fontSize: 22, marginTop: 1 },
  insightText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  insightAction: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  // Section headers
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  sectionSub: { fontSize: 12, color: COLORS.textMuted },

  // Mood avg badge
  moodAvgBadge: {
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
  },
  moodAvgText: { fontSize: 12, fontWeight: '700', color: COLORS.success },

  // Heatmap
  heatCard: { marginBottom: 20, padding: 14 },
  heatDowRow: { flexDirection: 'row', marginBottom: 4, paddingLeft: 2 },
  heatDow: { width: 14, textAlign: 'center', fontSize: 9, color: COLORS.textMuted, marginHorizontal: 2 },
  heatGrid: { flexDirection: 'row', gap: 3 },
  heatWeekCol: { flexDirection: 'column', gap: 3 },
  heatCell: { width: 14, height: 14, borderRadius: 3 },
  heatCellToday: { borderWidth: 2, borderColor: COLORS.warning },
  heatLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, justifyContent: 'flex-end' },
  heatLegendLabel: { fontSize: 10, color: COLORS.textMuted },
  heatLegendCell: { width: 12, height: 12, borderRadius: 2 },

  // XP chart
  periodBtns: { flexDirection: 'row', gap: 6 },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: COLORS.surface },
  periodBtnActive: { backgroundColor: COLORS.primary },
  periodBtnTxt: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  periodBtnTxtActive: { color: '#fff' },
  chartCard: { marginBottom: 20 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2, paddingBottom: 20 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', position: 'relative' },
  bar: { width: '100%', borderRadius: 2, minHeight: 2 },
  barLabel: { position: 'absolute', bottom: 0, fontSize: 8, color: COLORS.textSecondary, textAlign: 'center' },
  chartLegend: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 12, color: COLORS.textSecondary },

  // Phases
  phasesCard: { marginBottom: 20, padding: 20 },
  phaseItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20, gap: 12 },
  phaseItemLocked: { opacity: 0.4 },
  phaseCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  phaseNum: { color: '#fff', fontWeight: '800', fontSize: 16 },
  phaseLock: { fontSize: 14 },
  phaseConnector: { position: 'absolute', left: 17, top: 36, width: 2, height: 20, backgroundColor: COLORS.border },
  phaseInfo: { flex: 1, paddingTop: 4 },
  phaseName: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  phaseNameLocked: { color: COLORS.textSecondary },
  phaseDesc: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },

  // Streak cards
  streakCard: { marginBottom: 8 },
  streakRow: { flexDirection: 'row', alignItems: 'center' },
  streakName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  streakCurrent: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  streakBadge: { alignItems: 'center', minWidth: 56 },
  streakBadgeTxt: { fontSize: 18, fontWeight: '700', color: COLORS.warning },
  streakBadgeLbl: { fontSize: 10, color: COLORS.textSecondary },
});
