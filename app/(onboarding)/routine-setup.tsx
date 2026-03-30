import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '../../src/utils/constants';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';

const SUGGESTED_HABITS = [
  { id: '1', title: 'Arrumar a cama', toolType: 'first_victory', emoji: '🛏️', xp: 15 },
  { id: '2', title: 'Não abrir celular por 30min', toolType: 'dopamine_block', emoji: '📵', xp: 20 },
  { id: '3', title: 'Beber água ao acordar', toolType: 'mini_habit', emoji: '💧', xp: 10 },
  { id: '4', title: 'Meditação 5 minutos', toolType: 'fudoshin', emoji: '🧘', xp: 15 },
  { id: '5', title: '10 flexões ao acordar', toolType: 'gradual_change', emoji: '💪', xp: 15 },
  { id: '6', title: 'Escrever 1 objetivo do dia', toolType: 'mini_habit', emoji: '📝', xp: 10 },
];

export default function RoutineSetupScreen() {
  const { name, why, imageUri } = useLocalSearchParams<{ name: string; why: string; imageUri: string }>();
  const [selectedHabits, setSelectedHabits] = useState<string[]>(['1', '2']);

  const toggleHabit = (id: string) => {
    setSelectedHabits(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    router.push({
      pathname: '/(onboarding)/notification-setup',
      params: {
        name,
        why,
        imageUri,
        habits: JSON.stringify(selectedHabits.map(id => SUGGESTED_HABITS.find(h => h.id === id))),
      },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.stepIndicator}>
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepActive]} />
        <View style={styles.step} />
      </View>

      <Text style={styles.title}>Sua Rotina Matinal</Text>
      <Text style={styles.subtitle}>
        Escolha seus primeiros hábitos. Comece simples — você pode adicionar mais depois.
      </Text>

      <Text style={styles.sectionTitle}>Hábitos sugeridos (Fase 1 & 2):</Text>

      {SUGGESTED_HABITS.map(habit => {
        const selected = selectedHabits.includes(habit.id);
        return (
          <TouchableOpacity
            key={habit.id}
            onPress={() => toggleHabit(habit.id)}
            activeOpacity={0.8}
          >
            <Card
              style={[styles.habitCard, selected && styles.habitCardSelected]}
              variant="bordered"
            >
              <View style={styles.habitRow}>
                <Text style={styles.habitEmoji}>{habit.emoji}</Text>
                <View style={styles.habitInfo}>
                  <Text style={[styles.habitTitle, selected && styles.habitTitleSelected]}>
                    {habit.title}
                  </Text>
                  <Text style={styles.habitXP}>+{habit.xp} XP</Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        );
      })}

      <View style={styles.tip}>
        <Text style={styles.tipText}>
          💡 Princípio da Água: Comece com poucos hábitos. Consistência vence quantidade.
        </Text>
      </View>

      <Button
        title={`Continuar com ${selectedHabits.length} hábito${selectedHabits.length !== 1 ? 's' : ''} →`}
        onPress={handleNext}
        disabled={selectedHabits.length === 0}
        size="lg"
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24 },
  stepIndicator: { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
  step: { height: 4, flex: 1, backgroundColor: COLORS.border, borderRadius: 2 },
  stepDone: { backgroundColor: COLORS.primary },
  stepActive: { backgroundColor: COLORS.primary + '80' },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  habitCard: { marginBottom: 10 },
  habitCardSelected: { borderColor: COLORS.primary },
  habitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitEmoji: { fontSize: 28 },
  habitInfo: { flex: 1 },
  habitTitle: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  habitTitleSelected: { color: COLORS.text },
  habitXP: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tip: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 24,
  },
  tipText: { color: COLORS.primary, fontSize: 13, lineHeight: 20 },
  button: { marginBottom: 32 },
});
