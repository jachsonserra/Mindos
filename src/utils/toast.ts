/**
 * toast.ts — Feedback leve para o usuário
 *
 * Android: usa ToastAndroid nativo (não interrompe o fluxo)
 * iOS:     usa Alert apenas para erros (único recurso nativo sem biblioteca)
 */

import { Alert, Platform, ToastAndroid } from 'react-native';

export function showToast(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  }
  // iOS não tem toast nativo — silêncio para mensagens informativas
}

export function showError(message: string): void {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`⚠️ ${message}`, ToastAndroid.LONG);
  } else {
    // iOS: Alert curto apenas para erros críticos
    Alert.alert('Erro', message, [{ text: 'OK' }]);
  }
}

export function showSuccess(message: string): void {
  showToast(`✓ ${message}`);
}
