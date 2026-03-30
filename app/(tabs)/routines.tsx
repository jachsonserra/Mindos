import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS } from '../../src/utils/constants';
import { useHabitStore } from '../../src/stores/useHabitStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useObjectiveStore } from '../../src/stores/useObjectiveStore';
import { useSmarterGoalStore } from '../../src/stores/useSmarterGoalStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { HabitLoopCard } from '../../src/components/ui/HabitLoopCard';
import { Habit, Routine } from '../../src/types/habit.types';
import { today } from '../../src/utils/dateHelpers';
import { NotificationService } from '../../src/services/notifications/notificationService';
import { TimePicker } from '../../src/components/ui/TimePicker';

// ─── Tipos e constantes ───────────────────────────────────────────────────────

type MainTab = 'routines' | 'fire';

const ROUTINE_TYPES: { value: Routine['type']; label: string; icon: string; desc: string }[] = [
  { value: 'morning', label: 'Manhã', icon: '🌅', desc: 'Como você começa o dia' },
  { value: 'work',    label: 'Trabalho', icon: '💼', desc: 'Foco e produtividade' },
  { value: 'evening', label: 'Noite', icon: '🌙', desc: 'Descanso e revisão' },
  { value: 'custom',  label: 'Personalizada', icon: '⚡', desc: 'Rotina livre' },
];

const DAYS_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_PRESET = '1,2,3,4,5';
const ALL_DAYS_PRESET = '0,1,2,3,4,5,6';

const ROUTINE_TEMPLATES = [
  {
    title: 'Manhã Produtiva',
    type: 'morning' as Routine['type'],
    triggerTime: '06:00',
    daysOfWeek: WEEKDAYS_PRESET,
    habits: ['Hidratação (1 copo)', 'Revisar metas do dia', 'Exercício 20min'],
  },
  {
    title: 'Foco Profundo',
    type: 'work' as Routine['type'],
    triggerTime: '09:00',
    daysOfWeek: WEEKDAYS_PRESET,
    habits: ['Bloquear distrações', 'Tarefa principal (25min)', 'Revisão rápida'],
  },
  {
    title: 'Noite Tranquila',
    type: 'evening' as Routine['type'],
    triggerTime: '21:00',
    daysOfWeek: ALL_DAYS_PRESET,
    habits: ['Sem telas 30min', 'Journaling', 'Planejamento do amanhã'],
  },
];

// ─── Tela Principal ───────────────────────────────────────────────────────────

