/**
 * MindOS Sync Service
 * Sincronização bidirecional SQLite local ↔ Supabase
 *
 * Estratégia: Local-first com sync manual/periódico
 * - Push: envia dados locais para o Supabase
 * - Pull: baixa dados do Supabase para o local (merge por updated_at)
 * - Conflito: o mais recente (updated_at) vence
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { type SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { getDatabase } from "../database/db";
import { getSupabaseClient } from "./supabaseClient";

const LAST_SYNC_KEY_PREFIX = "mindos_last_sync";
const SYNC_VERSION = 1;

// ─── Storage key/value abstraction (native usa AsyncStorage, web usa localStorage) ─
const SyncStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return typeof localStorage !== "undefined"
          ? localStorage.getItem(key)
          : null;
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined")
          localStorage.setItem(key, value);
      } catch {
        /* storage full — ignora */
      }
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        if (typeof localStorage !== "undefined") localStorage.removeItem(key);
      } catch {
        /* ignora */
      }
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type SyncStatus =
  | "idle"
  | "syncing"
  | "success"
  | "error"
  | "not_configured";

export interface SyncResult {
  status: SyncStatus;
  pushedAt?: string;
  error?: string;
  tables?: {
    name: string;
    pushed: number;
    pulled: number;
  }[];
}

type SyncOwnerColumn = "user_id" | "id" | null;

interface SyncTableConfig {
  name: string;
  hasUpdatedAt: boolean;
  hasCreatedAt: boolean;
  ownerColumn: SyncOwnerColumn;
}

