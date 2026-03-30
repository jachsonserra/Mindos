import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export function KPICard({ title, value, icon, color = COLORS.primary, subtitle, trend, trendValue }: KPICardProps) {
  const trendColor = trend === 'up' ? COLORS.success : trend === 'down' ? COLORS.error : COLORS.textMuted;
  const trendIcon = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={18} color={color} />
        </View>
        {trend && trendValue && (
          <View style={styles.trend}>
            <Ionicons name={trendIcon} size={12} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>{trendValue}</Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, minWidth: 140,
    backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 14,
    borderLeftWidth: 3,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2, gap: 4,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  trendText: { fontSize: 11, fontWeight: '600' },
  value: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  subtitle: { fontSize: 11, color: COLORS.textMuted },
});
