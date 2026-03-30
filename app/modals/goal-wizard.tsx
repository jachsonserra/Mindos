import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../src/utils/constants';
import { useSmarterGoalStore } from '../../src/stores/useSmarterGoalStore';
import { useHabitStore } from '../../src/stores/useHabitStore';
import { useAgendaStore } from '../../src/stores/useAgendaStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { Card } from '../../src/components/ui/Card';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { today } from '../../src/utils/dateHelpers';

const GOAL_SUGGESTIONS = [
  'Perder peso', 'Aprender algo novo', 'Organizar finanças',
  'Melhorar saúde mental', 'Ser mais produtivo', 'Leitura diária',
  'Praticar exercícios', 'Aprender idioma',
];

const HABIT_SUGGESTIONS = [
  { title: 'Acordar 30min mais cedo', icon: '⏰', hour: '06:30' },
  { title: '10 minutos de leitura', icon: '📚', hour: '07:00' },
  { title: 'Beber 2L de água', icon: '💧', hour: '08:00' },
  { title: '5 minutos de exercício', icon: '🏋️', hour: '07:30' },
  { title: 'Escrever 3 gratidões', icon: '🙏', hour: '22:00' },
  { title: 'Meditar 5 minutos', icon: '🧘', hour: '07:00' },
  { title: 'Sem celular de manhã', icon: '📵', hour: '06:00' },
  { title: 'Dormir antes das 23h', icon: '😴', hour: '22:30' },
];

interface WizardHabit {
  title: string;
  icon: string;
  hour: string;
  selected: boolean;
  custom?: boolean;
}

