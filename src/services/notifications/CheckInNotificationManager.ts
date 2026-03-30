/**
 * CheckInNotificationManager
 *
 * Gerencia o agendamento único dos 3 lembretes diários de check-in.
 * Garante que as notificações só sejam agendadas uma vez por instalação
 * (ou quando o usuário explicitamente reativa nas configurações).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from './notificationService';

const STORAGE_KEY = 'checkInNotifIds:v1';
const ENABLED_KEY = 'checkInNotifsEnabled:v1';

export const CheckInNotificationManager = {
  /**
   * Agenda os lembretes se ainda não estiverem agendados.
   * Chamado na inicialização do app, após permissão.
   */
  async ensureScheduled(): Promise<void> {
    try {
      const enabled = await AsyncStorage.getItem(ENABLED_KEY);
      if (enabled === 'false') return; // usuário desativou explicitamente

      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      if (existing) return; // já agendado

      const ids = await NotificationService.scheduleCheckInReminders();
      if (ids.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        await AsyncStorage.setItem(ENABLED_KEY, 'true');
      }
    } catch { /* silencioso */ }
  },

  /**
   * Cancela todos os lembretes de check-in e marca como desativado.
   */
  async disable(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        await NotificationService.cancelByIds(ids);
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
      await AsyncStorage.setItem(ENABLED_KEY, 'false');
    } catch { /* silencioso */ }
  },

  /**
   * (Re)agenda os lembretes e marca como ativado.
   */
  async enable(): Promise<void> {
    try {
      // Cancela os anteriores se existirem
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ids: string[] = JSON.parse(raw);
        await NotificationService.cancelByIds(ids);
      }
      const ids = await NotificationService.scheduleCheckInReminders();
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      await AsyncStorage.setItem(ENABLED_KEY, 'true');
    } catch { /* silencioso */ }
  },

  async isEnabled(): Promise<boolean> {
    try {
      const v = await AsyncStorage.getItem(ENABLED_KEY);
      return v !== 'false';
    } catch { return true; }
  },
};
