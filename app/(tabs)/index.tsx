import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    DashboardSkeleton,
    ErrorScreen,
} from "../../src/components/LoadingSkeletons";
import { useStaleLoader } from "../../src/hooks/useStaleLoader";
import {
    calculateCurrentLevelXP,
    getLevelProgressPercent,
    getLevelTitle,
    getXPForNextLevel,
} from "../../src/services/gamification/xpEngine";
import { uploadUserImage } from "../../src/services/media/imageUploadService";
import { useAgendaStore } from "../../src/stores/useAgendaStore";
import { useGamificationStore } from "../../src/stores/useGamificationStore";
import { useGratitudeStore } from "../../src/stores/useGratitudeStore";
import { useHabitStore } from "../../src/stores/useHabitStore";
import { useInsightStore } from "../../src/stores/useInsightStore";
import { useWeeklySummaryStore } from "../../src/stores/useWeeklySummaryStore";
import { useObjectiveStore } from "../../src/stores/useObjectiveStore";
import { useSmarterGoalStore } from "../../src/stores/useSmarterGoalStore";
import { useTaskStore } from "../../src/stores/useTaskStore";
import { useUserStore } from "../../src/stores/useUserStore";
import { NotificationService } from "../../src/services/notifications/notificationService";
import { COLORS } from "../../src/utils/constants";
import { getGreeting, today } from "../../src/utils/dateHelpers";

