import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../utils/constants';
import {
  MOOD_OPTIONS, FEELING_TAGS, PERIOD_CONFIG,
  MORNING_QUESTIONS, MIDDAY_QUESTIONS, EVENING_QUESTIONS,
  CheckInPeriod, MoodLevel, PeriodEntry,
} from '../../types/checkin.types';
import { MicroCoachingService, CoachingResult } from '../../services/coaching/MicroCoachingService';

interface Props {
  visible: boolean;
  period: CheckInPeriod;
  onSave: (entry: PeriodEntry) => void;
  onClose: () => void;
}

// ── Perguntas adaptativas por humor ──────────────────────────────────────────

const LOW_MOOD_QUESTIONS: Record<CheckInPeriod, string[]> = {
  morning: ['O que está pesando mais antes de começar o dia?', 'O que você precisa de si mesmo agora?'],
  midday:  ['O que está drenando sua energia hoje?', 'Existe algo que você pode fazer agora, mesmo pequeno?'],
  evening: ['O que fez o dia ser difícil?', 'O que você aprendeu sobre si mesmo hoje?'],
};

const HIGH_MOOD_QUESTIONS: Record<CheckInPeriod, string[]> = {
  morning: ['O que está alimentando essa energia hoje?', 'Como você quer usar esse estado positivo?'],
  midday:  ['O que está indo bem e por quê?', 'Que conquista de hoje merece ser lembrada?'],
  evening: ['Qual foi o momento que mais te orgulha hoje?', 'O que fez esse dia ser especial?'],
};

const NEUTRAL_QUESTIONS: Record<CheckInPeriod, string[]> = {
  morning: MORNING_QUESTIONS,
  midday:  MIDDAY_QUESTIONS,
  evening: EVENING_QUESTIONS,
};

function getAdaptiveQuestions(period: CheckInPeriod, mood: MoodLevel | null): string[] {
  if (!mood) return NEUTRAL_QUESTIONS[period];
  if (mood <= 2) return LOW_MOOD_QUESTIONS[period];
  if (mood >= 4) return HIGH_MOOD_QUESTIONS[period];
  return NEUTRAL_QUESTIONS[period];
}

function getAdaptiveGreeting(period: CheckInPeriod, mood: MoodLevel | null): string {
  if (!mood) return PERIOD_CONFIG[period].greeting;
  if (mood <= 2) return period === 'morning'
    ? 'Tudo bem não estar bem. O que está acontecendo?'
    : 'Que peso é esse que você está carregando?';
  if (mood >= 4) return period === 'morning'
    ? 'Boa energia! De onde ela está vindo?'
    : 'Esse estado positivo merece ser entendido.';
  return PERIOD_CONFIG[period].greeting;
}

// ── Component ─────────────────────────────────────────────────────────────────

type Step = 'mood' | 'feelings' | 'questions' | 'coaching';

