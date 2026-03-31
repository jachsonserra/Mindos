/**
 * MindOS Auth Service
 */
import type { AuthSession, AuthUser } from "../../types/auth.types";
import { getSupabaseClient } from "../sync/supabaseClient";

export const AuthService = {
  async signUp(email: string, password: string): Promise<{ session: AuthSession; user: AuthUser } | null> {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Supabase n‹o configurado");

    const { data, error } = await client.auth.signUp({ email: email.toLowerCase(), password });
    if (error || !data.user) throw new Error(error?.message ?? "Falha ao criar conta.");

    const session: AuthSession = {
      accessToken: data.session?.access_token ?? "",
      user: { id: data.user.id, email: data.user.email ?? "" },
      expiresAt: data.session?.expires_at,
    };
    return { session, user: session.user };
  },

  async signIn(email: string, password: string): Promise<{ session: AuthSession; user: AuthUser } | null> {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Supabase n‹o configurado");

    const { data, error } = await client.auth.signInWithPassword({ email: email.toLowerCase(), password });
    if (error || !data.user || !data.session) throw new Error(error?.message ?? "Email ou senha incorretos.");

    const session: AuthSession = {
      accessToken: data.session.access_token,
      user: { id: data.user.id, email: data.user.email ?? "" },
      expiresAt: data.session.expires_at,
    };
    return { session, user: session.user };
  },

  async signInWithGoogle(): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Supabase n‹o configurado");

    const redirectTo =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://mindos-blush.vercel.app";

    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) throw new Error(error.message);
  },

  async getSession(): Promise<AuthSession | null> {
    const client = await getSupabaseClient();
    if (!client) return null;

    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session) return null;

      return {
        accessToken: session.access_token,
        user: { id: session.user.id, email: session.user.email ?? "" },
        expiresAt: session.expires_at,
      };
    } catch {
      return null;
    }
  },

  async signOut(): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) return;
    await client.auth.signOut();
  },

  async resetPassword(email: string): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) throw new Error("Supabase n‹o configurado");

    const redirectTo = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? "https://mindos-blush.vercel.app/auth/reset";
    const { error } = await client.auth.resetPasswordForEmail(email.toLowerCase(), { redirectTo });
    if (error) throw new Error(error.message ?? "Erro ao resetar senha.");
  },

  async updatePassword(_token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 6) throw new Error("A nova senha deve ter pelo menos 6 caracteres.");

    const client = await getSupabaseClient();
    if (!client) throw new Error("Supabase n‹o configurado");

    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message ?? "Erro ao atualizar senha.");
  },
};