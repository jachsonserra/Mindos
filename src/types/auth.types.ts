/**
 * Tipos de Autenticação
 */

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
  expiresAt?: number;
}