// ─── Tabelas a sincronizar ────────────────────────────────────────────────────
// Ordem importa: tabelas com FK devem vir depois das referenciadas
const SYNC_TABLES: readonly SyncTableConfig[] = [
  { name: "users", hasUpdatedAt: true, hasCreatedAt: true, ownerColumn: "id" },
  {
    name: "habits",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "routines",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "routine_habits",
    hasUpdatedAt: false,
    hasCreatedAt: false,
    ownerColumn: null,
  },
  {
    name: "habit_logs",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "user_xp",
    hasUpdatedAt: true,
    hasCreatedAt: false,
    ownerColumn: "user_id",
  },
  {
    name: "xp_history",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "missions",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "rewards",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "notes",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "priming_items",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "personal_metrics",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "metric_entries",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "goals",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "sub_goals",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "tasks",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "agenda_events",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "objectives",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "smarter_goals",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "goal_checkpoints",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "finance_accounts",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "finance_categories",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "transactions",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "study_subjects",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "study_sessions",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "study_notes",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "gratitude_entries",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "cookie_jar",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "brain_nodes",
    hasUpdatedAt: true,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
  {
    name: "node_relations",
    hasUpdatedAt: false,
    hasCreatedAt: true,
    ownerColumn: "user_id",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLastSyncKey(userId: string): string {
  return `${LAST_SYNC_KEY_PREFIX}:${userId}`;
}

async function getLastSync(userId: string): Promise<string | null> {
  return SyncStorage.getItem(getLastSyncKey(userId));
}

async function setLastSync(userId: string, date: string): Promise<void> {
  await SyncStorage.setItem(getLastSyncKey(userId), date);
}

// ─── DDL para criar tabelas no Supabase (executar uma vez) ───────────────────
export function getSupabaseSchema(): string {
  return `
-- Execute este SQL no seu projeto Supabase (SQL Editor)
-- MindOS Sync Schema v${SYNC_VERSION}

-- Habilitar RLS em todas as tabelas (recomendado)
-- As políticas abaixo permitem acesso anônimo ou por service_role

-- Metadados de sync
CREATE TABLE IF NOT EXISTS mindos_sync_meta (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sync_version INTEGER DEFAULT ${SYNC_VERSION},
  last_synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cria todas as tabelas espelhando o SQLite local
-- (simplificado — tipos TEXT para máxima compatibilidade)

CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, why_anchor TEXT, why_anchor_image_uri TEXT, current_phase INTEGER, onboarding_completed INTEGER, profile_image_uri TEXT, dream_board_image_uri TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS habits (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, category TEXT, phase INTEGER, tool_type TEXT, xp_reward INTEGER, streak_count INTEGER, best_streak INTEGER, is_active INTEGER, duration_minutes INTEGER, order_index INTEGER, trigger TEXT, cue TEXT, desire TEXT, implementation TEXT, two_minute_version TEXT, reward TEXT, related_goal_id TEXT, never_miss_count INTEGER, notification_id TEXT, notification_hour TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, type TEXT, phase INTEGER, trigger_time TEXT, days_of_week TEXT, is_active INTEGER, xp_bonus INTEGER, order_index INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS routine_habits (id TEXT PRIMARY KEY, routine_id TEXT, habit_id TEXT, order_index INTEGER);
CREATE TABLE IF NOT EXISTS habit_logs (id TEXT PRIMARY KEY, habit_id TEXT, user_id TEXT, completed_at TEXT, date TEXT, duration_actual INTEGER, mood_after INTEGER, note TEXT, xp_earned INTEGER, is_missed INTEGER, missed_reason TEXT);
CREATE TABLE IF NOT EXISTS user_xp (id TEXT PRIMARY KEY, user_id TEXT UNIQUE, total_xp INTEGER, level INTEGER, current_level_xp INTEGER, momentum_score REAL, longest_streak INTEGER, current_overall_streak INTEGER, updated_at TEXT);
CREATE TABLE IF NOT EXISTS xp_history (id TEXT PRIMARY KEY, user_id TEXT, xp_amount INTEGER, source TEXT, source_id TEXT, description TEXT, date TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS missions (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, type TEXT, status TEXT, xp_reward INTEGER, requirement_type TEXT, requirement_value INTEGER, requirement_current INTEGER, phase_required INTEGER, expires_at TEXT, completed_at TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS rewards (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, image_uri TEXT, xp_cost INTEGER, is_unlocked INTEGER, unlocked_at TEXT, type TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, content TEXT, type TEXT, tags TEXT, phase INTEGER, is_pinned INTEGER, image_uris TEXT, linked_goal_id TEXT, linked_task_id TEXT, linked_event_id TEXT, linked_study_subject_id TEXT, linked_gratitude_id TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS priming_items (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, image_uri TEXT, affirmation TEXT, category TEXT, order_index INTEGER, is_active INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS personal_metrics (id TEXT PRIMARY KEY, user_id TEXT, metric_name TEXT, metric_type TEXT, unit TEXT, is_active INTEGER, order_index INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS metric_entries (id TEXT PRIMARY KEY, metric_id TEXT, user_id TEXT, value TEXT, date TEXT, notes TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS goals (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, why TEXT, deadline TEXT, status TEXT, color TEXT, order_index INTEGER, completed_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS sub_goals (id TEXT PRIMARY KEY, goal_id TEXT, user_id TEXT, title TEXT, is_completed INTEGER, completed_at TEXT, order_index INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, user_id TEXT, goal_id TEXT, title TEXT, description TEXT, reward TEXT, reward_unlocked INTEGER, scheduled_date TEXT, scheduled_hour TEXT, is_completed INTEGER, completed_at TEXT, status TEXT, order_index INTEGER, is_pareto INTEGER, difficulty_level INTEGER, energy_required TEXT, smarter_goal_id TEXT, reward_points INTEGER, reward_type TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS agenda_events (id TEXT PRIMARY KEY, user_id TEXT, task_id TEXT, routine_id TEXT, title TEXT, description TEXT, start_time TEXT, end_time TEXT, date TEXT, type TEXT, color TEXT, is_completed INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS objectives (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, why TEXT, status TEXT, color TEXT, order_index INTEGER, completed_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS smarter_goals (id TEXT PRIMARY KEY, user_id TEXT, objective_id TEXT, title TEXT, specific TEXT, metric TEXT, baseline REAL, target REAL, metric_unit TEXT, achievable TEXT, relevant TEXT, deadline TEXT, emotional TEXT, review_frequency TEXT, current_value REAL, status TEXT, color TEXT, order_index INTEGER, completed_at TEXT, next_review_at TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS goal_checkpoints (id TEXT PRIMARY KEY, goal_id TEXT, user_id TEXT, scheduled_date TEXT, notes TEXT, value_at_checkpoint REAL, is_completed INTEGER, completed_at TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS finance_accounts (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, type TEXT, balance REAL, currency TEXT, color TEXT, is_active INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS finance_categories (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, type TEXT, color TEXT, icon TEXT, is_default INTEGER, created_at TEXT);
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, user_id TEXT, account_id TEXT, title TEXT, amount REAL, type TEXT, category TEXT, payment_method TEXT, date TEXT, due_date TEXT, status TEXT, description TEXT, is_recurring INTEGER, recurring_frequency TEXT, tags TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS study_subjects (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, color TEXT, total_minutes INTEGER, order_index INTEGER, linked_goal_id TEXT, is_active INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS study_sessions (id TEXT PRIMARY KEY, user_id TEXT, subject_id TEXT, title TEXT, planned_minutes INTEGER, actual_minutes INTEGER, pomodoro_count INTEGER, date TEXT, started_at TEXT, ended_at TEXT, notes TEXT, linked_note_id TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS study_notes (id TEXT PRIMARY KEY, user_id TEXT, subject_id TEXT, session_id TEXT, title TEXT, content TEXT, type TEXT, media_uri TEXT, tags TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS gratitude_entries (id TEXT PRIMARY KEY, user_id TEXT, date TEXT, gratitudes TEXT, emotion TEXT, highlight TEXT, linked_note_id TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS cookie_jar (id TEXT PRIMARY KEY, user_id TEXT, title TEXT, description TEXT, date TEXT, emotion_score INTEGER, image_uri TEXT, tags TEXT, is_pinned INTEGER, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS brain_nodes (id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, content TEXT, tags TEXT, linked_entity_id TEXT, linked_entity_type TEXT, is_pinned INTEGER, color TEXT, created_at TEXT, updated_at TEXT);
CREATE TABLE IF NOT EXISTS node_relations (id TEXT PRIMARY KEY, user_id TEXT, source_id TEXT, target_id TEXT, relation_type TEXT, note TEXT, created_at TEXT);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS (SEGURANÇA) — isolamento por usuário autenticado (auth.uid)
-- Pré-requisito: autenticar via Supabase Auth e usar user.id = auth.uid()::text
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS users_owner_read ON users
  FOR SELECT USING (id = auth.uid()::text);
CREATE POLICY IF NOT EXISTS users_owner_write ON users
  FOR ALL USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS habits_owner_all ON habits
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS routines_owner_all ON routines
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE routine_habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS routine_habits_owner_all ON routine_habits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routines r
      WHERE r.id = routine_habits.routine_id AND r.user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routines r
      WHERE r.id = routine_habits.routine_id AND r.user_id = auth.uid()::text
    )
  );

ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS habit_logs_owner_all ON habit_logs
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS user_xp_owner_all ON user_xp
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE xp_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS xp_history_owner_all ON xp_history
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS missions_owner_all ON missions
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS rewards_owner_all ON rewards
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS notes_owner_all ON notes
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE priming_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS priming_items_owner_all ON priming_items
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE personal_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS personal_metrics_owner_all ON personal_metrics
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE metric_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS metric_entries_owner_all ON metric_entries
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS goals_owner_all ON goals
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE sub_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS sub_goals_owner_all ON sub_goals
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS tasks_owner_all ON tasks
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE agenda_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS agenda_events_owner_all ON agenda_events
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS objectives_owner_all ON objectives
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE smarter_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS smarter_goals_owner_all ON smarter_goals
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE goal_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS goal_checkpoints_owner_all ON goal_checkpoints
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS finance_accounts_owner_all ON finance_accounts
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS finance_categories_owner_all ON finance_categories
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS transactions_owner_all ON transactions
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE study_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS study_subjects_owner_all ON study_subjects
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS study_sessions_owner_all ON study_sessions
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS study_notes_owner_all ON study_notes
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE gratitude_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS gratitude_entries_owner_all ON gratitude_entries
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE cookie_jar ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS cookie_jar_owner_all ON cookie_jar
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE brain_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS brain_nodes_owner_all ON brain_nodes
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

ALTER TABLE node_relations ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS node_relations_owner_all ON node_relations
  FOR ALL USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
`;
}

// ─── Push: local → Supabase ───────────────────────────────────────────────────
async function pushTable(
  client: SupabaseClient,
  table: SyncTableConfig,
  userId: string,
  lastSync: string | null,
): Promise<number> {
  const db = await getDatabase();

  let query = `SELECT * FROM ${table.name}`;
  const params: string[] = [];
  const conditions: string[] = [];

  if (table.ownerColumn === "user_id") {
    conditions.push("user_id = ?");
    params.push(userId);
  } else if (table.ownerColumn === "id") {
    conditions.push("id = ?");
    params.push(userId);
  }

  if (lastSync && table.hasUpdatedAt && table.hasCreatedAt) {
    conditions.push("(updated_at > ? OR created_at > ?)");
    params.push(lastSync, lastSync);
  } else if (lastSync && table.hasUpdatedAt) {
    conditions.push("updated_at > ?");
    params.push(lastSync);
  } else if (lastSync && table.hasCreatedAt) {
    conditions.push("created_at > ?");
    params.push(lastSync);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  const rows = await db.getAllAsync<Record<string, unknown>>(query, params);

  if (rows.length === 0) return 0;

  const BATCH = 100;
  let pushed = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await client
      .from(table.name)
      .upsert(batch, { onConflict: "id" });
    if (error) {
      console.warn(`[Sync] Push erro em ${table.name}:`, error.message);
    } else {
      pushed += batch.length;
    }
  }

  return pushed;
}

// ─── Pull: Supabase → local ───────────────────────────────────────────────────
async function pullTable(
  client: SupabaseClient,
  table: SyncTableConfig,
  userId: string,
  lastSync: string | null,
): Promise<number> {
  const db = await getDatabase();

  let query = client.from(table.name).select("*");

  if (table.ownerColumn === "user_id") {
    query = query.eq("user_id", userId);
  } else if (table.ownerColumn === "id") {
    query = query.eq("id", userId);
  }

  if (lastSync && table.hasUpdatedAt) {
    query = query.gt("updated_at", lastSync);
  } else if (lastSync && table.hasCreatedAt) {
    query = query.gt("created_at", lastSync);
  }

  const { data, error } = await query;

  if (error) {
    console.warn(`[Sync] Pull erro em ${table.name}:`, error.message);
    return 0;
  }

  if (!data || data.length === 0) return 0;

  // Merge: para cada linha remota, verifica se local é mais recente
  let pulled = 0;
  for (const row of data) {
    try {
      const localRow = await db.getFirstAsync<Record<string, any>>(
        `SELECT updated_at, created_at FROM ${table.name} WHERE id = ?`,
        [row.id],
      );

      let shouldUpdate = true;
      if (
        localRow &&
        table.hasUpdatedAt &&
        row.updated_at &&
        localRow.updated_at
      ) {
        // Mantém o mais recente
        shouldUpdate = row.updated_at > localRow.updated_at;
      } else if (localRow) {
        // Linha já existe localmente e não temos timestamp — não sobrescreve
        shouldUpdate = false;
      }

      if (shouldUpdate) {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => "?").join(", ");
        const values = cols.map((c) => row[c]);

        if (localRow) {
          // UPDATE
          const sets = cols
            .filter((c) => c !== "id")
            .map((c) => `${c} = ?`)
            .join(", ");
          const updateVals = cols.filter((c) => c !== "id").map((c) => row[c]);
          await db.runAsync(`UPDATE ${table.name} SET ${sets} WHERE id = ?`, [
            ...updateVals,
            row.id,
          ]);
        } else {
          // INSERT
          await db.runAsync(
            `INSERT OR IGNORE INTO ${table.name} (${cols.join(", ")}) VALUES (${placeholders})`,
            values,
          );
        }
        pulled++;
      }
    } catch (e) {
      console.warn(`[Sync] Merge erro em ${table.name} id=${row.id}:`, e);
    }
  }

  return pulled;
}

// ─── Sync principal ───────────────────────────────────────────────────────────
export async function syncData(userId: string): Promise<SyncResult> {
  if (!userId) {
    return { status: "error", error: "Usuário inválido para sincronização." };
  }

  const client = await getSupabaseClient();
  if (!client) {
    return { status: "not_configured" };
  }

  const lastSync = await getLastSync(userId);
  const now = new Date().toISOString();
  const tables: SyncResult["tables"] = [];

  try {
    for (const table of SYNC_TABLES) {
      let pushed = 0;
      let pulled = 0;

      try {
        pushed = await pushTable(client, table, userId, lastSync);
        pulled = await pullTable(client, table, userId, lastSync);
      } catch (e) {
        console.warn(`[Sync] Erro na tabela ${table.name}:`, e);
      }

      if (pushed > 0 || pulled > 0) {
        tables.push({ name: table.name, pushed, pulled });
      }
    }

    await setLastSync(userId, now);

    return {
      status: "success",
      pushedAt: now,
      tables,
    };
  } catch (e: unknown) {
    const msg =
      e instanceof Error ? e.message : "Erro desconhecido durante sync";
    return { status: "error", error: msg };
  }
}

// ─── Utilitários de status ────────────────────────────────────────────────────
export async function getLastSyncDate(userId?: string): Promise<string | null> {
  if (!userId) return null;
  return getLastSync(userId);
}

export async function clearSyncHistory(userId?: string): Promise<void> {
  if (!userId) return;
  await SyncStorage.removeItem(getLastSyncKey(userId));
}
