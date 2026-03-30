import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { COLORS } from '../../utils/constants';
import { Button } from '../ui/Button';

interface Props {
  onClose: () => void;
  userId: string;
}

type TimerState = 'idle' | 'running' | 'paused' | 'completed';

export function FiveMinuteTimer({ onClose, userId }: Props) {
  const [state, setState] = useState<TimerState>('idle');
  const [seconds, setSeconds] = useState(5 * 60);
  const [task, setTask] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = 5 * 60;
  const progress = 1 - seconds / total;

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setState('completed');
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [state]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Regra dos 5 Minutos</Text>
        <View style={{ width: 32 }} />
      </View>

      <Text style={styles.subtitle}>
        {state === 'idle' && 'Comprometa-se apenas com 5 minutos. O início é tudo.'}
        {state === 'running' && 'Fudoshin — mente imóvel. Continue.'}
        {state === 'paused' && 'Efeito Zeigarnik ativado. Sua mente quer terminar.'}
        {state === 'completed' && '5 minutos cumpridos! Quer continuar?'}
      </Text>

      {/* Timer circle */}
      <View style={styles.timerContainer}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
          <Text style={styles.timerState}>{state === 'running' ? 'ATIVO' : state === 'completed' ? '✓' : ''}</Text>
        </View>
      </View>

      {/* Controles */}
      <View style={styles.controls}>
        {state === 'idle' && (
          <Button
            title="Iniciar sem pensar →"
            onPress={() => setState('running')}
            size="lg"
            style={styles.controlBtn}
          />
        )}
        {state === 'running' && (
          <View style={styles.controlRow}>
            <Button
              title="Pausar"
              onPress={() => setState('paused')}
              variant="secondary"
              style={styles.controlBtnHalf}
            />
            <Button
              title="Concluir"
              onPress={() => setState('completed')}
              style={styles.controlBtnHalf}
            />
          </View>
        )}
        {state === 'paused' && (
          <View style={styles.controlRow}>
            <Button
              title="Retomar"
              onPress={() => setState('running')}
              style={styles.controlBtnHalf}
            />
            <Button
              title="Fechar"
              onPress={onClose}
              variant="ghost"
              style={styles.controlBtnHalf}
            />
          </View>
        )}
        {state === 'completed' && (
          <View style={styles.completedSection}>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+15 XP ganhos!</Text>
            </View>
            <View style={styles.controlRow}>
              <Button
                title="Mais 5min"
                onPress={() => { setSeconds(5 * 60); setState('running'); }}
                style={styles.controlBtnHalf}
              />
              <Button
                title="Encerrar"
                onPress={onClose}
                variant="secondary"
                style={styles.controlBtnHalf}
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.tipBox}>
        <Text style={styles.tipText}>
          💡 Uma vez iniciado, a mente odeia deixar coisas inacabadas — Efeito Zeigarnik.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: { fontSize: 20, color: COLORS.textSecondary, padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  subtitle: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 32,
  },
  timerContainer: { alignItems: 'center', marginBottom: 40 },
  timerCircle: {
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.surface,
    borderWidth: 6,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: { fontSize: 48, fontWeight: '800', color: COLORS.text },
  timerState: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  controls: { marginBottom: 24 },
  controlBtn: { width: '100%' },
  controlRow: { flexDirection: 'row', gap: 12 },
  controlBtnHalf: { flex: 1 },
  completedSection: { gap: 16 },
  xpBadge: {
    backgroundColor: COLORS.success + '20',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  xpBadgeText: { color: COLORS.success, fontWeight: '700', fontSize: 16 },
  tipBox: {
    backgroundColor: COLORS.primary + '15',
    borderRadius: 12,
    padding: 14,
  },
  tipText: { color: COLORS.primary, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});