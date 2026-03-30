import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { Habit } from '../../types/habit.types';

interface HabitLoopCardProps {
  habit: Habit;
}

const LOOP_STEPS = [
  { key: 'trigger', label: 'Gatilho', icon: 'flash' as const, color: '#C4882A' },
  { key: 'desire', label: 'Desejo', icon: 'heart' as const, color: '#B85C45' },
  { key: 'implementation', label: 'Ação', icon: 'checkmark-circle' as const, color: '#5A8A5A' },
  { key: 'reward', label: 'Recompensa', icon: 'gift' as const, color: '#D4A843' },
];

export function HabitLoopCard({ habit }: HabitLoopCardProps) {
  const hasLoop = habit.trigger || habit.desire || habit.implementation || habit.reward;
  if (!hasLoop) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Loop do Hábito</Text>
      <View style={styles.steps}>
        {LOOP_STEPS.map((step, i) => {
          const value = (habit as any)[step.key];
          return (
            <View key={step.key} style={styles.stepRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${step.color}18` }]}>
                <Ionicons name={step.icon} size={16} color={step.color} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepLabel}>{step.label}</Text>
                <Text style={styles.stepValue} numberOfLines={2}>
                  {value || '—'}
                </Text>
              </View>
              {i < LOOP_STEPS.length - 1 && (
                <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} style={styles.arrow} />
              )}
            </View>
          );
        })}
      </View>
      {habit.twoMinuteVersion && (
        <View style={styles.twoMin}>
          <Ionicons name="timer" size={14} color={COLORS.primary} />
          <Text style={styles.twoMinText}>2 min: {habit.twoMinuteVersion}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 14, gap: 10,
  },
  title: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  steps: { gap: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepContent: { flex: 1 },
  stepLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  stepValue: { fontSize: 13, color: COLORS.text },
  arrow: { opacity: 0.5 },
  twoMin: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${COLORS.primary}12`, borderRadius: 8, padding: 8,
  },
  twoMinText: { fontSize: 12, color: COLORS.primary, fontWeight: '500', flex: 1 },
});
