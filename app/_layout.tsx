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
import { COLORS } from "../src/utils/constants";
import { today } from "../src/utils/dateHelpers";

// Re-exporta ErrorBoundary customizado no lugar do padrão do expo-router
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
  const loadHabits = useHabitStore((s) => s.loadData);
  const loadGamification = useGamificationStore((s) => s.loadData);
  const loadSecondMind = useSecondMindStore((s) => s.loadData);
  const loadTasks = useTaskStore((s) => s.loadData);
  const loadAgenda = useAgendaStore((s) => s.loadByDate);
  const loadObjectives = useObjectiveStore((s) => s.loadData);
  const loadSmarterGoals = useSmarterGoalStore((s) => s.loadData);
  const loadStudy = useStudyStore((s) => s.loadData);
  const loadGratitude = useGratitudeStore((s) => s.loadData);
  const loadBrain = useBrainStore((s) => s.loadData);

  useDailyReset();
  useAutoRefresh();

  // Restaurar sessão ao abrir app
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Carregar dados do usuário local (sincronizado com auth)
  useEffect(() => {
    if (session?.user.id) {
      loadUser(session.user.id);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (!user?.id) return; // Sem usuário logado, não carrega nada.

    const uid = user.id;
    const todayStr = today();

    // CORREÇÃO: antes, todas as funções eram chamadas sem await e sem catch.
    // Se qualquer uma falhasse (banco não inicializado, rede, etc.), o erro
    // seria silenciado e o app ficaria vazio sem nenhuma indicação ao usuário.
    //
    // SOLUÇÃO: Promise.allSettled() — diferença crucial em relação a Promise.all():
    //   Promise.all()        → se UMA falhar, todas param e o erro propaga.
    //   Promise.allSettled() → TODAS rodam; ao final, sabemos o status de cada uma.
    //
    // Isso garante que se um load falhar, os outros ainda carregam.
    // Em um app com muitos módulos independentes, falhar tudo por um erro
    // em um único módulo seria uma péssima experiência de usuário.
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
      // Iteramos sobre os resultados para logar qualquer falha.
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const loadNames = [
            "loadHabits", "loadGamification", "loadSecondMind",
            "loadTasks", "loadAgenda", "loadObjectives", "loadSmarterGoals",
            "loadStudy", "loadGratitude", "loadBrain",
          ];
          console.error(`[_layout] ${loadNames[index]} falhou:`, result.reason);
        }
      });
    });
  }, [user?.id]);

  return (
    <>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: "700", color: COLORS.text },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen
          name="modals"
          options={{ presentation: "modal", headerShown: false }}
        />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
