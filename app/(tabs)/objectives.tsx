import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../../src/utils/constants';
import { useObjectiveStore } from '../../src/stores/useObjectiveStore';
import { useSmarterGoalStore } from '../../src/stores/useSmarterGoalStore';
import { useHabitStore } from '../../src/stores/useHabitStore';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { SMARTERProgress } from '../../src/components/ui/SMARTERProgress';
import { GoalWizardFlow } from '../../src/components/ui/GoalWizardFlow';
import { SmarterGoal, ReviewFrequency } from '../../src/types/smarterGoal.types';
import { Objective } from '../../src/types/objective.types';
import type { Habit, ToolType } from '../../src/types/habit.types';

// ─── Constantes ───────────────────────────────────────────────────────────────

type Tab = 'general' | 'objectives' | 'goals' | 'habits';

const REVIEW_OPTIONS: { label: string; value: ReviewFrequency }[] = [
  { label: 'Diária', value: 'daily' },
  { label: 'Semanal', value: 'weekly' },
  { label: '2 Semanas', value: 'biweekly' },
  { label: 'Mensal', value: 'monthly' },
];

const GOAL_COLORS = COLORS.goalColors ?? [
  '#6B4F2F', '#8B6F47', '#A0845C', '#C4882A', '#5A8A5A', '#4A7A8A', '#7A5A8A', '#8A5A6A',
];

