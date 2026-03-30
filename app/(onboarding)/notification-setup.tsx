import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { Button } from "../../src/components/ui/Button";
import { uploadUserImage } from "../../src/services/media/imageUploadService";
import { NotificationService } from "../../src/services/notifications/notificationService";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useGamificationStore } from "../../src/stores/useGamificationStore";
import { useHabitStore } from "../../src/stores/useHabitStore";
import { useUserStore } from "../../src/stores/useUserStore";
import type { ToolType } from "../../src/types/habit.types";
import { COLORS } from "../../src/utils/constants";

export default function NotificationSetupScreen() {
  const { name, why, imageUri, habits } = useLocalSearchParams<{
    name: string;
    why: string;
    imageUri: string;
    habits: string;
  }>();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [morningTime] = useState("07:00");
  const [isLoading, setIsLoading] = useState(false);

  const createUser = useUserStore((s) => s.createUser);
  const completeOnboarding = useUserStore((s) => s.completeOnboarding);
  const createHabit = useHabitStore((s) => s.createHabit);
  const createRoutine = useHabitStore((s) => s.createRoutine);
  const addHabitToRoutine = useHabitStore((s) => s.addHabitToRoutine);
  const loadData = useHabitStore((s) => s.loadData);
  const loadGamification = useGamificationStore((s) => s.loadData);
  const { session } = useAuthStore();

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // Validar que user está autenticado
      if (!session?.user.id) {
        throw new Error("Usuário não autenticado. Faça login primeiro.");
      }

      // 0. Persistir imagem da âncora no Storage (se houver)
      let whyAnchorImagePersisted: string | undefined;
      if (imageUri) {
        try {
          const { url } = await uploadUserImage({
            userId: session.user.id,
            bucket: "visions",
            localUri: imageUri,
            filePrefix: "why-anchor",
          });
          whyAnchorImagePersisted = url;
        } catch {
          // fallback: mantém URI local caso storage ainda não esteja configurado
          whyAnchorImagePersisted = imageUri;
        }
      }

      // 1. Criar usuário (requer authUserId do Supabase Auth)
      const user = await createUser(
        {
          name,
          whyAnchor: why,
          whyAnchorImageUri: whyAnchorImagePersisted,
        },
        session.user.id,
      ); // Agora usando auth.uid real

      // 2. Criar hábitos selecionados
      const parsedHabits = habits ? JSON.parse(habits) : [];
      const createdHabits: string[] = [];

      for (const h of parsedHabits) {
        if (!h) continue;
        const habit = await createHabit({
          userId: user.id,
          title: h.title,
          category: "morning",
          phase: 1,
          toolType: h.toolType as ToolType,
          xpReward: h.xp,
          isActive: true,
          orderIndex: createdHabits.length,
          neverMissCount: 0,
        });
        createdHabits.push(habit.id);
      }

      // 3. Criar rotina matinal
      const routine = await createRoutine({
        userId: user.id,
        title: "Rotina Matinal",
        type: "morning",
        phase: 1,
        triggerTime: morningTime,
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
        isActive: true,
        xpBonus: 25,
        orderIndex: 0,
      });

      // 4. Associar hábitos à rotina
      for (let i = 0; i < createdHabits.length; i++) {
        await addHabitToRoutine(routine.id, createdHabits[i]);
      }

      // 5. Pedir permissão de notificações
      if (notificationsEnabled) {
        const granted = await NotificationService.requestPermissions();
        if (granted) {
          await NotificationService.scheduleMomentumWarning();
        }
      }

      // 6. Carregar dados e completar onboarding
      await Promise.all([loadData(user.id), loadGamification(user.id)]);

      await completeOnboarding();

      router.replace("/(tabs)");
    } catch (error) {
      console.error("Erro no onboarding:", error);
      Alert.alert("Erro", "Algo deu errado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.stepIndicator}>
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepDone]} />
        <View style={[styles.step, styles.stepActive]} />
      </View>

      <Text style={styles.title}>Quase lá! 🎯</Text>
      <Text style={styles.subtitle}>
        Configure os lembretes para manter seu momentum.
      </Text>

      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Notificações ativas</Text>
            <Text style={styles.settingDesc}>
              Receba alertas de rotinas, streaks e momentum
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Resumo do seu setup:</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>👤</Text>
          <Text style={styles.summaryText}>{name}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>⚓</Text>
          <Text style={styles.summaryText} numberOfLines={2}>
            {why}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>🌅</Text>
          <Text style={styles.summaryText}>
            Rotina matinal às {morningTime}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryIcon}>⚡</Text>
          <Text style={styles.summaryText}>
            {habits ? JSON.parse(habits).filter(Boolean).length : 0} hábitos
            configurados
          </Text>
        </View>
      </View>

      <View style={styles.motivationBox}>
        <Text style={styles.motivationText}>
          "A disciplina não é uma ponte para o descanso, mas a própria vida."
        </Text>
        <Text style={styles.motivationAuthor}>— Anel do Vazio</Text>
      </View>

      <Button
        title="Iniciar minha jornada 🚀"
        onPress={handleFinish}
        loading={isLoading}
        size="lg"
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, flexGrow: 1 },
  stepIndicator: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 32,
    justifyContent: "center",
  },
  step: { height: 4, flex: 1, backgroundColor: COLORS.border, borderRadius: 2 },
  stepDone: { backgroundColor: COLORS.primary },
  stepActive: { backgroundColor: COLORS.primary },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  settingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  settingDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  summaryIcon: { fontSize: 16 },
  summaryText: { flex: 1, color: COLORS.text, fontSize: 14, lineHeight: 20 },
  motivationBox: {
    backgroundColor: COLORS.primary + "15",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  motivationText: {
    color: COLORS.text,
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 22,
  },
  motivationAuthor: {
    color: COLORS.primary,
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  button: { marginBottom: 32 },
});
