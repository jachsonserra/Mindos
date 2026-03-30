import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SmarterGoal, progressPercent } from '../../types/smarterGoal.types';
import { COLORS } from '../../utils/constants';

interface SMARTERProgressProps {
  goal: SmarterGoal;
  compact?: boolean;
}

export function SMARTERProgress({ goal, compact = false }: SMARTERProgressProps) {
  const pct = progressPercent(goal);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );
  const nextCheckpoint = (goal.checkpoints ?? []).find((cp) => !cp.isCompleted);
  const color = goal.color ?? COLORS.primary;

  return (
    <View style={styles.container}>
      {/* Barra de progresso */}
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      {/* Números */}
      <View style={styles.row}>
        <Text style={styles.label}>
          {goal.currentValue} / {goal.target} {goal.metricUnit}
        </Text>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
      </View>
      {!compact && (
        <View style={styles.row}>
          <Text style={styles.meta}>
            {daysLeft > 0 ? `⏳ ${daysLeft} dias restantes` : '⚡ Prazo encerrado'}
          </Text>
          {nextCheckpoint && (
            <Text style={styles.meta}>
              📍 Checkpoint: {nextCheckpoint.scheduledDate}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  barTrack: {
    height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  label: { fontSize: 12, color: COLORS.textSecondary },
  pct: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 11, color: COLORS.textMuted },
});
