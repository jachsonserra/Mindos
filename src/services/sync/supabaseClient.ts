import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { HybridStorage } from "../storage/indexedDBAdapter";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SYNC_CREDENTIALS_KEY = "mindos_supabase_credentials";

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}

let _client: SupabaseClient<any, any, any, any, any> | null = null;

/**
 * Storage para credenciais Supabase
 * - Web: IndexedDB (HybridStorage com fallback localStorage)
 * - Native: AsyncStorage
 */
const SyncCredentialStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      // Usa IndexedDB com fallback para localStorage
      return HybridStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      // Escreve em IndexedDB (e localStorage como backup)
      await HybridStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      await HybridStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

function createSyncClient(
  creds: SupabaseCredentials,
): SupabaseClient<any, any, any, any, any> {
  // CORREÇÃO: schema era hardcoded como "mindos".
  // Se o projeto Supabase usar o schema padrão "public" (que é o padrão),
  // todas as queries falhariam com "schema 'mindos' not found".
  //
  // Agora lemos de EXPO_PUBLIC_SUPABASE_SCHEMA, com fallback para "public".
  // Para usar schema customizado, adicione ao .env.local:
  //   EXPO_PUBLIC_SUPABASE_SCHEMA=mindos
  //
  // O QUE É UM SCHEMA NO POSTGRESQL?
  // Schema é como uma "pasta" dentro do banco que agrupa tabelas.
  // Supabase cria os schemas "public" (padrão) e "auth" (autenticação).
  // Criar um schema separado "mindos" é boa prática para namespacing,
  // mas requer configuração explícita no Supabase.
  const schema = process.env.EXPO_PUBLIC_SUPABASE_SCHEMA ?? "public";

  return createClient(creds.url, creds.anonKey, { db: { schema } });
}

export async function getSupabaseClient(): Promise<SupabaseClient<
  any,
  any,
  any,
  any,
  any
> | null> {
  if (_client) return _client;

  const stored = await SyncCredentialStorage.getItem(SYNC_CREDENTIALS_KEY);
  if (stored) {
    try {
      const creds: SupabaseCredentials = JSON.parse(stored);
      if (creds.url && creds.anonKey) {
        _client = createSyncClient(creds);
        return _client;
      }
    } catch {
      // credenciais corrompidas
    }
  }

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    _client = createSyncClient({
      url: SUPABASE_URL,
      anonKey: SUPABASE_ANON_KEY,
    });
    return _client;
  }

  return null;
}

export async function saveSupabaseCredentials(
  creds: SupabaseCredentials,
): Promise<void> {
  await SyncCredentialStorage.setItem(
    SYNC_CREDENTIALS_KEY,
    JSON.stringify(creds),
  );
  _client = createSyncClient(creds);
}

export async function clearSupabaseCredentials(): Promise<void> {
  await SyncCredentialStorage.removeItem(SYNC_CREDENTIALS_KEY);
  _client = null;
}

export async function testSupabaseConnection(
  creds: SupabaseCredentials,
): Promise<boolean> {
  try {
    const client = createSyncClient(creds);
    const { error } = await client
      .from("mindos_sync_meta")
      .select("id")
      .limit(1);
    if (error && error.message.toLowerCase().includes("connection"))
      return false;
    return true;
  } catch {
    return false;
  }
}

export async function hasSupabaseCredentials(): Promise<boolean> {
  const stored = await SyncCredentialStorage.getItem(SYNC_CREDENTIALS_KEY);
  if (stored) {
    try {
      const creds: SupabaseCredentials = JSON.parse(stored);
      return Boolean(creds.url && creds.anonKey);
    } catch {
      return false;
    }
  }
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