export function CheckInModal({ visible, period, onSave, onClose }: Props) {
  const config = PERIOD_CONFIG[period];

  const [step, setStep]         = useState<Step>('mood');
  const [mood, setMood]         = useState<MoodLevel | null>(null);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [note, setNote]         = useState('');
  const [answers, setAnswers]   = useState<string[]>(['', '', '']);
  const [coaching, setCoaching] = useState<CoachingResult | null>(null);

  const questions = getAdaptiveQuestions(period, mood);

  function reset() {
    setStep('mood');
    setMood(null);
    setFeelings([]);
    setAnswers(['', '', '']);
    setNote('');
    setCoaching(null);
  }

  function handleClose() { reset(); onClose(); }

  function toggleFeeling(f: string) {
    setFeelings(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  }

  function handleNext() {
    if (step === 'mood' && mood) {
      setStep('feelings');
      return;
    }
    if (step === 'feelings') {
      setStep('questions');
      return;
    }
    if (step === 'questions') {
      const entry: PeriodEntry = {
        mood:        mood!,
        feelings,
        note,
        answers:     answers.slice(0, questions.length),
        completedAt: new Date().toISOString(),
      };
      // Save (fire and forget — parent handles storage)
      onSave(entry);
      // Generate micro-coaching observation
      const result = MicroCoachingService.generate({
        period,
        mood:     mood!,
        feelings,
        answers:  answers.slice(0, questions.length),
      });
      setCoaching(result);
      setStep('coaching');
      return;
    }
    if (step === 'coaching') {
      handleClose();
    }
  }

  const canNext =
    (step === 'mood'      && mood !== null) ||
    (step === 'feelings') ||
    (step === 'questions') ||
    (step === 'coaching');

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.periodBadge}>
              <Text style={s.periodEmoji}>{config.emoji}</Text>
              <Text style={s.periodLabel}>{config.label}</Text>
            </View>
            {/* Steps indicator */}
            <View style={s.stepsRow}>
              {(['mood', 'feelings', 'questions', 'coaching'] as Step[]).map((st, i) => (
                <View
                  key={st}
                  style={[
                    s.stepDot,
                    step === st && s.stepDotActive,
                    (step === 'coaching' || (i < ['mood','feelings','questions','coaching'].indexOf(step))) && s.stepDotDone,
                  ]}
                />
              ))}
            </View>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── STEP 1: HUMOR ── */}
            {step === 'mood' && (
              <View style={s.stepContent}>
                <Text style={s.question}>{config.greeting}</Text>
                <View style={s.moodRow}>
                  {MOOD_OPTIONS.map(m => (
                    <TouchableOpacity
                      key={m.level}
                      style={[s.moodBtn, mood === m.level && s.moodBtnActive]}
                      onPress={() => setMood(m.level)}
                    >
                      <Text style={s.moodEmoji}>{m.emoji}</Text>
                      <Text style={[s.moodLabel, mood === m.level && s.moodLabelActive]}>
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* ── STEP 2: SENTIMENTOS ── */}
            {step === 'feelings' && (
              <View style={s.stepContent}>
                <Text style={s.question}>Como você se descreveria agora?</Text>
                <Text style={s.hint}>Selecione quantos quiser</Text>
                <View style={s.tagsWrap}>
                  {FEELING_TAGS.map(f => (
                    <TouchableOpacity
                      key={f}
                      style={[s.tag, feelings.includes(f) && s.tagActive]}
                      onPress={() => toggleFeeling(f)}
                    >
                      <Text style={[s.tagText, feelings.includes(f) && s.tagTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.noteInput}
                  placeholder="Quer adicionar algo? (opcional)"
                  placeholderTextColor={COLORS.textMuted}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={2}
                />
              </View>
            )}

            {/* ── STEP 3: PERGUNTAS ADAPTATIVAS ── */}
            {step === 'questions' && (
              <View style={s.stepContent}>
                <Text style={s.question}>{getAdaptiveGreeting(period, mood)}</Text>
                {questions.map((q, i) => (
                  <View key={i} style={s.qBlock}>
                    <Text style={s.qLabel}>{q}</Text>
                    <TextInput
                      style={s.qInput}
                      placeholder="Escreva aqui..."
                      placeholderTextColor={COLORS.textMuted}
                      value={answers[i]}
                      onChangeText={v => {
                        const arr = [...answers]; arr[i] = v; setAnswers(arr);
                      }}
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                ))}
              </View>
            )}

            {/* ── STEP 4: MICRO-COACHING ── */}
            {step === 'coaching' && coaching && (
              <View style={s.stepContent}>
                {/* Saved confirmation */}
                <View style={s.savedBadge}>
                  <Text style={s.savedIcon}>✓</Text>
                  <Text style={s.savedText}>Check-in salvo</Text>
                </View>

                {/* Coaching card */}
                <View style={s.coachingCard}>
                  <View style={s.coachingHeader}>
                    <Text style={s.coachingEmoji}>{coaching.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.coachingLabel}>OBSERVAÇÃO DO DIA</Text>
                      <Text style={s.coachingTitle}>{coaching.title}</Text>
                    </View>
                  </View>
                  <Text style={s.coachingObservation}>{coaching.observation}</Text>
                  <View style={s.nudgeBox}>
                    <Text style={s.nudgeLabel}>PRÓXIMO PASSO</Text>
                    <Text style={s.nudgeText}>{coaching.nudge}</Text>
                  </View>
                </View>

                <Text style={s.coachingFooter}>
                  Sua Alma Coach acompanha seu progresso a cada check-in.
                </Text>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={s.footer}>
            {step !== 'mood' && step !== 'coaching' && (
              <TouchableOpacity
                style={s.backBtn}
                onPress={() => setStep(step === 'questions' ? 'feelings' : 'mood')}
              >
                <Text style={s.backTxt}>← Voltar</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.nextBtn, !canNext && s.nextBtnDisabled]}
              onPress={handleNext}
              disabled={!canNext}
            >
              <Text style={s.nextTxt}>
                {step === 'questions' ? '✓ Salvar' : step === 'coaching' ? 'Fechar' : 'Continuar →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  periodBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
  },
  periodEmoji: { fontSize: 16 },
  periodLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },

  // Step dots
  stepsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  stepDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: COLORS.primary, width: 16, borderRadius: 3 },
  stepDotDone: { backgroundColor: `${COLORS.primary}60` },

  closeBtn: { padding: 4 },
  closeTxt: { fontSize: 16, color: COLORS.textMuted },

  stepContent: { gap: 16 },
  question: { fontSize: 18, fontWeight: '700', color: COLORS.text, lineHeight: 26 },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: -8 },

  // Humor
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  moodBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    paddingVertical: 14, borderWidth: 2, borderColor: 'transparent',
  },
  moodBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryMuted },
  moodEmoji: { fontSize: 26 },
  moodLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  moodLabelActive: { color: COLORS.primary },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border,
  },
  tagActive: { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary },
  tagText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tagTextActive: { color: COLORS.primary, fontWeight: '700' },
  noteInput: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    padding: 12, color: COLORS.text, fontSize: 14, lineHeight: 20,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 60,
  },

  // Perguntas
  qBlock: { gap: 8 },
  qLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  qInput: {
    backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md,
    padding: 12, color: COLORS.text, fontSize: 14, lineHeight: 20,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 70,
  },

  // Saved badge
  savedBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10,
    backgroundColor: `${COLORS.success ?? '#22c55e'}18`,
    borderRadius: RADIUS.md,
  },
  savedIcon: { fontSize: 16, color: COLORS.success ?? '#22c55e', fontWeight: '700' },
  savedText: { fontSize: 14, fontWeight: '700', color: COLORS.success ?? '#22c55e' },

  // Micro-coaching
  coachingCard: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.lg ?? 16,
    padding: 18,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  coachingHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  coachingEmoji: { fontSize: 32, lineHeight: 40 },
  coachingLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.primary,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2,
  },
  coachingTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, lineHeight: 22 },
  coachingObservation: {
    fontSize: 14, color: COLORS.textSecondary, lineHeight: 22,
  },
  nudgeBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md ?? 12,
    padding: 12, gap: 4,
  },
  nudgeLabel: {
    fontSize: 10, fontWeight: '700', color: COLORS.textMuted,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  nudgeText: { fontSize: 14, fontWeight: '600', color: COLORS.text, lineHeight: 20 },
  coachingFooter: {
    fontSize: 12, color: COLORS.textMuted,
    textAlign: 'center', fontStyle: 'italic',
  },

  // Footer
  footer: {
    flexDirection: 'row', gap: 12, marginTop: 16,
    paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  backBtn: {
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceAlt,
  },
  backTxt: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  nextBtn: {
    flex: 1, paddingVertical: 14, borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
