export type EventType = 'task' | 'routine' | 'habit' | 'custom';
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface AgendaEvent {
  id: string;
  userId: string;
  taskId?: string;
  routineId?: string;
  title: string;
  description?: string;
  startTime: string;   // HH:MM
  endTime?: string;    // HH:MM
  date: string;        // YYYY-MM-DD
  type: EventType;
  color?: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getPeriodFromTime(time: string): DayPeriod {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

export const PERIOD_LABELS: Record<DayPeriod, string> = {
  morning: '☀️ Manhã',
  afternoon: '🌤 Tarde',
  evening: '🌅 Noite',
  night: '🌙 Madrugada',
};

export const PERIOD_ORDER: DayPeriod[] = ['morning', 'afternoon', 'evening', 'night'];
