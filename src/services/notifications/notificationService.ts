import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Routine } from '../../types/habit.types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// GUARD GLOBAL: notificações push não existem no web/Electron.
// expo-notifications lança UnavailabilityError para qualquer chamada de
// agendamento na plataforma web, bloqueando o onboarding inteiro.
// Todos os métodos abaixo retornam silenciosamente quando Platform.OS === 'web'.
// Conceito: "graceful degradation" — a funcionalidade não existe, mas o app não quebra.

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    // Web não tem push notifications nativas — retorna false sem lançar erro.
    // O Electron usa o sistema de notificações do Chromium, mas expo-notifications
    // não implementa isso. Para notificações no Electron, usaria o módulo
    // 'electron' diretamente (Notification API do sistema).
    if (Platform.OS === 'web') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('mindos', {
        name: 'MindOS',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async scheduleRoutineReminder(routine: Routine): Promise<string[]> {
    const ids: string[] = [];
    if (Platform.OS === 'web') return ids; // sem agendamento no web
    if (!routine.triggerTime || !routine.isActive) return ids;

    const [hours, minutes] = routine.triggerTime.split(':').map(Number);
    const daysOfWeek: number[] = JSON.parse(routine.daysOfWeek);

    const messages: Record<string, string> = {
      morning: 'Comece com uma Primeira Vitória. Arrume a cama agora.',
      work: 'Use a Regra dos 5 Minutos. Comece sem pensar.',
      evening: 'Reflita sobre o dia. Escreva na Segunda Mente.',
      custom: `Sua rotina "${routine.title}" está esperando por você.`,
    };

    for (const day of daysOfWeek) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Hora da rotina: ${routine.title}`,
          body: messages[routine.type] || messages.custom,
          data: { routineId: routine.id, type: 'routine' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day,
          hour: hours,
          minute: minutes,
        },
      });
      ids.push(id);
    }
    return ids;
  },

  async scheduleMomentumWarning(): Promise<void> {
    if (Platform.OS === 'web') return; // UnavailabilityError no web — ignorar silenciosamente
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Seu Momentum está caindo',
        body: 'Você ainda tem tempo hoje. Complete pelo menos um hábito.',
        data: { type: 'momentum_warning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 20,
        minute: 0,
      },
    });
  },

  /**
   * Agenda uma notificação ONE-SHOT para às 21h de hoje se o usuário ainda
   * tem hábitos pendentes. Retorna o ID da notificação agendada (ou '' se
   * já passou das 21h ou estiver no web/Electron).
   */
  async scheduleEveningStreakWarning(pendingCount: number): Promise<string> {
    if (Platform.OS === 'web') return '';
    const now = new Date();
    const target = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0,
    );
    const secondsUntil = Math.floor((target.getTime() - now.getTime()) / 1000);
    if (secondsUntil <= 60) return ''; // já passou das 21h (ou falta menos de 1 min)

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Não quebre sua sequência!',
        body:
          pendingCount === 1
            ? 'Você ainda tem 1 hábito para hoje. Não desperdice seu progresso!'
            : `Você ainda tem ${pendingCount} hábitos para hoje. Não quebre a sequência!`,
        data: { type: 'evening_streak_warning' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntil,
        repeats: false,
      } as any,
    });
    return id;
  },

  async scheduleStreakProtection(habitTitle: string, streakDays: number): Promise<void> {
    if (Platform.OS === 'web') return;
    if (streakDays < 3) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Não quebre sua sequência de ${streakDays} dias!`,
        body: `"${habitTitle}" está esperando. Não desperdice seu progresso.`,
        data: { type: 'streak_protection' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 30,
      },
    });
  },

  async scheduleZeigarnikReminder(taskTitle: string, minutesLater: number): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tarefa inacabada te chamando...',
        body: `"${taskTitle}" ainda está incompleta. Seu cérebro não vai descansar.`,
        data: { type: 'zeigarnik' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutesLater * 60,
      },
    });
  },

  async scheduleDopamineBlockEnd(durationMinutes: number): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bloqueio matinal concluído',
        body: 'Você protegeu sua dopamina. Agora execute com foco total.',
        data: { type: 'dopamine_block_end' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: durationMinutes * 60,
      },
    });
  },

  // ─── Novos métodos ────────────────────────────────────────────────────────────

  async scheduleHabitReminder(habitId: string, habitTitle: string, hourStr: string): Promise<string> {
    if (Platform.OS === 'web') return '';
    const [hour, minute] = hourStr.split(':').map(Number);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚡ Hora do seu hábito',
        body: `"${habitTitle}" te espera. Lembre: versão 2 minutos conta!`,
        data: { type: 'habit_reminder', habitId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  },

  async scheduleTaskReminder(taskId: string, taskTitle: string, dateStr: string, hourStr: string): Promise<string> {
    if (Platform.OS === 'web') return '';
    const [hour, minute] = hourStr.split(':').map(Number);
    const [y, m, d] = dateStr.split('-').map(Number);
    const scheduledDate = new Date(y, m - 1, d, hour, minute, 0);
    const secondsFromNow = Math.max(10, (scheduledDate.getTime() - Date.now()) / 1000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '✅ Tarefa chegando',
        body: `"${taskTitle}" — é hora de agir!`,
        data: { type: 'task_reminder', taskId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.round(secondsFromNow),
      },
    });
    return id;
  },

  async scheduleDailyCheckin(hour = 8, minute = 0): Promise<string> {
    if (Platform.OS === 'web') return '';
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌅 Check-in do dia',
        body: 'Abra o MindOS e defina sua intenção para hoje. 2 minutos mudam tudo.',
        data: { type: 'daily_checkin' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  },

  async scheduleGratitudeReminder(hour = 21, minute = 30): Promise<string> {
    if (Platform.OS === 'web') return '';
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🙏 Momento de gratidão',
        body: 'Anote 3 coisas pelas quais você é grato hoje. Seu futuro agradece.',
        data: { type: 'gratitude_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  },

  async scheduleWeeklyGoalReview(weekday = 1, hour = 19, minute = 0): Promise<string> {
    if (Platform.OS === 'web') return '';
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎯 Revisão semanal das metas',
        body: 'Você evoluiu esta semana? Atualize seu progresso no MindOS.',
        data: { type: 'weekly_goal_review' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
    return id;
  },

  async scheduleMotivationalPush(messages: string[], intervalHours = 4): Promise<void> {
    if (Platform.OS === 'web') return;
    for (let i = 0; i < messages.length; i++) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💡 MindOS',
          body: messages[i],
          data: { type: 'motivational' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: (i + 1) * intervalHours * 3600,
        },
      });
    }
  },

  async schedulePomodoroEnd(minutes: number): Promise<string> {
    if (Platform.OS === 'web') return '';
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🍅 Pomodoro concluído!',
        body: 'Faça uma pausa de 5 minutos. Você merece.',
        data: { type: 'pomodoro_end' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: minutes * 60,
      },
    });
    return id;
  },

  /**
   * Agenda 3 lembretes diários de check-in (manhã, tarde e noite).
   * Retorna os IDs das notificações criadas.
   */
  async scheduleCheckInReminders(
    morningHour = 8,
    middayHour  = 13,
    eveningHour = 20,
  ): Promise<string[]> {
    if (Platform.OS === 'web') return [];
    const reminders = [
      {
        hour: morningHour, minute: 0,
        title: '🌅 Check-in da manhã',
        body: 'Como você está começando o dia? 2 minutos de consciência mudam o tom de tudo.',
      },
      {
        hour: middayHour, minute: 0,
        title: '☀️ Check-in da tarde',
        body: 'Meio do dia: como está sua energia e foco agora?',
      },
      {
        hour: eveningHour, minute: 0,
        title: '🌙 Check-in da noite',
        body: 'Encerre o dia com consciência. O que foi bom? O que você aprendeu?',
      },
    ];
    const ids: string[] = [];
    for (const r of reminders) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body:  r.body,
          data:  { type: 'checkin_reminder' },
        },
        trigger: {
          type:   Notifications.SchedulableTriggerInputTypes.DAILY,
          hour:   r.hour,
          minute: r.minute,
        },
      });
      ids.push(id);
    }
    return ids;
  },

  async cancelAll(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  async cancelById(id: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(id);
  },

  async cancelByIds(ids: string[]): Promise<void> {
    if (Platform.OS === 'web') return;
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
  },
};
