import { create } from "zustand";
import { UserRepository } from "../services/database/userRepository";
import type { User } from "../types/user.types";

interface UserState {
  user: User | null;
  isLoading: boolean;
  isOnboarded: boolean;
  authUserId: string | null; // ID da sessão Supabase Auth

  loadUser: (authUserId?: string) => Promise<void>;
  createUser: (
    data: { name: string; whyAnchor: string; whyAnchorImageUri?: string },
    authUserId: string,
  ) => Promise<User>;
  updateUser: (data: Partial<User>) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearUser: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,

  // CORREÇÃO: isLoading começa como FALSE, não true.
  //
  // BUG: antes era true, causando tela branca permanente no Electron/Web.
  //
  // POR QUE O BUG ACONTECIA:
  // index.tsx aguarda: if (authLoading || isLoading) return
  // Se não há sessão Supabase → _layout.tsx nunca chama loadUser()
  // → isLoading ficava true para sempre → o spinner nunca sumia → tela "branca"
  //
  // PRINCÍPIO CORRETO: isLoading deve ser true APENAS enquanto uma operação
  // assíncrona está ativamente em andamento. No estado inicial, nenhuma
  // operação começou → isLoading = false é o valor semanticamente correto.
  //
  // Quando loadUser() é chamado, ele faz set({ isLoading: true }) logo no
  // início, então o comportamento durante a carga é idêntico ao anterior.
  isLoading: false,
  isOnboarded: false,
  authUserId: null,

  loadUser: async (authUserId?: string) => {
    set({ isLoading: true });
    try {
      let user = null;

      if (authUserId) {
        // Primeira tentativa: buscar pelo ID exato do Supabase Auth.
        user = await UserRepository.getById(authUserId);

        // FALLBACK: se não encontrou pelo UUID do Supabase (pode acontecer quando
        // o usuário foi criado antes de ter auth ou com um ID local diferente),
        // busca o primeiro usuário do banco e migra o ID para o auth UUID.
        // Isso resolve o bug de "pedir o nome toda vez que abre o app".
        if (!user) {
          const fallbackUser = await UserRepository.getFirst();
          if (fallbackUser) {
            // Migra o ID local para corresponder ao Supabase Auth UUID,
            // garantindo que buscas futuras por getById(authUserId) funcionem.
            await UserRepository.updateId(fallbackUser.id, authUserId);
            user = { ...fallbackUser, id: authUserId };
          }
        }
      } else {
        // Sem authUserId (ex: modo offline, primeira abertura sem sessão).
        user = await UserRepository.getFirst();
      }

      set({
        user,
        authUserId: authUserId ?? user?.id ?? null,
        isOnboarded: Boolean(user?.onboardingCompleted),
        isLoading: false,
      });
    } catch (e) {
      console.error("[User] Erro ao carregar:", e);
      set({ isLoading: false });
    }
  },

  createUser: async (data, authUserId) => {
    const user = await UserRepository.create({
      ...data,
      id: authUserId, // user.id local = auth.uid do Supabase
    });
    set({ user, authUserId });
    return user;
  },

  updateUser: async (data) => {
    const { user } = get();
    if (!user) return;
    await UserRepository.update(user.id, data);
    set({ user: { ...user, ...data } });
  },

  completeOnboarding: async () => {
    const { user } = get();
    if (!user) return;
    await UserRepository.completeOnboarding(user.id);
    set({ user: { ...user, onboardingCompleted: true }, isOnboarded: true });
  },

  clearUser: () => {
    set({ user: null, authUserId: null, isOnboarded: false });
  },
}));
