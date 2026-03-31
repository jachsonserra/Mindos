import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import pt from './locales/pt';
import en from './locales/en';

export const SUPPORTED_LANGUAGES = ['pt', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = '@mindos_language';

/** Detecta o idioma padrão: primeiro o salvo pelo usuário, depois o do dispositivo */
async function detectLanguage(): Promise<SupportedLanguage> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
      return saved as SupportedLanguage;
    }
  } catch {/* ignore */}

  // Pega o idioma do dispositivo (ex: "pt-BR" → "pt")
  const deviceLang = (Localization.getLocales()?.[0]?.languageCode ?? 'en').toLowerCase();
  if (deviceLang.startsWith('pt')) return 'pt';
  return 'en';
}

let i18nInitialized = false;

export async function initI18n(): Promise<void> {
  if (i18nInitialized) return;
  i18nInitialized = true;

  const lng = await detectLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources: {
        pt: { translation: pt },
        en: { translation: en },
      },
      lng,
      fallbackLng: 'pt',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });
}

/** Troca o idioma e persiste a escolha */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export { i18n };
export default i18n;
