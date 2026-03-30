import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/utils/constants';

const MENU_ITEMS = [
  {
    icon: 'checkmark-circle' as const,
    label: 'Tarefas',
    subtitle: 'Organize com Pareto 20%',
    route: '/(tabs)/tasks',
    color: '#5A8A5A',
  },
  {
    icon: 'heart' as const,
    label: 'Diário',
    subtitle: 'Gratidão + Cookie Jar',
    route: '/(tabs)/gratitude',
    color: '#C4882A',
  },
  {
    icon: 'book' as const,
    label: 'Estudos',
    subtitle: 'Pomodoro + anotações',
    route: '/(tabs)/studies',
    color: '#9B4A7A',
  },
  {
    icon: 'bar-chart' as const,
    label: 'Progresso',
    subtitle: 'XP, streak e heatmap',
    route: '/(tabs)/progress',
    color: '#4A7A9B',
  },
  {
    icon: 'trophy' as const,
    label: 'Missões',
    subtitle: 'Desafios e conquistas',
    route: '/(tabs)/missions',
    color: '#C4882A',
  },
  {
    icon: 'git-network' as const,
    label: 'Segunda Mente',
    subtitle: 'Grafo de ideias e nós',
    route: '/(tabs)/second-mind',
    color: '#7A4A9B',
  },
  {
    icon: 'analytics' as const,
    label: 'Insights',
    subtitle: 'Padrões detectados pelo app',
    route: '/(tabs)/insights',
    color: '#E53935',
  },
  {
    icon: 'chatbubble-ellipses' as const,
    label: 'Coach IA',
    subtitle: 'Seu coach pessoal com contexto',
    route: '/(tabs)/coach',
    color: '#E53935',
  },
] as const;

export default function MoreScreen() {
  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>Mais</Text>
        <Text style={s.subtitle}>Todas as funcionalidades</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.grid}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={s.card}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[s.iconWrap, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={s.cardLabel}>{item.label}</Text>
              <Text style={s.cardSub}>{item.subtitle}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dica */}
        <View style={s.tipCard}>
          <Text style={s.tipTitle}>💡 Dica de produtividade</Text>
          <Text style={s.tipText}>
            "Toda semana, 3 ações garantem 80% do resultado. Qual hábito diário puxa o resto?"
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  scroll: { paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%', backgroundColor: COLORS.surface,
    borderRadius: 16, padding: 16, gap: 8,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
  },
  iconWrap: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  tipCard: {
    marginTop: 20, backgroundColor: `${COLORS.primary}12`,
    borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: COLORS.primary, gap: 8,
  },
  tipTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  tipText: { fontSize: 13, color: COLORS.text, lineHeight: 20, fontStyle: 'italic' },
});
