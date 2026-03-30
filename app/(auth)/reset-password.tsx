/**
 * Tela de Reset Password — Recuperação de senha via e-mail (Supabase)
 */

import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthService } from "../../src/services/auth/authService";
import { COLORS } from "../../src/utils/constants";

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError("E-mail é obrigatório");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("E-mail inválido");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateEmail()) return;
    setIsLoading(true);
    setError("");
    try {
      await AuthService.resetPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.message ?? "Erro ao enviar e-mail. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Tela de confirmação ───────────────────────────────────────────────────
  if (submitted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={s.successScreen}>
          <View style={s.successIcon}>
            <Ionicons name="mail-open-outline" size={52} color={COLORS.primary} />
          </View>
          <Text style={s.successTitle}>E-mail enviado!</Text>
          <Text style={s.successSub}>
            Verifique a caixa de entrada de{"\n"}
            <Text style={s.successEmail}>{email}</Text>
            {"\n"}e clique no link para redefinir sua senha.
          </Text>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backBtnText}>Voltar para o login</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  // ── Formulário ────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <TouchableOpacity style={s.closeBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={s.header}>
            <Text style={s.title}>Recuperar Senha</Text>
            <Text style={s.subtitle}>
              Digite seu e-mail cadastrado e enviaremos um link para redefinir sua senha.
            </Text>
          </View>

          {/* Campo e-mail */}
          <View style={s.field}>
            <Text style={s.label}>E-mail</Text>
            <View style={[s.inputWrap, !!error && s.inputWrapError]}>
              <Ionicons
                name="mail-outline"
                size={16}
                color={COLORS.textMuted}
                style={s.inputIcon}
              />
              <TextInput
                style={s.input}
                placeholder="seu@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(t) => { setEmail(t); if (error) setError(""); }}
                editable={!isLoading}
                onSubmitEditing={handleSubmit}
                returnKeyType="send"
              />
            </View>
            {!!error && <Text style={s.errorText}>{error}</Text>}
          </View>

          {/* Botão principal */}
          <TouchableOpacity
            style={[s.submitBtn, isLoading && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.submitBtnText}>Enviar link de redefinição</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={s.linkBtn} onPress={() => router.back()} disabled={isLoading}>
            <Text style={s.linkBtnText}>Voltar para o login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  closeBtn: { marginBottom: 32 },

  header: { marginBottom: 32 },
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
  },

  field: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 50,
  },
  inputWrapError: { borderColor: COLORS.error },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 6,
  },

  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  linkBtn: { alignItems: "center", padding: 8 },
  linkBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },

  // ── Tela de sucesso ──────────────────────────────────────────────────────
  successScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: 12,
  },
  successSub: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  successEmail: {
    color: COLORS.primary,
    fontWeight: "700",
  },
  backBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
});
