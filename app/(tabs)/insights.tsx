import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { COLORS } from '../../src/utils/constants';
import { useInsightStore } from '../../src/stores/useInsightStore';
import { useUserStore } from '../../src/stores/useUserStore';
import { Insight, InsightType } from '../../src/types/insight.types';

// ─── Cores por tipo ───────────────────────────────────────────────────────────

const TYPE_STYLE: Record<InsightType, { accent: string; bg: string }> = {
  streak:      { accent: '#FF6D00', bg: 'rgba(255,109,0,0.08)'  },
  trend:       { accent: '#26C6DA', bg: 'rgba(38,198,218,0.08)' },
  correlation: { accent: '#5AB4FF', bg: 'rgba(90,180,255,0.08)' },
  pattern:     { accent: '#AB47BC', bg: 'rgba(171,71,188,0.08)' },
  celebration: { accent: '#FFD54F', bg: 'rgba(255,213,79,0.08)' },
  attention:   { accent: '#FF8A65', bg: 'rgba(255,138,101,0.08)'},
  theme:       { accent: '#66BB6A', bg: 'rgba(102,187,106,0.08)'},
};

const TYPE_LABEL: Record<InsightType, string> = {
  streak:      'SEQUÊNCIA',
  trend:       'TENDÊNCIA',
  correlation: 'CORRELAÇÃO',
  pattern:     'PADRÃO',
  celebration: 'CONQUISTA',
  attention:   'ATENÇÃO',
  theme:       'TEMA',
};

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────

