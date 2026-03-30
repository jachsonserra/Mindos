import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../../src/utils/constants';
import { useCheckInStore } from '../../src/stores/useCheckInStore';
import { useUserStore } from '../../src/stores/useUserStore';
import {
  PERIOD_CONFIG, MOOD_OPTIONS, getMoodEmoji,
  CheckInPeriod, DailyCheckIn, MoodLevel,
} from '../../src/types/checkin.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateFull(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDateShort(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  const isToday = dt.toDateString() === today.toDateString();
  if (isToday) return 'Hoje';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (dt.toDateString() === yesterday.toDateString()) return 'Ontem';
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function moodColor(level?: MoodLevel | null): string {
  if (!level) return COLORS.border;
  const map: Record<MoodLevel, string> = {
    1: '#EF5350', 2: '#FF8A65', 3: '#FFD54F', 4: '#66BB6A', 5: '#26C6DA',
  };
  return map[level];
}

function avgMood(item: DailyCheckIn): MoodLevel | null {
  const vals = (['morning', 'midday', 'evening'] as CheckInPeriod[])
    .map(p => item[p]?.mood).filter(Boolean) as MoodLevel[];
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) as MoodLevel;
}

// ─── DayCard ──────────────────────────────────────────────────────────────────

function DayCard({ item, onPress }: { item: DailyCheckIn; onPress: () => void }) {
  const avg = avgMood(item);
  const periods: CheckInPeriod[] = ['morning', 'midday', 'evening'];
  const answered = periods.filter(p => item[p]).length;

  return (
    <TouchableOpacity style={c.card} onPress={onPress} activeOpacity={0.82}>
      {/* Linha superior: data + badge médio */}
      <View style={c.cardTop}>
        <Text style={c.cardDate}>{formatDateShort(item.date)}</Text>
        <View style={c.cardRight}>
          {avg && (
            <View style={[c.avgBadge, { backgroundColor: moodColor(avg) + '22', borderColor: moodColor(avg) + '55' }]}>
              <Text style={c.avgEmoji}>{getMoodEmoji(avg)}</Text>
              <Text style={[c.avgLabel, { color: moodColor(avg) }]}>
                {MOOD_OPTIONS.find(m => m.level === avg)?.label}
              </Text>
            </View>
          )}
          <Text style={c.chevron}>›</Text>
        </View>
      </View>

      {/* Períodos */}
      <View style={c.periodsRow}>
        {periods.map(p => {
          const entry = item[p];
          return (
            <View key={p} style={[c.periodPill, !entry && c.periodPillEmpty]}>
              <Text style={c.periodEmoji}>{PERIOD_CONFIG[p].emoji}</Text>
              <View>
                <Text style={c.periodName}>{PERIOD_CONFIG[p].label}</Text>
                {entry
                  ? <Text style={[c.periodMood, { color: moodColor(entry.mood) }]}>{getMoodEmoji(entry.mood)}</Text>
                  : <Text style={c.periodSkipped}>—</Text>
                }
              </View>
            </View>
          );
        })}
      </View>

      {/* Progresso */}
      {answered < 3 && (
        <Text style={c.incomplete}>{answered} de 3 períodos respondidos</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── DayDetail (bottom sheet modal) ──────────────────────────────────────────

const QUESTIONS: Record<CheckInPeriod, string[]> = {
  morning: ['Pelo que você é grato hoje de manhã?'],
  midday:  ['O que está ocupando mais sua mente agora?', 'O que você realizou até aqui hoje?'],
  evening: ['Qual foi o melhor momento do seu dia?', 'O que você aprendeu hoje?', 'O que faria diferente amanhã?'],
};

function DayDetail({ item, onClose }: { item: DailyCheckIn; onClose: () => void }) {
  const periods: CheckInPeriod[] = ['morning', 'midday', 'evening'];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={det.overlay}>
        <TouchableOpacity style={det.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={det.sheet}>
          {/* Handle */}
          <View style={det.handle} />

          {/* Cabeçalho */}
          <View style={det.header}>
            <View>
              <Text style={det.dateShort}>{formatDateShort(item.date)}</Text>
              <Text style={det.dateFull}>{formatDateFull(item.date)}</Text>
            </View>
            {(() => {
              const avg = avgMood(item);
              return avg ? (
                <View style={[det.avgBadgeLg, { backgroundColor: moodColor(avg) + '22' }]}>
                  <Text style={det.avgEmojiLg}>{getMoodEmoji(avg)}</Text>
                </View>
              ) : null;
            })()}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {periods.map(p => {
              const entry = item[p];
              return (
                <View key={p} style={det.section}>
                  {/* Cabeçalho do período */}
                  <View style={det.periodRow}>
                    <Text style={det.periodIcon}>{PERIOD_CONFIG[p].emoji}</Text>
                    <Text style={det.periodLabel}>{PERIOD_CONFIG[p].label}</Text>
                    {entry && (
                      <View style={[det.moodChip, { backgroundColor: moodColor(entry.mood) + '25' }]}>
                        <Text style={det.moodChipEmoji}>{getMoodEmoji(entry.mood)}</Text>
                        <Text style={[det.moodChipLabel, { color: moodColor(entry.mood) }]}>
                          {MOOD_OPTIONS.find(m => m.level === entry.mood)?.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!entry ? (
                    <Text style={det.notAnswered}>Não respondido neste período</Text>
                  ) : (
                    <>
                      {/* Tags de sentimento */}
                      {entry.feelings.length > 0 && (
                        <View style={det.tagsRow}>
                          {entry.feelings.map(f => (
                            <View key={f} style={det.tag}>
                              <Text style={det.tagText}>{f}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Respostas às perguntas */}
                      {entry.answers.map((ans, i) => ans.trim() ? (
                        <View key={i} style={det.qBlock}>
                          <Text style={det.qQuestion}>{QUESTIONS[p][i]}</Text>
                          <Text style={det.qAnswer}>{ans}</Text>
                        </View>
                      ) : null)}

                      {/* Nota livre */}
                      {entry.note ? (
                        <View style={det.noteBlock}>
                          <Text style={det.noteText}>✏️  {entry.note}</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              );
            })}
            <View style={{ height: 48 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────

export default function AlmaScreen() {
  const { user }  = useUserStore();
  const { history, loadData } = useCheckInStore();
  const [expanded, setExpanded] = useState<DailyCheckIn | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadData(user.id);
    }, [user?.id])
  );

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Alma</Text>
          <Text style={s.subtitle}>Seu diário de humor</Text>
        </View>
        <Text style={s.titleEmoji}>🫧</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {history.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>🌱</Text>
            <Text style={s.emptyTitle}>Nenhum registro ainda</Text>
            <Text style={s.emptyText}>
              O app irá te perguntar como você está ao longo do dia.{'\n'}
              Suas respostas aparecerão aqui.
            </Text>
          </View>
        ) : (
          history.map(item => (
            <DayCard key={item.id} item={item} onPress={() => setExpanded(item)} />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>

      {expanded && (
        <DayDetail item={expanded} onClose={() => setExpanded(null)} />
      )}
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: COLORS.background },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  title:      { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle:   { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  titleEmoji: { fontSize: 32 },
  scroll:     { paddingHorizontal: 16, paddingTop: 4, gap: 12 },
  empty:      { alignItems: 'center', paddingTop: 72, gap: 12 },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptyText:  { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
});

const c = StyleSheet.create({
  card:          { backgroundColor: COLORS.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate:      { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardRight:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avgBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  avgEmoji:      { fontSize: 14 },
  avgLabel:      { fontSize: 12, fontWeight: '600' },
  chevron:       { fontSize: 22, color: COLORS.textMuted, marginLeft: 2 },
  periodsRow:    { flexDirection: 'row', gap: 8 },
  periodPill:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border },
  periodPillEmpty: { opacity: 0.45 },
  periodEmoji:   { fontSize: 18 },
  periodName:    { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  periodMood:    { fontSize: 15, marginTop: 2 },
  periodSkipped: { fontSize: 15, color: COLORS.textMuted, marginTop: 2 },
  incomplete:    { fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
});

const det = StyleSheet.create({
  overlay:      { flex: 1 },
  backdrop:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:        { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, maxHeight: '90%' },
  handle:       { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  dateShort:    { fontSize: 20, fontWeight: '800', color: COLORS.text },
  dateFull:     { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  avgBadgeLg:   { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avgEmojiLg:   { fontSize: 26 },
  section:      { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16, marginBottom: 16, gap: 10 },
  periodRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  periodIcon:   { fontSize: 20 },
  periodLabel:  { fontSize: 15, fontWeight: '700', color: COLORS.text, flex: 1 },
  moodChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  moodChipEmoji: { fontSize: 13 },
  moodChipLabel: { fontSize: 12, fontWeight: '600' },
  notAnswered:  { fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  tagsRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:          { backgroundColor: COLORS.surfaceAlt, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:      { fontSize: 12, color: COLORS.textSecondary },
  qBlock:       { gap: 4, backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12 },
  qQuestion:    { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  qAnswer:      { fontSize: 14, color: COLORS.text, lineHeight: 20, marginTop: 4 },
  noteBlock:    { backgroundColor: COLORS.primaryMuted, borderRadius: 12, padding: 12 },
  noteText:     { fontSize: 14, color: COLORS.text, lineHeight: 20, fontStyle: 'italic' },
});
