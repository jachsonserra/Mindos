import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    AgendaSkeleton,
    ErrorScreen,
} from "../../src/components/LoadingSkeletons";
import { Card } from "../../src/components/ui/Card";
import { useAgendaWithSWR } from "../../src/hooks/useAgendaWithSWR";
import { useAgendaStore } from "../../src/stores/useAgendaStore";
import { useHabitStore } from "../../src/stores/useHabitStore";
import { useTaskStore } from "../../src/stores/useTaskStore";
import { useUserStore } from "../../src/stores/useUserStore";
import {
    getPeriodFromTime,
    PERIOD_LABELS,
    PERIOD_ORDER,
    type AgendaEvent,
    type DayPeriod,
} from "../../src/types/agenda.types";
import type { Task } from "../../src/types/task.types";
import { COLORS } from "../../src/utils/constants";
import { today } from "../../src/utils/dateHelpers";

const EVENT_COLORS = [
  "#8B6F47",
  "#A0845C",
  "#5A8A5A",
  "#4A7A9B",
  "#C4882A",
  "#B85C45",
];

// ── Utilitário de data local (sem bug UTC) ────────────────────────────────────

function localDateFromSelected(selectedDate: string, offset: number): string {
  // Usa T12:00:00 para evitar que o UTC shift mude o dia
  const d = new Date(selectedDate + "T12:00:00");
  d.setDate(d.getDate() + offset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── Modal novo evento ─────────────────────────────────────────────────────────

function NewEventModal({
  visible,
  onClose,
  selectedDate,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
}) {
  const { createEvent } = useAgendaStore();
  const { tasks } = useTaskStore();
  const { user } = useUserStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [linkedTaskId, setLinkedTaskId] = useState<string | undefined>();

  // Reset ao fechar/abrir
  useEffect(() => {
    if (visible) {
      setTitle("");
      setDescription("");
      setStartTime("");
      setEndTime("");
      setColor(EVENT_COLORS[0]);
      setLinkedTaskId(undefined);
    }
  }, [visible]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Atenção", "Dê um título ao evento.");
      return;
    }
    if (!startTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Atenção", "Informe o horário no formato HH:MM");
      return;
    }
    if (!user?.id) return;

    await createEvent({
      userId: user.id,
      taskId: linkedTaskId,
      title: title.trim(),
      description: description.trim() || undefined,
      startTime,
      endTime: endTime.trim() || undefined,
      date: selectedDate,
      type: linkedTaskId ? "task" : "custom",
      color,
      isCompleted: false,
    });

    onClose();
  };

  // Mostra tarefas pendentes do dia selecionado ou sem data (para poder agendar)
  const availableTasks = tasks.filter(
    (t) =>
      !t.isCompleted && (t.scheduledDate === selectedDate || !t.scheduledDate),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={m.container} edges={["top", "bottom"]}>
          <View style={m.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={m.cancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={m.title}>Novo Bloco</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={m.save}>Criar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={m.form}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={m.label}>Título *</Text>
            <TextInput
              style={m.input}
              placeholder="Ex: Reunião, Academia, Estudo..."
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />

            <View style={m.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={m.label}>Início * (HH:MM)</Text>
                <TextInput
                  style={m.input}
                  placeholder="08:00"
                  placeholderTextColor={COLORS.textMuted}
                  value={startTime}
                  onChangeText={setStartTime}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.label}>Fim (HH:MM)</Text>
                <TextInput
                  style={m.input}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.textMuted}
                  value={endTime}
                  onChangeText={setEndTime}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={m.label}>Descrição (opcional)</Text>
            <TextInput
              style={[
                m.input,
                { height: 72, textAlignVertical: "top", paddingTop: 10 },
              ]}
              placeholder="Notas, links, contexto..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />

            <Text style={m.label}>Cor</Text>
            <View style={m.colorRow}>
              {EVENT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    m.colorDot,
                    { backgroundColor: c },
                    color === c && m.colorSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            {availableTasks.length > 0 && (
              <>
                <Text style={m.label}>Vincular a uma tarefa (opcional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={[m.taskChip, !linkedTaskId && m.taskChipActive]}
                      onPress={() => setLinkedTaskId(undefined)}
                    >
                      <Text
                        style={[
                          m.taskChipText,
                          !linkedTaskId && m.taskChipTextActive,
                        ]}
                      >
                        Nenhuma
                      </Text>
                    </TouchableOpacity>
                    {availableTasks.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          m.taskChip,
                          linkedTaskId === t.id && m.taskChipActive,
                        ]}
                        onPress={() => {
                          setLinkedTaskId(t.id);
                          if (!title) setTitle(t.title);
                          if (!startTime && t.scheduledHour)
                            setStartTime(t.scheduledHour);
                        }}
                      >
                        <Text
                          style={[
                            m.taskChipText,
                            linkedTaskId === t.id && m.taskChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {t.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Modal editar evento ───────────────────────────────────────────────────────

function EditEventModal({
  event,
  visible,
  onClose,
}: {
  event: AgendaEvent | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { updateEvent } = useAgendaStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Preenche campos ao abrir o modal de edição
  useEffect(() => {
    if (visible && event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setStartTime(event.startTime);
      setEndTime(event.endTime ?? "");
      setColor(event.color ?? EVENT_COLORS[0]);
    }
  }, [visible, event]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Atenção", "Dê um título ao evento.");
      return;
    }
    if (!startTime.match(/^\d{2}:\d{2}$/)) {
      Alert.alert("Atenção", "Informe o horário no formato HH:MM");
      return;
    }
    if (!event) return;

    setSaving(true);
    try {
      await updateEvent(event.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime,
        endTime: endTime.trim() || undefined,
        color,
      });
      onClose();
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível salvar o evento.");
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={m.container} edges={["top", "bottom"]}>
          <View style={m.header}>
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={m.cancel}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={m.title}>Editar Evento</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[m.save, saving && { opacity: 0.4 }]}>Salvar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={m.form}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={m.label}>Título *</Text>
            <TextInput
              style={m.input}
              placeholder="Ex: Reunião, Academia, Estudo..."
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={m.label}>Descrição (opcional)</Text>
            <TextInput
              style={[m.input, { minHeight: 64, textAlignVertical: "top" }]}
              placeholder="Detalhes do evento..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <View style={m.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={m.label}>Início * (HH:MM)</Text>
                <TextInput
                  style={m.input}
                  placeholder="08:00"
                  placeholderTextColor={COLORS.textMuted}
                  value={startTime}
                  onChangeText={setStartTime}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={m.label}>Fim (HH:MM)</Text>
                <TextInput
                  style={m.input}
                  placeholder="09:00"
                  placeholderTextColor={COLORS.textMuted}
                  value={endTime}
                  onChangeText={setEndTime}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={m.label}>Cor</Text>
            <View style={m.colorRow}>
              {EVENT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    m.colorDot,
                    { backgroundColor: c },
                    color === c && m.colorSelected,
                  ]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── EventBlock ────────────────────────────────────────────────────────────────

function EventBlock({
  event,
  onEdit,
}: {
  event: AgendaEvent;
  onEdit: (event: AgendaEvent) => void;
}) {
  const { toggleComplete, deleteEvent } = useAgendaStore();
  const [showAction, setShowAction] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handlePress = () => setShowAction(true);

  const duration = (() => {
    if (!event.endTime) return null;
    const [sh, sm] = event.startTime.split(":").map(Number);
    const [eh, em] = event.endTime.split(":").map(Number);
    const mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) return null;
    return mins >= 60
      ? `${Math.floor(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ""}`
      : `${mins}min`;
  })();

  return (
    <>
      {/* ══ Modal: Menu de Ações do Evento ══ */}
      <Modal visible={showAction} transparent animationType="fade">
        <TouchableOpacity style={eb.actionOverlay} activeOpacity={1} onPress={() => setShowAction(false)}>
          <View style={eb.actionSheet}>
            <Text style={eb.actionSheetTitle} numberOfLines={1}>{event.title}</Text>
            <TouchableOpacity style={eb.actionSheetBtn} onPress={() => { onEdit(event); setShowAction(false); }}>
              <Ionicons name="create-outline" size={20} color={COLORS.text} />
              <Text style={eb.actionSheetBtnText}>Editar evento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={eb.actionSheetBtn} onPress={() => { toggleComplete(event.id); setShowAction(false); }}>
              <Ionicons name={event.isCompleted ? 'arrow-undo-outline' : 'checkmark-circle-outline'} size={20} color={COLORS.success} />
              <Text style={[eb.actionSheetBtnText, { color: COLORS.success }]}>
                {event.isCompleted ? 'Desmarcar concluído' : 'Marcar como concluído'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={eb.actionSheetBtn} onPress={() => { setShowAction(false); setShowDeleteConfirm(true); }}>
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              <Text style={[eb.actionSheetBtnText, { color: COLORS.error }]}>Excluir evento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[eb.actionSheetBtn, eb.actionSheetCancelBtn]} onPress={() => setShowAction(false)}>
              <Text style={eb.actionSheetCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ══ Modal: Confirmar Exclusão ══ */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={eb.actionOverlay}>
          <View style={[eb.actionSheet, { gap: 14 }]}>
            <Text style={eb.actionSheetTitle}>Excluir evento?</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
              "{event.title}" será removido permanentemente.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity style={[eb.cancelBtn, { flex: 1 }]} onPress={() => setShowDeleteConfirm(false)}>
                <Text style={eb.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[eb.confirmBtn, { flex: 1 }]}
                onPress={() => { deleteEvent(event.id); setShowDeleteConfirm(false); }}
              >
                <Text style={eb.confirmBtnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <TouchableOpacity onPress={handlePress} activeOpacity={0.85}>
      <View style={[eb.container, event.isCompleted && eb.containerDone]}>
        {/* Linha de tempo */}
        <View style={eb.timeColumn}>
          <Text style={eb.time}>{event.startTime}</Text>
          <View
            style={[
              eb.timeLine,
              { backgroundColor: event.color ?? COLORS.primary },
            ]}
          />
        </View>

        {/* Card do evento */}
        <Card
          style={[eb.card, event.isCompleted && eb.cardDone]}
          variant="elevated"
        >
          <View style={eb.cardHeader}>
            <Text
              style={[eb.title, event.isCompleted && eb.titleDone]}
              numberOfLines={1}
            >
              {event.title}
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              {event.isCompleted && (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={COLORS.success}
                />
              )}
              <TouchableOpacity
                onPress={handlePress}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>
          {!!event.description && (
            <Text style={eb.description} numberOfLines={1}>
              {event.description}
            </Text>
          )}
          <View style={eb.meta}>
            {!!duration && (
              <Text style={eb.metaText}>
                {event.startTime} – {event.endTime} · {duration}
              </Text>
            )}
            {event.type === "task" && (
              <View style={eb.badge}>
                <Text style={eb.badgeText}>Tarefa</Text>
              </View>
            )}
            {event.type === "routine" && (
              <View
                style={[eb.badge, { backgroundColor: COLORS.primaryMuted }]}
              >
                <Text style={eb.badgeText}>Rotina</Text>
              </View>
            )}
          </View>
        </Card>
      </View>
      </TouchableOpacity>
    </>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

// ── TaskEventBlock — tarefas com horário exibidas na agenda ──────────────────

function TaskEventBlock({
  task,
  onComplete,
}: {
  task: Task;
  onComplete: (task: Task) => void;
}) {
  const [showDetail, setShowDetail] = React.useState(false);

  return (
    <>
      {/* ══ Modal: Detalhes da Tarefa ══ */}
      <Modal visible={showDetail} transparent animationType="fade">
        <TouchableOpacity style={eb.actionOverlay} activeOpacity={1} onPress={() => setShowDetail(false)}>
          <View style={eb.actionSheet}>
            <Text style={eb.actionSheetTitle} numberOfLines={2}>{task.title}</Text>
            {!!task.description && (
              <Text style={[eb.description, { paddingHorizontal: 0, paddingBottom: 8 }]} numberOfLines={3}>
                {task.description}
              </Text>
            )}
            {!task.isCompleted && (
              <TouchableOpacity
                style={eb.actionSheetBtn}
                onPress={() => { onComplete(task); setShowDetail(false); }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
                <Text style={[eb.actionSheetBtnText, { color: COLORS.success }]}>✅ Concluir tarefa</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[eb.actionSheetBtn, eb.actionSheetCancelBtn]}
              onPress={() => setShowDetail(false)}
            >
              <Text style={eb.actionSheetCancelText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    <TouchableOpacity
      onPress={() => setShowDetail(true)}
      activeOpacity={0.85}
    >
      <View style={[eb.container, task.isCompleted && eb.containerDone]}>
        <View style={eb.timeColumn}>
          <Text style={eb.time}>{task.scheduledHour}</Text>
          <View style={[eb.timeLine, { backgroundColor: "#1E90FF" }]} />
        </View>
        <Card
          style={[eb.card, { borderLeftWidth: 3, borderLeftColor: "#1E90FF" }]}
          variant="elevated"
        >
          <View style={eb.cardHeader}>
            <Text
              style={[eb.title, task.isCompleted && eb.titleDone]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            <View style={[eb.badge, { backgroundColor: "#1E90FF20" }]}>
              <Text style={[eb.badgeText, { color: "#1E90FF" }]}>
                ✅ Tarefa
              </Text>
            </View>
          </View>
          {!!task.description && (
            <Text style={eb.description} numberOfLines={1}>
              {task.description}
            </Text>
          )}
        </Card>
      </View>
    </TouchableOpacity>
    </>
  );
}

export default function AgendaScreen() {
  const { selectedDate, setSelectedDate } = useAgendaStore();
  const { events, isLoading, isRevalidating, refetch } =
    useAgendaWithSWR(selectedDate);
  const { tasks, completeTask, loadData: loadTasks } = useTaskStore();
  const {
    habits,
    completedToday: completedHabitIds,
    completeHabit,
    loadData: loadHabits,
  } = useHabitStore();
  const { user } = useUserStore();
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AgendaEvent | null>(null);
  const [viewMode, setViewMode] = useState<"day" | "month">("day");
  const [agendaError, setAgendaError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    setAgendaError(null);
    Promise.all([loadTasks(user.id), loadHabits(user.id)]).catch((e: any) => {
      setAgendaError(e?.message ?? "Falha ao carregar dados da agenda");
    });
  }, [user?.id, loadTasks, loadHabits]);

  // Navega dias sem bug de fuso horário (usa T12:00:00 para não virar dia no UTC)
  const navigateDay = (offset: number) => {
    setSelectedDate(localDateFromSelected(selectedDate, offset));
  };

  const goToday = () => setSelectedDate(today());

  const isToday = selectedDate === today();
  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString(
    "pt-BR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    },
  );

  // Tarefas do dia SEM hora (seção "Para hoje")
  const noHourTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.scheduledDate === selectedDate &&
          !t.scheduledHour &&
          !t.isCompleted,
      ),
    [tasks, selectedDate],
  );

  // Hábitos ativos
  const activeHabits = useMemo(
    () => habits.filter((h) => h.isActive),
    [habits],
  );

  // Grade mensal: gera células para o mês do selectedDate
  const monthGrid = useMemo(() => {
    const [y, mo] = selectedDate.split("-").map(Number);
    const firstDay = new Date(y, mo - 1, 1);
    const lastDay = new Date(y, mo, 0);
    const startDow = firstDay.getDay(); // 0=Dom
    const offset = startDow === 0 ? 6 : startDow - 1; // segunda = 0
    const cells: (string | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(
        `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      );
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [selectedDate]);

  const monthLabel = useMemo(() => {
    const [y, mo] = selectedDate.split("-").map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
  }, [selectedDate]);

  // Tarefas do dia com horário que ainda não têm evento de agenda vinculado
  const linkedTaskIds = new Set(events.map((e) => e.taskId).filter(Boolean));
  const taskEvents = tasks.filter(
    (t) =>
      t.scheduledDate === selectedDate &&
      !!t.scheduledHour &&
      !linkedTaskIds.has(t.id),
  );

  // Agrupar eventos por período — inclui tanto eventos reais quanto tarefas virtuais
  const grouped: Record<DayPeriod, { events: AgendaEvent[]; tasks: Task[] }> = {
    morning: { events: [], tasks: [] },
    afternoon: { events: [], tasks: [] },
    evening: { events: [], tasks: [] },
    night: { events: [], tasks: [] },
  };
  events.forEach((e) => {
    grouped[getPeriodFromTime(e.startTime)].events.push(e);
  });
  taskEvents.forEach((t) => {
    grouped[getPeriodFromTime(t.scheduledHour!)].tasks.push(t);
  });

  const totalBlocks = events.length + taskEvents.length;

  const openEdit = (event: AgendaEvent) => setEditingEvent(event);
  const closeEdit = () => setEditingEvent(null);

  const handleCompleteTask = async (task: Task) => {
    await completeTask(task.id);
  };

  // Mini-calendário semanal: gera os 7 dias da semana atual em relação ao dia selecionado
  const weekDays = useMemo(() => {
    const base = new Date(selectedDate + "T12:00:00");
    const dayOfWeek = base.getDay(); // 0=Dom, 1=Seg...
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // semana começa segunda
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [selectedDate]);

  const DAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const todayStr = today();

  const totalDayItems = totalBlocks + noHourTasks.length;

  if (agendaError) {
    return (
      <SafeAreaView style={s.safeArea} edges={["top"]}>
        <ErrorScreen
          title="Erro ao carregar agenda"
          message={agendaError}
          onRetry={() => {
            setAgendaError(null);
            if (!user?.id) return;
            Promise.all([
              refetch(),
              loadTasks(user.id),
              loadHabits(user.id),
            ]).catch((e: any) => {
              setAgendaError(e?.message ?? "Falha ao recarregar agenda");
            });
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.screenTitle}>📅 Agenda</Text>
          {totalDayItems > 0 && viewMode === "day" && (
            <Text style={s.headerSub}>
              {totalDayItems} item{totalDayItems !== 1 ? "s" : ""} hoje
            </Text>
          )}
        </View>
        <View style={s.headerActions}>
          {/* Toggle vista Dia / Mês */}
          <TouchableOpacity
            style={[s.viewToggle, viewMode === "month" && s.viewToggleActive]}
            onPress={() => setViewMode((v) => (v === "day" ? "month" : "day"))}
          >
            <Ionicons
              name={viewMode === "month" ? "calendar" : "calendar-outline"}
              size={16}
              color={viewMode === "month" ? "#fff" : COLORS.primary}
            />
            <Text
              style={[
                s.viewToggleText,
                viewMode === "month" && { color: "#fff" },
              ]}
            >
              {viewMode === "month" ? "Mês" : "Dia"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => setShowNewModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.addBtnText}>Evento</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Mini-calendário semanal */}
      <View style={s.weekStrip}>
        <TouchableOpacity style={s.weekNavBtn} onPress={() => navigateDay(-7)}>
          <Ionicons name="chevron-back" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
        {weekDays.map((dateStr, idx) => {
          const dayNum = new Date(dateStr + "T12:00:00").getDate();
          const isSelected = dateStr === selectedDate;
          const isTodayDate = dateStr === todayStr;
          return (
            <TouchableOpacity
              key={dateStr}
              style={[s.weekDay, isSelected && s.weekDaySelected]}
              onPress={() => setSelectedDate(dateStr)}
            >
              <Text
                style={[s.weekDayName, isSelected && s.weekDayNameSelected]}
              >
                {DAY_NAMES[idx]}
              </Text>
              <Text
                style={[
                  s.weekDayNum,
                  isSelected && s.weekDayNumSelected,
                  isTodayDate && !isSelected && s.weekDayToday,
                ]}
              >
                {dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={s.weekNavBtn} onPress={() => navigateDay(7)}>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>
      {/* ── Vista Mensal ── */}
      {viewMode === "month" && (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Cabeçalho mês */}
          <View style={s.monthHeader}>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(localDateFromSelected(selectedDate, -28))
              }
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={s.monthTitle}>
              {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setSelectedDate(localDateFromSelected(selectedDate, 28))
              }
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Cabeçalho dias da semana */}
          <View style={s.monthDowRow}>
            {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
              <Text key={d} style={s.monthDow}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grade */}
          <View style={s.monthGrid}>
            {monthGrid.map((dateStr, idx) => {
              if (!dateStr)
                return <View key={`empty-${idx}`} style={s.monthCell} />;
              const dayNum = new Date(dateStr + "T12:00:00").getDate();
              const isSelected = dateStr === selectedDate;
              const isTodayDate = dateStr === todayStr;
              const hasTask = tasks.some(
                (t) => t.scheduledDate === dateStr && !t.isCompleted,
              );
              const hasEvent = events.some((e: any) => e.date === dateStr);
              return (
                <TouchableOpacity
                  key={dateStr}
                  style={[s.monthCell, isSelected && s.monthCellSelected]}
                  onPress={() => {
                    setSelectedDate(dateStr);
                    setViewMode("day");
                  }}
                >
                  <Text
                    style={[
                      s.monthCellNum,
                      isSelected && s.monthCellNumSelected,
                      isTodayDate && !isSelected && s.monthCellToday,
                    ]}
                  >
                    {dayNum}
                  </Text>
                  {hasTask && !isSelected && <View style={s.monthDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tarefas do mês selecionado */}
          <View style={s.monthTaskList}>
            <Text style={s.monthTaskTitle}>Tarefas agendadas</Text>
            {tasks
              .filter(
                (t) =>
                  t.scheduledDate?.startsWith(selectedDate.substring(0, 7)) &&
                  !t.isCompleted,
              )
              .sort((a, b) =>
                (a.scheduledDate ?? "").localeCompare(b.scheduledDate ?? ""),
              )
              .slice(0, 20)
              .map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={s.monthTaskRow}
                  onPress={() => {
                    setSelectedDate(t.scheduledDate!);
                    setViewMode("day");
                  }}
                >
                  <View style={s.monthTaskDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.monthTaskText} numberOfLines={1}>
                      {t.title}
                    </Text>
                    <Text style={s.monthTaskDate}>
                      {new Date(
                        t.scheduledDate! + "T12:00:00",
                      ).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                      {t.scheduledHour ? ` · ${t.scheduledHour}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            {tasks.filter(
              (t) =>
                t.scheduledDate?.startsWith(selectedDate.substring(0, 7)) &&
                !t.isCompleted,
            ).length === 0 && (
              <Text style={s.monthTaskEmpty}>
                Nenhuma tarefa agendada neste mês.
              </Text>
            )}
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
      {/* ── Vista Dia ── */}
      {viewMode === "day" && (
        <>
          {/* Navegação de dia */}
          <View style={s.dayNav}>
            <TouchableOpacity
              style={s.dayNavBtn}
              onPress={() => navigateDay(-1)}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goToday} style={s.dayCenter}>
              <Text style={s.dayText}>
                {displayDate.charAt(0).toUpperCase() + displayDate.slice(1)}
              </Text>
              {!isToday && <Text style={s.todayLink}>Ir para hoje</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.dayNavBtn}
              onPress={() => navigateDay(1)}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          </View>

          {isRevalidating && (
            <View style={s.revalidatingBar}>
              <Text style={s.revalidatingText}>Atualizando dados...</Text>
            </View>
          )}

          {/* ── Para hoje: tarefas sem hora + hábitos ── */}
          {(noHourTasks.length > 0 || activeHabits.length > 0) && (
            <View style={s.paraHojeSection}>
              <Text style={s.paraHojeTitle}>Para hoje</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                  style={{ flexDirection: "row", gap: 8, paddingBottom: 4 }}
                >
                  {noHourTasks.map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={s.paraHojeItem}
                      onPress={async () => {
                        await completeTask(t.id);
                      }}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color={COLORS.primary}
                      />
                      <Text style={s.paraHojeTxt} numberOfLines={1}>
                        {t.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {activeHabits.map((h) => (
                    <TouchableOpacity
                      key={h.id}
                      style={[
                        s.paraHojeItem,
                        s.paraHojeHabit,
                        completedHabitIds.includes(h.id)
                          ? { opacity: 0.45 }
                          : {},
                      ]}
                      onPress={async () => {
                        if (user?.id && !completedHabitIds.includes(h.id))
                          await completeHabit(h.id, user.id);
                      }}
                    >
                      <Ionicons
                        name="repeat"
                        size={14}
                        color={COLORS.primary}
                      />
                      <Text style={s.paraHojeTxt} numberOfLines={1}>
                        {h.title}
                      </Text>
                      {completedHabitIds.includes(h.id) && (
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color={COLORS.success}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          <ScrollView
            style={s.scroll}
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
          >
            {isLoading && events.length === 0 ? (
              <AgendaSkeleton />
            ) : totalBlocks === 0 ? (
              <Card style={s.emptyCard}>
                <Ionicons
                  name="calendar-outline"
                  size={40}
                  color={COLORS.primaryLight}
                />
                <Text style={s.emptyTitle}>Dia livre!</Text>
                <Text style={s.emptyDesc}>
                  Adicione blocos de tempo para estruturar seu dia.
                </Text>
                <TouchableOpacity
                  style={s.emptyBtn}
                  onPress={() => setShowNewModal(true)}
                >
                  <Text style={s.emptyBtnText}>+ Adicionar bloco</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              PERIOD_ORDER.map((period) => {
                const { events: pe, tasks: pt } = grouped[period];
                // Mescla e ordena por horário
                const allItems = [
                  ...pe.map((e) => ({
                    kind: "event" as const,
                    key: e.id,
                    time: e.startTime,
                    data: e,
                  })),
                  ...pt.map((t) => ({
                    kind: "task" as const,
                    key: t.id,
                    time: t.scheduledHour!,
                    data: t,
                  })),
                ].sort((a, b) => a.time.localeCompare(b.time));

                if (allItems.length === 0) return null;
                return (
                  <View key={period}>
                    <View style={s.periodHeader}>
                      <Text style={s.periodLabel}>{PERIOD_LABELS[period]}</Text>
                    </View>
                    {allItems.map((item) =>
                      item.kind === "event" ? (
                        <EventBlock
                          key={item.key}
                          event={item.data as AgendaEvent}
                          onEdit={openEdit}
                        />
                      ) : (
                        <TaskEventBlock
                          key={item.key}
                          task={item.data as Task}
                          onComplete={handleCompleteTask}
                        />
                      ),
                    )}
                  </View>
                );
              })
            )}

            <View style={{ height: 80 }} />
          </ScrollView>
        </>
      )}
      {/* end viewMode === 'day' */}
      {/* Modais sempre montados para não perder estado */}
      <NewEventModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        selectedDate={selectedDate}
      />
      <EditEventModal
        event={editingEvent}
        visible={!!editingEvent}
        onClose={closeEdit}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  screenTitle: { fontSize: 22, fontWeight: "800", color: COLORS.text },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Mini-calendário semanal
  weekStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 4,
  },
  weekNavBtn: { padding: 6 },
  weekDay: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 10,
  },
  weekDaySelected: { backgroundColor: COLORS.primary },
  weekDayName: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  weekDayNameSelected: { color: "#fff" },
  weekDayNum: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: 2,
  },
  weekDayNumSelected: { color: "#fff" },
  weekDayToday: { color: COLORS.primary },

  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  dayNavBtn: { padding: 8 },
  dayCenter: { flex: 1, alignItems: "center" },
  dayText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    textTransform: "capitalize",
  },
  todayLink: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  revalidatingBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  revalidatingText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: "italic",
  },

  periodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  periodLabel: { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },

  emptyCard: {
    alignItems: "center",
    gap: 10,
    padding: 40,
    marginTop: 32,
    borderRadius: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center" },
  emptyBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // ── Header extras ──────────────────────────────────────────────────────────
  headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  viewToggleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  viewToggleText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },

  // ── Vista mensal ───────────────────────────────────────────────────────────
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    textTransform: "capitalize",
  },
  monthDowRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 4 },
  monthDow: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
  },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 },
  monthCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  monthCellSelected: { backgroundColor: COLORS.primary, borderRadius: 100 },
  monthCellNum: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  monthCellNumSelected: { color: "#fff" },
  monthCellToday: { color: COLORS.primary },
  monthDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
    marginTop: 2,
  },
  monthTaskList: { paddingHorizontal: 16, marginTop: 16 },
  monthTaskTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  monthTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  monthTaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  monthTaskText: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  monthTaskDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  monthTaskEmpty: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: 24,
  },

  // ── Para hoje ──────────────────────────────────────────────────────────────
  paraHojeSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paraHojeTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textMuted,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  paraHojeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 160,
  },
  paraHojeHabit: {
    borderColor: COLORS.primaryMuted,
    backgroundColor: COLORS.primaryMuted,
  },
  paraHojeTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
    flexShrink: 1,
  },
});

const eb = StyleSheet.create({
  container: { flexDirection: "row", gap: 12, marginBottom: 10 },
  containerDone: { opacity: 0.6 },
  timeColumn: { width: 44, alignItems: "center", paddingTop: 4 },
  time: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  timeLine: { width: 3, flex: 1, marginTop: 4, borderRadius: 2, minHeight: 20 },
  card: { flex: 1, borderRadius: 14, padding: 12 },
  cardDone: {},
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { flex: 1, fontSize: 15, fontWeight: "700", color: COLORS.text },
  titleDone: { textDecorationLine: "line-through", color: COLORS.textMuted },
  description: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  metaText: { fontSize: 12, color: COLORS.textMuted },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, color: COLORS.primary, fontWeight: "600" },
  // ── Action Sheet Modal ────────────────────────────────────────────────────
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
    paddingHorizontal: 4, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 4,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 17, fontWeight: "700", color: COLORS.text },
  cancel: { fontSize: 16, color: COLORS.textSecondary },
  save: { fontSize: 16, fontWeight: "700", color: COLORS.primary },
  form: { padding: 16, gap: 4 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  timeRow: { flexDirection: "row", gap: 12 },
  colorRow: { flexDirection: "row", gap: 12 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorSelected: { borderWidth: 3, borderColor: COLORS.text },
  taskChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  taskChipActive: {
    backgroundColor: COLORS.primaryMuted,
    borderColor: COLORS.primary,
  },
  taskChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
    maxWidth: 140,
  },
  taskChipTextActive: { color: COLORS.primary, fontWeight: "700" },
});
