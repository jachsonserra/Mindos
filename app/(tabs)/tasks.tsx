import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Alert, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { COLORS } from '../../src/utils/constants';
import { useTaskStore } from '../../src/stores/useTaskStore';
import { useObjectiveStore } from '../../src/stores/useObjectiveStore';
import { useSmarterGoalStore } from '../../src/stores/useSmarterGoalStore';
import { useHabitStore } from '../../src/stores/useHabitStore';
import { useAgendaStore } from '../../src/stores/useAgendaStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { Card } from '../../src/components/ui/Card';
import { TimePicker } from '../../src/components/ui/TimePicker';
import { today, tomorrowStr } from '../../src/utils/dateHelpers';
import type { Task } from '../../src/types/task.types';

// ── Modal de criação de tarefa ────────────────────────────────────────────────

interface TaskFormState {
  title: string;
  description: string;
  smarterGoalId: string | undefined;
  habitId: string | undefined;
  dateFilter: 'today' | 'tomorrow' | 'none';
  hour: string;
  reward: string;
  linkTab: 'meta' | 'habito';
  recurrence: 'once' | 'daily' | 'weekly';
}

const defaultFormState = (): TaskFormState => ({
  title: '',
  description: '',
  smarterGoalId: undefined,
  habitId: undefined,
  dateFilter: 'today',
  hour: '',
  reward: '',
  linkTab: 'meta',
  recurrence: 'once',
});

