import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { useAutoRefresh } from "../src/hooks/useAutoRefresh";
import { useDailyReset } from "../src/hooks/useDailyReset";
import { useAgendaStore } from "../src/stores/useAgendaStore";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useBrainStore } from "../src/stores/useBrainStore";
import { useGamificationStore } from "../src/stores/useGamificationStore";
import { useGratitudeStore } from "../src/stores/useGratitudeStore";
import { useHabitStore } from "../src/stores/useHabitStore";
import { useObjectiveStore } from "../src/stores/useObjectiveStore";
import { useSecondMindStore } from "../src/stores/useSecondMindStore";
import { useSmarterGoalStore } from "../src/stores/useSmarterGoalStore";
import { useStudyStore } from "../src/stores/useStudyStore";
import { useTaskStore } from "../src/stores/useTaskStore";
import { useUserStore } from "../src/stores/useUserStore";
import { syncData } from "../src/services/sync/syncService";
import { COLORS } from "../src/utils/constants";
import { today } from "../src/utils/dateHelpers";

export { ErrorBoundary };

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const { session, restoreSession, isLoading: authLoading } = useAuthStore();
  const { user, loadUser } = useUserStore();
  const loadHabits       = useHabitStore((s) => s.loadData);
  const loadGamification = useGamificationStore((s) => s.loadData);
  const loadSecondMind   = useSecondMindStore((s) => s.loadData);
  const loadTasks        = useTaskStore((s) => s.loadData);
  const loadAgenda       = useAgendaStore((s) => s.loadByDate);
  const loadObjectives   = useObjectiveStore((s) => s.loadData);
  const loadSmarterGoals = useSmarterGoalStore((s) => s.loadData);
  const loadStudy        = useStudyStore((s) => s.loadData);
  const loadGratitude    = useGratitudeStore((s) => s.loadData);
  const loadBrain        = useBrainStore((s) => s.loadData);

  useDailyReset();
  useAutoRefresh();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (session?.user.id) {
      loadUser(session.user.id);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!user?.id) return;

    const uid      = user.id;
    const todayStr = today();

    const loadAll = () =>
      Promise.allSettled([
        loadHabits(uid),
        loadGamification(uid),
        loadSecondMind(uid),
        loadTasks(uid),
        loadAgenda(uid, todayStr),
        loadObjectives(uid),
        loadSmarterGoals(uid),
        loadStudy(uid),
        loadGratitude(uid),
        loadBrain(uid),
      ]).then((results) => {
        results.forEach((result, index) => {
          if (result.status === "rejected") {
            const names = [
              "loadHabits", "loadGamification", "loadSecondMind",
              "loadTasks", "loadAgenda", "loadObjectives", "loadSmarterGoals",
              "loadStudy", "loadGratitude", "loadBrain",
            ];
            console.error(`[_layout] ${names[index]} falhou:`, result.reason);
          }
        });
      });

    // 1. Carrega dados locais imediatamente (r‡pido, mesmo dispositivo)
    loadAll();

    // 2. Sincroniza com Supabase em background Ñ garante dados em novos dispositivos
    //    Se pulled > 0, recarrega os stores para refletir os dados novos
    syncData(uid)
      .then((result) => {
        const hadNewData = result.tables && result.tables.some(
          (t) => t.pulled > 0
        );
        if (result.status === "success" && hadNewData) {
          loadAll();
        }
      })
      .catch((e) => console.warn("[_layout] Sync background error:", e));
  }, [user?.id]);

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack
        screenOptions={{
          headerStyle:      { backgroundColor: COLORS.surface },
          headerTintColor:  COLORS.text,
          headerTitleStyle: { fontWeight: "700", color: COLORS.text },
          contentStyle:     { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index"          options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"         options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)"   options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
        <Stack.Screen name="modal"          options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="modals"         options={{ presentation: "modal", headerShown: false }} />
        <Stack.Screen name="settings"       options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}