export default function Dashboard() {
  const router = useRouter();
  const { user, updateUser } = useUserStore();
  const {
    habits,
    routines,
    completedToday: completedHabitIds,
    completeHabit,
    uncompleteHabit,
    loadData: loadHabits,
    isLoading: habitsLoading,
  } = useHabitStore();
  const { todayTasks, loadData: loadTasks } = useTaskStore();
  const { events, loadByDate } = useAgendaStore();
  const { objectives, loadData: loadObjectives } = useObjectiveStore();
  const { goals, loadData: loadGoals } = useSmarterGoalStore();
  const { todayEntry, loadData: loadGratitude } = useGratitudeStore();
  const { topInsights, generate: generateInsights } = useInsightStore();
  const {
    summary: weeklySummary,
    isLoading: summaryLoading,
    loadFromStorage: loadWeeklySummary,
    generate: generateWeeklySummary,
    shouldShowSummary,
    shouldAutoGenerate,
  } = useWeeklySummaryStore();
  const {
    userXP,
    missions,
    todayXPEarned,
    loadData: loadGamification,
  } = useGamificationStore();
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [uploadingProfile, setUploadingProfile] = React.useState(false);
  const [uploadingDreamBoard, setUploadingDreamBoard] = React.useState(false);

  // ── Check-in diário ─────────────────────────────────────────────────────────
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinStep, setCheckinStep] = useState<1 | 2 | 3>(1);
  const [checkinPareto, setCheckinPareto] = useState<string | null>(null);

  // ── Notificação de proteção do streak às 21h ─────────────────────────────────
  const eveningWarningIdRef = useRef<string>('');

  // ── Celebração: todos os hábitos concluídos ──────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const prevHabitsDoneRef = useRef(0);

  // ── Marco de streak (7, 21, 30, 66, 100 dias) ───────────────────────────────
  const [showStreakMilestone, setShowStreakMilestone] = useState(false);
  const [milestoneDays, setMilestoneDays] = useState(0);
  const celebratedMilestonesRef = useRef<Set<number>>(new Set());
  const STREAK_MILESTONES = [3, 7, 14, 21, 30, 66, 100, 365];

  // ── Toast de progresso inline ────────────────────────────────────────────────
  const [toastMsg, setToastMsg] = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Encerramento do dia ──────────────────────────────────────────────────────
  const [showEveningRitual, setShowEveningRitual] = useState(false);
  const [eveningFeeling, setEveningFeeling] = useState<'great' | 'ok' | 'bad' | null>(null);
  const [eveningNote, setEveningNote] = useState('');
  const [eveningSubmitted, setEveningSubmitted] = useState(false);

  // ── Carta para o eu futuro ───────────────────────────────────────────────────
  const [showFutureLetter, setShowFutureLetter] = useState(false);
  const [futureLetterText, setFutureLetterText] = useState('');
  const [letterSaved, setLetterSaved] = useState(false);
  const [letterReveal, setLetterReveal] = useState<{ letter: string; writtenDate: string } | null>(null);
  const [showLetterReveal, setShowLetterReveal] = useState(false);

  // Cache stale-time: recarrega só se passaram mais de 90 segundos desde o último load
  const { shouldLoad, markLoaded } = useStaleLoader(
    `dashboard:${user?.id}`,
    90_000,
  );

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;
    setLoadError(null);
    const uid = user.id;
    const todayStr = today();

    try {
      await Promise.all([
        loadHabits(uid),
        loadTasks(uid),
        loadByDate(uid, todayStr),
        loadObjectives(uid),
        loadGoals(uid),
        loadGratitude(uid),
        loadGamification(uid),
      ]);
      // Insights rodam em background (não bloqueia o dashboard)
      generateInsights(uid).catch(() => {});
      markLoaded();
    } catch (e: any) {
      setLoadError(e?.message ?? "Falha ao carregar dashboard");
    }
  }, [
    user?.id,
    loadHabits,
    loadTasks,
    loadByDate,
    loadObjectives,
    loadGoals,
    loadGratitude,
    loadGamification,
    markLoaded,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !shouldLoad) return;
      void loadDashboardData();
    }, [user?.id, shouldLoad, loadDashboardData]),
  );

  // Carrega resumo semanal do storage e auto-gera aos domingos à tarde
  useEffect(() => {
    if (!user?.id) return;
    void loadWeeklySummary();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !shouldAutoGenerate()) return;
    const streak = userXP?.currentOverallStreak ?? 0;
    const totalXP = userXP?.totalXp ?? 0;
    const ctx = [
      `Streak atual: ${streak} dias`,
      `XP total: ${totalXP}`,
      `Hábitos ativos: ${habits.filter(h => h.isActive).length}`,
      `Objetivos ativos: ${objectives.filter(o => o.status === 'active').length}`,
    ].join('\n');
    void generateWeeklySummary(user.id, ctx);
  }, [user?.id, userXP?.currentOverallStreak]);

  const activeHabits = habits.filter((h) => h.isActive);
  const completedSet = new Set(completedHabitIds);
  const habitsDone = activeHabits.filter((h) => completedSet.has(h.id)).length;
  const habitPct =
    activeHabits.length > 0
      ? Math.round((habitsDone / activeHabits.length) * 100)
      : 0;

  // Agenda (ou cancela) a notificação de streak às 21h sempre que o progresso muda.
  // Se todos os hábitos do dia foram concluídos → cancela a notificação.
  // Se ainda há pendentes → (re)agenda para as 21h de hoje.
  useEffect(() => {
    const pendingCount = activeHabits.length - habitsDone;
    const prevId = eveningWarningIdRef.current;

    if (pendingCount <= 0) {
      // Todos concluídos — cancela notificação se existir
      if (prevId) {
        NotificationService.cancelById(prevId).catch(() => {});
        eveningWarningIdRef.current = '';
      }
      return;
    }

    // Há hábitos pendentes — cancela o anterior e agenda novo
    const reschedule = async () => {
      if (prevId) {
        await NotificationService.cancelById(prevId).catch(() => {});
      }
      const newId = await NotificationService.scheduleEveningStreakWarning(pendingCount);
      eveningWarningIdRef.current = newId;
    };
    void reschedule();
  }, [habitsDone, activeHabits.length]);

  // Detecta quando todos os hábitos são concluídos → celebração + marco
  useEffect(() => {
    const prev = prevHabitsDoneRef.current;
    prevHabitsDoneRef.current = habitsDone;
    if (activeHabits.length === 0) return;
    if (habitsDone === activeHabits.length && prev < activeHabits.length) {
      setShowCelebration(true);
      const milestone = STREAK_MILESTONES.find(
        m => m === streak && !celebratedMilestonesRef.current.has(m)
      );
      if (milestone) {
        celebratedMilestonesRef.current.add(milestone);
        setMilestoneDays(milestone);
        setTimeout(() => { setShowCelebration(false); setShowStreakMilestone(true); }, 2800);
      }
    }
  }, [habitsDone, activeHabits.length]);

  // Verifica se existe carta do passado para revelar
  useEffect(() => {
    if (!user?.id) return;
    const check = async () => {
      try {
        const revealStr = await AsyncStorage.getItem(`letterReveal:${user.id}`);
        if (!revealStr) return;
        if (new Date() >= new Date(revealStr)) {
          const letter = await AsyncStorage.getItem(`futureLetter:${user.id}`);
          const writtenDate = await AsyncStorage.getItem(`letterDate:${user.id}`);
          if (letter) setLetterReveal({ letter, writtenDate: writtenDate ?? '' });
        }
      } catch { /* silencioso */ }
    };
    void check();
  }, [user?.id]);

  // Função: mostrar toast de progresso
  function showProgressToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMsg(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  // Função: marcar/desmarcar hábito com toast de progresso
  async function handleHabitToggle(habitId: string, done: boolean) {
    if (!user) return;
    if (done) {
      uncompleteHabit(habitId, user.id);
    } else {
      await completeHabit(habitId, user.id, { date: today() });
      const habit = habits.find(h => h.id === habitId);
      const obj = getHabitObjective(habitId);
      if (obj) {
        const linked = activeHabits.filter(h => {
          const g = h.relatedGoalId ? goalMap[h.relatedGoalId] : null;
          return g?.objectiveId === obj.id;
        });
        const doneCount = linked.filter(h => completedSet.has(h.id) || h.id === habitId).length;
        const pct = linked.length > 0 ? Math.round((doneCount / linked.length) * 100) : 0;
        showProgressToast(`🎯 ${pct}% em direção a "${obj.title}"`);
      }
    }
  }

  // Função: salvar encerramento do dia
  async function handleSaveEvening() {
    if (!user?.id || !eveningFeeling) return;
    try {
      const entry = { feeling: eveningFeeling, note: eveningNote, date: today() };
      await AsyncStorage.setItem(`evening:${user.id}:${today()}`, JSON.stringify(entry));
      setEveningSubmitted(true);
      setTimeout(() => { setShowEveningRitual(false); setEveningSubmitted(false); setEveningFeeling(null); setEveningNote(''); }, 1800);
    } catch { /* silencioso */ }
  }

  // Função: salvar carta para o eu futuro
  async function handleSaveLetter() {
    if (!user?.id || !futureLetterText.trim()) return;
    try {
      const revealDate = new Date();
      revealDate.setDate(revealDate.getDate() + 90);
      await AsyncStorage.setItem(`futureLetter:${user.id}`, futureLetterText.trim());
      await AsyncStorage.setItem(`letterReveal:${user.id}`, revealDate.toISOString());
      await AsyncStorage.setItem(`letterDate:${user.id}`, new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
      setLetterSaved(true);
      setTimeout(() => { setShowFutureLetter(false); setLetterSaved(false); setFutureLetterText(''); }, 2000);
    } catch { /* silencioso */ }
  }

  const activeObjectives = objectives
    .filter((o) => o.status === "active")
    .slice(0, 2);
  const activeGoals = goals.filter((g) => g.status === "active").slice(0, 2);

  // ── Mapeamentos para tags de objetivo em hábitos ─────────────────────────────
  const goalMap = Object.fromEntries(goals.map((g) => [g.id, g]));
  const objectiveMap = Object.fromEntries(objectives.map((o) => [o.id, o]));

  function getHabitObjective(habitId: string) {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit?.relatedGoalId) return null;
    const goal = goalMap[habit.relatedGoalId];
    if (!goal?.objectiveId) return null;
    return objectiveMap[goal.objectiveId] ?? null;
  }

  // ── Missões ativas ─────────────────────────────────────────────────────────
  const activeMissions = missions.filter((m) => m.status === "active");
  const pendingMissions = activeMissions.filter(
    (m) => m.requirementCurrent < m.requirementValue,
  );
  const pendingTasks = todayTasks.filter((t) => !t.isCompleted).slice(0, 4);
  const todayEvents = events.filter((e) => !e.isCompleted).slice(0, 3);
  const activeRoutines = (routines ?? []).filter((r) => r.isActive); // r: any → tipo inferido

  // Tarefas de hoje concluídas
  const tasksDoneToday = todayTasks.filter((t) => t.isCompleted).length;
  const tasksTotalToday = todayTasks.length;

  // XP / Level
  const level = userXP?.level ?? 1;
  const totalXP = userXP?.totalXp ?? 0;
  const streak = userXP?.currentOverallStreak ?? 0;
  const levelTitle = getLevelTitle(level);
  const levelPct = getLevelProgressPercent(totalXP);
  const xpToNext = getXPForNextLevel(level);
  const currentLevelXP = calculateCurrentLevelXP(totalXP);
  const xpToday = todayXPEarned ?? 0;

  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] ?? "Você";

  async function handlePickDreamBoard() {
    if (!user?.id || uploadingDreamBoard) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 7],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadingDreamBoard(true);
      try {
        const { url } = await uploadUserImage({
          userId: user.id,
          bucket: "visions",
          localUri: result.assets[0].uri,
          filePrefix: "dream-board",
        });
        await updateUser({ dreamBoardImageUri: url });
      } catch {
        await updateUser({ dreamBoardImageUri: result.assets[0].uri });
      } finally {
        setUploadingDreamBoard(false);
      }
    }
  }

  async function handlePickProfileImage() {
    if (!user?.id || uploadingProfile) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadingProfile(true);
      try {
        const { url } = await uploadUserImage({
          userId: user.id,
          bucket: "avatars",
          localUri: result.assets[0].uri,
          filePrefix: "profile",
        });
        await updateUser({ profileImageUri: url });
      } catch {
        await updateUser({ profileImageUri: result.assets[0].uri });
      } finally {
        setUploadingProfile(false);
      }
    }
  }

  // Exibe skeleton enquanto carrega pela primeira vez
  const isFirstLoad = habitsLoading && habits.length === 0;
  if (isFirstLoad) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <DashboardSkeleton />
        <View style={{ alignItems: "center", marginTop: 8 }}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <ErrorScreen
          title="Erro ao carregar dashboard"
          message={loadError}
          onRetry={() => {
            void loadDashboardData();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView
        style={s.screen}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. HEADER: foto + nome + settings ── */}
        <View style={s.header}>
          <TouchableOpacity
            style={s.avatarWrap}
            onPress={handlePickProfileImage}
          >
            {user?.profileImageUri ? (
              <Image source={{ uri: user.profileImageUri }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Text style={s.avatarLetter}>
                  {firstName[0]?.toUpperCase()}
                </Text>
              </View>
            )}
            <View style={s.avatarEdit}>
              {uploadingProfile ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={9} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          <View style={s.headerText}>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.name}>{firstName} 👋</Text>
          </View>

          <TouchableOpacity
            style={s.settingsBtn}
            onPress={() => router.push("/settings" as any)}
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* ── PREVIEW DE INSIGHTS ── */}
        {topInsights.length > 0 && (
          <TouchableOpacity
            style={s.insightPreviewCard}
            onPress={() => router.push('/(tabs)/insights' as any)}
            activeOpacity={0.85}
          >
            <View style={s.insightPreviewLeft}>
              <Text style={s.insightPreviewEmoji}>{topInsights[0].emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.insightPreviewLabel}>INSIGHT DO DIA</Text>
                <Text style={s.insightPreviewTitle} numberOfLines={1}>{topInsights[0].title}</Text>
                <Text style={s.insightPreviewDesc} numberOfLines={2}>{topInsights[0].description}</Text>
              </View>
            </View>
            <Text style={s.insightPreviewArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── RESUMO SEMANAL (domingo à tarde) ── */}
        {shouldShowSummary() && weeklySummary && (
          <View style={s.weeklySummaryCard}>
            <View style={s.weeklySummaryHeader}>
              <Text style={s.weeklySummaryEmoji}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.weeklySummaryLabel}>RESUMO DA SEMANA</Text>
                <Text style={s.weeklySummaryTitle}>Sua coach analisou sua semana</Text>
              </View>
            </View>
            <Text style={s.weeklySummaryText}>{weeklySummary}</Text>
          </View>
        )}
        {summaryLoading && (
          <View style={[s.weeklySummaryCard, { alignItems: 'center', paddingVertical: 20 }]}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={[s.weeklySummaryLabel, { marginTop: 8 }]}>Gerando resumo da semana...</Text>
          </View>
        )}

        {/* ── BOTÃO INICIAR O DIA ── */}
        {activeHabits.length > 0 && habitsDone < activeHabits.length && (
          <TouchableOpacity
            style={s.checkinBanner}
            onPress={() => { setCheckinStep(1); setCheckinPareto(null); setShowCheckin(true); }}
            activeOpacity={0.88}
          >
            <View style={s.checkinBannerLeft}>
              <Text style={s.checkinBannerEmoji}>🌅</Text>
              <View>
                <Text style={s.checkinBannerTitle}>Iniciar o dia</Text>
                <Text style={s.checkinBannerSub}>
                  {activeHabits.length - habitsDone} hábito{activeHabits.length - habitsDone !== 1 ? "s" : ""} pendente{activeHabits.length - habitsDone !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* ── 1b. STRIP DE PROGRESSO ── */}
        <View style={s.statsStrip}>
          {/* Level + XP bar */}
          <View style={s.statLevelBlock}>
            <View style={s.statLevelRow}>
              <Text style={s.statLevelBadge}>Nv {level}</Text>
              <Text style={s.statLevelTitle}>{levelTitle}</Text>
            </View>
            <View style={s.xpBarBg}>
              <View style={[s.xpBarFill, { width: `${levelPct}%` as any }]} />
            </View>
            <Text style={s.xpBarLabel}>
              {currentLevelXP} / {xpToNext} XP
            </Text>
          </View>

          {/* Divider */}
          <View style={s.statDivider} />

          {/* Stats: streak | XP hoje | hábitos */}
          <View style={s.statGrid}>
            <View style={s.statTile}>
              <Text style={s.statIcon}>🔥</Text>
              <Text style={s.statVal}>{streak}</Text>
              <Text style={s.statKey}>streak</Text>
            </View>
            <View style={s.statTile}>
              <Text style={s.statIcon}>⚡</Text>
              <Text style={s.statVal}>+{xpToday}</Text>
              <Text style={s.statKey}>XP hoje</Text>
            </View>
            <View style={s.statTile}>
              <Text style={s.statIcon}>✅</Text>
              <Text style={s.statVal}>
                {habitsDone}/{activeHabits.length}
              </Text>
              <Text style={s.statKey}>hábitos</Text>
            </View>
            <View style={s.statTile}>
              <Text style={s.statIcon}>📌</Text>
              <Text style={s.statVal}>
                {tasksDoneToday}/{tasksTotalToday}
              </Text>
              <Text style={s.statKey}>tarefas</Text>
            </View>
          </View>
        </View>

        {/* ── 2. MURAL DOS SONHOS + PROPÓSITO ── */}
        <View style={s.dreamContainer}>
          <TouchableOpacity
            style={s.dreamBoard}
            onPress={handlePickDreamBoard}
            activeOpacity={0.92}
          >
            {user?.dreamBoardImageUri ? (
              <Image
                source={{ uri: user.dreamBoardImageUri }}
                style={s.dreamImage}
                resizeMode="cover"
              />
            ) : (
              <View style={s.dreamPlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={32}
                  color="rgba(255,255,255,0.5)"
                />
                <Text style={s.dreamPlaceholderText}>
                  Toque para adicionar seu mural dos sonhos
                </Text>
              </View>
            )}
            <View style={s.dreamOverlay} />
            {uploadingDreamBoard && (
              <View style={s.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.uploadText}>Enviando imagem...</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Card de propósito flutuando sobre a imagem */}
          <View style={s.purposeCard}>
            <View style={s.purposeHeader}>
              <View
                style={[s.purposeDot, { backgroundColor: COLORS.primary }]}
              />
              <Text style={s.purposeLabel}>MEU PROPÓSITO</Text>
            </View>
            <Text style={s.purposeText}>
              {user?.whyAnchor || "Toque para definir seu porquê central..."}
            </Text>
          </View>
        </View>

        {/* ── 3. CARD HOJE ── */}
        <TouchableOpacity
          style={s.card}
          onPress={() => router.push("/(tabs)/agenda" as any)}
          activeOpacity={0.85}
        >
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>📅 Hoje</Text>
            <Text style={s.cardLink}>Ver agenda →</Text>
          </View>

          {pendingTasks.length === 0 && todayEvents.length === 0 ? (
            <Text style={s.emptyText}>
              Nenhuma tarefa ou evento para hoje 🎉
            </Text>
          ) : (
            <View style={s.todayList}>
              {todayEvents.map((event) => (
                <View
                  key={event.id}
                  style={[
                    s.todayItem,
                    { borderLeftColor: event.color ?? COLORS.primary },
                  ]}
                >
                  <View
                    style={[
                      s.eventDot,
                      { backgroundColor: event.color ?? COLORS.primary },
                    ]}
                  />
                  <Text style={s.todayItemText} numberOfLines={1}>
                    {event.title}
                  </Text>
                  <Text style={s.todayItemTime}>{event.startTime}</Text>
                </View>
              ))}
              {pendingTasks.map((task) => (
                <View
                  key={task.id}
                  style={[s.todayItem, { borderLeftColor: COLORS.border }]}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={COLORS.textMuted}
                  />
                  <Text style={s.todayItemText} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {task.scheduledHour ? (
                    <Text style={s.todayItemTime}>{task.scheduledHour}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* ── 4. CARD ROTINAS & HÁBITOS COM CHECKBOX ── */}
        <View style={s.card}>
          <TouchableOpacity
            style={s.cardHeader}
            onPress={() => router.push("/(tabs)/routines" as any)}
            activeOpacity={0.85}
          >
            <Text style={s.cardTitle}>🔄 Rotinas & Hábitos</Text>
            <Text style={s.cardLink}>Ver rotinas →</Text>
          </TouchableOpacity>

          <View style={s.progressRow}>
            <Text style={s.progressLabel}>
              {habitsDone}/{activeHabits.length} concluídos hoje
            </Text>
            <Text
              style={[
                s.progressPct,
                { color: habitPct === 100 ? COLORS.success : COLORS.primary },
              ]}
            >
              {habitPct}%
            </Text>
          </View>
          <View style={s.progressBar}>
            <View
              style={[
                s.progressFill,
                {
                  width: `${habitPct}%` as any,
                  backgroundColor:
                    habitPct === 100 ? COLORS.success : COLORS.primary,
                },
              ]}
            />
          </View>

          {activeHabits.length === 0 ? (
            <Text style={s.emptyText}>Crie hábitos na aba Rotinas →</Text>
          ) : (
            activeHabits.slice(0, 6).map((h) => {
              const done = completedSet.has(h.id);
              const obj = getHabitObjective(h.id);
              return (
                <TouchableOpacity
                  key={h.id}
                  style={s.habitCheckRow}
                  onPress={() => handleHabitToggle(h.id, done)}
                  activeOpacity={0.7}
                >
                  <View style={[s.habitCheckbox, done && s.habitCheckboxDone]}>
                    {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.habitCheckText, done && s.habitCheckDone]} numberOfLines={1}>
                      {h.title}
                    </Text>
                    {obj && (
                      <View style={s.objTag}>
                        <View style={[s.objTagDot, { backgroundColor: obj.color ?? COLORS.primary }]} />
                        <Text style={[s.objTagText, { color: obj.color ?? COLORS.primary }]} numberOfLines={1}>
                          {obj.title}
                        </Text>
                      </View>
                    )}
                  </View>
                  {done && (
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {activeHabits.length > 6 && (
            <TouchableOpacity onPress={() => router.push("/(tabs)/routines" as any)} style={{ marginTop: 4 }}>
              <Text style={s.cardLink}>+{activeHabits.length - 6} mais na aba Rotinas →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 5. CARD ESPIRITUALIDADE ── */}
        <TouchableOpacity
          style={[s.card, s.spiritualCard]}
          onPress={() => router.push("/(tabs)/gratitude" as any)}
          activeOpacity={0.85}
        >
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>🙏 Espiritualidade</Text>
            <Text style={s.cardLink}>Ver mais →</Text>
          </View>
          {todayEntry && todayEntry.gratitudes.length > 0 ? (
            <View style={s.spiritualContent}>
              <Text style={s.spiritualLabel}>Gratidão de hoje</Text>
              <Text style={s.spiritualText} numberOfLines={2}>
                {todayEntry.gratitudes[0]}
              </Text>
            </View>
          ) : (
            <Text style={s.emptyText}>Registre sua gratidão de hoje ✨</Text>
          )}
        </TouchableOpacity>

        {/* ── 6. CARD BÚSSOLA ── */}
        <TouchableOpacity
          style={s.card}
          onPress={() => router.push("/(tabs)/objectives" as any)}
          activeOpacity={0.85}
        >
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>🧭 Bússola</Text>
            <Text style={s.cardLink}>Ver tudo →</Text>
          </View>

          {activeObjectives.length === 0 && activeGoals.length === 0 ? (
            <Text style={s.emptyText}>Defina seus objetivos e metas →</Text>
          ) : (
            <>
              {activeObjectives.map((obj) => (
                <View
                  key={obj.id}
                  style={[
                    s.compassItem,
                    { borderLeftColor: obj.color ?? COLORS.primary },
                  ]}
                >
                  <View
                    style={[
                      s.compassDot,
                      { backgroundColor: obj.color ?? COLORS.primary },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.compassTitle} numberOfLines={1}>
                      {obj.title}
                    </Text>
                    <Text style={s.compassSub} numberOfLines={1}>
                      {obj.why}
                    </Text>
                  </View>
                </View>
              ))}
              {activeGoals.map((goal) => (
                <View
                  key={goal.id}
                  style={[
                    s.compassItem,
                    { borderLeftColor: goal.color ?? COLORS.primary },
                  ]}
                >
                  <Ionicons
                    name="flag"
                    size={14}
                    color={goal.color ?? COLORS.primary}
                  />
                  <Text style={s.compassTitle} numberOfLines={1}>
                    {goal.title}
                  </Text>
                </View>
              ))}
            </>
          )}
        </TouchableOpacity>

        {/* ── 7. CARD MISSÕES ── */}
        {pendingMissions.length > 0 && (
          <TouchableOpacity
            style={[s.card, s.missionCard]}
            onPress={() => router.push("/(tabs)/missions" as any)}
            activeOpacity={0.85}
          >
            <View style={s.cardHeader}>
              <Text style={s.cardTitle}>⚔️ Missões</Text>
              <Text style={s.cardLink}>Ver todas →</Text>
            </View>
            <View style={s.missionCountRow}>
              <View style={s.missionBadge}>
                <Text style={s.missionBadgeText}>{pendingMissions.length}</Text>
              </View>
              <Text style={s.missionCountText}>
                {pendingMissions.length === 1 ? "missão disponível" : "missões disponíveis"}
              </Text>
            </View>
            {pendingMissions.slice(0, 2).map((m) => {
              const pct = m.requirementValue > 0
                ? Math.round((m.requirementCurrent / m.requirementValue) * 100)
                : 0;
              return (
                <View key={m.id} style={s.missionRow}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.missionTitle} numberOfLines={1}>{m.title}</Text>
                    <View style={s.missionBarBg}>
                      <View style={[s.missionBarFill, { width: `${pct}%` as any }]} />
                    </View>
                  </View>
                  <Text style={s.missionXp}>+{m.xpReward}XP</Text>
                </View>
              );
            })}
          </TouchableOpacity>
        )}

        {/* ── CARTA PARA O EU FUTURO ── */}
        {letterReveal ? (
          <TouchableOpacity
            style={s.letterRevealBanner}
            onPress={() => setShowLetterReveal(true)}
            activeOpacity={0.88}
          >
            <Text style={s.letterRevealEmoji}>💌</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.letterRevealTitle}>Você tem uma carta do passado!</Text>
              <Text style={s.letterRevealSub}>Escrita em {letterReveal.writtenDate} — toque para ler</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.futureLetterCard}
            onPress={() => setShowFutureLetter(true)}
            activeOpacity={0.88}
          >
            <Text style={s.futureLetterEmoji}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.futureLetterTitle}>Carta para o Eu Futuro</Text>
              <Text style={s.futureLetterSub}>Escreva para você mesmo daqui a 90 dias</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        )}

        {/* ── ENCERRAR O DIA (aparece após 17h) ── */}
        {new Date().getHours() >= 17 && (
          <TouchableOpacity
            style={s.eveningBtn}
            onPress={() => setShowEveningRitual(true)}
            activeOpacity={0.88}
          >
            <Text style={s.eveningBtnEmoji}>🌙</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.eveningBtnTitle}>Encerrar o dia</Text>
              <Text style={s.eveningBtnSub}>Reflexão rápida de 60 segundos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── TOAST DE PROGRESSO (overlay flutuante) ── */}
      <Animated.View
        pointerEvents="none"
        style={[
          s.progressToast,
          {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <Text style={s.progressToastText}>{toastMsg}</Text>
      </Animated.View>

      {/* ══════ MODAL: Check-in Diário (full-screen emocional) ══════ */}
      <Modal visible={showCheckin} transparent animationType="fade">
        <View style={s.checkinFullScreen}>
          {/* Background: dream board com overlay escuro */}
          {user?.dreamBoardImageUri ? (
            <Image
              source={{ uri: user.dreamBoardImageUri }}
              style={s.checkinBg}
              resizeMode="cover"
              blurRadius={6}
            />
          ) : (
            <View style={[s.checkinBg, { backgroundColor: '#0a0f1e' }]} />
          )}
          <View style={s.checkinBgOverlay} />

          <View style={s.checkinContent}>

            {/* Passo 1: Hábitos do dia */}
            {checkinStep === 1 && (
              <>
                <Text style={s.checkinEmojiLg}>🌅</Text>
                <Text style={s.checkinTitleLg}>Bom dia, {firstName}!</Text>
                <Text style={s.checkinSubLg}>Marque os hábitos que vai fazer hoje:</Text>
                <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                  {activeHabits.map((h) => {
                    const done = completedSet.has(h.id);
                    const obj = getHabitObjective(h.id);
                    return (
                      <TouchableOpacity
                        key={h.id}
                        style={[s.checkinHabitRowLg, done && s.checkinHabitRowDone]}
                        onPress={() => handleHabitToggle(h.id, done)}
                        activeOpacity={0.7}
                      >
                        <View style={[s.habitCheckbox, done && s.habitCheckboxDone]}>
                          {done && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.habitCheckText, done && s.habitCheckDone]} numberOfLines={1}>{h.title}</Text>
                          {obj && (
                            <View style={s.objTag}>
                              <View style={[s.objTagDot, { backgroundColor: obj.color ?? COLORS.primary }]} />
                              <Text style={[s.objTagText, { color: obj.color ?? COLORS.primary }]} numberOfLines={1}>{obj.title}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <TouchableOpacity
                  style={s.checkinNextBtn}
                  onPress={() => setCheckinStep(todayTasks.filter(t => !t.isCompleted).length > 0 ? 2 : 3)}
                >
                  <Text style={s.checkinNextBtnText}>Próximo →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ alignItems: 'center', paddingVertical: 8 }} onPress={() => setShowCheckin(false)}>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Passo 2: Tarefa Pareto */}
            {checkinStep === 2 && (
              <>
                <Text style={s.checkinEmojiLg}>🎯</Text>
                <Text style={s.checkinTitleLg}>Uma tarefa muda tudo</Text>
                <Text style={s.checkinSubLg}>Qual tarefa, se feita hoje, torna o dia um sucesso?</Text>
                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  {todayTasks.filter(t => !t.isCompleted).map((t) => (
                    <TouchableOpacity
                      key={t.id}
                      style={[s.checkinTaskRow, checkinPareto === t.id && s.checkinTaskRowSelected]}
                      onPress={() => setCheckinPareto(checkinPareto === t.id ? null : t.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.checkinRadio, checkinPareto === t.id && s.checkinRadioSelected]}>
                        {checkinPareto === t.id && <View style={s.checkinRadioDot} />}
                      </View>
                      <Text style={s.checkinTaskText} numberOfLines={2}>{t.title}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity style={s.checkinBackBtn} onPress={() => setCheckinStep(1)}>
                    <Text style={s.checkinBackText}>← Voltar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.checkinNextBtn, { flex: 1 }]} onPress={() => setCheckinStep(3)}>
                    <Text style={s.checkinNextBtnText}>Próximo →</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Passo 3: Propósito — a tela mais importante */}
            {checkinStep === 3 && (
              <>
                <Text style={s.checkinEmojiLg}>⚡</Text>
                <Text style={s.checkinTitleLg}>Seu porquê</Text>
                <View style={s.checkinAnchorBox}>
                  <Text style={s.checkinAnchorText}>
                    {user?.whyAnchor || "Defina seu propósito em Configurações."}
                  </Text>
                </View>
                {checkinPareto && (
                  <View style={s.checkinSummaryLg}>
                    <Text style={s.checkinSummaryLabel}>🎯 Missão de hoje:</Text>
                    <Text style={s.checkinSummaryTask}>
                      {todayTasks.find(t => t.id === checkinPareto)?.title}
                    </Text>
                  </View>
                )}
                <Text style={s.checkinReadyText}>
                  {habitsDone}/{activeHabits.length} hábitos · {streak > 0 ? `🔥 ${streak} dias de sequência` : 'Comece sua sequência hoje'}
                </Text>
                <TouchableOpacity
                  style={s.checkinLaunchBtn}
                  onPress={() => setShowCheckin(false)}
                  activeOpacity={0.9}
                >
                  <Text style={s.checkinLaunchText}>🚀 Conquistar o dia!</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowCheckin(false)}>
                  <Text style={[s.checkinSkipText, { color: 'rgba(255,255,255,0.5)', textAlign: 'center' }]}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      {/* ══════ MODAL: Celebração — todos os hábitos concluídos ══════ */}
      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={s.celebOverlay}>
          {user?.dreamBoardImageUri && (
            <Image source={{ uri: user.dreamBoardImageUri }} style={s.checkinBg} resizeMode="cover" blurRadius={4} />
          )}
          <View style={[s.checkinBgOverlay, { backgroundColor: 'rgba(0,30,10,0.82)' }]} />
          <View style={s.celebContent}>
            <Text style={s.celebMedal}>🏆</Text>
            <Text style={s.celebTitle}>Dia conquistado!</Text>
            <Text style={s.celebStreakNum}>{streak}</Text>
            <Text style={s.celebStreakLabel}>{streak === 1 ? 'dia de sequência' : 'dias de sequência'}</Text>
            <Text style={s.celebMessage}>
              {streak >= 66 ? 'Isso já é parte de quem você é. Hábito formado.' :
               streak >= 21 ? 'Três semanas. O hábito está ganhando raízes.' :
               streak >= 7  ? 'Uma semana inteira. Você está construindo algo real.' :
               streak >= 3  ? 'Três dias seguidos. O ímpeto começou.' :
                              'Primeiro passo completo. Faça de novo amanhã.'}
            </Text>
            <TouchableOpacity style={s.celebBtn} onPress={() => setShowCelebration(false)}>
              <Text style={s.celebBtnText}>Continuar →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Marco de Streak ══════ */}
      <Modal visible={showStreakMilestone} transparent animationType="fade">
        <View style={s.celebOverlay}>
          <View style={[s.checkinBgOverlay, { backgroundColor: 'rgba(20,0,40,0.9)' }]} />
          <View style={s.celebContent}>
            <Text style={{ fontSize: 70 }}>
              {milestoneDays >= 100 ? '💎' : milestoneDays >= 66 ? '🔥' : milestoneDays >= 30 ? '⚡' : '🌟'}
            </Text>
            <Text style={s.milestoneTitle}>Marco desbloqueado</Text>
            <Text style={s.milestoneDays}>{milestoneDays} dias</Text>
            <Text style={s.milestoneMsg}>
              {milestoneDays >= 100 ? 'Centenas de versões melhores de você, uma por dia.' :
               milestoneDays >= 66  ? 'Neurociência diz: 66 dias formam um hábito. Você chegou lá.' :
               milestoneDays >= 30  ? '30 dias. Um mês inteiro de compromisso consigo mesmo.' :
               milestoneDays >= 21  ? '21 dias. Você provou que consegue quando decide.' :
               milestoneDays >= 14  ? '14 dias. Duas semanas de consistência real.' :
               milestoneDays >= 7   ? '7 dias. Sua primeira semana completa. Isso muda tudo.' :
                                      '3 dias. O começo mais difícil passou. Agora é ritmo.'}
            </Text>
            <TouchableOpacity style={[s.celebBtn, { backgroundColor: COLORS.primary }]} onPress={() => setShowStreakMilestone(false)}>
              <Text style={s.celebBtnText}>Vou manter! 🔥</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Encerramento do dia ══════ */}
      <Modal visible={showEveningRitual} transparent animationType="slide">
        <View style={s.eveningOverlay}>
          <View style={s.eveningModal}>
            {eveningSubmitted ? (
              <View style={{ alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 50 }}>✅</Text>
                <Text style={s.eveningTitle}>Dia encerrado com consciência.</Text>
                <Text style={s.eveningSub}>Durma bem. Amanhã você recomeça melhor.</Text>
              </View>
            ) : (
              <>
                <Text style={s.eveningEmoji}>🌙</Text>
                <Text style={s.eveningTitle}>Como foi hoje?</Text>
                <Text style={s.eveningSub}>Reflexão rápida. Sem julgamento.</Text>
                <View style={s.feelingRow}>
                  {(['great', 'ok', 'bad'] as const).map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[s.feelingBtn, eveningFeeling === f && s.feelingBtnSelected]}
                      onPress={() => setEveningFeeling(f)}
                    >
                      <Text style={s.feelingEmoji}>
                        {f === 'great' ? '🚀' : f === 'ok' ? '😌' : '😤'}
                      </Text>
                      <Text style={[s.feelingLabel, eveningFeeling === f && { color: COLORS.primary }]}>
                        {f === 'great' ? 'Matei!' : f === 'ok' ? 'Razoável' : 'Difícil'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.eveningNoteLabel}>O que faço diferente amanhã?</Text>
                <TextInput
                  style={s.eveningNoteInput}
                  placeholder="Opcional — escreva sem filtro..."
                  placeholderTextColor={COLORS.textMuted}
                  value={eveningNote}
                  onChangeText={setEveningNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[s.celebBtn, { backgroundColor: eveningFeeling ? COLORS.primary : COLORS.border }]}
                  onPress={handleSaveEvening}
                  disabled={!eveningFeeling}
                >
                  <Text style={s.celebBtnText}>Encerrar o dia ✓</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowEveningRitual(false)}>
                  <Text style={{ color: COLORS.textMuted, textAlign: 'center', fontSize: 13 }}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Carta para o Eu Futuro ══════ */}
      <Modal visible={showFutureLetter} transparent animationType="slide">
        <View style={s.eveningOverlay}>
          <View style={[s.eveningModal, { maxHeight: '90%' }]}>
            {letterSaved ? (
              <View style={{ alignItems: 'center', gap: 14 }}>
                <Text style={{ fontSize: 50 }}>💌</Text>
                <Text style={s.eveningTitle}>Carta guardada!</Text>
                <Text style={[s.eveningSub, { textAlign: 'center' }]}>
                  Ela será entregue a você em 90 dias.{'\n'}Até lá — viva de forma que valha a pena ler.
                </Text>
              </View>
            ) : (
              <>
                <Text style={s.eveningEmoji}>✉️</Text>
                <Text style={s.eveningTitle}>Carta para o Eu Futuro</Text>
                <Text style={s.eveningSub}>Daqui a 90 dias, você vai ler isso. O que quer dizer para essa versão sua?</Text>
                <TextInput
                  style={[s.eveningNoteInput, { minHeight: 160, marginTop: 8 }]}
                  placeholder="Olá, eu do futuro. Hoje estou começando algo porque..."
                  placeholderTextColor={COLORS.textMuted}
                  value={futureLetterText}
                  onChangeText={setFutureLetterText}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[s.celebBtn, { backgroundColor: futureLetterText.trim() ? COLORS.primary : COLORS.border }]}
                  onPress={handleSaveLetter}
                  disabled={!futureLetterText.trim()}
                >
                  <Text style={s.celebBtnText}>Guardar carta 💌</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowFutureLetter(false)}>
                  <Text style={{ color: COLORS.textMuted, textAlign: 'center', fontSize: 13 }}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ══════ MODAL: Revelação da carta do passado ══════ */}
      <Modal visible={showLetterReveal} transparent animationType="fade">
        <View style={s.celebOverlay}>
          <View style={[s.checkinBgOverlay, { backgroundColor: 'rgba(10,5,30,0.93)' }]} />
          <View style={[s.celebContent, { gap: 16 }]}>
            <Text style={{ fontSize: 50 }}>💌</Text>
            <Text style={s.celebTitle}>Uma carta do seu passado</Text>
            {letterReveal?.writtenDate && (
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center' }}>
                Escrita em {letterReveal.writtenDate}
              </Text>
            )}
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <Text style={s.letterRevealText}>{letterReveal?.letter}</Text>
            </ScrollView>
            <TouchableOpacity
              style={[s.celebBtn, { backgroundColor: COLORS.primary }]}
              onPress={async () => {
                if (user?.id) {
                  await AsyncStorage.removeItem(`futureLetter:${user.id}`);
                  await AsyncStorage.removeItem(`letterReveal:${user.id}`);
                  await AsyncStorage.removeItem(`letterDate:${user.id}`);
                }
                setLetterReveal(null);
                setShowLetterReveal(false);
              }}
            >
              <Text style={s.celebBtnText}>Recebi com gratidão ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { flex: 1 },
  content: { paddingBottom: 20 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 18, fontWeight: "700", color: "#fff" },
  avatarEdit: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  headerText: { flex: 1 },
  greeting: { fontSize: 12, color: COLORS.textSecondary },
  name: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  settingsBtn: { padding: 6 },

  // Dream Board
  dreamContainer: {
    marginHorizontal: 20,
    marginBottom: 56,
    position: "relative",
  },
  dreamBoard: {
    height: 160,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceAlt,
  },
  dreamImage: { width: "100%", height: "100%" },
  dreamPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: `${COLORS.primary}18`,
  },
  dreamPlaceholderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  dreamOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  uploadText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  purposeCard: {
    position: "absolute",
    bottom: -46,
    left: 12,
    right: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  purposeHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  purposeDot: { width: 6, height: 6, borderRadius: 3 },
  purposeLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  purposeText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
    lineHeight: 19,
  },

  // Cards genéricos
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  cardLink: { fontSize: 12, color: COLORS.primary, fontWeight: "600" },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: "italic" },

  // Hoje
  todayList: { gap: 6 },
  todayItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  eventDot: { width: 7, height: 7, borderRadius: 4 },
  todayItemText: { flex: 1, fontSize: 13, color: COLORS.text },
  todayItemTime: { fontSize: 11, color: COLORS.textMuted },

  // Rotinas & Hábitos
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary },
  progressPct: { fontSize: 13, fontWeight: "700" },
  progressBar: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  routineRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  routineText: { fontSize: 12, color: COLORS.textMuted },
  habitRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  habitRowText: { fontSize: 13, color: COLORS.text },
  habitDone: { textDecorationLine: "line-through", color: COLORS.textMuted },

  // Espiritualidade
  spiritualCard: { borderLeftWidth: 3, borderLeftColor: `${COLORS.warning}80` },
  spiritualContent: { gap: 4 },
  spiritualLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spiritualText: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // ── Stats strip ──────────────────────────────────────────────────────────
  statsStrip: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statLevelBlock: { gap: 4 },
  statLevelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statLevelBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#fff",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statLevelTitle: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  xpBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  xpBarLabel: { fontSize: 10, color: COLORS.textMuted },
  statDivider: { height: 1, backgroundColor: COLORS.border },
  statGrid: { flexDirection: "row", justifyContent: "space-around" },
  statTile: { alignItems: "center", gap: 2 },
  statIcon: { fontSize: 16 },
  statVal: { fontSize: 15, fontWeight: "800", color: COLORS.text },
  statKey: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // ── Quick access ─────────────────────────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quickBtn: { alignItems: "center", gap: 6, flex: 1 },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 11, fontWeight: "600", color: COLORS.textSecondary },

  // Bússola
  compassItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
  },
  compassDot: { width: 8, height: 8, borderRadius: 4 },
  compassTitle: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  compassSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
    fontStyle: "italic",
  },

  // ── Preview de Insights ───────────────────────────────────────────────────
  insightPreviewCard: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: "rgba(229,57,53,0.06)",
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(229,57,53,0.2)",
    gap: 8,
  },
  insightPreviewLeft:  { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 12 },
  insightPreviewEmoji: { fontSize: 26, lineHeight: 30 },
  insightPreviewLabel: { fontSize: 9, fontWeight: "800", color: COLORS.primary, letterSpacing: 1, marginBottom: 2 },
  insightPreviewTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, lineHeight: 18 },
  insightPreviewDesc:  { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15, marginTop: 2 },
  insightPreviewArrow: { fontSize: 22, color: COLORS.textMuted },

  // ── Resumo semanal ────────────────────────────────────────────────────────
  weeklySummaryCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16, gap: 12,
    borderWidth: 1, borderColor: `${COLORS.primary}30`,
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
  },
  weeklySummaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weeklySummaryEmoji: { fontSize: 24 },
  weeklySummaryLabel: {
    fontSize: 9, fontWeight: '800', color: COLORS.primary,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2,
  },
  weeklySummaryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  weeklySummaryText: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 22,
  },

  // ── Iniciar o dia banner ──────────────────────────────────────────────────
  checkinBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  checkinBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  checkinBannerEmoji: { fontSize: 24 },
  checkinBannerTitle: { fontSize: 15, fontWeight: "700", color: COLORS.primary },
  checkinBannerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  // ── Hábitos com checkbox ──────────────────────────────────────────────────
  habitCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  habitCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  habitCheckboxDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  habitCheckText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },
  habitCheckDone: { color: COLORS.textMuted, textDecorationLine: "line-through" },

  // ── Tag de objetivo no hábito ─────────────────────────────────────────────
  objTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  objTagDot: { width: 5, height: 5, borderRadius: 3 },
  objTagText: { fontSize: 10, fontWeight: "600" },

  // ── Card de missões ───────────────────────────────────────────────────────
  missionCard: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  missionCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  missionBadge: {
    backgroundColor: COLORS.warning,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  missionBadgeText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  missionCountText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  missionTitle: { fontSize: 13, color: COLORS.text, fontWeight: "500" },
  missionBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  missionBarFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: COLORS.warning,
  },
  missionXp: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.warning,
    minWidth: 48,
    textAlign: "right",
  },

  // ── Check-in wizard modal ─────────────────────────────────────────────────
  checkinOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  checkinModal: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 14,
    maxHeight: "85%",
  },
  checkinEmoji: { fontSize: 40, textAlign: "center" },
  checkinTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: "center",
  },
  checkinSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  checkinHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  checkinHabitRowDone: { opacity: 0.7 },
  checkinTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: COLORS.surfaceAlt,
  },
  checkinTaskRowSelected: {
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  checkinRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkinRadioSelected: { borderColor: COLORS.primary },
  checkinRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  checkinTaskText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: "500" },
  checkinNextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkinNextBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  checkinSkipBtn: { alignItems: "center", paddingVertical: 8 },
  checkinSkipText: { fontSize: 14, color: COLORS.textMuted },
  checkinBackBtn: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
  },
  checkinBackText: { fontSize: 15, color: COLORS.text, fontWeight: "600" },
  checkinPurposeBox: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  checkinPurposeText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
    fontStyle: "italic",
    textAlign: "center",
  },
  checkinSummary: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  checkinSummaryLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "700" },
  checkinSummaryTask: { fontSize: 14, color: COLORS.text, fontWeight: "600" },
  checkinReadyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // ── Check-in full-screen (emocional) ─────────────────────────────────────
  checkinFullScreen: {
    flex: 1,
    position: 'relative',
  },
  checkinBg: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: '100%',
    height: '100%',
  },
  checkinBgOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  checkinContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 40,
    gap: 14,
    zIndex: 10,
  },
  checkinEmojiLg: {
    fontSize: 52,
    textAlign: 'center',
  },
  checkinTitleLg: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  checkinSubLg: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 21,
  },
  checkinAnchorBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  checkinAnchorText: {
    fontSize: 17,
    color: '#fff',
    fontStyle: 'italic',
    lineHeight: 25,
    textAlign: 'center',
    fontWeight: '600',
  },
  checkinSummaryLg: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  checkinHabitRowLg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  checkinLaunchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  checkinLaunchText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.4,
  },

  // ── Celebração — todos os hábitos concluídos ──────────────────────────────
  celebOverlay: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebContent: {
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 10,
    zIndex: 10,
    maxWidth: 400,
    width: '100%',
  },
  celebMedal: { fontSize: 72 },
  celebTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  celebStreakNum: {
    fontSize: 64,
    fontWeight: '900',
    color: COLORS.primary,
    lineHeight: 72,
  },
  celebStreakLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: -6,
  },
  celebMessage: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  celebBtn: {
    backgroundColor: COLORS.success,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  celebBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Marco de streak ───────────────────────────────────────────────────────
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  milestoneDays: {
    fontSize: 72,
    fontWeight: '900',
    color: '#fff',
    lineHeight: 80,
    textAlign: 'center',
  },
  milestoneMsg: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 24,
    fontStyle: 'italic',
    paddingHorizontal: 12,
  },

  // ── Toast de progresso flutuante ──────────────────────────────────────────
  progressToast: {
    position: 'absolute',
    bottom: 80,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(20,20,30,0.92)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${COLORS.primary}44`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  progressToastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },

  // ── Carta para o eu futuro ────────────────────────────────────────────────
  letterRevealBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  letterRevealEmoji: { fontSize: 28 },
  letterRevealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  letterRevealSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  letterRevealText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  futureLetterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  futureLetterEmoji: { fontSize: 28 },
  futureLetterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  futureLetterSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Encerrar o dia ────────────────────────────────────────────────────────
  eveningBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  eveningBtnEmoji: { fontSize: 26 },
  eveningBtnTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  eveningBtnSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Modal: encerramento do dia & carta futura ─────────────────────────────
  eveningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  eveningModal: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 24,
    paddingBottom: 40,
    gap: 14,
  },
  eveningEmoji: {
    fontSize: 44,
    textAlign: 'center',
  },
  eveningTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  eveningSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  eveningNoteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  eveningNoteInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 80,
  },
  feelingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  feelingBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  feelingBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryMuted,
  },
  feelingEmoji: { fontSize: 28 },
  feelingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
