/**
 * MindOS Auth Service
 * Gerencia autenticação com Supabase Auth
 *
 * Fluxo:
 * 1. signUp: cria conta + usuário local (user_id = auth.uid)
 * 2. signIn: entra em conta existente
 * 3. signOut: sai + limpa sessão local
 * 4. getSession: restaura sessão ao abrir app
 */

import type { AuthSession, AuthUser } from "../../types/auth.types";
import { getSupabaseClient } from "../sync/supabaseClient";

export const AuthService = {
  /**
   * Criar nova conta
   * Cria usuário no Supabase Auth e retorna a sessão
   */
  async signUp(
    email: string,
    password: string,
  ): Promise<{ session: AuthSession; user: AuthUser } | null> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error("Supabase não configurado");
    }

    const { data, error } = await client.auth.signUp({
      email: email.toLowerCase(),
      password,
    });

    if (error || !data.user) {
      throw new Error(
        error?.message ?? "Falha ao criar conta. Tente outro email.",
      );
    }

    const session: AuthSession = {
      accessToken: data.session?.access_token ?? "",
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
      },
      expiresAt: data.session?.expires_at,
    };

    return { session, user: session.user };
  },

  /**
   * Entrar com email/senha
   */
  async signIn(
    email: string,
    password: string,
  ): Promise<{ session: AuthSession; user: AuthUser } | null> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error("Supabase não configurado");
    }

    const { data, error } = await client.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });

    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "Email ou senha incorretos.");
    }

    const session: AuthSession = {
      accessToken: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
      },
      expiresAt: data.session.expires_at,
    };

    return { session, user: session.user };
  },

  /**
   * Obter sessão atual (para restaurar ao abrir app)
   */
  async getSession(): Promise<AuthSession | null> {
    const client = await getSupabaseClient();
    if (!client) {
      return null;
    }

    try {
      const {
        data: { session },
        error,
      } = await client.auth.getSession();

      if (error || !session) {
        return null;
      }

      const authSession: AuthSession = {
        accessToken: session.access_token,
        user: {
          id: session.user.id,
          email: session.user.email ?? "",
        },
        expiresAt: session.expires_at,
      };

      return authSession;
    } catch {
      return null;
    }
  },

  /**
   * Sair da conta
   */
  async signOut(): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) {
      return;
    }

    await client.auth.signOut();
  },

  /**
   * Resetar senha (envia link para email)
   */
  async resetPassword(email: string): Promise<void> {
    const client = await getSupabaseClient();
    if (!client) {
      throw new Error("Supabase não configurado");
    }

    // redirectTo: onde o usuário será levado após clicar no link do email.
    // Em produção: use o scheme do app configurado em app.json, ex: "mindos://auth/reset"
    // Em desenvolvimento Expo: o Expo Go lida com "exp://" automaticamente.
    // Por enquanto usamos a URL web como fallback — substitua pelo deep link quando
    // configurar o scheme no app.json.
    const redirectTo =
      process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL ?? "https://mindos.app/auth/reset";

    const { error } = await client.auth.resetPasswordForEmail(
      email.toLowerCase(),
      { redirectTo },
    );

    if (error) {
      throw new Error(
        error.message ?? "Erro ao resetar senha. Tente novamente.",
      );
    }
  },

  /**
   * Atualizar senha (usado após o usuário clicar no link de reset)
   *
   * COMO FUNCIONA O FLUXO DE RESET NO SUPABASE:
   * 1. Usuário clica em "Esqueceu a senha?" → chamamos resetPassword(email)
   * 2. Supabase envia link por email com um token de sessão temporário
   * 3. Usuário clica no link → Supabase redireciona para o app com
   *    o token na URL (fragment hash: #access_token=...&type=recovery)
   * 4. O SDK do Supabase detecta o fragment, troca o token por uma sessão
   *    ativa automaticamente em auth.onAuthStateChange
   * 5. Com a sessão ativa, chamamos auth.updateUser({ password: newPassword })
   *
   * IMPORTANTE: O parâmetro `token` era ignorado na versão anterior porque
   * o Supabase JS SDK gerencia o token automaticamente via deep link.
   * No Expo, o fluxo é tratado pelo supabaseClient através do onAuthStateChange.
   * Mantemos o parâmetro na assinatura para clareza, mas o SDK não precisa dele.
   *
   * Para deep linking funcionar no Expo, configure em app.json:
   *   "scheme": "mindos"
   * E no redirectTo: "mindos://auth/reset" (URL scheme do app)
   */
  async updatePassword(_token: string, newPassword: string): Promise<void> {
    // Prefixo "_" em "_token" é convenção TypeScript para "parâmetro intencionalmente
    // não usado" — evita warning do compilador sem remover da assinatura pública.

    if (newPassword.length < 6) {
      // Validamos localmente antes de chamar o servidor — economiza round trip.
      throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
    }

    const client = await getSupabaseClient();
    if (!client) {
      throw new Error("Supabase não configurado");
    }

    // auth.updateUser() atualiza a senha do usuário ATUALMENTE AUTENTICADO.
    // O Supabase SDK já gerenciou o token de recovery via onAuthStateChange
    // quando o usuário chegou pelo link de email.
    const { error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message ?? "Erro ao atualizar senha.");
    }
  },
};
