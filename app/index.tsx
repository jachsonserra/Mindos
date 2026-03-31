import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuthStore } from "../src/stores/useAuthStore";
import { useUserStore } from "../src/stores/useUserStore";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../src/utils/constants";

const FEATURES = [
  { icon: "flame-outline",         color: "#FF6B35", title: "Hábitos & Rotinas",  desc: "Construa hábitos com gamificação e streaks diários" },
  { icon: "trophy-outline",        color: "#FFD700", title: "XP & Missões",       desc: "Ganhe pontos por cada conquista e suba de nível" },
  { icon: "flag-outline",          color: "#4ECDC4", title: "Metas SMARTER",      desc: "Defina e acompanhe objetivos com checkpoints reais" },
  { icon: "hardware-chip-outline", color: "#A78BFA", title: "Coach IA",           desc: "Assistente mental que te conhece de verdade" },
  { icon: "albums-outline",        color: "#34D399", title: "Second Mind",        desc: "Notas, ideias e pensamentos sempre organizados" },
  { icon: "heart-outline",         color: "#F87171", title: "Gratidão Diária",    desc: "Diário de gratidão para manter o foco no positivo" },
];

export default function Index() {
  const router = useRouter();
  const { isLoading: authLoading, isOnboarded, authUserId } = useUserStore();
  const { session, isLoading: sessionLoading } = useAuthStore();

  useEffect(() => {
    if (sessionLoading || authLoading) return;
    if (!session?.user.id) return;
    if (authUserId !== session.user.id) return;
    if (!isOnboarded) {
      router.replace("/(onboarding)/welcome" as any);
    } else {
      router.replace("/(tabs)" as any);
    }
  }, [sessionLoading, authLoading, session?.user.id, authUserId, isOnboarded]);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  if (sessionLoading || session?.user.id) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <Animated.View style={[s.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={s.logoWrap}>
          <View style={s.logoDot} />
        </View>
        <Text style={s.heroTitle}>MindOS</Text>
        <Text style={s.heroSub}>Sua mente. Organizada.</Text>
        <Text style={s.heroDesc}>
          O sistema operacional da sua vida — hábitos, metas, XP e inteligência artificial em um só lugar.
        </Text>

        <Pressable
          style={({ pressed }) => [s.btnPrimary, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/sign-up" as any)}
        >
          <Ionicons name="rocket-outline" size={18} color="#fff" />
          <Text style={s.btnPrimaryText}>Começar agora — é grátis</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.btnSecondary, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/sign-in" as any)}
        >
          <Text style={s.btnSecondaryText}>Já tenho conta</Text>
        </Pressable>
      </Animated.View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { value: "28",   label: "módulos"  },
          { value: "∞",    label: "hábitos"  },
          { value: "100%", label: "privado"  },
        ].map((stat) => (
          <View key={stat.label} style={s.statItem}>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Features */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>Tudo que você precisa</Text>
        <View style={s.grid}>
          {FEATURES.map((f) => (
            <View key={f.title} style={s.card}>
              <View style={[s.cardIcon, { backgroundColor: f.color + "22" }]}>
                <Ionicons name={f.icon as any} size={24} color={f.color} />
              </View>
              <Text style={s.cardTitle}>{f.title}</Text>
              <Text style={s.cardDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={s.bottomCta}>
        <Text style={s.bottomCtaTitle}>Pronto para organizar sua mente?</Text>
        <Pressable
          style={({ pressed }) => [s.btnPrimary, s.btnLarge, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/sign-up" as any)}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={s.btnPrimaryText}>Criar conta grátis</Text>
        </Pressable>
        <Text style={s.bottomNote}>Sem cartão de crédito. Sem prazo.</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background },
  scroll:  { paddingBottom: 60 },

  hero: {
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingTop: 72,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },
  logoWrap: {
    width: 64, height: 64, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1, borderColor: COLORS.primaryDark,
    alignItems: "center", justifyContent: "center",
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary, shadowOpacity: 0.4,
    shadowRadius: 20, shadowOffset: { width: 0, height: 0 },
  },
  logoDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOpacity: 0.9,
    shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  heroTitle: { ...TYPOGRAPHY.h1, color: COLORS.text, letterSpacing: 0.5, marginTop: 4 },
  heroSub:   { ...TYPOGRAPHY.h4, color: COLORS.primary, letterSpacing: 0.3 },
  heroDesc:  {
    ...TYPOGRAPHY.body, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 24, marginTop: 4, marginBottom: 8,
    maxWidth: 320,
  },

  btnPrimary: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    paddingVertical: 14, paddingHorizontal: 28, width: "100%",
    justifyContent: "center",
    shadowColor: COLORS.primary, shadowOpacity: 0.4,
    shadowRadius: 16, shadowOffset: { width: 0, height: 4 },
  },
  btnLarge:       { paddingVertical: 16 },
  btnPrimaryText: { ...TYPOGRAPHY.h4, color: "#fff", letterSpacing: 0.3 },
  btnSecondary: {
    borderRadius: RADIUS.md, paddingVertical: 12,
    paddingHorizontal: 28, width: "100%", alignItems: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  btnSecondaryText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary, fontWeight: "600" },
  pressed: { opacity: 0.8 },

  statsRow: {
    flexDirection: "row", justifyContent: "space-around",
    marginHorizontal: SPACING.xl, marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statItem:  { alignItems: "center", gap: 2 },
  statValue: { ...TYPOGRAPHY.h2, color: COLORS.primary },
  statLabel: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },

  section:      { paddingHorizontal: SPACING.xl, marginBottom: SPACING.xxl },
  sectionTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, marginBottom: SPACING.lg },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  card: {
    flex: 1, minWidth: 140,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  cardIcon:  { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: "center", justifyContent: "center" },
  cardTitle: { ...TYPOGRAPHY.bodySmall, color: COLORS.text, fontWeight: "700" },
  cardDesc:  { ...TYPOGRAPHY.caption, color: COLORS.textMuted, lineHeight: 18 },

  bottomCta: {
    alignItems: "center", gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  bottomCtaTitle: { ...TYPOGRAPHY.h3, color: COLORS.text, textAlign: "center" },
  bottomNote:     { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
});