export default function RoutinesScreen() {
  const router = useRouter();
  const { user } = useUserStore();
  const {
    habits, routines, completedToday: completedTodayIds,
    completeHabit, uncompleteHabit, createHabit, updateHabit, deleteHabit,
    createRoutine, updateRoutine, deleteRoutine,
    addHabitToRoutine, removeHabitFromRoutine,
    loadData,
  } = useHabitStore();
  const { objectives } = useObjectiveStore();
  const { goals: smarterGoals } = useSmarterGoalStore();
  const { tasks, loadTasks } = useTaskStore();

  const [tab, setTab] = useState<MainTab>('routines');
  const [showTemplates, setShowTemplates] = useState(false);

  // Expandidos
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);

  // Modais
  const [showNewRoutine, setShowNewRoutine] = useState(false);
  const [showNewHabit, setShowNewHabit] = useState(false);
  const [showFireModal, setShowFireModal] = useState(false);
  const [showAddHabitToRoutine, setShowAddHabitToRoutine] = useState<string | null>(null); // routineId

  // Edit/Delete states
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);
  const [deletingRoutine, setDeletingRoutine] = useState<Routine | null>(null);
  const [habitActionTarget, setHabitActionTarget] = useState<Habit | null>(null); // para o menu de ações
  const [routineActionTarget, setRoutineActionTarget] = useState<Routine | null>(null); // para o menu de ações de rotina
  const [uncompleteTarget, setUncompleteTarget] = useState<Habit | null>(null); // confirmar reabertura de hábito

  // Criação de tarefa inline dentro de uma rotina
  const [addingTaskToRoutine, setAddingTaskToRoutine] = useState<string | null>(null);
  const [newRoutineTaskTitle, setNewRoutineTaskTitle] = useState('');

  // Estado de fogo
  const [fireHabit, setFireHabit] = useState<Habit | null>(null);
  const [fireMissedReason, setFireMissedReason] = useState('');

  // ── Form: Nova Rotina ──────────────────────────────────────────────────────
  const [rTitle, setRTitle] = useState('');
  const [rType, setRType] = useState<Routine['type']>('morning');
  const [rTime, setRTime] = useState('');
  const [rDays, setRDays] = useState(WEEKDAYS_PRESET);
  const [rStep, setRStep] = useState(1); // 1: tipo/nome, 2: horário/dias, 3: confirmar

  // ── Form: Novo Hábito ──────────────────────────────────────────────────────
  const [hTitle, setHTitle] = useState('');
  const [hImplementation, setHImplementation] = useState('');
  const [hTwoMin, setHTwoMin] = useState('');
  const [hTrigger, setHTrigger] = useState('');
  const [hReward, setHReward] = useState('');
  const [hNotifHour, setHNotifHour] = useState('');
  const [hGoalId, setHGoalId] = useState('');

  // Recarregar ao focar
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadData(user.id);
        loadTasks(user.id);
      }
    }, [user?.id])
  );

  // ─ Dados derivados ─────────────────────────────────────────────────────────
  const todayStr = today();
  // completedTodayIds vem direto da store (array de IDs já persistido no DB)
  const completedIds = new Set(completedTodayIds ?? []);
  const activeHabits = habits.filter(h => h.isActive);
  const completedToday = activeHabits.filter(h => completedIds.has(h.id));
  const pendingToday = activeHabits.filter(h => !completedIds.has(h.id));
  const progressPct = activeHabits.length > 0
    ? Math.round((completedToday.length / activeHabits.length) * 100)
    : 0;

  const activeGoals = smarterGoals.filter(g => g.status === 'active');
  const objectiveMap = Object.fromEntries(objectives.map(o => [o.id, o]));
  const goalMap = Object.fromEntries(smarterGoals.map(g => [g.id, g]));

  // Rotinas ativas do dia
  const todayDayIndex = new Date().getDay(); // 0=dom, 1=seg...
  const activeRoutines = routines.filter(r => {
    if (!r.isActive) return false;
    const days = r.daysOfWeek.split(',').map(Number);
    return days.includes(todayDayIndex);
  });

  // Hábitos avulsos (não vinculados a nenhuma rotina)
  const routineHabitIds = new Set(
    routines.flatMap(r => (r.habits ?? []).map(h => h.id))
  );
  const looseHabits = activeHabits.filter(h => !routineHabitIds.has(h.id));

  // ─ Handlers ────────────────────────────────────────────────────────────────

  async function handleCompleteHabit(habit: Habit) {
    if (!user) return;
    await completeHabit(habit.id, user.id, { date: todayStr });
  }

  async function handleUncompleteHabit(habit: Habit) {
    if (!user) return;
    setUncompleteTarget(habit);
  }

  function handleMissed(habit: Habit) {
    setFireHabit(habit);
    setFireMissedReason('');
    setShowFireModal(true);
  }

  function resetRoutineForm() {
    setRTitle(''); setRType('morning'); setRTime('');
    setRDays(WEEKDAYS_PRESET); setRStep(1);
    setShowNewRoutine(false);
  }

  function resetHabitForm() {
    setHTitle(''); setHImplementation(''); setHTwoMin('');
    setHTrigger(''); setHReward(''); setHNotifHour(''); setHGoalId('');
    setShowNewHabit(false);
    setEditingHabit(null);
  }

  function openEditHabit(habit: Habit) {
    setHTitle(habit.title);
    setHImplementation(habit.implementation ?? '');
    setHTwoMin(habit.twoMinuteVersion ?? '');
    setHTrigger(habit.trigger ?? '');
    setHReward(habit.reward ?? '');
    setHNotifHour(habit.notificationHour ?? '');
    setHGoalId(habit.relatedGoalId ?? '');
    setEditingHabit(habit);
    setShowNewHabit(true);
    setHabitActionTarget(null);
  }

  function openEditRoutine(routine: Routine) {
    setRTitle(routine.title);
    setRType(routine.type);
    setRTime(routine.triggerTime ?? '');
    setRDays(routine.daysOfWeek);
    setRStep(1);
    setEditingRoutine(routine);
    setShowNewRoutine(true);
  }

  function resetRoutineEditForm() {
    setEditingRoutine(null);
    setShowNewRoutine(false);
    setRTitle(''); setRType('morning'); setRTime(''); setRDays(WEEKDAYS_PRESET); setRStep(1);
  }

  async function handleCreateRoutine() {
    if (!user || !rTitle.trim()) return;
    await createRoutine({
      userId: user.id,
      title: rTitle.trim(),
      type: rType,
      triggerTime: rTime.trim() || undefined,
      daysOfWeek: rDays,
      isActive: true,
      phase: 1,
      xpBonus: 20,
      orderIndex: routines.length,
    });
    resetRoutineForm();
  }

  async function handleCreateFromTemplate(tpl: typeof ROUTINE_TEMPLATES[0]) {
    if (!user) return;
    const routine = await createRoutine({
      userId: user.id,
      title: tpl.title,
      type: tpl.type,
      triggerTime: tpl.triggerTime,
      daysOfWeek: tpl.daysOfWeek,
      isActive: true,
      phase: 1,
      xpBonus: 20,
      orderIndex: routines.length,
    });
    Alert.alert(
      `✅ "${tpl.title}" criada!`,
      `Ela já aparece na aba Rotinas. Agora adicione seus hábitos clicando em "+ Hábito" na rotina.`
    );
  }

  async function handleCreateHabit() {
    if (!user || !hTitle.trim()) return;
    if (editingHabit) {
      // Editar hábito existente
      await updateHabit(editingHabit.id, {
        title: hTitle.trim(),
        implementation: hImplementation.trim() || undefined,
        twoMinuteVersion: hTwoMin.trim() || undefined,
        trigger: hTrigger.trim() || undefined,
        reward: hReward.trim() || undefined,
        notificationHour: hNotifHour.trim() || undefined,
        relatedGoalId: hGoalId || undefined,
      } as any);
    } else {
      // Criar novo hábito
      const created = await createHabit({
        userId: user.id,
        title: hTitle.trim(),
        category: 'custom',
        phase: 1,
        toolType: 'custom',
        xpReward: 10,
        isActive: true,
        orderIndex: habits.length,
        neverMissCount: 0,
        implementation: hImplementation.trim() || undefined,
        twoMinuteVersion: hTwoMin.trim() || undefined,
        trigger: hTrigger.trim() || undefined,
        reward: hReward.trim() || undefined,
        notificationHour: hNotifHour.trim() || undefined,
        relatedGoalId: hGoalId || undefined,
      });
      if (hNotifHour.trim() && created) {
        try {
          await NotificationService.scheduleHabitReminder(created.id, created.title, hNotifHour.trim());
        } catch (e) { /* silencioso */ }
      }
    }
    resetHabitForm();
  }

  async function handleSaveRoutine() {
    if (!user || !rTitle.trim()) return;
    if (editingRoutine) {
      await updateRoutine(editingRoutine.id, {
        title: rTitle.trim(),
        type: rType,
        triggerTime: rTime.trim() || undefined,
        daysOfWeek: rDays,
      });
      resetRoutineEditForm();
    } else {
      await handleCreateRoutine();
    }
  }

  async function handleCreateRoutineTask(routineId: string) {
    if (!user || !newRoutineTaskTitle.trim()) return;
    const { createTask } = useTaskStore.getState();
    await createTask({
      userId: user.id,
      routineId,
      title: newRoutineTaskTitle.trim(),
      isCompleted: false,
      rewardUnlocked: false,
      status: 'pending',
      orderIndex: 0,
      isPareto: false,
      scheduledDate: todayStr,
    });
    setNewRoutineTaskTitle('');
    setAddingTaskToRoutine(null);
    // Recarrega tasks
    loadTasks(user.id);
  }

  async function handleDeleteRoutine(routine: Routine) {
    setDeletingRoutine(routine);
  }

  async function handleDeleteHabit(habit: Habit) {
    setHabitActionTarget(null);
    setDeletingHabit(habit);
  }


  function toggleDay(dayIndex: number) {
    const current = rDays.split(',').filter(Boolean).map(Number);
    const next = current.includes(dayIndex)
      ? current.filter(d => d !== dayIndex)
      : [...current, dayIndex].sort();
    setRDays(next.join(','));
  }

  function getRoutineIcon(type: Routine['type']) {
    return ROUTINE_TYPES.find(t => t.value === type)?.icon ?? '⚡';
  }

  function formatDays(daysOfWeek: string): string {
    const days = daysOfWeek.split(',').map(Number);
    if (days.length === 7) return 'Todos os dias';
    if (JSON.stringify(days) === JSON.stringify([1,2,3,4,5])) return 'Seg–Sex';
    if (JSON.stringify(days) === JSON.stringify([0,6])) return 'Fim de semana';
    return days.map(d => DAYS_LABELS[d]).join(', ');
  }

  // ─ Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Rotinas</Text>
          <Text style={s.subtitle} numberOfLines={1}>
            {completedToday.length}/{activeHabits.length} hábitos · {progressPct}% hoje
          </Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => tab === 'routines' ? setShowNewRoutine(true) : setShowNewHabit(true)}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Barra de progresso */}
      <View style={s.progressWrap}>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
        </View>
        <Text style={s.progressPct}>{progressPct}%</Text>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {/* Aba Rotinas */}
        <TouchableOpacity
          style={[s.tab, tab === 'routines' && s.tabActive]}
          onPress={() => setTab('routines')}
        >
          <Text style={[s.tabText, tab === 'routines' && s.tabTextActive]}>🗂 Rotinas</Text>
        </TouchableOpacity>

        {/* Aba Fogo — com badge de hábitos pendentes */}
        <TouchableOpacity
          style={[
            s.tab,
            tab === 'fire' && s.tabActive,
            tab !== 'fire' && pendingToday.length > 0 && s.tabFireUrgent,
          ]}
          onPress={() => setTab('fire')}
        >
          <View style={s.tabFireRow}>
            <Text style={[
              s.tabText,
              tab === 'fire' && s.tabTextActive,
              tab !== 'fire' && pendingToday.length > 0 && s.tabFireUrgentText,
            ]}>🔥 Fogo</Text>
            {pendingToday.length > 0 && tab !== 'fire' && (
              <View style={s.fireBadge}>
                <Text style={s.fireBadgeText}>{pendingToday.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ══════════ ABA: ROTINAS ══════════ */}
        {tab === 'routines' && (
          <>
            {/* Dica de fluxo */}
            <View style={s.flowHint}>
              <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} />
              <Text style={s.flowHintText}>
                Rotinas são moldes de dia. Adicione hábitos e tarefas em cada bloco (manhã, trabalho, noite).
              </Text>
            </View>

            {/* Rotinas ativas */}
            {routines.filter(r => r.isActive).length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="time-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyTitle}>Nenhuma rotina criada</Text>
                <Text style={s.emptyText}>Crie sua primeira rotina ou use um template abaixo.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowNewRoutine(true)}>
                  <Text style={s.emptyBtnText}>+ Criar rotina</Text>
                </TouchableOpacity>
              </View>
            ) : (
              routines.filter(r => r.isActive).map(routine => {
                const isOpen = expandedRoutine === routine.id;
                const routineHabits = routine.habits ?? [];
                const doneCount = routineHabits.filter(h => completedIds.has(h.id)).length;
                const isActiveToday = activeRoutines.some(r => r.id === routine.id);

                return (
                  <View key={routine.id} style={[s.routineCard, isActiveToday && s.routineCardActive]}>
                    {/* Header */}
                    <View style={s.routineHeaderRow}>
                      <TouchableOpacity
                        style={s.routineHeaderTouch}
                        onPress={() => setExpandedRoutine(isOpen ? null : routine.id)}
                      >
                        <View style={s.routineIconWrap}>
                          <Text style={s.routineIconText}>{getRoutineIcon(routine.type)}</Text>
                        </View>
                        <View style={s.routineInfo}>
                          <View style={s.routineTitleRow}>
                            <Text style={s.routineTitle}>{routine.title}</Text>
                            {isActiveToday && (
                              <View style={s.activeBadge}>
                                <Text style={s.activeBadgeText}>Hoje</Text>
                              </View>
                            )}
                          </View>
                          <Text style={s.routineMeta}>
                            {routine.triggerTime ? `${routine.triggerTime} · ` : ''}
                            {formatDays(routine.daysOfWeek)}
                            {routineHabits.length > 0 ? ` · ${doneCount}/${routineHabits.length} feitos` : ''}
                          </Text>
                        </View>
                        <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={s.menuBtn}
                        onPress={() => setRoutineActionTarget(routine)}
                      >
                        <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Barra de progresso da rotina */}
                    {routineHabits.length > 0 && (
                      <View style={s.routineProgress}>
                        <View style={s.routineProgressTrack}>
                          <View style={[
                            s.routineProgressFill,
                            { width: `${Math.round((doneCount / routineHabits.length) * 100)}%` as any },
                          ]} />
                        </View>
                      </View>
                    )}

                    {/* Expandido */}
                    {isOpen && (
                      <View style={s.routineBody}>
                        {routineHabits.length === 0 ? (
                          <Text style={s.routineEmptyHabits}>
                            Nenhum hábito nesta rotina ainda. Adicione abaixo.
                          </Text>
                        ) : (
                          routineHabits.map((h, idx) => {
                            const isDone = completedIds.has(h.id);
                            return (
                              <View key={h.id} style={s.routineHabitRow}>
                                <View style={[s.routineHabitNum, isDone && s.routineHabitNumDone]}>
                                  {isDone
                                    ? <Ionicons name="checkmark" size={12} color="#fff" />
                                    : <Text style={s.routineHabitNumText}>{idx + 1}</Text>
                                  }
                                </View>
                                <TouchableOpacity
                                  style={{ flex: 1 }}
                                  onPress={() => isDone ? handleUncompleteHabit(h) : handleCompleteHabit(h)}
                                >
                                  <Text style={[s.routineHabitTitle, isDone && s.routineHabitTitleDone]}>
                                    {h.title}
                                  </Text>
                                  {h.twoMinuteVersion && !isDone && (
                                    <Text style={s.routineHabitHint}>⏱ {h.twoMinuteVersion}</Text>
                                  )}
                                  {isDone && (
                                    <Text style={s.routineHabitReopenHint}>Toque para reabrir</Text>
                                  )}
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => setHabitActionTarget(h)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                >
                                  <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}

                        {/* Seção de tarefas vinculadas */}
                        {(() => {
                          const routineTasks = tasks.filter(t => t.routineId === routine.id && t.status !== 'cancelled');
                          return (
                            <View style={{ marginTop: 12 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <Text style={s.routineSectionLabel}>✅ Tarefas ({routineTasks.length})</Text>
                                <TouchableOpacity onPress={() => {
                                  setAddingTaskToRoutine(routine.id);
                                  setNewRoutineTaskTitle('');
                                }}>
                                  <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                                </TouchableOpacity>
                              </View>

                              {routineTasks.map(t => (
                                <View key={t.id} style={s.routineTaskRow}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      if (t.isCompleted) return;
                                      const { completeTask: ct } = useTaskStore.getState();
                                      ct(t.id);
                                      loadTasks(user!.id);
                                    }}
                                  >
                                    <View style={[s.routineHabitNum, t.isCompleted && s.routineHabitNumDone]}>
                                      {t.isCompleted
                                        ? <Ionicons name="checkmark" size={12} color="#fff" />
                                        : <Ionicons name="square-outline" size={12} color={COLORS.textMuted} />
                                      }
                                    </View>
                                  </TouchableOpacity>
                                  <Text style={[s.routineHabitTitle, t.isCompleted && s.routineHabitTitleDone, { flex: 1 }]} numberOfLines={1}>
                                    {t.title}
                                  </Text>
                                  {!!t.scheduledHour && (
                                    <Text style={{ fontSize: 11, color: COLORS.textMuted }}>{t.scheduledHour}</Text>
                                  )}
                                </View>
                              ))}

                              {/* Inline input para nova tarefa */}
                              {addingTaskToRoutine === routine.id && (
                                <View style={s.routineTaskInput}>
                                  <TextInput
                                    style={s.routineTaskInputField}
                                    placeholder="Nome da tarefa..."
                                    placeholderTextColor={COLORS.textMuted}
                                    value={newRoutineTaskTitle}
                                    onChangeText={setNewRoutineTaskTitle}
                                    autoFocus
                                    onSubmitEditing={() => handleCreateRoutineTask(routine.id)}
                                  />
                                  <TouchableOpacity
                                    style={[s.routineTaskSave, !newRoutineTaskTitle.trim() && { opacity: 0.4 }]}
                                    onPress={() => handleCreateRoutineTask(routine.id)}
                                  >
                                    <Ionicons name="checkmark" size={16} color="#fff" />
                                  </TouchableOpacity>
                                  <TouchableOpacity onPress={() => setAddingTaskToRoutine(null)} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={16} color={COLORS.textMuted} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })()}

                        {/* Botões de ação */}
                        <View style={s.routineActions}>
                          <TouchableOpacity
                            style={s.routineActionBtn}
                            onPress={() => setShowAddHabitToRoutine(routine.id)}
                          >
                            <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
                            <Text style={s.routineActionText}>+ Hábito</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Templates prontos — colapsável */}
            <TouchableOpacity
              style={s.templateToggleBtn}
              onPress={() => setShowTemplates(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={s.templateToggleText}>⚡ Templates prontos</Text>
              <Ionicons name={showTemplates ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.primary} />
            </TouchableOpacity>
            {showTemplates && (
              <View style={s.templateSection}>
                <Text style={s.templateSubtitle}>Toque em um template para importar</Text>
                {ROUTINE_TEMPLATES.map((tpl, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={s.templateCard}
                    onPress={() => { handleCreateFromTemplate(tpl); setShowTemplates(false); }}
                  >
                    <View style={s.templateLeft}>
                      <Text style={s.templateIcon}>{ROUTINE_TYPES.find(t => t.value === tpl.type)?.icon}</Text>
                      <View>
                        <Text style={s.templateName}>{tpl.title}</Text>
                        <Text style={s.templateMeta}>
                          {tpl.triggerTime} · {formatDays(tpl.daysOfWeek)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Hábitos Avulsos */}
            {looseHabits.length > 0 && (
              <View style={s.looseSection}>
                <View style={s.looseSectionHeader}>
                  <Text style={s.looseSectionTitle}>⚡ Hábitos Avulsos</Text>
                  <Text style={s.looseSectionSub}>
                    {looseHabits.filter(h => completedIds.has(h.id)).length}/{looseHabits.length} feitos
                  </Text>
                </View>
                {looseHabits.map(h => {
                  const isDone = completedIds.has(h.id);
                  const relatedGoal = h.relatedGoalId ? goalMap[h.relatedGoalId] : null;
                  return (
                    <View key={h.id} style={[s.looseHabitCard, isDone && s.looseHabitCardDone]}>
                      <TouchableOpacity
                        style={s.looseHabitRow}
                        onPress={() => isDone ? handleUncompleteHabit(h) : handleCompleteHabit(h)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.looseHabitCheck, isDone && { backgroundColor: COLORS.success, borderColor: COLORS.success }]}>
                          {isDone && <Ionicons name="checkmark" size={14} color="#fff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.looseHabitTitle, isDone && s.looseHabitTitleDone]}>{h.title}</Text>
                          {relatedGoal && (
                            <Text style={[s.looseHabitGoal, { color: relatedGoal.color ?? COLORS.primary }]}>
                              🎯 {relatedGoal.title}
                            </Text>
                          )}
                        </View>
                        <Text style={s.looseHabitStreak}>🔥 {h.streakCount}</Text>
                      </TouchableOpacity>
                      {/* Botão ações */}
                      <TouchableOpacity
                        style={{ paddingHorizontal: 10, paddingVertical: 8 }}
                        onPress={() => setHabitActionTarget(h)}
                      >
                        <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ══════════ ABA: FOGO ══════════ */}
        {tab === 'fire' && (
          <>
            <View style={[s.infoCard, { borderLeftColor: COLORS.error }]}>
              <Text style={[s.infoTitle, { color: COLORS.error }]}>🔥 Sistema do Fogo</Text>
              <Text style={s.infoText}>
                Quando você não conclui, use a <Text style={s.bold}>raiva construtiva</Text> — não de você, mas <Text style={s.bold}>pela situação</Text>. Escreva por que ficou com raiva de não ter feito. Isso vira combustível para amanhã.
              </Text>
            </View>

            {activeHabits.length === 0 && (
              <View style={s.empty}>
                <Text style={s.emptyTitle}>Crie hábitos primeiro</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => setShowNewHabit(true)}>
                  <Text style={s.emptyBtnText}>+ Novo hábito</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeHabits.map(h => {
              const isDone = completedIds.has(h.id);
              const relatedGoal = h.relatedGoalId ? goalMap[h.relatedGoalId] : null;
              return (
                <View key={h.id} style={[s.fireCard, isDone && { borderLeftColor: COLORS.success }]}>
                  <View style={s.fireCardRow}>
                    <Ionicons
                      name={isDone ? 'checkmark-circle' : 'flame'}
                      size={22}
                      color={isDone ? COLORS.success : COLORS.error}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.habitTitle}>{h.title}</Text>
                      {relatedGoal && (
                        <Text style={[s.habitGoalText, { color: relatedGoal.color ?? COLORS.primary }]}>
                          🎯 {relatedGoal.title}
                        </Text>
                      )}
                    </View>
                    <Text style={s.habitStreak}>🔥 {h.streakCount}</Text>
                    <TouchableOpacity
                      onPress={() => setHabitActionTarget(h)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {!isDone && (
                    <TouchableOpacity style={s.fireBtn} onPress={() => handleMissed(h)}>
                      <Text style={s.fireBtnText}>Registrar raiva construtiva 🔥</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ══════ MODAL: Nova Rotina ══════ */}
      <Modal visible={showNewRoutine} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={s.modal}>
              <View style={s.modalHeaderRow}>
                <Text style={s.modalTitle}>{editingRoutine ? 'Editar Rotina' : 'Nova Rotina'}</Text>
                <View style={s.stepPills}>
                  {[1,2,3].map(n => (
                    <View key={n} style={[s.stepPill, n <= rStep && s.stepPillActive]}>
                      <Text style={[s.stepPillText, n <= rStep && s.stepPillTextActive]}>{n}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Passo 1: tipo + nome */}
              {rStep === 1 && (
                <View style={s.formStep}>
                  <Text style={s.formQuestion}>Qual tipo de rotina?</Text>
                  <View style={s.typeGrid}>
                    {ROUTINE_TYPES.map(t => (
                      <TouchableOpacity
                        key={t.value}
                        style={[s.typeCard, rType === t.value && s.typeCardActive]}
                        onPress={() => setRType(t.value)}
                      >
                        <Text style={s.typeIcon}>{t.icon}</Text>
                        <Text style={[s.typeLabel, rType === t.value && s.typeLabelActive]}>{t.label}</Text>
                        <Text style={s.typeDesc}>{t.desc}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={s.formQuestion}>Nome da rotina</Text>
                  <TextInput
                    style={s.input}
                    placeholder={`Ex: ${ROUTINE_TYPES.find(t => t.value === rType)?.label} de Alta Performance`}
                    placeholderTextColor={COLORS.textMuted}
                    value={rTitle}
                    onChangeText={setRTitle}
                  />
                </View>
              )}

              {/* Passo 2: horário + dias */}
              {rStep === 2 && (
                <View style={s.formStep}>
                  <Text style={s.formQuestion}>Qual horário começa?</Text>
                  <TimePicker value={rTime} onChange={setRTime} placeholder="Sem horário fixo" />

                  <Text style={s.formQuestion}>Quais dias da semana?</Text>
                  <View style={s.daysRow}>
                    {[0,1,2,3,4,5,6].map(d => {
                      const active = rDays.split(',').filter(Boolean).map(Number).includes(d);
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[s.dayChip, active && s.dayChipActive]}
                          onPress={() => toggleDay(d)}
                        >
                          <Text style={[s.dayChipText, active && s.dayChipTextActive]}>
                            {DAYS_LABELS[d]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <View style={s.daysPresets}>
                    <TouchableOpacity
                      style={[s.presetBtn, rDays === WEEKDAYS_PRESET && s.presetBtnActive]}
                      onPress={() => setRDays(WEEKDAYS_PRESET)}
                    >
                      <Text style={[s.presetBtnText, rDays === WEEKDAYS_PRESET && s.presetBtnTextActive]}>Seg–Sex</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.presetBtn, rDays === ALL_DAYS_PRESET && s.presetBtnActive]}
                      onPress={() => setRDays(ALL_DAYS_PRESET)}
                    >
                      <Text style={[s.presetBtnText, rDays === ALL_DAYS_PRESET && s.presetBtnTextActive]}>Todos</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.presetBtn, rDays === '0,6' && s.presetBtnActive]}
                      onPress={() => setRDays('0,6')}
                    >
                      <Text style={[s.presetBtnText, rDays === '0,6' && s.presetBtnTextActive]}>Fim de semana</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Passo 3: confirmação */}
              {rStep === 3 && (
                <View style={s.formStep}>
                  <Text style={s.formQuestion}>Confirme sua rotina</Text>
                  <View style={s.previewRoutineCard}>
                    <Text style={s.previewRoutineIcon}>{getRoutineIcon(rType)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.previewRoutineTitle}>{rTitle || 'Sem nome'}</Text>
                      <Text style={s.previewRoutineMeta}>
                        {rTime ? `${rTime} · ` : ''}{formatDays(rDays)}
                      </Text>
                    </View>
                  </View>
                  <View style={s.nextStepHint}>
                    <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
                    <Text style={s.nextStepHintText}>
                      Após criar, adicione hábitos e tarefas dentro desta rotina.
                    </Text>
                  </View>
                </View>
              )}

              <View style={s.modalActions}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={rStep === 1 ? resetRoutineForm : () => setRStep(rStep - 1)}
                >
                  <Text style={s.cancelText}>{rStep === 1 ? 'Cancelar' : '← Voltar'}</Text>
                </TouchableOpacity>
                {rStep < 3 ? (
                  <TouchableOpacity
                    style={[s.saveBtn, !rTitle.trim() && rStep === 1 && s.saveBtnDisabled]}
                    onPress={() => setRStep(rStep + 1)}
                    disabled={rStep === 1 && !rTitle.trim()}
                  >
                    <Text style={s.saveBtnText}>Continuar →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.saveBtn} onPress={handleSaveRoutine}>
                    <Text style={s.saveBtnText}>{editingRoutine ? 'Salvar ✅' : 'Criar Rotina ✅'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ MODAL: Novo / Editar Hábito ══════ */}
      <Modal visible={showNewHabit} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={s.modal}>
              <Text style={s.modalTitle}>{editingHabit ? 'Editar Hábito' : 'Novo Hábito'}</Text>
              <Text style={s.modalHint}>Comece pela versão de 2 minutos. 1% todo dia.</Text>

              <TextInput
                style={s.input}
                placeholder="Nome do hábito (ex: Meditar 10 min)"
                placeholderTextColor={COLORS.textMuted}
                value={hTitle} onChangeText={setHTitle}
              />

              {/* Vincular a meta */}
              {activeGoals.length > 0 && (
                <>
                  <Text style={s.fieldLabel}>Vincular a uma meta (opcional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                      <TouchableOpacity
                        style={[s.goalChip, !hGoalId && s.goalChipActive]}
                        onPress={() => setHGoalId('')}
                      >
                        <Text style={[s.goalChipText, !hGoalId && s.goalChipTextActive]}>Nenhuma</Text>
                      </TouchableOpacity>
                      {activeGoals.map(g => (
                        <TouchableOpacity
                          key={g.id}
                          style={[s.goalChip, hGoalId === g.id && s.goalChipActive,
                            { borderColor: g.color ?? COLORS.border }]}
                          onPress={() => setHGoalId(g.id === hGoalId ? '' : g.id)}
                        >
                          <View style={[s.goalDot, { backgroundColor: g.color ?? COLORS.primary }]} />
                          <Text style={[s.goalChipText, hGoalId === g.id && s.goalChipTextActive]} numberOfLines={1}>
                            {g.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </>
              )}

              <TextInput
                style={[s.input, s.inputMulti]}
                placeholder={'Implementation Intention:\n"Eu vou [AÇÃO] às [HORA] em [LOCAL]"'}
                placeholderTextColor={COLORS.textMuted}
                value={hImplementation} onChangeText={setHImplementation}
                multiline
              />
              <TextInput
                style={s.input}
                placeholder="Versão de 2 minutos (ex: Só abrir o livro)"
                placeholderTextColor={COLORS.textMuted}
                value={hTwoMin} onChangeText={setHTwoMin}
              />
              <TextInput
                style={s.input}
                placeholder="Gatilho (o que vai disparar?)"
                placeholderTextColor={COLORS.textMuted}
                value={hTrigger} onChangeText={setHTrigger}
              />
              <TextInput
                style={s.input}
                placeholder="Recompensa após concluir"
                placeholderTextColor={COLORS.textMuted}
                value={hReward} onChangeText={setHReward}
              />

              <Text style={s.fieldLabel}>Horário de notificação (opcional)</Text>
              <TimePicker value={hNotifHour} onChange={setHNotifHour} placeholder="Sem notificação" />

              <View style={s.modalActions}>
                <TouchableOpacity style={s.cancelBtn} onPress={resetHabitForm}>
                  <Text style={s.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, !hTitle.trim() && s.saveBtnDisabled]}
                  onPress={handleCreateHabit}
                  disabled={!hTitle.trim()}
                >
                  <Text style={s.saveBtnText}>{editingHabit ? 'Salvar' : 'Criar Hábito'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ MODAL: Adicionar hábito existente à rotina ══════ */}
      <Modal visible={!!showAddHabitToRoutine} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Adicionar Hábito à Rotina</Text>
            <Text style={s.modalHint}>Selecione um hábito existente ou crie um novo.</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {activeHabits.length === 0 ? (
                <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 20 }}>
                  Nenhum hábito ativo. Crie um primeiro na aba Hábitos.
                </Text>
              ) : (
                activeHabits.map(h => {
                  const routineId = showAddHabitToRoutine!;
                  const routine = routines.find(r => r.id === routineId);
                  const alreadyAdded = routine?.habits?.some(rh => rh.id === h.id);
                  return (
                    <TouchableOpacity
                      key={h.id}
                      style={[s.addHabitRow, alreadyAdded && s.addHabitRowDone]}
                      onPress={() => {
                        if (!alreadyAdded) {
                          addHabitToRoutine(routineId, h.id);
                        }
                      }}
                    >
                      <Ionicons
                        name={alreadyAdded ? 'checkmark-circle' : 'add-circle-outline'}
                        size={22}
                        color={alreadyAdded ? COLORS.success : COLORS.primary}
                      />
                      <Text style={s.addHabitTitle}>{h.title}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAddHabitToRoutine(null)}>
                <Text style={s.cancelText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.saveBtn}
                onPress={() => { setShowAddHabitToRoutine(null); setShowNewHabit(true); }}
              >
                <Text style={s.saveBtnText}>+ Novo hábito</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ MODAL: Raiva Construtiva ══════ */}
      <Modal visible={showFireModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modal}>
            <Text style={[s.modalTitle, { color: COLORS.error }]}>🔥 Raiva Construtiva</Text>
            <Text style={s.modalHint}>
              "{fireHabit?.title}" — Por que você sente raiva de não ter feito? Não é punição, é combustível para amanhã.
            </Text>
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder="Escreva o que sente... Isso vai te motivar amanhã."
              placeholderTextColor={COLORS.textMuted}
              value={fireMissedReason}
              onChangeText={setFireMissedReason}
              multiline autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowFireModal(false)}>
                <Text style={s.cancelText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: COLORS.error }, !fireMissedReason.trim() && s.saveBtnDisabled]}
                onPress={() => {
                  setShowFireModal(false);
                  Alert.alert('🔥 Guardado!', 'Amanhã você vai fazer. Sem miss duas vezes consecutivas.');
                }}
                disabled={!fireMissedReason.trim()}
              >
                <Text style={s.saveBtnText}>Guardar 🔥</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ══════ MODAL: Menu de Ações do Hábito ══════ */}
      <Modal visible={!!habitActionTarget} transparent animationType="fade">
        <TouchableOpacity
          style={s.actionOverlay}
          activeOpacity={1}
          onPress={() => setHabitActionTarget(null)}
        >
          <View style={s.actionSheet}>
            <Text style={s.actionSheetTitle} numberOfLines={1}>{habitActionTarget?.title}</Text>
            <TouchableOpacity
              style={s.actionSheetBtn}
              onPress={() => {
                if (!habitActionTarget) return;
                setHabitActionTarget(null);
                router.push({ pathname: '/(tabs)/habit-detail', params: { habitId: habitActionTarget.id } } as any);
              }}
            >
              <Ionicons name="bar-chart-outline" size={20} color={COLORS.primary} />
              <Text style={[s.actionSheetBtnText, { color: COLORS.primary }]}>Ver histórico e stats</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionSheetBtn}
              onPress={() => habitActionTarget && openEditHabit(habitActionTarget)}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
              <Text style={s.actionSheetBtnText}>Editar hábito</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionSheetBtn}
              onPress={() => habitActionTarget && handleDeleteHabit(habitActionTarget)}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[s.actionSheetBtnText, { color: COLORS.error }]}>Excluir hábito</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionSheetBtn, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 }]} onPress={() => setHabitActionTarget(null)}>
              <Text style={[s.actionSheetBtnText, { color: COLORS.textSecondary, textAlign: 'center', width: '100%' }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════ MODAL: Confirmar reabertura de hábito ══════ */}
      <Modal visible={!!uncompleteTarget} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={s.actionSheetTitle}>↩️ Reabrir hábito?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              Marcar "{uncompleteTarget?.title}" como não concluído hoje?
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setUncompleteTarget(null)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { flex: 1 }]} onPress={() => {
                if (uncompleteTarget && user) uncompleteHabit(uncompleteTarget.id, user.id);
                setUncompleteTarget(null);
              }}>
                <Text style={s.saveBtnText}>Reabrir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Menu de ações de Rotina (substitui Alert.alert) ══════ */}
      <Modal visible={!!routineActionTarget} transparent animationType="fade">
        <TouchableOpacity style={s.actionOverlay} activeOpacity={1} onPress={() => setRoutineActionTarget(null)}>
          <View style={s.actionSheet}>
            <Text style={s.actionSheetTitle} numberOfLines={1}>{routineActionTarget?.title}</Text>
            <TouchableOpacity style={s.actionSheetBtn} onPress={() => {
              if (routineActionTarget) openEditRoutine(routineActionTarget);
              setRoutineActionTarget(null);
            }}>
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
              <Text style={s.actionSheetBtnText}>✏️ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionSheetBtn} onPress={() => {
              if (routineActionTarget) updateRoutine(routineActionTarget.id, { isActive: !routineActionTarget.isActive });
              setRoutineActionTarget(null);
            }}>
              <Ionicons name={routineActionTarget?.isActive ? 'pause-circle-outline' : 'play-circle-outline'} size={20} color={COLORS.textSecondary} />
              <Text style={s.actionSheetBtnText}>{routineActionTarget?.isActive ? '⏸ Desativar' : '▶️ Ativar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionSheetBtn} onPress={() => {
              if (routineActionTarget) setDeletingRoutine(routineActionTarget);
              setRoutineActionTarget(null);
            }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[s.actionSheetBtnText, { color: COLORS.error }]}>🗑 Excluir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionSheetBtn, { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4 }]}
              onPress={() => setRoutineActionTarget(null)}>
              <Text style={[s.actionSheetBtnText, { color: COLORS.textSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════ MODAL: Confirmar Delete de Hábito ══════ */}
      <Modal visible={!!deletingHabit} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 16 }]}>
            <Text style={s.actionSheetTitle}>Excluir hábito?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              "{deletingHabit?.title}" será excluído permanentemente. O histórico será perdido.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[s.cancelBtn, { flex: 1 }]}
                onPress={() => setDeletingHabit(null)}
              >
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={() => {
                  if (deletingHabit) deleteHabit(deletingHabit.id);
                  setDeletingHabit(null);
                }}
              >
                <Text style={s.saveBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Confirmar Delete de Rotina ══════ */}
      <Modal visible={!!deletingRoutine} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 16 }]}>
            <Text style={s.actionSheetTitle}>Excluir rotina?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              "{deletingRoutine?.title}" será excluída. Os hábitos vinculados não serão apagados.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[s.cancelBtn, { flex: 1 }]}
                onPress={() => setDeletingRoutine(null)}
              >
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={() => {
                  if (deletingRoutine) deleteRoutine(deletingRoutine.id);
                  setDeletingRoutine(null);
                }}
              >
                <Text style={s.saveBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 8, gap: 12,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Progress
  progressWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 12, gap: 10,
  },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
  progressPct: { fontSize: 12, fontWeight: '700', color: COLORS.primary, width: 36, textAlign: 'right' },

  // Tabs
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 12, gap: 6 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabFireUrgent: { backgroundColor: '#2d1a00', borderWidth: 1, borderColor: '#f97316' },
  tabFireRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff' },
  tabFireUrgentText: { color: '#f97316' },
  fireBadge: {
    backgroundColor: '#f97316',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  fireBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  // Flow hint
  flowHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: `${COLORS.primary}10`, borderRadius: 10, padding: 10, marginBottom: 12,
  },
  flowHintText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },

  // Empty
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '600' },

  // ── Routines ──
  routineCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 12, overflow: 'hidden',
  },
  routineCardActive: { borderWidth: 1.5, borderColor: `${COLORS.primary}50` },
  routineHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  routineHeaderTouch: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  routineIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center',
  },
  routineIconText: { fontSize: 20 },
  routineInfo: { flex: 1 },
  routineTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routineTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  routineMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  activeBadge: { backgroundColor: `${COLORS.primary}20`, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
  menuBtn: { padding: 12 },
  routineProgress: { paddingHorizontal: 14, paddingBottom: 8 },
  routineProgressTrack: { height: 3, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' },
  routineProgressFill: { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
  routineBody: { padding: 14, paddingTop: 4, gap: 8 },
  routineEmptyHabits: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: 8 },
  routineHabitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  routineHabitNum: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  routineHabitNumDone: { backgroundColor: COLORS.success },
  routineHabitNumText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  routineHabitTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  routineHabitTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  routineHabitHint: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  routineHabitReopenHint: { fontSize: 10, color: COLORS.textMuted, marginTop: 1, fontStyle: 'italic' },
  routineActions: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  routineActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  routineActionText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Routine task section
  routineSectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  routineTaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 5,
  },
  routineTaskInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceAlt, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: `${COLORS.primary}40`,
    marginTop: 4,
  },
  routineTaskInputField: {
    flex: 1, fontSize: 13, color: COLORS.text, paddingVertical: 2,
  },
  routineTaskSave: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Templates
  templateToggleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: `${COLORS.primary}10`, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
  },
  templateToggleText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  templateSection: { marginTop: 8, gap: 8 },
  templateTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  templateSubtitle: { fontSize: 12, color: COLORS.textSecondary },
  templateCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  templateLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  templateIcon: { fontSize: 24 },
  templateName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  templateMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // ── Habits ──
  habitSection: { marginBottom: 12 },
  habitSectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  habitCard: { backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  habitCardDone: { opacity: 0.65 },
  habitCardRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  habitCheck: { width: 32, alignItems: 'center' },
  habitTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  habitTitleDone: { fontSize: 14, fontWeight: '600', color: COLORS.textMuted, textDecorationLine: 'line-through', flex: 1 },
  habitGoalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  habitGoalText: { fontSize: 11, fontWeight: '600', maxWidth: 200 },
  habitTwoMin: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  habitStreak: { fontSize: 12, fontWeight: '700', color: COLORS.warning },
  habitRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  habitImpl: {
    padding: 12, paddingTop: 0, gap: 4,
    backgroundColor: `${COLORS.primary}08`,
  },
  habitImplLabel: { fontSize: 10, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase' },
  habitImplText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic' },

  // Motivacional
  motivCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: `${COLORS.primary}12`, borderRadius: 12, padding: 14,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginTop: 8,
  },
  motivText: { flex: 1, fontSize: 13, color: COLORS.text, fontStyle: 'italic', lineHeight: 18 },

  // Fire
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 6,
    borderLeftWidth: 3, borderLeftColor: COLORS.primary, marginBottom: 12,
  },
  infoTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  infoText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  bold: { fontWeight: '700', color: COLORS.text },
  fireCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, gap: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: COLORS.error,
  },
  fireCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fireBtn: {
    backgroundColor: `${COLORS.error}12`, borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: `${COLORS.error}30`,
  },
  fireBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.error },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 14, maxHeight: '92%',
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: -6 },

  // Steps
  stepPills: { flexDirection: 'row', gap: 6 },
  stepPill: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  stepPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepPillText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  stepPillTextActive: { color: '#fff' },

  // Form
  formStep: { gap: 14 },
  formQuestion: { fontSize: 15, fontWeight: '600', color: COLORS.text },

  // Tipo de rotina grid 2x2
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: {
    width: '47%', backgroundColor: COLORS.surfaceAlt, borderRadius: 12,
    padding: 12, gap: 4, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'flex-start',
  },
  typeCardActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  typeIcon: { fontSize: 22 },
  typeLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  typeLabelActive: { color: COLORS.primary },
  typeDesc: { fontSize: 11, color: COLORS.textMuted },

  // Dias da semana
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent',
  },
  dayChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  dayChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  dayChipTextActive: { color: COLORS.primary },
  daysPresets: { flexDirection: 'row', gap: 8 },
  presetBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  presetBtnActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  presetBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  presetBtnTextActive: { color: COLORS.primary },

  // Preview rotina
  previewRoutineCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  previewRoutineIcon: { fontSize: 28 },
  previewRoutineTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  previewRoutineMeta: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  nextStepHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: `${COLORS.primary}12`, borderRadius: 10, padding: 12,
  },
  nextStepHintText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 17 },

  // Inputs
  input: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Goal chips (dentro do modal de hábito)
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  goalChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalChipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', maxWidth: 140 },
  goalChipTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Add habit to routine
  addHabitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  addHabitRowDone: { opacity: 0.5 },
  addHabitTitle: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },

  // Modal botões
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },

  // Hábitos Avulsos
  looseSection: { marginTop: 16, marginBottom: 8 },
  looseSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  looseSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  looseSectionSub: { fontSize: 12, color: COLORS.textSecondary },
  looseHabitCard: {
    backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  looseHabitCardDone: { borderColor: `${COLORS.success}50`, opacity: 0.7 },
  looseHabitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  looseHabitCheck: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  looseHabitTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  looseHabitTitleDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  looseHabitGoal: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  looseHabitStreak: { fontSize: 12, fontWeight: '700', color: COLORS.warning },

  // Action sheet
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, gap: 4,
  },
  actionSheetTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, paddingHorizontal: 4 },
  actionSheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  actionSheetBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.text },
});
