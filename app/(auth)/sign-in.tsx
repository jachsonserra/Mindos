/**
 * Tela de Sign In — redesenhada com novo design system dark
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { useAuthStore } from "../../src/stores/useAuthStore";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../../src/utils/constants";

export default function SignInScreen() {
  const router              = useRouter();
  const { signIn, isLoading } = useAuthStore();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [errors,   setErrors]   = useState<{ email?: string; password?: string }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim())                          e.email    = "Email é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Email inválido";
    if (!password)                              e.password = "Senha é obrigatória";
    else if (password.length < 6)              e.password = "Mínimo 6 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignIn() {
    if (!validate()) return;
    try {
      await signIn(email.toLowerCase(), password);
      router.replace("/(tabs)" as any);
    } catch (err) {
      Alert.alert("Erro ao entrar", err instanceof Error ? err.message : "Tente novamente");
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.root}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo / brand ── */}
        <View style={s.brand}>
          <View style={s.brandIcon}>
            <View style={s.brandDot} />
          </View>
          <Text style={s.brandName}>MindOS</Text>
          <Text style={s.brandTagline}>Sua mente. Organizada.</Text>
        </View>

        {/* ── Card do formulário ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Entrar</Text>
          <Text style={s.cardSub}>Bem-vindo de volta</Text>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <View style={[s.inputWrap, errors.email && s.inputWrapError]}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input}
                placeholder="seu@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                editable={!isLoading}
              />
            </View>
            {errors.email && <Text style={s.errorText}>{errors.email}</Text>}
          </View>

          {/* Senha */}
          <View style={s.field}>
            <Text style={s.label}>Senha</Text>
            <View style={[s.inputWrap, errors.password && s.inputWrapError]}>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPass}
                autoComplete="password"
                value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={s.errorText}>{errors.password}</Text>}
          </View>

          {/* Esqueci a senha */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/reset-password" as any)}
            style={s.forgotBtn}
            disabled={isLoading}
          >
            <Text style={s.forgotText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          {/* CTA principal */}
          <TouchableOpacity
            style={[s.btn, isLoading && s.btnDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.btnText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Rodapé: cadastrar ── */}
        <View style={s.footer}>
          <Text style={s.footerText}>Não tem conta? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/sign-up" as any)} disabled={isLoading}>
            <Text style={s.footerLink}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xxl,
  },

  // Brand
  brand: {
    alignItems: "center",
    marginBottom: SPACING.xxl + SPACING.lg,
    gap: SPACING.sm,
  },
  brandIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  brandDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  brandName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  brandTagline: {
    ...TYPOGRAPHY.body,
    color: COLORS.textMuted,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  cardTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  cardSub: {
    ...TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    marginTop: -SPACING.sm,
    marginBottom: SPACING.sm,
  },

  // Fields
  field: { gap: SPACING.xs },
  label: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  inputWrapError: {
    borderColor: COLORS.error,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    outlineStyle: "none" as any,
  },
  eyeBtn: { padding: SPACING.xs },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
  },

  forgotBtn: { alignSelf: "flex-end" },
  forgotText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontWeight: "500",
  },

  // Button
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    ...TYPOGRAPHY.h4,
    color: "#fff",
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  footerLink: { ...TYPOGRAPHY.body, color: COLORS.primary, fontWeight: "700" },
});
