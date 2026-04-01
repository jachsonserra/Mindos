import { create } from 'zustand';
import { changeLanguage, i18n, type SupportedLanguage } from '../i18n';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  syncWithI18n: () => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  // Inicializa com o idioma atual do i18n (pode ser 'pt' ou 'en' se já inicializado)
  language: (i18n.language as SupportedLanguage) || 'pt',
  setLanguage: async (lang) => {
    await changeLanguage(lang);
    set({ language: lang });
  },
  // Sincroniza o store com o idioma detectado pelo initI18n()
  syncWithI18n: () => {
    const detected = (i18n.language as SupportedLanguage) || 'pt';
    set({ language: detected });
  },
}));
