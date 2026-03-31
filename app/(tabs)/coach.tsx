import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/constants';
import { AnthropicKeyService } from '../../src/services/ai/AnthropicKeyService';
import { useCoachStore, CoachChatMessage } from '../../src/stores/useCoachStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { useHabitStore } from '../../src/stores/useHabitStore';
import { useObjectiveStore } from '../../src/stores/useObjectiveStore';
import { useCheckInStore } from '../../src/stores/useCheckInStore';
import { useInsightStore } from '../../src/stores/useInsightStore';

// ─── Blink cursor animado durante streaming ────────────────────────────────────

function BlinkCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return <Animated.Text style={[msg_.cursor, { opacity }]}>▍</Animated.Text>;
}

// ─── Bolha de mensagem ────────────────────────────────────────────────────────

function MessageBubble({ item }: { item: CoachChatMessage }) {
  const isUser = item.role === 'user';

  return (
    <View style={[msg_.row, isUser && msg_.rowUser]}>
      {!isUser && (
        <View style={msg_.avatar}>
          <Text style={msg_.avatarEmoji}>🧠</Text>
        </View>
      )}
      <View style={[
        msg_.bubble,
        isUser ? msg_.bubbleUser : msg_.bubbleCoach,
        item.isStreaming && msg_.bubbleStreaming,
      ]}>
        <Text style={[msg_.text, isUser && msg_.textUser]}>
          {item.content}
        </Text>
        {item.isStreaming && <BlinkCursor />}
      </View>
    </View>
  );
}

// ─── Sugestões rápidas ────────────────────────────────────────────────────────

// Quick prompts are i18n-aware — rendered inside the component

function QuickPrompts({ onSelect }: { onSelect: (text: string) => void }) {
  const { t } = useTranslation();
  const prompts: string[] = t('coach.quickPrompts', { returnObjects: true }) as string[];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={qp.wrap}
    >
      {prompts.map(p => (
        <TouchableOpacity key={p} style={qp.chip} onPress={() => onSelect(p)}>
          <Text style={qp.chipText}>{p}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Banner de chave ausente ──────────────────────────────────────────────────

function NoKeyBanner() {
  const { t } = useTranslation();
  return (
    <View style={s.noKeyBanner}>
      <Text style={s.noKeyEmoji}>🔑</Text>
      <Text style={s.noKeyTitle}>{t('coach.noKey.title')}</Text>
      <Text style={s.noKeyText}>{t('coach.noKey.text')}</Text>
    </View>
  );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────

export default function CoachScreen() {
  const { t }              = useTranslation();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput]     = useState('');
  const [hasKey, setHasKey]   = useState(true);

  const { user }       = useUserStore();
  const { habits } = useHabitStore();
  const { objectives } = useObjectiveStore();
  const { history: checkInHistory } = useCheckInStore();
  const { profile: insightProfile } = useInsightStore();

  const {
    messages, isStreaming, initContext, send,
    clearHistory, addOpeningMessage, loadHistory, persistHistory,
  } = useCoachStore();

  // Verifica chave, carrega histórico e inicializa contexto
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      AnthropicKeyService.isConfigured().then(valid => {
        setHasKey(valid);
        if (!valid) return;

        // Carrega histórico persistido antes de gerar abertura
        loadHistory(user.id).then(() => {
          const last7 = checkInHistory.slice(0, 7);
          initContext({
            user,
            habits:         habits.filter(h => h.isActive),
            objectives:     objectives ?? [],
            recentCheckIns: last7,
            insightProfile: insightProfile ?? null,
          });
          addOpeningMessage(user, insightProfile ?? null);
        });
      });
    }, [user?.id, insightProfile?.generatedAt])
  );

  // Auto-scroll para o fim
  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input;
    setInput('');
    await send(text);
    // Persiste histórico após cada troca
    if (user?.id) {
      const { messages: updated } = useCoachStore.getState();
      persistHistory(user.id, updated);
    }
  };

  if (!hasKey) return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>{t('coach.title')}</Text>
        <Text style={s.titleEmoji}>🧠</Text>
      </View>
      <NoKeyBanner />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t('coach.title')}</Text>
          <Text style={s.subtitle}>
            {user?.name ? t('coach.contextLoaded', { name: user.name }) : t('coach.personalCoach')}
          </Text>
        </View>
        <TouchableOpacity onPress={clearHistory} style={s.clearBtn}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Mensagens */}
        <ScrollView
          ref={scrollRef}
          style={s.messagesWrap}
          contentContainerStyle={s.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🧠</Text>
              <Text style={s.emptyTitle}>{t('coach.loadingContext')}</Text>
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
            </View>
          )}

          {messages.map(item => (
            <MessageBubble key={item.id} item={item} />
          ))}
        </ScrollView>

        {/* Sugestões rápidas — aparece só se poucos messages */}
        {messages.length <= 2 && !isStreaming && (
          <QuickPrompts onSelect={(t) => { setInput(t); }} />
        )}

        {/* Input */}
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={input}
            onChangeText={setInput}
            placeholder={t('coach.inputPlaceholder')}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={1000}
            editable={!isStreaming}
            onSubmitEditing={Platform.OS !== 'web' ? handleSend : undefined}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || isStreaming) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title:        { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  titleEmoji:   { fontSize: 28 },
  clearBtn:     { padding: 8 },

  messagesWrap: { flex: 1 },
  messagesList: { padding: 16, gap: 12, paddingBottom: 8 },

  emptyState:   { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 15, color: COLORS.textSecondary },

  inputWrap: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1, backgroundColor: COLORS.surfaceAlt,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    color: COLORS.text, fontSize: 14, maxHeight: 120,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },

  noKeyBanner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 12,
  },
  noKeyEmoji:  { fontSize: 48 },
  noKeyTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  noKeyText:   { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  noKeyCode:   { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: COLORS.primary, fontSize: 12 },
});

const msg_ = StyleSheet.create({
  row:            { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '88%' },
  rowUser:        { alignSelf: 'flex-end', flexDirection: 'row-reverse' },
  avatar:         { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryMuted, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  avatarEmoji:    { fontSize: 16 },
  bubble:         { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '100%', flexShrink: 1 },
  bubbleCoach:    { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderBottomLeftRadius: 4 },
  bubbleUser:     { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  bubbleStreaming:{ borderColor: COLORS.primary + '60' },
  text:           { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  textUser:       { color: '#fff' },
  cursor:         { fontSize: 14, color: COLORS.primary },
});

const qp = StyleSheet.create({
  wrap:    { paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexDirection: 'row' },
  chip:    { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipText:{ fontSize: 13, color: COLORS.textSecondary },
});
