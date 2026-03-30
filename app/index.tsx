import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useUserStore } from "../src/stores/useUserStore";
import { COLORS } from "../src/utils/constants";

export default function Index() {
  const router = useRouter();
  const { isLoading, isOnboarded, authUserId } = useUserStore();
  const { session, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    // 1. Aguardar auth ser restaurada
    if (authLoading) return;

    // 2. Sem sessão → login (onboarding nunca deve aparecer sem sessão)
    if (!session?.user.id) {
      router.replace("/(auth)/sign-in" as any);
      return;
    }

    // 3. Sessão existe — aguardar loadUser completar para este session.user.id.
    //
    // PROBLEMA (race condition): isLoading começa como false (padrão no store),
    // então entre "session foi restaurada" e "loadUser foi chamado e setou isLoading=true"
    // há um render onde authLoading=false, isLoading=false, session existe, mas user=null.
    // Isso fazia o app redirecionar indevidamente para onboarding.
    //
    // SOLUÇÃO: authUserId só é preenchido após loadUser() completar.
    // Enquanto authUserId !== session.user.id, sabemos que loadUser ainda não terminou.
    if (isLoading || authUserId !== session.user.id) return;

    // 4. loadUser completou — agora é seguro avaliar o estado do onboarding.
    // O onboarding só deve ocorrer uma única vez: quando o usuário nunca completou.
    // Após isso, qualquer re-abertura do app vai direto para tabs (ou login se deslogado).
    if (!isOnboarded) {
      router.replace("/(onboarding)/welcome" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  }, [authLoading, isLoading, session?.user.id, authUserId, isOnboarded]);

  // Loading screen enquanto aguarda
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
  },
});
