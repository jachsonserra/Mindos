import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../../src/utils/constants';
import { Button } from '../../src/components/ui/Button';

// ── Problemas que o app resolve ────────────────────────────────────────────────

const PROBLEMS = [
  {
    emoji: '🌀',
    title: 'Motivação que não dura',
    desc: 'Você começa cheio de energia e para depois de alguns dias.',
  },
  {
    emoji: '📊',
    title: 'Sem clareza do progresso',
    desc: 'Você trabalha, mas não sente que está avançando de verdade.',
  },
  {
    emoji: '🧩',
    title: 'Hábitos e objetivos desconectados',
    desc: 'O que você faz todo dia não tem ligação clara com o que quer conquistar.',
  },
];

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const [name, setName] = useState('');

  const handleNext = () => {
    if (!name.trim()) return;
    router.push({ pathname: '/(onboarding)/why-anchor', params: { name: name.trim() } });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.logo}>🧠</Text>
          <Text style={styles.title}>MindOS</Text>
          <Text style={styles.subtitle}>Construa a versão de você que funciona.</Text>
        </View>

        {/* Problema-first: o que o app resolve */}
        <View style={styles.problemsSection}>
          <Text style={styles.problemsIntro}>Você se identifica com isso?</Text>
          {PROBLEMS.map((p, i) => (
            <View key={i} style={styles.problemCard}>
              <Text style={styles.problemEmoji}>{p.emoji}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.problemTitle}>{p.title}</Text>
                <Text style={styles.problemDesc}>{p.desc}</Text>
              </View>
            </View>
          ))}
          <View style={styles.solutionBadge}>
            <Text style={styles.solutionText}>
              O MindOS foi construído para resolver exatamente isso — com check-ins diários,
              análise de padrões e um coach que entende seus dados.
            </Text>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Primeiro, como você se chama?</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome..."
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleNext}
          />
        </View>

        <Button
          title="Começar →"
          onPress={handleNext}
          disabled={!name.trim()}
          style={styles.button}
          size="lg"
        />

        <Text style={styles.disclaimer}>
          Seus dados ficam somente no seu dispositivo. Nenhuma conta necessária.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },

  // Problemas
  problemsSection: {
    gap: 10,
    marginBottom: 32,
  },
  problemsIntro: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  problemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  problemEmoji: { fontSize: 22, marginTop: 1 },
  problemTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  problemDesc:  { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  solutionBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    marginTop: 4,
  },
  solutionText: {
    fontSize: 13,
    color: COLORS.primary,
    lineHeight: 20,
    fontWeight: '500',
  },

  // Form
  form: {
    marginBottom: 20,
  },
  label: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button: {
    marginBottom: 16,
  },
  disclaimer: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
});
