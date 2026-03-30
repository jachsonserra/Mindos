/**
 * AnthropicKeyService
 *
 * Gerencia a chave da Anthropic API com suporte a override via AsyncStorage.
 * Prioridade: AsyncStorage > .env.local
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'anthropicApiKey:v1';

export const AnthropicKeyService = {
  async getKey(): Promise<string> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored && stored.trim() && stored !== 'sua_chave_aqui') {
        return stored.trim();
      }
    } catch { /* silencioso */ }
    return process.env.EXPO_PUBLIC_ANTHROPIC_KEY ?? '';
  },

  async setKey(key: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, key.trim());
  },

  async clearKey(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
  },

  async isConfigured(): Promise<boolean> {
    const key = await this.getKey();
    return Boolean(key && key !== 'sua_chave_aqui' && key.startsWith('sk-ant'));
  },
};
