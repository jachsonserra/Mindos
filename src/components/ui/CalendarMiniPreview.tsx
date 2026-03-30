import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../utils/constants';
import { today } from '../../utils/dateHelpers';

interface DayData {
  date: string; // YYYY-MM-DD
  eventCount?: number;
  habitCount?: number;
}

interface CalendarMiniPreviewProps {
  days?: DayData[];
  onDayPress?: (date: string) => void;
}

function getWeekDays(): string[] {
  const dates: string[] = [];
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Dom
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7)); // começa segunda
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function CalendarMiniPreview({ days = [], onDayPress }: CalendarMiniPreviewProps) {
  const weekDates = getWeekDays();
  const todayStr = today();
  const dayMap = new Map(days.map((d) => [d.date, d]));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {weekDates.map((date, i) => {
          const data = dayMap.get(date);
          const isToday = date === todayStr;
          const isPast = date < todayStr;
          const hasEvent = (data?.eventCount ?? 0) > 0;
          const hasHabit = (data?.habitCount ?? 0) > 0;
          const [, , day] = date.split('-');

          return (
            <TouchableOpacity
              key={date}
              style={styles.dayCol}
              onPress={() => onDayPress?.(date)}
            >
              <Text style={[styles.dayLabel, isPast && styles.pastLabel]}>{DAY_LABELS[i]}</Text>
              <View style={[
                styles.dayCircle,
                isToday && styles.todayCircle,
                isPast && styles.pastCircle,
              ]}>
                <Text style={[styles.dayNum, isToday && styles.todayNum, isPast && styles.pastNum]}>
                  {day}
                </Text>
              </View>
              {/* Indicadores */}
              <View style={styles.dots}>
                {hasEvent && <View style={[styles.indicator, { backgroundColor: COLORS.primary }]} />}
                {hasHabit && <View style={[styles.indicator, { backgroundColor: COLORS.success }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 4, flex: 1 },
  dayLabel: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '500' },
  pastLabel: { color: COLORS.textMuted },
  dayCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  todayCircle: { backgroundColor: COLORS.primary },
  pastCircle: { opacity: 0.5 },
  dayNum: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  todayNum: { color: COLORS.surface },
  pastNum: { color: COLORS.textMuted },
  dots: { flexDirection: 'row', gap: 2, height: 6, alignItems: 'center' },
  indicator: { width: 5, height: 5, borderRadius: 3 },
});
