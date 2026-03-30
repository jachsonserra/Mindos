/**
 * Auth Store — Zustand
 * Gerencia sessão e autenticação globalmente
 */

import { create } from "zustand";
import { AuthService } from "../services/auth/authService";
import type { AuthSession } from "../types/auth.types";

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Ações
  restoreSession: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: true,
  isAuthenticated: false,

  restoreSession: async () => {
    set({ isLoading: true });
    try {
      const session = await AuthService.getSession();
      set({ session, isAuthenticated: !!session, isLoading: false });
    } catch (e) {
      console.error("[Auth] Erro ao restaurar sessão:", e);
      set({ isAuthenticated: false, isLoading: false });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.signUp(email, password);
      if (result) {
        set({
          session: result.session,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (e: unknown) {
      // CORREÇÃO: "catch (e: any)" → "catch (e: unknown)"
      // Com "any", poderíamos acidentalmente acessar e.foo sem verificar o tipo.
      // Com "unknown", o TypeScript EXIGE que verifiquemos antes de acessar campos.
      // "instanceof Error" verifica se "e" é uma instância da classe Error do JS.
      // Se não for (ex: alguém lançou uma string ou número), usamos String(e).
      console.error("[Auth] Erro ao criar conta:", e instanceof Error ? e.message : String(e));
      set({ isLoading: false });
      throw e; // Re-throw para que a tela de SignUp possa mostrar o Alert correto.
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const result = await AuthService.signIn(email, password);
      if (result) {
        set({
          session: result.session,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (e: unknown) {
      // Mesmo padrão: catch unknown, não any.
      console.error("[Auth] Erro ao entrar:", e instanceof Error ? e.message : String(e));
      set({ isLoading: false });
      throw e; // Re-throw para a tela de SignIn mostrar o Alert com a mensagem de erro.
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
