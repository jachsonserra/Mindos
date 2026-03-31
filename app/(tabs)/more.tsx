import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../src/utils/constants';

const MENU_KEYS = [
  { icon: 'checkmark-circle' as const, labelKey: 'more.items.tasks',      route: '/(tabs)/tasks',       color: '#5A8A5A' },
  { icon: 'heart'            as const, labelKey: 'more.items.journal',    route: '/(tabs)/gratitude',   color: '#C4882A' },
  { icon: 'book'             as const, labelKey: 'more.items.studies',    route: '/(tabs)/studies',     color: '#9B4A7A' },
  { icon: 'bar-chart'        as const, labelKey: 'more.items.progress',   route: '/(tabs)/progress',    color: '#4A7A9B' },
  { icon: 'trophy'           as const, labelKey: 'more.items.missions',   route: '/(tabs)/missions',    color: '#C4882A' },
  { icon: 'git-network'      as const, labelKey: 'more.items.secondMind', route: '/(tabs)/second-mind', color: '#7A4A9B' },
  { icon: 'analytics'        as const, labelKey: 'more.items.insights',   route: '/(tabs)/insights',    color: '#E53935' },
  { icon: 'chatbubble-ellipses' as const, labelKey: 'more.items.coach',   route: '/(tabs)/coach',       color: '#E53935' },
] as const;

export default function MoreScreen() {
  const { t } = useTranslation();

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.title}>{t('more.title')}</Text>
        <Text style={s.subtitle}>{t('more.subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.grid}>
          {MENU_KEYS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={s.card}
              onPress={() => router.push(item.route as any)}
            >
              <View style={[s.iconWrap, { backgroundColor: `${item.color}18` }]}>
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text style={s.cardLabel}>{t(`${item.labelKey}.label` as any)}</Text>
              <Text style={s.cardSub}>{t(`${item.labelKey}.subtitle` as any)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tip */}
        <View style={s.tipCard}>
          <Text style={s.tipTitle}>{t('more.tip.title')}</Text>
          <Text style={s.tipText}>{t('more.tip.text')}</Text>
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