const TOOL_TYPES: { value: ToolType; label: string }[] = [
  { value: 'mini_habit', label: '🌱 Mini hábito' },
  { value: 'five_min_rule', label: '⏱ Regra dos 5min' },
  { value: 'gradual_change', label: '📈 Mudança gradual' },
  { value: 'fudoshin', label: '🧘 Fudoshin' },
  { value: 'custom', label: '✨ Personalizado' },
];

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function ObjectivesScreen() {
  const { user } = useUserStore();
  const { objectives, createObjective, updateObjective, completeObjective, deleteObjective, loadData: loadObjectives } = useObjectiveStore();
  const { goals, createGoal, updateGoal, updateProgress, completeGoal, deleteGoal, loadData: loadGoals } = useSmarterGoalStore();
  const { habits, completedToday: completedTodayHabits, createHabit, updateHabit, deleteHabit, loadData: loadHabits } = useHabitStore();
  const { tasks, loadTasks } = useTaskStore();

  const [tab, setTab] = useState<Tab>('general');

  // Wizard flow após criar meta
  const [wizardGoal, setWizardGoal] = useState<SmarterGoal | null>(null);

  // Modal de atualização de progresso
  const [updatingGoal, setUpdatingGoal] = useState<SmarterGoal | null>(null);
  const [progressInput, setProgressInput] = useState('');

  // Expandidos
  const [expandedObj, setExpandedObj] = useState<string | null>(null);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [expandedHabit, setExpandedHabit] = useState<string | null>(null);

  // ── Modais de CRIAÇÃO ─────────────────────────────────────
  const [showNewObj, setShowNewObj] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showNewHabit, setShowNewHabit] = useState(false);

  // ── Modais de EDIÇÃO ──────────────────────────────────────
  const [editingObj, setEditingObj] = useState<Objective | null>(null);
  const [editingGoal, setEditingGoal] = useState<SmarterGoal | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // ── Menus de ação (substituem Alert.alert aninhado) ───────
  const [objActionTarget, setObjActionTarget] = useState<Objective | null>(null);
  const [deletingObj, setDeletingObj] = useState<Objective | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<SmarterGoal | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<Habit | null>(null);

  // ── Formulário: Objetivo ──────────────────────────────────
  const [objTitle, setObjTitle] = useState('');
  const [objWhy, setObjWhy] = useState('');
  const [objColor, setObjColor] = useState(GOAL_COLORS[0]);

  // ── Formulário: Meta ──────────────────────────────────────
  const [goalStep, setGoalStep] = useState(1);
  const [goalObjectiveId, setGoalObjectiveId] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalMetric, setGoalMetric] = useState('');
  const [goalUnit, setGoalUnit] = useState('');
  const [goalBaseline, setGoalBaseline] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalDeadline, setGoalDeadline] = useState('');
  const [goalEmotional, setGoalEmotional] = useState('');
  const [goalReview, setGoalReview] = useState<ReviewFrequency>('weekly');
  const [goalColor, setGoalColor] = useState(GOAL_COLORS[1]);

  // ── Formulário: Hábito ────────────────────────────────────
  const [habitTitle, setHabitTitle] = useState('');
  const [habitDescription, setHabitDescription] = useState('');
  const [habitObjectiveId, setHabitObjectiveId] = useState('');
  const [habitGoalId, setHabitGoalId] = useState('');
  const [habitToolType, setHabitToolType] = useState<ToolType>('mini_habit');
  const [habitTwoMin, setHabitTwoMin] = useState('');
  const [habitImplementation, setHabitImplementation] = useState('');
  const [habitTrigger, setHabitTrigger] = useState('');
  const [habitReward, setHabitReward] = useState('');
  const [habitFreq, setHabitFreq] = useState<'daily' | 'weekdays' | 'weekly'>('daily');

  // Recarregar ao focar na aba
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadObjectives(user.id);
        loadGoals(user.id);
        loadHabits(user.id);
        loadTasks(user.id);
      }
    }, [user?.id])
  );

  // ─ Dados derivados ──────────────────────────────────────────────────────────
  const activeObjectives = objectives.filter((o) => o.status === 'active');
  const completedObjectives = objectives.filter((o) => o.status === 'completed');
  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  // ─ Funções auxiliares ───────────────────────────────────────────────────────

  function openEditObj(obj: Objective) {
    setObjTitle(obj.title);
    setObjWhy(obj.why);
    setObjColor(obj.color ?? GOAL_COLORS[0]);
    setEditingObj(obj);
  }

  function openEditGoal(goal: SmarterGoal) {
    setGoalTitle(goal.title);
    setGoalMetric(goal.metric);
    setGoalUnit(goal.metricUnit);
    setGoalBaseline(String(goal.baseline));
    setGoalTarget(String(goal.target));
    setGoalDeadline(goal.deadline);
    setGoalEmotional(goal.emotional);
    setGoalReview(goal.reviewFrequency);
    setGoalColor(goal.color ?? GOAL_COLORS[1]);
    setGoalObjectiveId(goal.objectiveId ?? '');
    setGoalStep(1);
    setEditingGoal(goal);
  }

  function openEditHabit(habit: Habit) {
    setHabitTitle(habit.title);
    setHabitDescription(habit.description ?? '');
    setHabitObjectiveId('');
    setHabitGoalId(habit.relatedGoalId ?? '');
    setHabitToolType(habit.toolType ?? 'mini_habit');
    setHabitTwoMin((habit as any).twoMinuteVersion ?? '');
    setHabitImplementation((habit as any).implementation ?? '');
    setHabitTrigger((habit as any).trigger ?? '');
    setHabitReward((habit as any).reward ?? '');
    setHabitFreq((habit as any).frequency ?? 'daily');
    setEditingHabit(habit);
  }

  function resetObjForm() {
    setObjTitle(''); setObjWhy(''); setObjColor(GOAL_COLORS[0]);
    setShowNewObj(false); setEditingObj(null);
  }

  function resetGoalForm() {
    setGoalStep(1); setGoalTitle(''); setGoalMetric('');
    setGoalUnit(''); setGoalBaseline(''); setGoalTarget(''); setGoalDeadline('');
    setGoalEmotional(''); setGoalObjectiveId(''); setGoalReview('weekly');
    setGoalColor(GOAL_COLORS[1]);
    setShowNewGoal(false); setEditingGoal(null);
  }

  function resetHabitForm() {
    setHabitTitle(''); setHabitDescription(''); setHabitObjectiveId('');
    setHabitGoalId(''); setHabitToolType('mini_habit');
    setHabitTwoMin(''); setHabitImplementation(''); setHabitTrigger(''); setHabitReward('');
    setHabitFreq('daily');
    setShowNewHabit(false); setEditingHabit(null);
  }

  function parseDeadline(raw: string): string {
    if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
    return raw;
  }

  // ─ Handlers CRUD ────────────────────────────────────────────────────────────

  async function handleSaveObjective() {
    if (!objTitle.trim() || !user) return;
    if (editingObj) {
      await updateObjective(editingObj.id, { title: objTitle.trim(), why: objWhy.trim(), color: objColor });
    } else {
      await createObjective({
        userId: user.id, title: objTitle.trim(), why: objWhy.trim(),
        status: 'active', color: objColor, orderIndex: objectives.length,
      });
    }
    resetObjForm();
  }

  function handleDeleteObjective(obj: Objective) {
    setDeletingObj(obj);
  }

  async function handleSaveGoal() {
    if (!user || !goalTitle.trim() || !goalTarget || !goalDeadline) return;
    const deadline = parseDeadline(goalDeadline);
    const baselineVal = parseFloat(goalBaseline) || 0;
    const targetVal = parseFloat(goalTarget);
    if (editingGoal) {
      await updateGoal(editingGoal.id, {
        title: goalTitle.trim(),
        metric: goalMetric.trim(),
        metricUnit: goalUnit.trim(),
        baseline: baselineVal,
        target: targetVal,
        deadline,
        emotional: goalEmotional.trim(),
        reviewFrequency: goalReview,
        color: goalColor,
        objectiveId: goalObjectiveId || undefined,
      });
      resetGoalForm();
    } else {
      const newGoal = await createGoal({
        userId: user.id,
        objectiveId: goalObjectiveId || undefined,
        title: goalTitle.trim(),
        specific: goalTitle.trim(),
        metric: goalMetric.trim(),
        baseline: baselineVal,
        target: targetVal,
        metricUnit: goalUnit.trim(),
        achievable: '',
        relevant: '',
        deadline,
        emotional: goalEmotional.trim(),
        reviewFrequency: goalReview,
        currentValue: baselineVal,
        status: 'active',
        color: goalColor,
        orderIndex: goals.length,
      });
      resetGoalForm();
      if (newGoal) setWizardGoal(newGoal);
    }
  }

  function handleDeleteGoal(goal: SmarterGoal) {
    setDeletingGoal(goal);
  }

  async function handleSaveHabit() {
    if (!habitTitle.trim() || !user) return;
    const habitData: any = {
      title: habitTitle.trim(),
      description: habitDescription.trim() || undefined,
      toolType: habitToolType,
      twoMinuteVersion: habitTwoMin.trim() || undefined,
      implementation: habitImplementation.trim() || undefined,
      trigger: habitTrigger.trim() || undefined,
      reward: habitReward.trim() || undefined,
      frequency: habitFreq,
      relatedGoalId: habitGoalId || undefined,
    };
    if (editingHabit) {
      await updateHabit(editingHabit.id, habitData);
    } else {
      await createHabit({
        userId: user.id,
        ...habitData,
        category: 'custom',
        phase: 1,
        xpReward: 10,
        neverMissCount: 0,
        isActive: true,
        orderIndex: habits.length,
      });
    }
    resetHabitForm();
  }

  function handleDeleteHabit(habit: Habit) {
    setDeletingHabit(habit);
  }

  // ─ Render ────────────────────────────────────────────────────────────────────

  const activeHabits = habits.filter(h => h.isActive);
  const todayPct = activeHabits.length > 0
    ? Math.round((completedTodayHabits.length / activeHabits.length) * 100)
    : 0;

  return (
    <View style={s.screen}>
      {/* ── Header ───────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerContent}>
          <View style={s.headerTitleRow}>
            <Ionicons name="compass" size={26} color={COLORS.primary} />
            <Text style={s.title}>Bússola</Text>
          </View>
          <Text style={s.subtitle}>
            {activeObjectives.length} obj · {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} · {completedTodayHabits.length}/{activeHabits.length} hábitos hoje
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowNewObj(true)}>
          <Ionicons name="add" size={24} color={COLORS.surface} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Pulso do dia ─────────────────────────────────────── */}
        {activeHabits.length > 0 && (
          <View style={s.pulseCard}>
            <View style={s.pulseRow}>
              <Text style={s.pulseLabel}>Progresso hoje</Text>
              <Text style={s.pulseValue}>{completedTodayHabits.length}/{activeHabits.length} · {todayPct}%</Text>
            </View>
            <View style={s.pulseTrack}>
              <View style={[s.pulseFill, { width: `${todayPct}%` as any }]} />
            </View>
          </View>
        )}

        {/* ── Estado vazio ─────────────────────────────────────── */}
        {activeObjectives.length === 0 && activeGoals.length === 0 && activeHabits.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="compass" size={60} color={COLORS.primary} />
            <Text style={s.emptyTitle}>Sua Bússola está vazia</Text>
            <Text style={s.emptyText}>
              Comece criando um objetivo — ele vai organizar suas metas e hábitos em torno de um propósito claro.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowNewObj(true)}>
              <Text style={s.emptyBtnText}>+ Criar primeiro objetivo</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Objetivos ────────────────────────────────────────── */}
        {activeObjectives.map((obj) => {
          const objGoals = goals.filter(g => g.objectiveId === obj.id && g.status === 'active');
          const isOpen = expandedObj === obj.id;
          const totalProgress = objGoals.length > 0
            ? Math.round(objGoals.reduce((sum, g) => {
                if (g.target === g.baseline) return sum;
                return sum + Math.min(100, Math.max(0, ((g.currentValue - g.baseline) / (g.target - g.baseline)) * 100));
              }, 0) / objGoals.length)
            : 0;
          const accentColor = obj.color ?? COLORS.primary;

          return (
            <View key={obj.id} style={[s.objBlock, { borderLeftColor: accentColor }]}>
              {/* Cabeçalho clicável */}
              <TouchableOpacity
                style={s.objBlockHeader}
                onPress={() => setExpandedObj(isOpen ? null : obj.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <View style={s.objTitleRow}>
                    <View style={[s.objDot, { backgroundColor: accentColor }]} />
                    <Text style={s.objTitle} numberOfLines={1}>{obj.title}</Text>
                  </View>
                  <View style={s.objProgressRow}>
                    <View style={s.objProgressTrack}>
                      <View style={[s.objProgressFill, { width: `${totalProgress}%` as any, backgroundColor: accentColor }]} />
                    </View>
                    <Text style={s.objProgressLabel}>{totalProgress}%</Text>
                  </View>
                  <Text style={s.objMeta}>
                    {objGoals.length} meta{objGoals.length !== 1 ? 's' : ''} · toque para {isOpen ? 'fechar' : 'ver'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setObjActionTarget(obj)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
                </View>
              </TouchableOpacity>

              {/* Metas deste objetivo */}
              {isOpen && (
                <View style={s.objBody}>
                  {objGoals.length === 0 ? (
                    <TouchableOpacity
                      style={s.addGoalRow}
                      onPress={() => { setGoalObjectiveId(obj.id); setShowNewGoal(true); }}
                    >
                      <Ionicons name="flag-outline" size={16} color={COLORS.primary} />
                      <Text style={s.addGoalRowText}>Adicionar uma meta a este objetivo</Text>
                    </TouchableOpacity>
                  ) : (
                    objGoals.map((goal) => {
                      const goalHabits = habits.filter(h => h.relatedGoalId === goal.id && h.isActive);
                      const isGoalOpen = expandedGoal === goal.id;
                      const pct = goal.target > goal.baseline
                        ? Math.min(100, Math.max(0, Math.round(((goal.currentValue - goal.baseline) / (goal.target - goal.baseline)) * 100)))
                        : 0;
                      const daysLeft = Math.max(0, Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / 86400000));
                      const goalColor = goal.color ?? accentColor;

                      return (
                        <View key={goal.id} style={s.goalBlock}>
                          <TouchableOpacity
                            style={s.goalRow}
                            onPress={() => setExpandedGoal(isGoalOpen ? null : goal.id)}
                            activeOpacity={0.8}
                          >
                            <View style={[s.goalDot, { backgroundColor: goalColor }]} />
                            <View style={{ flex: 1, gap: 3 }}>
                              <Text style={s.goalTitle} numberOfLines={1}>{goal.title}</Text>
                              <View style={s.goalProgressRow}>
                                <View style={s.goalProgressTrack}>
                                  <View style={[s.goalProgressFill, { width: `${pct}%` as any, backgroundColor: goalColor }]} />
                                </View>
                                <Text style={s.goalProgressPct}>{pct}%</Text>
                              </View>
                              <Text style={s.goalMeta}>
                                {goal.currentValue} → {goal.target} {goal.metricUnit}
                                {daysLeft > 0 ? ` · ${daysLeft}d` : ' · Prazo!'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => { setProgressInput(String(goal.currentValue)); setUpdatingGoal(goal); }}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={{ marginLeft: 8 }}
                            >
                              <Ionicons name="trending-up-outline" size={20} color={goalColor} />
                            </TouchableOpacity>
                          </TouchableOpacity>

                          {/* Hábitos desta meta */}
                          {isGoalOpen && (
                            <View style={s.goalBody}>
                              {goalHabits.length === 0 && (
                                <Text style={s.goalNoHabits}>Nenhum hábito vinculado a esta meta.</Text>
                              )}
                              {goalHabits.map(h => {
                                const done = completedTodayHabits.includes(h.id);
                                return (
                                  <View key={h.id} style={[s.habitPill, done && s.habitPillDone]}>
                                    <Ionicons
                                      name={done ? 'checkmark-circle' : 'ellipse-outline'}
                                      size={14}
                                      color={done ? COLORS.success : COLORS.textMuted}
                                    />
                                    <Text style={[s.habitPillText, done && s.habitPillTextDone]} numberOfLines={1}>{h.title}</Text>
                                    <TouchableOpacity
                                      onPress={() => handleDeleteHabit(h)}
                                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                    >
                                      <Ionicons name="ellipsis-vertical" size={13} color={COLORS.textMuted} />
                                    </TouchableOpacity>
                                  </View>
                                );
                              })}
                              <View style={s.goalActions}>
                                <TouchableOpacity style={s.inlineBtn} onPress={() => openEditGoal(goal)}>
                                  <Text style={s.inlineBtnText}>✏️ Editar</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.inlineBtn} onPress={() => handleDeleteGoal(goal)}>
                                  <Text style={[s.inlineBtnText, { color: COLORS.error }]}>🗑 Excluir</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}

                  {/* Botões de ação do objetivo */}
                  <View style={s.objActions}>
                    <TouchableOpacity style={s.objActionBtn} onPress={() => { setGoalObjectiveId(obj.id); setShowNewGoal(true); }}>
                      <Ionicons name="flag-outline" size={14} color={COLORS.primary} />
                      <Text style={s.objActionBtnText}>+ Meta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.objActionBtn} onPress={() => { setHabitObjectiveId(obj.id); setShowNewHabit(true); }}>
                      <Ionicons name="repeat-outline" size={14} color={COLORS.primary} />
                      <Text style={s.objActionBtnText}>+ Hábito</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* ── Botão para adicionar novo objetivo ───────────────── */}
        {activeObjectives.length > 0 && (
          <TouchableOpacity style={s.addObjBtn} onPress={() => setShowNewObj(true)}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={s.addObjBtnText}>Novo objetivo</Text>
          </TouchableOpacity>
        )}

        {/* ── Metas sem objetivo ───────────────────────────────── */}
        {activeGoals.filter(g => !g.objectiveId).length > 0 && (
          <View style={s.standaloneSection}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Metas independentes</Text>
              <TouchableOpacity onPress={() => setShowNewGoal(true)}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {activeGoals.filter(g => !g.objectiveId).map(goal => {
              const pct = goal.target > goal.baseline
                ? Math.min(100, Math.max(0, Math.round(((goal.currentValue - goal.baseline) / (goal.target - goal.baseline)) * 100)))
                : 0;
              return (
                <View key={goal.id} style={s.standaloneCard}>
                  <View style={s.goalProgressRow}>
                    <Text style={s.goalTitle} numberOfLines={1}>{goal.title}</Text>
                    <Text style={s.goalProgressPct}>{pct}%</Text>
                  </View>
                  <View style={s.goalProgressTrack}>
                    <View style={[s.goalProgressFill, { width: `${pct}%` as any, backgroundColor: goal.color ?? COLORS.primary }]} />
                  </View>
                  <Text style={s.goalMeta}>{goal.currentValue} → {goal.target} {goal.metricUnit}</Text>
                  <View style={s.goalActions}>
                    <TouchableOpacity style={s.inlineBtn} onPress={() => { setProgressInput(String(goal.currentValue)); setUpdatingGoal(goal); }}>
                      <Text style={s.inlineBtnText}>📊 Progresso</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.inlineBtn} onPress={() => openEditGoal(goal)}>
                      <Text style={s.inlineBtnText}>✏️ Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.inlineBtn} onPress={() => handleDeleteGoal(goal)}>
                      <Text style={[s.inlineBtnText, { color: COLORS.error }]}>🗑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Hábitos sem meta ─────────────────────────────────── */}
        {activeHabits.filter(h => !h.relatedGoalId).length > 0 && (
          <View style={s.standaloneSection}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionLabel}>Hábitos livres</Text>
              <TouchableOpacity onPress={() => setShowNewHabit(true)}>
                <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            {activeHabits.filter(h => !h.relatedGoalId).map(h => {
              const done = completedTodayHabits.includes(h.id);
              return (
                <View key={h.id} style={[s.habitPill, done && s.habitPillDone]}>
                  <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={done ? COLORS.success : COLORS.textMuted} />
                  <Text style={[s.habitPillText, done && s.habitPillTextDone]} numberOfLines={1}>{h.title}</Text>
                  <TouchableOpacity onPress={() => handleDeleteHabit(h)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="ellipsis-vertical" size={13} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Objetivos concluídos ─────────────────────────────── */}
        {completedObjectives.length > 0 && (
          <View style={s.standaloneSection}>
            <Text style={s.sectionLabel}>🏆 Concluídos</Text>
            {completedObjectives.map(o => (
              <View key={o.id} style={s.completedRow}>
                <Text style={s.completedText}>{o.title}</Text>
                <TouchableOpacity onPress={() => handleDeleteObjective(o)}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* ══════ MODAL: Menu de Ações do Objetivo ══════ */}
      <Modal visible={!!objActionTarget} transparent animationType="fade">
        <TouchableOpacity style={s.actionOverlay} activeOpacity={1} onPress={() => setObjActionTarget(null)}>
          <View style={s.actionSheet}>
            <Text style={s.actionSheetTitle} numberOfLines={1}>{objActionTarget?.title}</Text>
            <TouchableOpacity style={s.actionSheetBtn} onPress={() => { if (objActionTarget) openEditObj(objActionTarget); setObjActionTarget(null); }}>
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
              <Text style={s.actionSheetBtnText}>Editar objetivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionSheetBtn} onPress={() => {
              if (objActionTarget) completeObjective(objActionTarget.id);
              setObjActionTarget(null);
            }}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
              <Text style={[s.actionSheetBtnText, { color: COLORS.success }]}>Marcar como concluído</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionSheetBtn} onPress={() => {
              if (objActionTarget) { setDeletingObj(objActionTarget); setObjActionTarget(null); }
            }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[s.actionSheetBtnText, { color: COLORS.error }]}>Excluir objetivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.actionSheetBtn, s.actionSheetCancelBtn]} onPress={() => setObjActionTarget(null)}>
              <Text style={s.actionSheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══════ MODAL: Confirmar Delete Objetivo ══════ */}
      <Modal visible={!!deletingObj} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={s.actionSheetTitle}>Excluir objetivo?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              "{deletingObj?.title}" será excluído. As metas vinculadas não serão apagadas.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setDeletingObj(null)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={() => { if (deletingObj) deleteObjective(deletingObj.id); setDeletingObj(null); }}>
                <Text style={s.saveBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Confirmar Delete Meta ══════ */}
      <Modal visible={!!deletingGoal} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={s.actionSheetTitle}>Excluir meta?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              "{deletingGoal?.title}" será excluída. As tarefas vinculadas não serão apagadas.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setDeletingGoal(null)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={() => { if (deletingGoal) deleteGoal(deletingGoal.id); setDeletingGoal(null); }}>
                <Text style={s.saveBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Confirmar Delete Hábito ══════ */}
      <Modal visible={!!deletingHabit} transparent animationType="fade">
        <View style={s.actionOverlay}>
          <View style={[s.actionSheet, { gap: 14 }]}>
            <Text style={s.actionSheetTitle}>Excluir hábito?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              "{deletingHabit?.title}" será excluído permanentemente.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={() => setDeletingHabit(null)}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.saveBtn, { flex: 1, backgroundColor: COLORS.error }]}
                onPress={() => { if (deletingHabit) deleteHabit(deletingHabit.id); setDeletingHabit(null); }}>
                <Text style={s.saveBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* GoalWizardFlow: cria tarefas/hábitos após criar/abrir uma meta */}
      <GoalWizardFlow
        visible={!!wizardGoal}
        goal={wizardGoal}
        onClose={() => setWizardGoal(null)}
      />

      {/* ══════ MODAL: Atualizar Progresso ══════ */}
      <Modal visible={!!updatingGoal} transparent animationType="fade">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modal, { gap: 16 }]}>
            <Text style={s.modalTitle}>Atualizar Progresso</Text>
            {updatingGoal && (
              <Text style={s.modalHint}>
                {updatingGoal.title}{'\n'}
                Atual: {updatingGoal.currentValue} → Meta: {updatingGoal.target} {updatingGoal.metricUnit}
              </Text>
            )}
            <TextInput
              style={s.input}
              placeholder="Novo valor"
              value={progressInput}
              onChangeText={setProgressInput}
              keyboardType="numeric"
              placeholderTextColor={COLORS.textMuted}
              autoFocus
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => { setUpdatingGoal(null); setProgressInput(''); }}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, !progressInput.trim() && s.saveBtnDisabled]}
                disabled={!progressInput.trim()}
                onPress={() => {
                  const val = parseFloat(progressInput);
                  if (!isNaN(val) && updatingGoal) {
                    updateProgress(updatingGoal.id, val);
                  }
                  setUpdatingGoal(null);
                  setProgressInput('');
                }}
              >
                <Text style={s.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ MODAL: Criar / Editar Objetivo ══════ */}
      <Modal visible={showNewObj || !!editingObj} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{editingObj ? 'Editar Objetivo' : 'Novo Objetivo'}</Text>
            <Text style={s.modalHint}>O que você quer alcançar? Defina clareza e direção.</Text>
            <TextInput
              style={s.input} placeholder="Título do objetivo"
              value={objTitle} onChangeText={setObjTitle}
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={[s.input, s.inputMulti]}
              placeholder="Por que isso é importante para você? (motivação central)"
              value={objWhy} onChangeText={setObjWhy}
              multiline numberOfLines={3}
              placeholderTextColor={COLORS.textMuted}
            />
            <Text style={s.fieldLabel}>Cor</Text>
            <View style={s.colorRow}>
              {GOAL_COLORS.map((c) => (
                <TouchableOpacity
                  key={c} style={[s.colorDot, { backgroundColor: c }, objColor === c && s.colorDotSelected]}
                  onPress={() => setObjColor(c)}
                />
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={resetObjForm}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, !objTitle.trim() && s.saveBtnDisabled]}
                onPress={handleSaveObjective}
                disabled={!objTitle.trim()}
              >
                <Text style={s.saveBtnText}>{editingObj ? 'Salvar' : 'Criar Objetivo'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ MODAL: Criar / Editar Meta ══════ */}
      <Modal visible={showNewGoal || !!editingGoal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
            <View style={s.modal}>

              {/* Cabeçalho com steps */}
              <View style={s.wizardHeader}>
                <View style={s.wizardTitleRow}>
                  <Text style={s.modalTitle}>
                    {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                  </Text>
                  <View style={s.stepPills}>
                    {[1,2,3].map((n) => (
                      <View key={n} style={[s.stepPill, n <= goalStep && s.stepPillActive]}>
                        <Text style={[s.stepPillText, n <= goalStep && s.stepPillTextActive]}>{n}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* ── PASSO 1: Título + Objetivo vinculado ── */}
              {goalStep === 1 && (
                <View style={s.wizardStep}>
                  <Text style={s.stepQuestion}>Qual é a sua meta?</Text>
                  <Text style={s.fieldHint}>Seja específico: o quê + quanto = meta clara</Text>
                  <TextInput
                    style={s.inputLarge}
                    placeholder="Ex: Emagrecer 8kg até julho, correr 5km sem parar, economizar R$5.000..."
                    value={goalTitle} onChangeText={setGoalTitle}
                    multiline
                    placeholderTextColor={COLORS.textMuted}
                    autoFocus
                  />

                  {activeObjectives.length > 0 && (
                    <>
                      <Text style={s.stepQuestion}>Faz parte de qual objetivo?</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={[s.chipRow, { paddingBottom: 4 }]}>
                          <TouchableOpacity
                            style={[s.chip, !goalObjectiveId && s.chipSelected]}
                            onPress={() => setGoalObjectiveId('')}
                          >
                            <Text style={[s.chipText, !goalObjectiveId && s.chipTextSelected]}>Sem vínculo</Text>
                          </TouchableOpacity>
                          {activeObjectives.map((o) => (
                            <TouchableOpacity
                              key={o.id}
                              style={[s.chip, goalObjectiveId === o.id && s.chipSelected,
                                goalObjectiveId === o.id && { borderColor: o.color ?? COLORS.primary, backgroundColor: o.color ?? COLORS.primary }
                              ]}
                              onPress={() => setGoalObjectiveId(o.id)}
                            >
                              <Text style={[s.chipText, goalObjectiveId === o.id && s.chipTextSelected]}>{o.title}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>
                    </>
                  )}
                </View>
              )}

              {/* ── PASSO 2: Números + prazo ── */}
              {goalStep === 2 && (
                <View style={s.wizardStep}>
                  <Text style={s.stepQuestion}>Onde você está agora e onde quer chegar?</Text>
                  <Text style={s.fieldHint}>Coloque os números reais. Isso torna a meta mensurável.</Text>
                  <View style={s.metricRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fieldLabel, { marginBottom: 6 }]}>Situação atual</Text>
                      <TextInput
                        style={s.input}
                        placeholder="0"
                        keyboardType="numeric"
                        value={goalBaseline} onChangeText={setGoalBaseline}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.primary} style={{ marginTop: 22 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.fieldLabel, { marginBottom: 6 }]}>Meta final</Text>
                      <TextInput
                        style={s.input}
                        placeholder="10"
                        keyboardType="numeric"
                        value={goalTarget} onChangeText={setGoalTarget}
                        placeholderTextColor={COLORS.textMuted}
                      />
                    </View>
                  </View>
                  <TextInput
                    style={s.input}
                    placeholder="Unidade: kg, km, R$, %, páginas..."
                    value={goalUnit} onChangeText={setGoalUnit}
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={s.stepQuestion}>Como vai acompanhar o progresso?</Text>
                  <Text style={s.fieldHint}>Opcional — descreva quando/como você vai verificar</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Ex: Me pesar toda segunda-feira de manhã"
                    value={goalMetric} onChangeText={setGoalMetric}
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={s.stepQuestion}>Quando quer alcançar isso?</Text>
                  <TextInput
                    style={s.input}
                    placeholder="DD/MM/AAAA"
                    value={goalDeadline} onChangeText={setGoalDeadline}
                    keyboardType="numbers-and-punctuation"
                    placeholderTextColor={COLORS.textMuted}
                  />
                </View>
              )}

              {/* ── PASSO 3: Motivação + cor + review ── */}
              {goalStep === 3 && (
                <View style={s.wizardStep}>
                  {/* Preview da meta */}
                  <View style={[s.previewCard, { borderLeftColor: goalColor }]}>
                    <Text style={s.previewTitle}>{goalTitle || 'Sem título'}</Text>
                    {goalTarget ? (
                      <Text style={s.previewNumbers}>
                        {goalBaseline || '0'} → {goalTarget} {goalUnit}
                      </Text>
                    ) : null}
                    {goalDeadline ? (
                      <Text style={s.previewDeadline}>Prazo: {goalDeadline}</Text>
                    ) : null}
                    {goalEmotional ? (
                      <Text style={s.previewWhy}>💬 "{goalEmotional}"</Text>
                    ) : null}
                  </View>

                  <Text style={s.stepQuestion}>Por que isso é importante para você?</Text>
                  <Text style={s.fieldHint}>Opcional — sua motivação vai te manter no caminho quando ficar difícil</Text>
                  <TextInput
                    style={[s.input, s.inputMulti]}
                    placeholder="O que muda na sua vida quando você alcançar isso?"
                    value={goalEmotional} onChangeText={setGoalEmotional}
                    multiline numberOfLines={3}
                    placeholderTextColor={COLORS.textMuted}
                  />

                  <Text style={s.fieldLabel}>Cor</Text>
                  <View style={s.colorRow}>
                    {GOAL_COLORS.map((c) => (
                      <TouchableOpacity
                        key={c}
                        style={[s.colorDot, { backgroundColor: c }, goalColor === c && s.colorDotSelected]}
                        onPress={() => setGoalColor(c)}
                      />
                    ))}
                  </View>

                  <Text style={s.fieldLabel}>Frequência de revisão</Text>
                  <View style={s.chipRow}>
                    {REVIEW_OPTIONS.map((opt) => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[s.chip, goalReview === opt.value && s.chipSelected]}
                        onPress={() => setGoalReview(opt.value)}
                      >
                        <Text style={[s.chipText, goalReview === opt.value && s.chipTextSelected]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {!editingGoal && (
                    <View style={s.nextStepHint}>
                      <Ionicons name="rocket-outline" size={14} color={COLORS.primary} />
                      <Text style={s.nextStepHintText}>
                        Após criar, você vai conectar hábitos e tarefas a esta meta.
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Tarefas vinculadas (somente no modo edição) */}
              {editingGoal && (() => {
                const linkedTasks = tasks.filter(t => t.smarterGoalId === editingGoal.id);
                if (linkedTasks.length === 0) return null;
                return (
                  <View style={s.linkedTasksBlock}>
                    <Text style={s.linkedTasksTitle}>Tarefas vinculadas ({linkedTasks.length})</Text>
                    {linkedTasks.map(t => (
                      <View key={t.id} style={s.linkedTaskRow}>
                        <Ionicons
                          name={t.isCompleted ? 'checkmark-circle' : 'square-outline'}
                          size={15}
                          color={t.isCompleted ? COLORS.success : COLORS.textMuted}
                        />
                        <Text style={[s.linkedTaskText, t.isCompleted && s.linkedTaskDone]} numberOfLines={1}>
                          {t.title}
                        </Text>
                        {t.scheduledHour && (
                          <Text style={s.linkedTaskTime}>{t.scheduledHour}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })()}

              {/* Botões */}
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={goalStep === 1 ? resetGoalForm : () => setGoalStep(goalStep - 1)}
                >
                  <Text style={s.cancelText}>{goalStep === 1 ? 'Cancelar' : '← Voltar'}</Text>
                </TouchableOpacity>
                {goalStep < 3 ? (
                  <TouchableOpacity
                    style={[s.saveBtn,
                      (goalStep === 1 && !goalTitle.trim()) && s.saveBtnDisabled,
                      (goalStep === 2 && (!goalTarget || !goalDeadline)) && s.saveBtnDisabled,
                    ]}
                    onPress={() => setGoalStep(goalStep + 1)}
                    disabled={
                      (goalStep === 1 && !goalTitle.trim()) ||
                      (goalStep === 2 && (!goalTarget || !goalDeadline))
                    }
                  >
                    <Text style={s.saveBtnText}>Continuar →</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[s.saveBtn, (!goalTitle.trim() || !goalTarget || !goalDeadline) && s.saveBtnDisabled]}
                    onPress={handleSaveGoal}
                    disabled={!goalTitle.trim() || !goalTarget || !goalDeadline}
                  >
                    <Text style={s.saveBtnText}>{editingGoal ? 'Salvar' : 'Criar Meta ✅'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ══════ MODAL: Criar / Editar Hábito ══════ */}
      <Modal visible={showNewHabit || !!editingHabit} transparent animationType="slide">
        <KeyboardAvoidingView style={s.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{editingHabit ? 'Editar Hábito' : 'Novo Hábito'}</Text>
            <Text style={s.modalHint}>Hábitos são comportamentos repetíveis que sustentam seu objetivo.</Text>

            {/* Campos roláveis */}
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
              <View style={{ gap: 12 }}>

                {/* Nome */}
                <TextInput
                  style={s.input} placeholder="Nome do hábito"
                  value={habitTitle} onChangeText={setHabitTitle}
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* Descrição */}
                <TextInput
                  style={[s.input, s.inputMulti]}
                  placeholder="Descrição (opcional)"
                  value={habitDescription} onChangeText={setHabitDescription}
                  multiline numberOfLines={2}
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* Vínculo com Meta */}
                {activeGoals.length > 0 && (
                  <>
                    <Text style={s.fieldLabel}>Vinculado a qual Meta? (opcional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={[s.chipRow, { paddingBottom: 4 }]}>
                        <TouchableOpacity
                          style={[s.chip, !habitGoalId && s.chipSelected]}
                          onPress={() => setHabitGoalId('')}
                        >
                          <Text style={[s.chipText, !habitGoalId && s.chipTextSelected]}>Nenhuma</Text>
                        </TouchableOpacity>
                        {activeGoals.map((g) => (
                          <TouchableOpacity
                            key={g.id}
                            style={[s.chip, habitGoalId === g.id && s.chipSelected,
                              habitGoalId === g.id && { borderColor: g.color ?? COLORS.primary, backgroundColor: g.color ?? COLORS.primary }
                            ]}
                            onPress={() => setHabitGoalId(g.id)}
                          >
                            <Text style={[s.chipText, habitGoalId === g.id && s.chipTextSelected]}>{g.title}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </>
                )}

                {/* Frequência */}
                <Text style={s.fieldLabel}>Frequência</Text>
                <View style={s.chipRow}>
                  {([
                    { value: 'daily', label: 'Todos os dias' },
                    { value: 'weekdays', label: 'Dias úteis' },
                    { value: 'weekly', label: 'Semanal' },
                  ] as const).map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[s.chip, habitFreq === opt.value && s.chipSelected]}
                      onPress={() => setHabitFreq(opt.value)}
                    >
                      <Text style={[s.chipText, habitFreq === opt.value && s.chipTextSelected]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tipo de ferramenta */}
                <Text style={s.fieldLabel}>Tipo de ferramenta</Text>
                <View style={s.chipRow}>
                  {TOOL_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[s.chip, habitToolType === t.value && s.chipSelected]}
                      onPress={() => setHabitToolType(t.value)}
                    >
                      <Text style={[s.chipText, habitToolType === t.value && s.chipTextSelected]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Versão de 2 minutos */}
                <Text style={s.fieldLabel}>Versão de 2 minutos</Text>
                <Text style={s.fieldHint}>Como fazer o hábito em apenas 2 minutos?</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ex: Abrir o livro e ler 1 parágrafo"
                  value={habitTwoMin} onChangeText={setHabitTwoMin}
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* Intenção de implementação */}
                <Text style={s.fieldLabel}>Quando e onde vou fazer</Text>
                <Text style={s.fieldHint}>"Vou fazer [hábito] às [hora] em [lugar]"</Text>
                <TextInput
                  style={[s.input, s.inputMulti]}
                  placeholder="Ex: Vou meditar às 7h no quarto, antes do café"
                  value={habitImplementation} onChangeText={setHabitImplementation}
                  multiline numberOfLines={2}
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* Gatilho */}
                <Text style={s.fieldLabel}>Gatilho (após o quê?)</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ex: Depois de escovar os dentes"
                  value={habitTrigger} onChangeText={setHabitTrigger}
                  placeholderTextColor={COLORS.textMuted}
                />

                {/* Recompensa */}
                <Text style={s.fieldLabel}>Recompensa</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ex: Uma xícara de café após terminar"
                  value={habitReward} onChangeText={setHabitReward}
                  placeholderTextColor={COLORS.textMuted}
                />

              </View>
            </ScrollView>

            {/* Botões fora do scroll */}
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={resetHabitForm}>
                <Text style={s.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, !habitTitle.trim() && s.saveBtnDisabled]}
                onPress={handleSaveHabit}
                disabled={!habitTitle.trim()}
              >
                <Text style={s.saveBtnText}>{editingHabit ? 'Salvar' : 'Criar Hábito'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Sub-componente SmartField ────────────────────────────────────────────────

function SmartField({ icon, label, value }: { icon: any; label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={sf.row}>
      <Ionicons name={icon} size={13} color={COLORS.primary} />
      <View style={{ flex: 1 }}>
        <Text style={sf.label}>{label}</Text>
        <Text style={sf.value}>{value}</Text>
      </View>
    </View>
  );
}

const sf = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', paddingVertical: 4 },
  label: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', fontWeight: '600' },
  value: { fontSize: 13, color: COLORS.text },
});

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 14,
  },
  headerContent: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textSecondary },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40 },

  // Pulse card (progresso do dia)
  pulseCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, marginBottom: 14, gap: 8,
  },
  pulseRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pulseLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  pulseValue: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },
  pulseTrack: {
    height: 6, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden',
  },
  pulseFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 80, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 20, lineHeight: 20 },
  emptyBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  emptyBtnText: { color: COLORS.surface, fontWeight: '600', fontSize: 14 },

  // Objective block
  objBlock: {
    backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 10,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary, overflow: 'hidden',
  },
  objBlockHeader: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10,
  },
  objTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objDot: { width: 10, height: 10, borderRadius: 5 },
  objTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  objProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  objProgressTrack: {
    flex: 1, height: 5, borderRadius: 3, backgroundColor: COLORS.border, overflow: 'hidden',
  },
  objProgressFill: { height: '100%', borderRadius: 3 },
  objProgressLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, width: 32, textAlign: 'right' },
  objMeta: { fontSize: 11, color: COLORS.textMuted },

  // Objective body (expanded)
  objBody: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  addGoalRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: `${COLORS.primary}12`, borderRadius: 10,
  },
  addGoalRowText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  objActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  objActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: `${COLORS.primary}40`,
    backgroundColor: `${COLORS.primary}0A`,
  },
  objActionBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  // Add objective button
  addObjBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginVertical: 6, paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  addObjBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // Goal block (within objective)
  goalBlock: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 10, overflow: 'hidden',
  },
  goalRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  goalDot: { width: 8, height: 8, borderRadius: 4 },
  goalTitle: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  goalProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalProgressTrack: {
    flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden',
  },
  goalProgressFill: { height: '100%', borderRadius: 2 },
  goalProgressPct: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, width: 28, textAlign: 'right' },
  goalMeta: { fontSize: 11, color: COLORS.textMuted },
  goalBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 6 },
  goalNoHabits: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  goalActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  inlineBtn: {
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  inlineBtnText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  inlineBtnDanger: { borderColor: `${COLORS.error}40` },

  // Habit pill
  habitPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  habitPillDone: { backgroundColor: `${COLORS.success}12`, borderColor: `${COLORS.success}30` },
  habitPillText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  habitPillTextDone: { color: COLORS.success, textDecorationLine: 'line-through' },

  // Standalone sections
  standaloneSection: {
    backgroundColor: COLORS.surface, borderRadius: 14, marginBottom: 10, padding: 14, gap: 8,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  standaloneCard: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 12, gap: 6,
  },

  // Completed
  completedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  completedText: { fontSize: 13, color: COLORS.textMuted, textDecorationLine: 'line-through', flex: 1 },

  // Modal / overlay
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 14, maxHeight: '92%',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: -6 },

  // Wizard
  wizardHeader: { gap: 4 },
  wizardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepPills: { flexDirection: 'row', gap: 6 },
  stepPill: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  stepPillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepPillText: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  stepPillTextActive: { color: COLORS.surface },
  wizardStep: { gap: 14 },
  stepQuestion: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputSmall: { width: 72, flex: undefined },
  inputLarge: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 14,
    fontSize: 16, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
    minHeight: 56, textAlignVertical: 'top', fontWeight: '500',
  },
  nextStepHint: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: `${COLORS.primary}12`, borderRadius: 10, padding: 12,
  },
  nextStepHintText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 17 },

  // Inputs
  fieldLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldHint: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  input: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 14,
    fontSize: 14, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },

  // Cores e chips
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotSelected: { borderWidth: 3, borderColor: COLORS.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.surface },

  // Preview da meta (passo 3)
  previewCard: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 16,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary, gap: 6,
  },
  previewTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  previewNumbers: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  previewDeadline: { fontSize: 13, color: COLORS.textSecondary },
  previewWhy: { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 4 },

  // Botões do modal
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 14, color: COLORS.surface, fontWeight: '700' },

  // Tarefas vinculadas no modal de edição de meta
  linkedTasksBlock: {
    backgroundColor: `${COLORS.primary}08`, borderRadius: 12, padding: 12, gap: 8,
    borderWidth: 1, borderColor: `${COLORS.primary}20`,
  },
  linkedTasksTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  linkedTaskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkedTaskText: { flex: 1, fontSize: 13, color: COLORS.text },
  linkedTaskDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  linkedTaskTime: { fontSize: 11, color: COLORS.textMuted },

  // Action Sheet
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionSheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36, gap: 4,
  },
  actionSheetTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, paddingHorizontal: 4 },
  actionSheetBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12 },
  actionSheetBtnText: { fontSize: 15, fontWeight: '500', color: COLORS.text },
  actionSheetCancelBtn: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, justifyContent: 'center' },
  actionSheetCancelText: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', width: '100%' as any },

  // Add habit/meta button (used in modals)
  addMetaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: `${COLORS.primary}10` },
  addMetaBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
});
