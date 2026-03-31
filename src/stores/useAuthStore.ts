import { create } from "zustand";
import { AuthService } from "../services/auth/authService";
import type { AuthSession } from "../types/auth.types";

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  restoreSession:    () => Promise<void>;
  signUp:            (email: string, password: string) => Promise<void>;
  signIn:            (email: string, password: string) => Promise<void>;
  signInWithGoogle:  () => Promise<void>;
  signOut:           () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session:         null,
  isLoading:       true,
  isAuthenticated: false,

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const session = await AuthService.getSession();
      set({ session, isAuthenticated: !!session, isLoading: false });
    } catch (e) {
      console.error("[Auth] Erro ao restaurar sess‹o:", e);
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.signUp(email, password);
      if (result) set({ session: result.session, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.signIn(email, password);
      if (result) set({ session: result.session, isAuthenticated: true, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true });
    try {
      await AuthService.signInWithGoogle();
      // O Supabase redireciona o browser Ñ a sess‹o ser‡ restaurada via getSession()
      // quando o app carregar novamente ap—s o redirect OAuth
      set({ isLoading: false });
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await AuthService.signOut();
      set({ session: null, isAuthenticated: false, isLoading: false });
    } catch (e) {
      console.error("[Auth] Erro ao sair:", e);
      set({ isLoading: false });
    }
  },
}));