import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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

export default function Index() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isLoading: authLoading, isOnboarded, authUserId } = useUserStore();
  const { session, isLoading: sessionLoading } = useAuthStore();

  const FEATURES = [
    { icon: "flame-outline",         color: "#FF6B35", titleKey: "landing.features.habits.title",   descKey: "landing.features.habits.desc" },
    { icon: "trophy-outline",        color: "#FFD700", titleKey: "landing.features.xp.title",       descKey: "landing.features.xp.desc" },
    { icon: "flag-outline",          color: "#4ECDC4", titleKey: "landing.features.goals.title",    descKey: "landing.features.goals.desc" },
    { icon: "hardware-chip-outline", color: "#A78BFA", titleKey: "landing.features.coach.title",    descKey: "landing.features.coach.desc" },
    { icon: "albums-outline",        color: "#34D399", titleKey: "landing.features.mind.title",     descKey: "landing.features.mind.desc" },
    { icon: "heart-outline",         color: "#F87171", titleKey: "landing.features.gratitude.title", descKey: "landing.features.gratitude.desc" },
  ];

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
        <Text style={s.heroSub}>{t('landing.tagline')}</Text>
        <Text style={s.heroDesc}>{t('landing.description')}</Text>

        <Pressable
          style={({ pressed }) => [s.btnPrimary, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/sign-up" as any)}
        >
          <Ionicons name="rocket-outline" size={18} color="#fff" />
          <Text style={s.btnPrimaryText}>{t('landing.ctaStart')}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.btnSecondary, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/sign-in" as any)}
        >
          <Text style={s.btnSecondaryText}>{t('landing.ctaLogin')}</Text>
        </Pressable>
      </Animated.View>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { value: "28", labelKey: "landing.stats.modules" },
          { value: "∞",  labelKey: "landing.stats.habits"  },
          { value: "100%", labelKey: "landing.stats.private" },
        ].map((stat) => (
          <View key={stat.labelKey} style={s.statItem}>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{t(stat.labelKey as any)}</Text>
          </View>
        ))}
      </View>

      {/* Features */}
      <View style={s.section}>
        <View style={s.grid}>
          {FEATURES.map((f) => (
            <View key={f.titleKey} style={s.card}>
              <View style={[s.cardIcon, { backgroundColor: f.color + "22" }]}>
                <Ionicons name={f.icon as any} size={24} color={f.color} />
              </View>
              <Text style={s.cardTitle}>{t(f.titleKey as any)}</Text>
              <Text style={s.cardDesc}>{t(f.descKey as any)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={s.bottomCta}>
        <Pressable
          style={({ pressed }) => [s.btnPrimary, s.btnLarge, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/sign-up" as any)}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={s.btnPrimaryText}>{t('auth.signUp.button')}</Text>
        </Pressable>
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
});
