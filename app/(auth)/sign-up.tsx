import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "../../src/utils/constants";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle, isLoading } = useAuthStore();
  const [name,            setName]            = useState("");
  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass,        setShowPass]        = useState(false);
  const [errors,          setErrors]          = useState<{
    name?: string; email?: string; password?: string; confirmPassword?: string;
  }>({});

  function validate() {
    const e: typeof errors = {};
    if (!name.trim())                                    e.name            = "Nome é obrigatório";
    if (!email.trim())                                   e.email           = "Email é obrigatório";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email           = "Email inválido";
    if (!password)                                       e.password        = "Senha é obrigatória";
    else if (password.length < 6)                        e.password        = "Mínimo 6 caracteres";
    if (confirmPassword !== password)                    e.confirmPassword = "Senhas não conferem";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSignUp() {
    if (!validate()) return;
    try {
      await signUp(email.toLowerCase(), password);
      // Confirmação de email desabilitada — vai direto para o app
      router.replace("/(onboarding)/welcome" as any);
    } catch (err) {
      Alert.alert("Erro ao criar conta", err instanceof Error ? err.message : "Tente novamente");
    }
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle();
    } catch (err) {
      Alert.alert("Erro com Google", err instanceof Error ? err.message : "Tente novamente");
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Back to landing */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace("/" as any)}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>

        {/* Brand */}
        <View style={s.brand}>
          <View style={s.brandIcon}><View style={s.brandDot} /></View>
          <Text style={s.brandName}>MindOS</Text>
          <Text style={s.brandTagline}>Comece sua jornada hoje</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Criar conta</Text>
          <Text style={s.cardSub}>Grátis para sempre</Text>

          {/* Google button */}
          <TouchableOpacity style={[s.googleBtn, isLoading && s.btnDisabled]} onPress={handleGoogle} disabled={isLoading} activeOpacity={0.85}>
            <Text style={s.googleIcon}>G</Text>
            <Text style={s.googleText}>Continuar com Google</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>ou</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Nome */}
          <View style={s.field}>
            <Text style={s.label}>Nome</Text>
            <View style={[s.inputWrap, errors.name && s.inputWrapError]}>
              <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input} placeholder="Seu nome" placeholderTextColor={COLORS.textMuted}
                autoCapitalize="words" value={name}
                onChangeText={(t) => { setName(t); if (errors.name) setErrors({ ...errors, name: undefined }); }}
                editable={!isLoading}
              />
            </View>
            {errors.name && <Text style={s.errorText}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={s.field}>
            <Text style={s.label}>Email</Text>
            <View style={[s.inputWrap, errors.email && s.inputWrapError]}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input} placeholder="seu@email.com" placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email}
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
                style={[s.input, { flex: 1 }]} placeholder="Mínimo 6 caracteres"
                placeholderTextColor={COLORS.textMuted} secureTextEntry={!showPass} value={password}
                onChangeText={(t) => { setPassword(t); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                editable={!isLoading}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={s.eyeBtn}>
                <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={16} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={s.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirmar Senha */}
          <View style={s.field}>
            <Text style={s.label}>Confirmar senha</Text>
            <View style={[s.inputWrap, errors.confirmPassword && s.inputWrapError]}>
              <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textMuted} style={s.inputIcon} />
              <TextInput
                style={s.input} placeholder="Repita a senha" placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPass} value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
                editable={!isLoading}
              />
            </View>
            {errors.confirmPassword && <Text style={s.errorText}>{errors.confirmPassword}</Text>}
          </View>

          <TouchableOpacity style={[s.btn, isLoading && s.btnDisabled]} onPress={handleSignUp} disabled={isLoading} activeOpacity={0.85}>
            {isLoading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.btnText}>Criar conta grátis</Text>}
          </TouchableOpacity>
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>Já tem conta? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in" as any)} disabled={isLoading}>
            <Text style={s.footerLink}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, justifyContent: "center", paddingHorizontal: SPACING.xl, paddingVertical: SPACING.xxl },
  backBtn: { position: "absolute", top: SPACING.xl, left: SPACING.xl, padding: SPACING.sm },
  brand:  { alignItems: "center", marginBottom: SPACING.xxl, gap: SPACING.sm },
  brandIcon: {
    width: 52, height: 52, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primaryMuted, borderWidth: 1, borderColor: COLORS.primaryDark,
    alignItems: "center", justifyContent: "center", marginBottom: SPACING.sm,
  },
  brandDot: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  brandName:    { ...TYPOGRAPHY.h2, color: COLORS.text, letterSpacing: 0.5 },
  brandTagline: { ...TYPOGRAPHY.body, color: COLORS.textMuted },
  card: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
    gap: SPACING.md, marginBottom: SPACING.xl,
  },
  cardTitle: { ...TYPOGRAPHY.h3, color: COLORS.text },
  cardSub:   { ...TYPOGRAPHY.body, color: COLORS.textSecondary, marginTop: -SPACING.sm, marginBottom: SPACING.sm },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, height: 48,
  },
  googleIcon: { fontSize: 18, fontWeight: "800", color: "#4285F4" },
  googleText: { ...TYPOGRAPHY.body, color: COLORS.text, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { ...TYPOGRAPHY.caption, color: COLORS.textMuted },
  field:         { gap: SPACING.xs },
  label:         { ...TYPOGRAPHY.bodySmall, color: COLORS.textSecondary, fontWeight: "600" },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, height: 48,
  },
  inputWrapError: { borderColor: COLORS.error },
  inputIcon:  { marginRight: SPACING.sm },
  input: { flex: 1, ...TYPOGRAPHY.body, color: COLORS.text, outlineStyle: "none" as any },
  eyeBtn:    { padding: SPACING.xs },
  errorText: { ...TYPOGRAPHY.caption, color: COLORS.error },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    height: 50, alignItems: "center", justifyContent: "center", marginTop: SPACING.sm,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 4 },
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { ...TYPOGRAPHY.h4, color: "#fff", letterSpacing: 0.3 },
  footer:      { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  footerText:  { ...TYPOGRAPHY.body, color: COLORS.textSecondary },
  footerLink:  { ...TYPOGRAPHY.body, color: COLORS.primary, fontWeight: "700" },
});