function MiniBarChart({ data }: { data: { label: string; value: number; color?: string }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <View style={chart.wrap}>
      {data.map((d, i) => (
        <View key={i} style={chart.col}>
          <View style={chart.barWrap}>
            <View
              style={[
                chart.bar,
                {
                  height: Math.max(4, (d.value / max) * 48),
                  backgroundColor: d.color ?? COLORS.primary,
                },
              ]}
            />
          </View>
          <Text style={chart.label} numberOfLines={2}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({ item }: { item: Insight }) {
  const style = TYPE_STYLE[item.type];

  return (
    <View style={[card.wrap, { backgroundColor: style.bg, borderColor: style.accent + '40' }]}>
      {/* Badge de tipo */}
      <View style={[card.badge, { backgroundColor: style.accent + '20' }]}>
        <Text style={[card.badgeText, { color: style.accent }]}>{TYPE_LABEL[item.type]}</Text>
      </View>

      {/* Corpo principal */}
      <View style={card.body}>
        <Text style={card.emoji}>{item.emoji}</Text>
        <View style={card.textBlock}>
          <Text style={card.title}>{item.title}</Text>
          <Text style={card.desc}>{item.description}</Text>
        </View>
      </View>

      {/* Highlight numérico */}
      {item.highlight && (
        <View style={[card.highlightBox, { borderColor: style.accent + '30' }]}>
          <Text style={[card.highlightNumber, { color: style.accent }]}>{item.highlight}</Text>
          {item.highlightLabel && (
            <Text style={card.highlightLabel}>{item.highlightLabel}</Text>
          )}
        </View>
      )}

      {/* Mini gráfico */}
      {item.chartData && item.chartData.length > 0 && (
        <MiniBarChart data={item.chartData} />
      )}
    </View>
  );
}

// ─── Header Stats ─────────────────────────────────────────────────────────────

function ProfileStats({
  mood, consistency, streak, objectives,
}: {
  mood: number | null;
  consistency: number;
  streak: number;
  objectives: number;
}) {
  const stats = [
    { label: 'Humor médio', value: mood ? `${mood}/5` : '—', emoji: '😊' },
    { label: 'Consistência', value: `${consistency}%`, emoji: '🎯' },
    { label: 'Maior sequência', value: streak > 0 ? `${streak}d` : '—', emoji: '🔥' },
    { label: 'Objetivos', value: `${objectives}`, emoji: '🏔️' },
  ];

  return (
    <View style={stats_.wrap}>
      {stats.map((s, i) => (
        <View key={i} style={stats_.card}>
          <Text style={stats_.emoji}>{s.emoji}</Text>
          <Text style={stats_.value}>{s.value}</Text>
          <Text style={stats_.label}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────

export default function InsightsScreen() {
  const { user } = useUserStore();
  const { profile, insights, isLoading, generate } = useInsightStore();

  useFocusEffect(
    useCallback(() => {
      if (user?.id) generate(user.id);
    }, [user?.id])
  );

  const onRefresh = () => {
    if (user?.id) generate(user.id, true);
  };

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Insights</Text>
          <Text style={s.subtitle}>O app analisando você por você</Text>
        </View>
        <Text style={s.titleEmoji}>🧠</Text>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Stats rápidos do perfil */}
        {profile && (
          <ProfileStats
            mood={profile.moodAvgLast7}
            consistency={profile.habitConsistency14d}
            streak={profile.longestCurrentStreak}
            objectives={profile.activeObjectivesCount}
          />
        )}

        {/* Sentimentos mais frequentes */}
        {profile && profile.topFeelings.length > 0 && (
          <View style={s.feelingsSection}>
            <Text style={s.feelingsLabel}>SENTIMENTOS MAIS FREQUENTES</Text>
            <View style={s.feelingsTags}>
              {profile.topFeelings.map((f, i) => (
                <View key={f} style={[s.feelingTag, i === 0 && s.feelingTagTop]}>
                  <Text style={[s.feelingTagText, i === 0 && s.feelingTagTextTop]}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Estado de carregamento */}
        {isLoading && !profile && (
          <View style={s.loadingState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingText}>Analisando seus dados...</Text>
          </View>
        )}

        {/* Estado vazio — sem dados */}
        {!isLoading && !profile && (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>🌱</Text>
            <Text style={s.emptyTitle}>Seus insights estão crescendo</Text>
            <Text style={s.emptyText}>
              O motor de análise precisa de alguns dias de dados para detectar padrões. Veja o que fazer:
            </Text>
            <View style={s.emptySteps}>
              {[
                { icon: '🌅', text: 'Faça 3 check-ins diários (manhã, tarde, noite)' },
                { icon: '✅', text: 'Marque seus hábitos por pelo menos 5 dias' },
                { icon: '🎯', text: 'Adicione pelo menos 1 objetivo ativo' },
              ].map((step, i) => (
                <View key={i} style={s.emptyStep}>
                  <Text style={s.emptyStepIcon}>{step.icon}</Text>
                  <Text style={s.emptyStepText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Sem insights gerados mas perfil existe */}
        {!isLoading && profile && insights.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyEmoji}>📊</Text>
            <Text style={s.emptyTitle}>Padrões em formação</Text>
            <Text style={s.emptyText}>
              Você já tem dados — o motor está aguardando consistência suficiente para gerar conclusões confiáveis.
            </Text>
            <View style={s.emptySteps}>
              {[
                { icon: '📅', text: 'Continue os check-ins por mais 3–5 dias' },
                { icon: '🔁', text: 'Mantenha a sequência de hábitos ativa' },
                { icon: '🔄', text: 'Puxe para baixo para forçar a análise agora' },
              ].map((step, i) => (
                <View key={i} style={s.emptyStep}>
                  <Text style={s.emptyStepIcon}>{step.icon}</Text>
                  <Text style={s.emptyStepText}>{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cards de insight */}
        {insights.map(item => (
          <InsightCard key={item.id} item={item} />
        ))}

        {/* Rodapé explicativo */}
        {insights.length > 0 && (
          <View style={s.footer}>
            <Text style={s.footerText}>
              ✦ Insights gerados automaticamente cruzando hábitos, humor e reflexões.
              Puxe para baixo para atualizar.
            </Text>
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: COLORS.background },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14 },
  title:        { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle:     { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  titleEmoji:   { fontSize: 32 },
  scroll:       { paddingHorizontal: 16, paddingTop: 4, gap: 14 },

  feelingsSection: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  feelingsLabel:   { fontSize: 10, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1, marginBottom: 10 },
  feelingsTags:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feelingTag:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  feelingTagTop:   { backgroundColor: COLORS.primaryMuted, borderColor: COLORS.primary + '50' },
  feelingTagText:  { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  feelingTagTextTop: { color: COLORS.primary, fontWeight: '700' },

  loadingState: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingText:  { fontSize: 14, color: COLORS.textSecondary },

  emptyState:   { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyCard:    {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, gap: 12,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  emptyEmoji:   { fontSize: 48 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptyText:    { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptySteps:   { width: '100%', gap: 10, marginTop: 4 },
  emptyStep:    {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 12,
  },
  emptyStepIcon:  { fontSize: 20 },
  emptyStepText:  { fontSize: 13, color: COLORS.textSecondary, flex: 1, lineHeight: 18 },

  footer:       { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  footerText:   { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, textAlign: 'center' },
});

const card = StyleSheet.create({
  wrap:           { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12 },
  badge:          { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:      { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  body:           { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji:          { fontSize: 30, lineHeight: 36 },
  textBlock:      { flex: 1, gap: 4 },
  title:          { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  desc:           { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  highlightBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, paddingTop: 10 },
  highlightNumber: { fontSize: 22, fontWeight: '800' },
  highlightLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
});

const chart = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  col:     { flex: 1, alignItems: 'center', gap: 4 },
  barWrap: { width: '100%', height: 52, justifyContent: 'flex-end', alignItems: 'center' },
  bar:     { width: '70%', borderRadius: 4, minHeight: 4 },
  label:   { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', lineHeight: 12 },
});

const stats_ = StyleSheet.create({
  wrap:  { flexDirection: 'row', gap: 10 },
  card:  { flex: 1, backgroundColor: COLORS.surface, borderRadius: 14, padding: 12, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  emoji: { fontSize: 20 },
  value: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  label: { fontSize: 9, color: COLORS.textMuted, textAlign: 'center', lineHeight: 12 },
});
