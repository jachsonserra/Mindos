import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

interface ParetoTagProps {
  small?: boolean;
}

export function ParetoTag({ small = false }: ParetoTagProps) {
  return (
    <View style={[styles.tag, small && styles.small]}>
      <Ionicons name="star" size={small ? 8 : 10} color={COLORS.celebrate} />
      <Text style={[styles.text, small && styles.smallText]}>TOP 20%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${COLORS.celebrate}20`,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: `${COLORS.celebrate}40`,
  },
  small: { paddingHorizontal: 5, paddingVertical: 2 },
  text: { fontSize: 10, fontWeight: '700', color: COLORS.celebrate },
  smallText: { fontSize: 9 },
});