export default function GoalWizardScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const { createGoal } = useSmarterGoalStore();
  const { createHabit, createRoutine, addHabitToRoutine } = useHabitStore();
  const { createEvent } = useAgendaStore();

  const [step, setStep] = useState(1);
  const [objectiveTitle, setObjectiveTitle] = useState('');
  const [why, setWhy] = useState('');
  const [habits, setHabits] = useState<WizardHabit[]>(
    HABIT_SUGGESTIONS.map(h => ({ ...h, selected: false }))
  );
  const [customHabit, setCustomHabit] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const selectedHabits = habits.filter(h => h.selected);
  const totalSteps = 4;

  const canContinue = () => {
    if (step === 1) return objectiveTitle.trim().length > 0;
    if (step === 2) return why.trim().length > 0;
    if (step === 3) return selectedHabits.length > 0;
    return true;
  };

  const toggleHabit = (index: number) => {
    const alreadySelected = habits.filter(h => h.selected).length;
    const habit = habits[index];
    if (!habit.selected && alreadySelected >= 3) {
      Alert.alert('Máximo 3 hábitos', 'Comece com até 3 hábitos. Menos é mais consistente!');
      return;
    }
    setHabits(prev => prev.map((h, i) => i === index ? { ...h, selected: !h.selected } : h));
  };

  const addCustomHabit = () => {
    if (!customHabit.trim()) return;
    if (habits.filter(h => h.selected).length >= 3) {
      Alert.alert('Máximo 3 hábitos', 'Selecione até 3 hábitos para começar.');
      return;
    }
    setHabits(prev => [...prev, { title: customHabit.trim(), icon: '✅', hour: '08:00', selected: true, custom: true }]);
    setCustomHabit('');
  };

  const updateHabitHour = (index: number, hour: string) => {
    setHabits(prev => prev.map((h, i) => i === index ? { ...h, hour } : h));
  };

  const handleFinish = async () => {
    if (!user?.id || selectedHabits.length === 0) return;
    setIsLoading(true);

    try {
      // 1. Criar meta SMARTER com defaults a partir do wizard
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 90);
      const goal = await createGoal({
        userId: user.id,
        title: objectiveTitle.trim(),
        specific: objectiveTitle.trim(),
        metric: 'hábitos mantidos',
        baseline: 0,
        target: 100,
        metricUnit: '%',
        achievable: 'Com hábitos diários consistentes',
        relevant: why.trim(),
        emotional: why.trim(),
        deadline: deadline.toISOString().slice(0, 10),
        reviewFrequency: 'weekly',
        currentValue: 0,
        status: 'active',
        color: COLORS.goalColors[0],
        orderIndex: 0,
      });

      // 2. Criar rotina base
      const firstHour = selectedHabits[0]?.hour ?? '07:00';
      const routine = await createRoutine({
        userId: user.id,
        title: `Rotina: ${objectiveTitle.trim().slice(0, 30)}`,
        type: 'morning',
        phase: 1,
        triggerTime: firstHour,
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
        isActive: true,
        xpBonus: 25,
        orderIndex: 0,
      });

      // 3. Criar hábitos e vincular à rotina
      for (let i = 0; i < selectedHabits.length; i++) {
        const h = selectedHabits[i];
        const habit = await createHabit({
          userId: user.id,
          title: h.title,
          category: 'morning',
          phase: 1,
          toolType: 'mini_habit',
          xpReward: 10,
          isActive: true,
          orderIndex: i,
          neverMissCount: 0,
          relatedGoalId: goal.id,
        });
        await addHabitToRoutine(routine.id, habit.id);

        // 4. Criar evento na agenda de hoje
        await createEvent({
          userId: user.id,
          title: h.title,
          startTime: h.hour,
          date: today(),
          type: 'habit',
          color: COLORS.primary,
          isCompleted: false,
        });
      }

      router.replace('/(tabs)');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar sua rotina. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Qual é o seu objetivo principal agora?</Text>
            <Text style={s.stepDesc}>Seja específico. Um objetivo claro é mais fácil de perseguir.</Text>

            <TextInput
              style={s.mainInput}
              placeholder="Ex: Ler 12 livros este ano"
              placeholderTextColor={COLORS.textMuted}
              value={objectiveTitle}
              onChangeText={setObjectiveTitle}
              autoFocus
            />

            <Text style={s.suggestionLabel}>Ou escolha uma sugestão:</Text>
            <View style={s.chips}>
              {GOAL_SUGGESTIONS.map(sug => (
                <TouchableOpacity
                  key={sug}
                  style={[s.chip, objectiveTitle === sug && s.chipActive]}
                  onPress={() => setObjectiveTitle(sug)}
                >
                  <Text style={[s.chipText, objectiveTitle === sug && s.chipTextActive]}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Por que isso é importante para você?</Text>
            <Text style={s.stepDesc}>Seja honesto. Esse porquê vai te manter firme nos dias difíceis.</Text>

            <Card style={s.whyExample}>
              <Text style={s.whyExampleLabel}>Exemplo:</Text>
              <Text style={s.whyExampleText}>
                "Porque quero ter energia pra brincar com meus filhos e não me sentir mal na frente do espelho."
              </Text>
            </Card>

            <TextInput
              style={[s.mainInput, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Escreva seu porquê com honestidade..."
              placeholderTextColor={COLORS.textMuted}
              value={why}
              onChangeText={setWhy}
              multiline
              autoFocus
            />
          </View>
        );

      case 3:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Escolha até 3 hábitos pequenos para começar</Text>
            <Text style={s.stepDesc}>Comece pequeno. É melhor fazer o pouco sempre do que o muito raramente.</Text>

            {habits.map((habit, i) => (
              <TouchableOpacity
                key={i}
                style={[s.habitOption, habit.selected && s.habitOptionActive]}
                onPress={() => toggleHabit(i)}
                activeOpacity={0.8}
              >
                <Text style={s.habitOptionIcon}>{habit.icon}</Text>
                <Text style={[s.habitOptionTitle, habit.selected && s.habitOptionTitleActive]}>
                  {habit.title}
                </Text>
                {habit.selected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}

            <View style={s.customHabitRow}>
              <TextInput
                style={s.customInput}
                placeholder="Outro hábito..."
                placeholderTextColor={COLORS.textMuted}
                value={customHabit}
                onChangeText={setCustomHabit}
                onSubmitEditing={addCustomHabit}
              />
              <TouchableOpacity style={s.customAddBtn} onPress={addCustomHabit}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={s.selectedCount}>
              {selectedHabits.length}/3 hábitos selecionados
            </Text>
          </View>
        );

      case 4:
        return (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Quando você vai fazer isso?</Text>
            <Text style={s.stepDesc}>Defina um horário para cada hábito. Horários fixos = mais consistência.</Text>

            {selectedHabits.map((habit, i) => {
              const globalIndex = habits.findIndex(h => h.title === habit.title);
              return (
                <View key={i} style={s.habitHourRow}>
                  <Text style={s.habitHourIcon}>{habit.icon}</Text>
                  <Text style={s.habitHourTitle} numberOfLines={1}>{habit.title}</Text>
                  <TextInput
                    style={s.hourInput}
                    value={habit.hour}
                    onChangeText={v => updateHabitHour(globalIndex, v)}
                    placeholder="HH:MM"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              );
            })}

            <Card style={s.summaryCard}>
              <Text style={s.summaryTitle}>Resumo da sua rotina 🎯</Text>
              <Text style={s.summaryItem}>• Meta: <Text style={s.summaryBold}>{objectiveTitle}</Text></Text>
              <Text style={s.summaryItem}>• Porquê: <Text style={s.summaryBold}>{why.slice(0, 60)}{why.length > 60 ? '...' : ''}</Text></Text>
              <Text style={s.summaryItem}>• Hábitos: <Text style={s.summaryBold}>{selectedHabits.length} selecionados</Text></Text>
              <Text style={s.summaryNote}>Esses hábitos serão adicionados à sua agenda de hoje automaticamente.</Text>
            </Card>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : router.back()}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Criar minha rotina</Text>
          <Text style={s.headerStep}>{step}/{totalSteps}</Text>
        </View>

        {/* Progress */}
        <ProgressBar value={step} max={totalSteps} color={COLORS.primary} height={4} style={s.progress} />

        {/* Conteúdo */}
        <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        {/* Botão próximo */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.nextBtn, !canContinue() && s.nextBtnDisabled]}
            onPress={step < totalSteps ? () => setStep(s => s + 1) : handleFinish}
            disabled={!canContinue() || isLoading}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>
              {step < totalSteps ? 'Continuar' : isLoading ? 'Criando...' : 'Criar minha rotina! 🚀'}
            </Text>
            {step < totalSteps && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  headerStep: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  progress: { marginHorizontal: 16, marginBottom: 8 },

  stepContent: { paddingTop: 12, gap: 12 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, lineHeight: 28 },
  stepDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },

  mainInput: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text, marginTop: 8 },

  suggestionLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },

  whyExample: { backgroundColor: COLORS.primaryMuted, borderRadius: 12, padding: 14 },
  whyExampleLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  whyExampleText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 19 },

  habitOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border },
  habitOptionActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  habitOptionIcon: { fontSize: 20 },
  habitOptionTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  habitOptionTitleActive: { color: COLORS.primaryDark },
  customHabitRow: { flexDirection: 'row', gap: 10 },
  customInput: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.text },
  customAddBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  selectedCount: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', fontWeight: '600' },

  habitHourRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  habitHourIcon: { fontSize: 20 },
  habitHourTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  hourInput: { width: 70, backgroundColor: COLORS.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15, fontWeight: '700', color: COLORS.primary, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border },

  summaryCard: { backgroundColor: COLORS.primaryMuted, borderRadius: 14, padding: 16, gap: 6 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginBottom: 4 },
  summaryItem: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  summaryBold: { fontWeight: '700', color: COLORS.text },
  summaryNote: { fontSize: 12, color: COLORS.primary, marginTop: 8, fontStyle: 'italic' },

  footer: { paddingHorizontal: 16, paddingVertical: 16 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 16 },
  nextBtnDisabled: { opacity: 0.5 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
