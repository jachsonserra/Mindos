import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';
import { PomodoroStatus, POMODORO_WORK_MINUTES } from '../../types/study.types';

interface PomodoroTimerProps {
  status: PomodoroStatus;
  elapsedSeconds: number;
  plannedMinutes?: number;
  subjectTitle?: string;
  pomodoroCount?: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function PomodoroTimer({
  status,
  elapsedSeconds,
  plannedMinutes = POMODORO_WORK_MINUTES,
  subjectTitle,
  pomodoroCount = 0,
  onStart,
  onPause,
  onResume,
  onStop,
}: PomodoroTimerProps) {
  const totalSeconds = plannedMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsedSeconds);
  const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
  const seconds = String(remaining % 60).padStart(2, '0');
  const progress = Math.min(1, elapsedSeconds / totalSeconds);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'running') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [status]);

  const SIZE = 180;
  const STROKE = 8;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUM = 2 * Math.PI * RADIUS;
  const strokeDash = CIRCUM * (1 - progress);

  const isRunning = status === 'running';
  const isIdle = status === 'idle';
  const isPaused = status === 'paused';

  return (
    <View style={styles.container}>
      {subjectTitle && <Text style={styles.subject}>{subjectTitle}</Text>}

      {/* Timer circular (SVG-free com View) */}
      <Animated.View style={[styles.circle, { transform: [{ scale: pulseAnim }] }]}>
        <View style={[styles.circleInner, { borderColor: isRunning ? COLORS.primary : COLORS.border }]}>
          <Text style={styles.timeText}>{minutes}:{seconds}</Text>
          <Text style={styles.statusText}>
            {isIdle ? 'Pronto' : isPaused ? 'Pausado' : 'Focando'}
          </Text>
        </View>
      </Animated.View>

      {/* Indicador de pomodoros */}
      <View style={styles.dots}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i < pomodoroCount && { backgroundColor: COLORS.primary }]}
          />
        ))}
      </View>

      {/* Controles */}
      <View style={styles.controls}>
        {isIdle && (
          <TouchableOpacity style={styles.mainBtn} onPress={onStart}>
            <Ionicons name="play" size={28} color={COLORS.surface} />
          </TouchableOpacity>
        )}
        {isRunning && (
          <>
            <TouchableOpacity style={[styles.mainBtn, styles.pauseBtn]} onPress={onPause}>
              <Ionicons name="pause" size={28} color={COLORS.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopBtn} onPress={onStop}>
              <Ionicons name="stop" size={22} color={COLORS.error} />
            </TouchableOpacity>
          </>
        )}
        {isPaused && (
          <>
            <TouchableOpacity style={styles.mainBtn} onPress={onResume}>
              <Ionicons name="play" size={28} color={COLORS.surface} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopBtn} onPress={onStop}>
              <Ionicons name="stop" size={22} color={COLORS.error} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {pomodoroCount > 0 && (
        <Text style={styles.countText}>🍅 {pomodoroCount} pomodoro{pomodoroCount > 1 ? 's' : ''} hoje</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16 },
  subject: {
    fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center',
  },
  circle: {
    width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12,
    elevation: 6,
  },
  circleInner: {
    width: 160, height: 160, borderRadius: 80, borderWidth: 6,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  timeText: { fontSize: 42, fontWeight: '700', color: COLORS.text, letterSpacing: 2 },
  statusText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.border, borderWidth: 1, borderColor: COLORS.borderStrong,
  },
  controls: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  mainBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    elevation: 6,
  },
  pauseBtn: { backgroundColor: COLORS.warning },
  stopBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: COLORS.error,
    alignItems: 'center', justifyContent: 'center',
  },
  countText: { fontSize: 13, color: COLORS.textSecondary },
});
