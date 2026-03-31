import { create } from 'zustand';
import { changeLanguage, type SupportedLanguage } from '../i18n';

interface LanguageState {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: 'pt',
  setLanguage: async (lang) => {
    await changeLanguage(lang);
    set({ language: lang });
  },
}));