function TaskFormModal({
  visible,
  onClose,
  editTask,
}: {
  visible: boolean;
  onClose: () => void;
  editTask?: Task | null;
}) {
  const { objectives } = useObjectiveStore();
  const { goals: smarterGoals } = useSmarterGoalStore();
  const { habits } = useHabitStore();
  const { user } = useUserStore();
  const { createTask, updateTask } = useTaskStore();
  const { createFromTask } = useAgendaStore();

  const isEditing = !!editTask;

  const [form, setForm] = useState<TaskFormState>(defaultFormState());
  const [saving, setSaving] = useState(false);

  // Quando modal abre, preenche campos com dados da tarefa (edição) ou reseta
  React.useEffect(() => {
    if (visible) {
      if (editTask) {
        const todayStr = today();
        const _tomorrowStr = tomorrowStr();
        let dateFilter: 'today' | 'tomorrow' | 'none' = 'none';
        if (editTask.scheduledDate === todayStr) dateFilter = 'today';
        else if (editTask.scheduledDate === _tomorrowStr) dateFilter = 'tomorrow';

        setForm({
          title: editTask.title,
          description: editTask.description ?? '',
          smarterGoalId: editTask.smarterGoalId,
          habitId: editTask.habitId,
          dateFilter,
          hour: editTask.scheduledHour ?? '',
          reward: editTask.reward ?? '',
          linkTab: 'meta',
          recurrence: 'once',
        });
      } else {
        setForm(defaultFormState());
      }
    }
  }, [visible, editTask]);

  const getScheduledDate = () => {
    if (form.dateFilter === 'today') return today();
    if (form.dateFilter === 'tomorrow') {
      return tomorrowStr();
    }
    return undefined;
  };

  const handleSave = async () => {
    if (!form.title.trim()) { Alert.alert('Atenção', 'Dê um nome para a tarefa.'); return; }
    if (!user?.id) return;
    setSaving(true);
    try {
      const scheduledDate = getScheduledDate();
      const scheduledHour = form.hour.trim() || undefined;

      if (isEditing && editTask) {
        await updateTask(editTask.id, {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          smarterGoalId: form.smarterGoalId,
          habitId: form.habitId,
          goalId: undefined,
          reward: form.reward.trim() || undefined,
          scheduledDate,
          scheduledHour,
        });
      } else {
        const task = await createTask({
          userId: user.id,
          smarterGoalId: form.smarterGoalId,
          habitId: form.habitId,
          goalId: undefined,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          reward: form.reward.trim() || undefined,
          rewardUnlocked: false,
          scheduledDate,
          scheduledHour,
          isCompleted: false,
          completedAt: undefined,
          status: 'pending',
          orderIndex: 0,
          isPareto: false,
        });
        if (scheduledDate && scheduledHour) {
          await createFromTask(task);
        }
      }
      onClose();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível salvar a tarefa.');
    } finally {
      setSaving(false);
    }
  };

  const activeGoals = smarterGoals.filter(g => g.status === 'active');
  const activeHabits = habits.filter(h => h.isActive);
  const objectiveMap = Object.fromEntries(objectives.map(o => [o.id, o.title]));

  const set = (key: keyof TaskFormState, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={m.container} edges={['top', 'bottom']}>
          <View style={m.header}>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={m.cancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={m.titleText}>{isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[m.save, saving && { opacity: 0.4 }]}>{isEditing ? 'Salvar' : 'Criar'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={m.form} keyboardShouldPersistTaps="handled">
            <Text style={m.label}>Nome da tarefa *</Text>
            <TextInput
              style={m.input}
              placeholder="O que precisa ser feito?"
              placeholderTextColor={COLORS.textMuted}
              value={form.title}
              onChangeText={v => set('title', v)}
              autoFocus={!isEditing}
            />

            <Text style={m.label}>Descrição (opcional)</Text>
            <TextInput
              style={[m.input, { minHeight: 64, textAlignVertical: 'top' }]}
              placeholder="Detalhes da tarefa..."
              placeholderTextColor={COLORS.textMuted}
              value={form.description}
              onChangeText={v => set('description', v)}
              multiline
            />

            {/* Vincular */}
            <Text style={m.label}>Vincular a</Text>
            <View style={m.linkTabs}>
              <TouchableOpacity
                style={[m.linkTab, form.linkTab === 'meta' && m.linkTabActive]}
                onPress={() => set('linkTab', 'meta')}
              >
                <Ionicons name="flag" size={14} color={form.linkTab === 'meta' ? '#fff' : COLORS.textSecondary} />
                <Text style={[m.linkTabText, form.linkTab === 'meta' && { color: '#fff' }]}>Meta</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[m.linkTab, form.linkTab === 'habito' && m.linkTabActive]}
                onPress={() => set('linkTab', 'habito')}
              >
                <Ionicons name="repeat" size={14} color={form.linkTab === 'habito' ? '#fff' : COLORS.textSecondary} />
                <Text style={[m.linkTabText, form.linkTab === 'habito' && { color: '#fff' }]}>Hábito</Text>
              </TouchableOpacity>
            </View>

            {form.linkTab === 'meta' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[m.goalChip, !form.smarterGoalId && m.goalChipActive]}
                    onPress={() => set('smarterGoalId', undefined)}
                  >
                    <Text style={[m.goalChipText, !form.smarterGoalId && m.goalChipTextActive]}>Sem meta</Text>
                  </TouchableOpacity>
                  {activeGoals.map(g => {
                    const objTitle = g.objectiveId ? objectiveMap[g.objectiveId] : null;
                    const isActive = form.smarterGoalId === g.id;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[m.goalChip, isActive && m.goalChipActive, { borderColor: g.color ?? COLORS.primary }]}
                        onPress={() => set('smarterGoalId', isActive ? undefined : g.id)}
                      >
                        <View style={[m.goalChipDot, { backgroundColor: g.color ?? COLORS.primary }]} />
                        <View>
                          <Text style={[m.goalChipText, isActive && m.goalChipTextActive]} numberOfLines={1}>{g.title}</Text>
                          {objTitle && <Text style={m.goalChipSub} numberOfLines={1}>{objTitle}</Text>}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {activeGoals.length === 0 && (
                    <Text style={m.emptyLink}>Nenhuma meta ativa. Crie uma em Objetivos.</Text>
                  )}
                </View>
              </ScrollView>
            )}

            {form.linkTab === 'habito' && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[m.goalChip, !form.habitId && m.goalChipActive]}
                    onPress={() => set('habitId', undefined)}
                  >
                    <Text style={[m.goalChipText, !form.habitId && m.goalChipTextActive]}>Sem hábito</Text>
                  </TouchableOpacity>
                  {activeHabits.map(h => {
                    const isActive = form.habitId === h.id;
                    return (
                      <TouchableOpacity
                        key={h.id}
                        style={[m.goalChip, isActive && m.goalChipActive]}
                        onPress={() => set('habitId', isActive ? undefined : h.id)}
                      >
                        <Ionicons name="repeat" size={12} color={isActive ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[m.goalChipText, isActive && m.goalChipTextActive]} numberOfLines={1}>{h.title}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {activeHabits.length === 0 && (
                    <Text style={m.emptyLink}>Nenhum hábito ativo. Crie um em Rotina.</Text>
                  )}
                </View>
              </ScrollView>
            )}

            {/* Tipo: única ou recorrente */}
            <Text style={m.label}>Tipo</Text>
            <View style={m.recurrenceRow}>
              {([
                { v: 'once', label: '1x Única', icon: 'checkmark-circle-outline' },
                { v: 'daily', label: '🔄 Diária', icon: 'repeat' },
                { v: 'weekly', label: '📅 Semanal', icon: 'calendar-outline' },
              ] as const).map(({ v, label, icon }) => (
                <TouchableOpacity
                  key={v}
                  style={[m.recChip, form.recurrence === v && m.recChipActive]}
                  onPress={() => set('recurrence', v)}
                >
                  <Ionicons name={icon as any} size={13} color={form.recurrence === v ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[m.recChipText, form.recurrence === v && m.recChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.recurrence !== 'once' && (
              <View style={m.recurrenceHint}>
                <Ionicons name="information-circle-outline" size={13} color={COLORS.info} />
                <Text style={m.recurrenceHintText}>
                  {form.recurrence === 'daily'
                    ? 'Aparece todo dia na lista de tarefas.'
                    : 'Aparece uma vez por semana na lista de tarefas.'}
                </Text>
              </View>
            )}

            <Text style={m.label}>Quando?</Text>
            <View style={m.dateRow}>
              {(['today', 'tomorrow', 'none'] as const).map(d => (
                <TouchableOpacity
                  key={d}
                  style={[m.dateChip, form.dateFilter === d && m.dateChipActive]}
                  onPress={() => set('dateFilter', d)}
                >
                  <Text style={[m.dateChipText, form.dateFilter === d && m.dateChipTextActive]}>
                    {d === 'today' ? 'Hoje' : d === 'tomorrow' ? 'Amanhã' : 'Sem data'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.dateFilter !== 'none' && (
              <>
                <Text style={m.label}>Horário (opcional)</Text>
                <TimePicker value={form.hour} onChange={v => set('hour', v)} placeholder="Sem horário definido" />
              </>
            )}

            <Text style={m.label}>🎁 Recompensa ao concluir (opcional)</Text>
            <TextInput
              style={m.input}
              placeholder="Ex: 30min do seu seriado favorito"
              placeholderTextColor={COLORS.textMuted}
              value={form.reward}
              onChangeText={v => set('reward', v)}
            />

            <Card style={m.tip}>
              <Text style={m.tipText}>
                💡 Comece pequeno — consistência supera intensidade. Uma tarefa pequena feita vale mais que dez que ficaram no papel.
              </Text>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Overlay de Recompensa ─────────────────────────────────────────────────────

function RewardOverlay({ task, onDismiss }: { task: Task; onDismiss: () => void }) {
  const { unlockReward } = useTaskStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const handleReceive = async () => {
    await unlockReward(task.id);
    Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(onDismiss);
  };

  return (
    <Animated.View style={[r.overlay, { opacity: fadeAnim }]}>
      <View style={r.card}>
        <Text style={r.emoji}>🎁</Text>
        <Text style={r.title}>Recompensa Desbloqueada!</Text>
        <Text style={r.subtitle}>{task.reward}</Text>
        <TouchableOpacity style={r.btn} onPress={handleReceive}>
          <Text style={r.btnText}>Receber!</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  goalTitle,
  habitTitle,
  onEdit,
}: {
  task: Task;
  goalTitle?: string;
  habitTitle?: string;
  onEdit: (task: Task) => void;
}) {
  const { completeTask, cancelTask, deleteTask, updateTask } = useTaskStore();
  const [celebrating, setCelebrating] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleComplete = async () => {
    if (task.isCompleted) return;
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.4, useNativeDriver: true, speed: 20 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    await completeTask(task.id);
    if (task.reward && !task.rewardUnlocked) {
      setTimeout(() => setCelebrating(true), 400);
    }
  };

  const handleLongPress = () => setShowAction(true);

  return (
    <>
      {/* ══ Modal: Menu de Ações ══ */}
      <Modal visible={showAction} transparent animationType="fade">
        <TouchableOpacity style={tc.actionOverlay} activeOpacity={1} onPress={() => setShowAction(false)}>
          <View style={tc.actionSheet}>
            <Text style={tc.actionSheetTitle} numberOfLines={1}>{task.title}</Text>
            <TouchableOpacity style={tc.actionSheetBtn} onPress={() => { onEdit(task); setShowAction(false); }}>
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
              <Text style={tc.actionSheetBtnText}>Editar tarefa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tc.actionSheetBtn} onPress={() => {
              if (task.isCompleted) {
                updateTask(task.id, { isCompleted: false, status: 'pending', completedAt: undefined });
              } else {
                handleComplete();
              }
              setShowAction(false);
            }}>
              <Ionicons name={task.isCompleted ? 'arrow-undo-outline' : 'checkmark-circle-outline'} size={20} color={COLORS.success} />
              <Text style={[tc.actionSheetBtnText, { color: COLORS.success }]}>
                {task.isCompleted ? 'Reabrir tarefa' : 'Marcar como concluída'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={tc.actionSheetBtn} onPress={() => { setShowAction(false); setShowDeleteConfirm(true); }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[tc.actionSheetBtnText, { color: COLORS.error }]}>Excluir tarefa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tc.actionSheetBtn, tc.actionSheetCancelBtn]} onPress={() => setShowAction(false)}>
              <Text style={tc.actionSheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ Modal: Confirmar exclusão ══ */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={tc.actionOverlay}>
          <View style={[tc.actionSheet, { gap: 14 }]}>
            <Text style={tc.actionSheetTitle}>Excluir tarefa?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              "{task.title}" será excluída permanentemente.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[tc.cancelBtn, { flex: 1 }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={tc.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[tc.confirmBtn, { flex: 1 }]}
                onPress={async () => {
                  setShowDeleteConfirm(false);
                  try {
                    if (typeof deleteTask === 'function') await deleteTask(task.id);
                    else await cancelTask(task.id);
                  } catch { /* silencioso */ }
                }}
              >
                <Text style={tc.confirmBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Card style={[tc.card, task.isCompleted && tc.cardDone]} variant={task.isCompleted ? 'bordered' : 'elevated'}>
        <View style={tc.row}>
          {/* Checkbox */}
          <TouchableOpacity onPress={handleComplete} activeOpacity={0.7}>
            <Animated.View style={[tc.checkbox, task.isCompleted && tc.checkboxDone, { transform: [{ scale: scaleAnim }] }]}>
              {task.isCompleted && <Ionicons name="checkmark" size={14} color="#fff" />}
            </Animated.View>
          </TouchableOpacity>

          {/* Conteúdo principal */}
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={handleComplete}
            onLongPress={handleLongPress}
            activeOpacity={0.85}
            delayLongPress={400}
          >
            <View style={{ gap: 2 }}>
              <Text style={[tc.title, task.isCompleted && tc.titleDone]} numberOfLines={2}>{task.title}</Text>
              {!!task.description && !task.isCompleted && (
                <Text style={tc.desc} numberOfLines={1}>{task.description}</Text>
              )}
              {!!goalTitle && (
                <View style={tc.goalBadge}>
                  <Ionicons name="flag" size={10} color={COLORS.primary} />
                  <Text style={tc.goalBadgeText}>{goalTitle}</Text>
                </View>
              )}
              {!!habitTitle && (
                <View style={[tc.goalBadge, { backgroundColor: `${COLORS.primary}15` }]}>
                  <Ionicons name="repeat" size={10} color={COLORS.primary} />
                  <Text style={tc.goalBadgeText}>🔁 {habitTitle}</Text>
                </View>
              )}
              {!!task.scheduledHour && (
                <Text style={tc.time}>
                  <Ionicons name="time-outline" size={11} /> {task.scheduledHour}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Botão de menu */}
          <TouchableOpacity style={tc.menuBtn} onPress={handleLongPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-vertical" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          {!!task.reward && (
            <View style={tc.rewardBadge}>
              <Ionicons name="gift-outline" size={15} color={task.rewardUnlocked ? COLORS.success : COLORS.celebrate} />
            </View>
          )}
        </View>
      </Card>

      {celebrating && task.reward && (
        <RewardOverlay task={task} onDismiss={() => setCelebrating(false)} />
      )}
    </>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { tasks, loadTasks } = useTaskStore();
  const { goals: smarterGoals } = useSmarterGoalStore();
  const { habits } = useHabitStore();
  const { user } = useUserStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');

  // Recarrega tarefas ao focar na tab
  useFocusEffect(
    useCallback(() => {
      if (user?.id && typeof loadTasks === 'function') {
        loadTasks(user.id);
      }
    }, [user?.id])
  );

  const todayStr = today();
  const tomorrowStrVal = tomorrowStr();

  // Map smarterGoalId → goal title
  const goalMap = Object.fromEntries(smarterGoals.map(g => [g.id, g.title]));

  // Map habitId → habit title
  const habitMap = Object.fromEntries(habits.map(h => [h.id, h.title]));

  const pending = tasks.filter(t => t.status === 'pending');
  const completed = tasks.filter(t => t.status === 'completed');

  const todayTasks = pending.filter(t => t.scheduledDate === todayStr);
  const tomorrowTasks = pending.filter(t => t.scheduledDate === tomorrowStrVal);
  const futureTasks = pending.filter(t => t.scheduledDate && t.scheduledDate > tomorrowStrVal);
  const noDateTasks = pending.filter(t => !t.scheduledDate);

  const displayDate = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const getGoalTitle = (task: Task) => task.smarterGoalId ? goalMap[task.smarterGoalId] : undefined;
  const getHabitTitle = (task: Task) => task.habitId ? habitMap[task.habitId] : undefined;

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  const pendingCount = pending.length;
  const completedCount = completed.length;

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.screenTitle}>Tarefas</Text>
          <Text style={s.headerSub}>
            {pendingCount === 0 ? 'Tudo em dia! 🎉' : `${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditingTask(null); setShowModal(true); }}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={s.addBtnText}>Nova</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs pending / completed */}
      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'pending' && s.tabBtnActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[s.tabBtnText, tab === 'pending' && s.tabBtnTextActive]}>
            Pendentes {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'completed' && s.tabBtnActive]}
          onPress={() => setTab('completed')}
        >
          <Text style={[s.tabBtnText, tab === 'completed' && s.tabBtnTextActive]}>
            Concluídas {completedCount > 0 ? `(${completedCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {tab === 'pending' && (
          <>
            {/* Hoje */}
            <Text style={s.sectionTitle}>📅 {displayDate.charAt(0).toUpperCase() + displayDate.slice(1)}</Text>
            {todayTasks.length === 0 ? (
              <Card style={s.emptySection}>
                <Text style={s.emptySectionText}>Nenhuma tarefa para hoje ✓</Text>
              </Card>
            ) : (
              todayTasks.map(t => <TaskCard key={t.id} task={t} goalTitle={getGoalTitle(t)} habitTitle={getHabitTitle(t)} onEdit={openEdit} />)
            )}

            {/* Amanhã */}
            {tomorrowTasks.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 16 }]}>Amanhã</Text>
                {tomorrowTasks.map(t => <TaskCard key={t.id} task={t} goalTitle={getGoalTitle(t)} habitTitle={getHabitTitle(t)} onEdit={openEdit} />)}
              </>
            )}

            {/* Futuro */}
            {futureTasks.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 16 }]}>Próximos dias</Text>
                {futureTasks.map(t => <TaskCard key={t.id} task={t} goalTitle={getGoalTitle(t)} habitTitle={getHabitTitle(t)} onEdit={openEdit} />)}
              </>
            )}

            {/* Sem data */}
            {noDateTasks.length > 0 && (
              <>
                <Text style={[s.sectionTitle, { marginTop: 16 }]}>Sem data</Text>
                {noDateTasks.map(t => <TaskCard key={t.id} task={t} goalTitle={getGoalTitle(t)} habitTitle={getHabitTitle(t)} onEdit={openEdit} />)}
              </>
            )}

            {pending.length === 0 && (
              <Card style={s.emptyMain}>
                <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.primaryLight} />
                <Text style={s.emptyMainTitle}>Nenhuma tarefa pendente</Text>
                <Text style={s.emptyMainDesc}>Crie sua primeira tarefa e vincule a uma meta ou hábito.</Text>
                <TouchableOpacity style={s.emptyBtn} onPress={() => { setEditingTask(null); setShowModal(true); }}>
                  <Text style={s.emptyBtnText}>+ Criar tarefa</Text>
                </TouchableOpacity>
              </Card>
            )}
          </>
        )}

        {tab === 'completed' && (
          <>
            {completed.length === 0 ? (
              <Card style={s.emptyMain}>
                <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
                <Text style={s.emptyMainTitle}>Nenhuma tarefa concluída ainda</Text>
                <Text style={s.emptyMainDesc}>Complete suas tarefas e acompanhe seu progresso aqui.</Text>
              </Card>
            ) : (
              <>
                <Text style={s.sectionTitle}>✓ Histórico ({completedCount})</Text>
                {completed.map(t => <TaskCard key={t.id} task={t} goalTitle={getGoalTitle(t)} habitTitle={getHabitTitle(t)} onEdit={openEdit} />)}
              </>
            )}
          </>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TaskFormModal visible={showModal} onClose={closeModal} editTask={editingTask} />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4,
  },
  screenTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  tabRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: 'transparent',
  },
  tabBtnActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.primary },
  sectionTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.textSecondary,
    marginBottom: 8, marginTop: 4, textTransform: 'capitalize',
  },
  emptySection: { padding: 14, marginBottom: 8, borderRadius: 12 },
  emptySectionText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
  emptyMain: { alignItems: 'center', gap: 10, padding: 32, marginTop: 32, borderRadius: 20 },
  emptyMainTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyMainDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  emptyBtn: { marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const tc = StyleSheet.create({
  card: { marginBottom: 8, padding: 14, borderRadius: 14 },
  cardDone: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  title: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  titleDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  desc: { fontSize: 12, color: COLORS.textSecondary },
  goalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalBadgeText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  time: { fontSize: 12, color: COLORS.textSecondary },
  rewardBadge: { padding: 4 },
  menuBtn: { padding: 4 },
  // ── Action Sheet Modais ──────────────────────────────────────────────────────
  actionOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end', alignItems: 'center',
  },
  actionSheet: {
    width: '100%', maxWidth: 480, backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 16, paddingBottom: 32, gap: 4,
  },
  actionSheetTitle: {
    fontSize: 14, fontWeight: '700', color: COLORS.textSecondary,
    paddingHorizontal: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  actionSheetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 8, borderRadius: 10,
  },
  actionSheetBtnText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  actionSheetCancelBtn: { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  actionSheetCancelText: { fontSize: 15, color: COLORS.textMuted, fontWeight: '500', textAlign: 'center', flex: 1 },
  cancelBtn: {
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center',
  },
  cancelText: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  confirmBtn: {
    paddingVertical: 12, borderRadius: 12,
    backgroundColor: COLORS.error, alignItems: 'center',
  },
  confirmBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
});

const m = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  titleText: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  cancel: { fontSize: 16, color: COLORS.textSecondary },
  save: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  form: { padding: 16, gap: 4 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginTop: 14, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.text,
  },
  linkTabs: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  linkTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  linkTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  linkTabText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  goalChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  goalChipDot: { width: 8, height: 8, borderRadius: 4 },
  goalChipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', maxWidth: 120 },
  goalChipTextActive: { color: COLORS.primary, fontWeight: '700' },
  goalChipSub: { fontSize: 10, color: COLORS.textMuted, maxWidth: 120 },
  emptyLink: { fontSize: 12, color: COLORS.textMuted, paddingVertical: 12, fontStyle: 'italic' },
  // Recorrência
  recurrenceRow: { flexDirection: 'row', gap: 8 },
  recChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
    paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: 'transparent',
  },
  recChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  recChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  recChipTextActive: { color: COLORS.primary },
  recurrenceHint: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: `${COLORS.info}12`, borderRadius: 8, padding: 10,
  },
  recurrenceHintText: { flex: 1, fontSize: 12, color: COLORS.info },
  // Data
  dateRow: { flexDirection: 'row', gap: 8 },
  dateChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt, alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  dateChipActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  dateChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  dateChipTextActive: { color: COLORS.primary },
  tip: { marginTop: 20, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 14 },
  tipText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
});

const r = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,15,26,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  card: {
    backgroundColor: COLORS.surface, borderRadius: 24, padding: 32, alignItems: 'center', gap: 12,
    marginHorizontal: 32, shadowColor: COLORS.primaryDark, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 12,
  },
  emoji: { fontSize: 52 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  subtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', fontStyle: 'italic' },
  btn: { marginTop: 8, backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 20 },
  btnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
