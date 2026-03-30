import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { useTaskStore } from '../../stores/useTaskStore';
import { useHabitStore } from '../../stores/useHabitStore';
import { useAgendaStore } from '../../stores/useAgendaStore';
import { useUserStore } from '../../stores/useUserStore';
import { today } from '../../utils/dateHelpers';
import { TimePicker } from './TimePicker';
import type { SmarterGoal } from '../../types/smarterGoal.types';

interface Props {
  visible: boolean;
  goal: SmarterGoal | null;
  onClose: () => void;
}

interface TaskDraft { title: string; date: 'today' | 'tomorrow' | 'week'; hour: string; }

const DATE_OPTIONS = [
  { value: 'today' as const, label: 'Hoje' },
  { value: 'tomorrow' as const, label: 'Amanhã' },
  { value: 'week' as const, label: 'Esta semana' },
];

function getDateStr(opt: 'today' | 'tomorrow' | 'week'): string {
  const d = new Date();
  if (opt === 'tomorrow') d.setDate(d.getDate() + 1);
  if (opt === 'week') d.setDate(d.getDate() + 3);
  return d.toISOString().split('T')[0];
}

export function GoalWizardFlow({ visible, goal, onClose }: Props) {
  const { user } = useUserStore();
  const { createTask } = useTaskStore();
  const { createHabit } = useHabitStore();
  const { createEvent } = useAgendaStore();

  const [step, setStep] = useState(1);
  const TOTAL_STEPS = 4;
  const [saving, setSaving] = useState(false);

  // Step 1: Habit (agora vem primeiro)
  const [createHabitFlag, setCreateHabitFlag] = useState<boolean | null>(null);
  const [habitTitle, setHabitTitle] = useState('');
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekdays' | 'weekly'>('daily');

  // Step 2: Tasks (agora vem depois do hábito)
  const [tasks, setTasks] = useState<TaskDraft[]>([
    { title: '', date: 'today', hour: '' },
  ]);

  // Step 3: Agenda
  const [scheduleFlag, setScheduleFlag] = useState<boolean | null>(null);

  // Results
  const [createdTasks, setCreatedTasks] = useState<string[]>([]);
  const [createdHabit, setCreatedHabit] = useState<string | null>(null);
  const [createdEvents, setCreatedEvents] = useState<number>(0);

  function reset() {
    setStep(1);
    setTasks([{ title: '', date: 'today', hour: '' }]);
    setCreateHabitFlag(null);
    setHabitTitle('');
    setHabitFreq('daily');
    setScheduleFlag(null);
    setCreatedTasks([]);
    setCreatedHabit(null);
    setCreatedEvents(0);
    setSaving(false);
  }

  function handleClose() { reset(); onClose(); }

  // ── Step 1: Save habit ─────────────────────────────────────
  async function saveHabit() {
    if (!user?.id || !goal) return;
    setSaving(true);
    try {
      if (createHabitFlag && habitTitle.trim()) {
        await createHabit({
          userId: user.id,
          title: habitTitle.trim(),
          category: 'custom',
          phase: 1,
          toolType: 'custom',
          xpReward: 10,
          isActive: true,
          neverMissCount: 0,
          orderIndex: 0,
          relatedGoalId: goal.id,
        });
        setCreatedHabit(habitTitle.trim());
      }
      setStep(2);
    } catch (e: any) {
      Alert.alert('Erro ao criar hábito', e?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // ── Step 2: Save tasks ──────────────────────────────────────
  async function saveTasks() {
    if (!user?.id || !goal) return;
    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.length === 0) { setStep(3); return; }
    setSaving(true);
    try {
      const names: string[] = [];
      for (const t of validTasks) {
        await createTask({
          userId: user.id,
          smarterGoalId: goal.id,   // ← correto: FK para SmarterGoal
          goalId: undefined,
          title: t.title.trim(),
          scheduledDate: getDateStr(t.date),
          scheduledHour: t.hour || undefined,
          isCompleted: false,
          rewardUnlocked: false,
          status: 'pending',
          orderIndex: 0,
          isPareto: false,
        });
        names.push(t.title.trim());
      }
      setCreatedTasks(names);
      setStep(3);
    } catch (e: any) {
      Alert.alert('Erro ao criar tarefas', e?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  // ── Step 3: Save agenda ────────────────────────────────────
  async function saveAgenda() {
    if (!user?.id || !goal) return;
    setSaving(true);
    try {
      if (scheduleFlag && createdTasks.length > 0) {
        let count = 0;
        for (const taskTitle of createdTasks) {
          await createEvent({
            userId: user.id,
            title: taskTitle,
            description: `Tarefa da meta: ${goal.title}`,
            date: today(),
            startTime: '09:00',
            endTime: '10:00',
            type: 'task',
            color: goal.color ?? COLORS.primary,
            isCompleted: false,
          });
          count++;
        }
        setCreatedEvents(count);
      }
      setStep(4);
    } catch (e: any) {
      Alert.alert('Erro ao agendar', e?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  if (!goal) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.stepLabel}>PASSO {step}/{TOTAL_STEPS}</Text>
              <Text style={s.title}>
                {step === 1 ? '🔁 Criar Hábito' :
                 step === 2 ? '📋 Criar Tarefas' :
                 step === 3 ? '📅 Agendar' : '✅ Resumo'}
              </Text>
              <Text style={s.goalName} numberOfLines={1}>Para: {goal.title}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Progress bar */}
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]} />
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">

            {/* ── STEP 1: Habit ── */}
            {step === 1 && (
              <View style={s.stepContent}>
                <Text style={s.hint}>Hábitos sustentam metas. Deseja criar um hábito recorrente para apoiar esta meta?</Text>

                <View style={s.yesNoRow}>
                  <TouchableOpacity
                    style={[s.yesNoBtn, createHabitFlag === true && s.yesNoBtnActive]}
                    onPress={() => setCreateHabitFlag(true)}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={createHabitFlag === true ? '#fff' : COLORS.success} />
                    <Text style={[s.yesNoText, createHabitFlag === true && { color: '#fff' }]}>Sim, criar hábito</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.yesNoBtn, createHabitFlag === false && s.yesNoBtnSkip]}
                    onPress={() => { setCreateHabitFlag(false); }}
                  >
                    <Ionicons name="remove-circle-outline" size={20} color={createHabitFlag === false ? '#fff' : COLORS.textMuted} />
                    <Text style={[s.yesNoText, createHabitFlag === false && { color: '#fff' }]}>Pular por agora</Text>
                  </TouchableOpacity>
                </View>

                {createHabitFlag === true && (
                  <View style={s.habitForm}>
                    <TextInput
                      style={s.input}
                      placeholder="Nome do hábito (ex: Meditar 10min)"
                      placeholderTextColor={COLORS.textMuted}
                      value={habitTitle}
                      onChangeText={setHabitTitle}
                      autoFocus
                    />
                    <Text style={s.fieldLabel}>Frequência</Text>
                    <View style={s.freqRow}>
                      {([
                        { v: 'daily', l: 'Diário' },
                        { v: 'weekdays', l: 'Dias úteis' },
                        { v: 'weekly', l: 'Semanal' },
                      ] as const).map(opt => (
                        <TouchableOpacity
                          key={opt.v}
                          style={[s.freqChip, habitFreq === opt.v && s.freqChipActive]}
                          onPress={() => setHabitFreq(opt.v)}
                        >
                          <Text style={[s.freqText, habitFreq === opt.v && s.freqTextActive]}>{opt.l}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                <View style={s.actions}>
                  <TouchableOpacity style={s.skipBtn} onPress={() => setStep(2)}>
                    <Text style={s.skipText}>Pular</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.nextBtn, (createHabitFlag === null || saving) && s.nextBtnDisabled]}
                    onPress={() => createHabitFlag !== null && !saving && saveHabit()}
                  >
                    <Text style={s.nextText}>
                      {saving ? 'Salvando...' : createHabitFlag === true ? 'Criar Hábito →' : 'Próximo →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 2: Tasks ── */}
            {step === 2 && (
              <View style={s.stepContent}>
                <Text style={s.hint}>Quebre a meta em ações concretas. Você pode adicionar até 3 tarefas agora.</Text>
                {tasks.map((task, i) => (
                  <View key={i} style={s.taskCard}>
                    <View style={s.taskNum}>
                      <Text style={s.taskNumText}>{i + 1}</Text>
                    </View>
                    <View style={s.taskFields}>
                      <TextInput
                        style={s.input}
                        placeholder={`Ação ${i + 1} (ex: Estudar 30min)`}
                        placeholderTextColor={COLORS.textMuted}
                        value={task.title}
                        onChangeText={v => {
                          const next = [...tasks];
                          next[i] = { ...next[i], title: v };
                          setTasks(next);
                        }}
                      />
                      <View style={s.dateRow}>
                        {DATE_OPTIONS.map(opt => (
                          <TouchableOpacity
                            key={opt.value}
                            style={[s.dateChip, task.date === opt.value && s.dateChipActive]}
                            onPress={() => {
                              const next = [...tasks];
                              next[i] = { ...next[i], date: opt.value };
                              setTasks(next);
                            }}
                          >
                            <Text style={[s.dateChipText, task.date === opt.value && s.dateChipTextActive]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <TimePicker
                        value={task.hour}
                        onChange={v => {
                          const next = [...tasks];
                          next[i] = { ...next[i], hour: v };
                          setTasks(next);
                        }}
                        placeholder="Horário (opcional)"
                      />
                    </View>
                    {tasks.length > 1 && (
                      <TouchableOpacity onPress={() => setTasks(tasks.filter((_, j) => j !== i))}>
                        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {tasks.length < 3 && (
                  <TouchableOpacity
                    style={s.addTaskBtn}
                    onPress={() => setTasks([...tasks, { title: '', date: 'today', hour: '' }])}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                    <Text style={s.addTaskText}>+ Adicionar outra ação</Text>
                  </TouchableOpacity>
                )}

                <View style={s.actions}>
                  <TouchableOpacity style={s.skipBtn} onPress={() => setStep(1)}>
                    <Text style={s.skipText}>← Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.nextBtn, saving && s.nextBtnDisabled]}
                    onPress={() => !saving && saveTasks()}
                  >
                    <Text style={s.nextText}>{saving ? 'Salvando...' : 'Salvar Tarefas →'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 3: Agenda ── */}
            {step === 3 && (
              <View style={s.stepContent}>
                <Text style={s.hint}>
                  {createdTasks.length > 0
                    ? `Você criou ${createdTasks.length} tarefa(s). Quer adicioná-las à agenda de hoje?`
                    : 'Deseja criar um evento na agenda para trabalhar nesta meta?'}
                </Text>

                <View style={s.yesNoRow}>
                  <TouchableOpacity
                    style={[s.yesNoBtn, scheduleFlag === true && s.yesNoBtnActive]}
                    onPress={() => setScheduleFlag(true)}
                  >
                    <Ionicons name="calendar" size={20} color={scheduleFlag === true ? '#fff' : COLORS.primary} />
                    <Text style={[s.yesNoText, scheduleFlag === true && { color: '#fff' }]}>Sim, agendar!</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.yesNoBtn, scheduleFlag === false && s.yesNoBtnSkip]}
                    onPress={() => setScheduleFlag(false)}
                  >
                    <Ionicons name="remove-circle-outline" size={20} color={scheduleFlag === false ? '#fff' : COLORS.textMuted} />
                    <Text style={[s.yesNoText, scheduleFlag === false && { color: '#fff' }]}>Depois</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.actions}>
                  <TouchableOpacity style={s.skipBtn} onPress={() => setStep(2)}>
                    <Text style={s.skipText}>← Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.nextBtn, (scheduleFlag === null || saving) && s.nextBtnDisabled]}
                    onPress={() => scheduleFlag !== null && !saving && saveAgenda()}
                  >
                    <Text style={s.nextText}>
                      {saving ? 'Salvando...' : scheduleFlag ? 'Agendar →' : 'Finalizar →'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── STEP 4: Summary ── */}
            {step === 4 && (
              <View style={s.stepContent}>
                <Text style={s.summaryTitle}>🎉 Meta configurada!</Text>
                <View style={s.summaryCard}>
                  <SummaryRow icon="flag" label="Meta criada" value={goal.title} color={COLORS.primary} />
                  {createdTasks.length > 0 && (
                    <SummaryRow
                      icon="checkmark-circle"
                      label={`${createdTasks.length} tarefa(s) criada(s)`}
                      value={createdTasks.join(', ')}
                      color={COLORS.success}
                    />
                  )}
                  {createdHabit && (
                    <SummaryRow icon="repeat" label="Hábito criado" value={createdHabit} color={COLORS.warning} />
                  )}
                  {createdEvents > 0 && (
                    <SummaryRow icon="calendar" label={`${createdEvents} evento(s) agendado(s)`} value="Na sua agenda de hoje" color="#4A7A9B" />
                  )}
                  {createdTasks.length === 0 && !createdHabit && createdEvents === 0 && (
                    <Text style={s.summaryEmpty}>Você pode adicionar tarefas e hábitos a qualquer momento.</Text>
                  )}
                </View>

                <TouchableOpacity style={s.doneBtn} onPress={handleClose}>
                  <Ionicons name="rocket" size={18} color="#fff" />
                  <Text style={s.doneBtnText}>Começar agora!</Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SummaryRow({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={sr.row}>
      <View style={[sr.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={sr.text}>
        <Text style={sr.label}>{label}</Text>
        <Text style={sr.value} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase' },
  value: { fontSize: 13, color: COLORS.text, marginTop: 2 },
});

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%', paddingBottom: 32,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    padding: 20, paddingBottom: 12,
  },
  headerLeft: { flex: 1, gap: 2 },
  stepLabel: { fontSize: 10, fontWeight: '800', color: COLORS.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  goalName: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  closeBtn: { padding: 4 },
  progressBar: { height: 4, backgroundColor: COLORS.border, marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  body: { padding: 20, paddingTop: 16, gap: 16 },
  stepContent: { gap: 14 },
  hint: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  taskCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  taskNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  taskNumText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  taskFields: { flex: 1, gap: 8 },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  dateRow: { flexDirection: 'row', gap: 6 },
  dateChip: { flex: 1, paddingVertical: 7, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  dateChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  dateChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  dateChipTextActive: { color: COLORS.primary },
  addTaskBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  addTaskText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  yesNoRow: { flexDirection: 'row', gap: 10 },
  yesNoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  yesNoBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  yesNoBtnSkip: { backgroundColor: COLORS.textMuted, borderColor: COLORS.textMuted },
  yesNoText: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  habitForm: { gap: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  freqRow: { flexDirection: 'row', gap: 8 },
  freqChip: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  freqChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  freqText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  freqTextActive: { color: '#fff' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  skipBtn: { flex: 1, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  skipText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  nextBtn: { flex: 2, padding: 13, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  summaryTitle: { fontSize: 24, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 4 },
  summaryCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: 16, padding: 16, gap: 2 },
  summaryEmpty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', fontStyle: 'italic', padding: 8 },
  doneBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: COLORS.primary, borderRadius: 16, padding: 16, marginTop: 8,
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
