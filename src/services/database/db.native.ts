import { openDatabaseAsync } from 'expo-sqlite';
import { type WebDatabaseAdapter } from './webDb';

// ─── Unified Database Interface ───────────────────────────────────────────────
export type DatabaseAdapter = WebDatabaseAdapter;

let db: DatabaseAdapter | null = null;

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!db) {
    const nativeDb = await openDatabaseAsync('mindos.db');
    db = {
      execAsync: (sql: string) => nativeDb.execAsync(sql),
      runAsync: async (sql: string, params: any[] = []) => { await nativeDb.runAsync(sql, params); },
      getAllAsync: <T>(sql: string, params: any[] = []) => nativeDb.getAllAsync<T>(sql, params),
      getFirstAsync: <T>(sql: string, params: any[] = []) => nativeDb.getFirstAsync<T>(sql, params),
    };
    await runMigrations(db!);
  }
  return db!;
}

// ─── Migrations ───────────────────────────────────────────────────────────────

async function runMigrations(database: DatabaseAdapter): Promise<void> {
  await database.execAsync(`PRAGMA journal_mode = WAL;`);
  await database.execAsync(`PRAGMA foreign_keys = ON;`);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const lastMigration = await database.getFirstAsync<{ version: number }>(
    'SELECT MAX(version) as version FROM migrations'
  );
  const currentVersion = lastMigration?.version ?? 0;

  if (currentVersion < 1) {
    await migrationV1(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [1]);
  }
  if (currentVersion < 2) {
    await migrationV2(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [2]);
  }
  if (currentVersion < 3) {
    await migrationV3(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [3]);
  }
  if (currentVersion < 4) {
    await migrationV4(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [4]);
  }
  if (currentVersion < 5) {
    await migrationV5(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [5]);
  }
  if (currentVersion < 6) {
    await migrationV6(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [6]);
  }
  if (currentVersion < 7) {
    await migrationV7(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [7]);
  }
  if (currentVersion < 8) {
    await migrationV8(database);
    await database.runAsync('INSERT INTO migrations (version) VALUES (?)', [8]);
  }
}

async function migrationV8(db: DatabaseAdapter): Promise<void> {
  // Vinculação opcional Tarefa → Hábito
  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN habit_id TEXT REFERENCES habits(id)`);
  } catch { /* coluna já existe */ }
}

async function migrationV7(db: DatabaseAdapter): Promise<void> {
  // Adiciona coluna routine_id em tasks para vincular tarefas a rotinas
  try {
    await db.execAsync(`ALTER TABLE tasks ADD COLUMN routine_id TEXT`);
  } catch (_) {
    // Coluna pode já existir — ignora
  }
}

async function migrationV1(db: DatabaseAdapter): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      why_anchor TEXT NOT NULL,
      why_anchor_image_uri TEXT,
      current_phase INTEGER DEFAULT 1,
      onboarding_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'custom',
      phase INTEGER NOT NULL DEFAULT 1,
      tool_type TEXT NOT NULL DEFAULT 'custom',
      xp_reward INTEGER DEFAULT 10,
      streak_count INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      duration_minutes INTEGER,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL DEFAULT 'custom',
      phase INTEGER DEFAULT 1,
      trigger_time TEXT,
      days_of_week TEXT DEFAULT '[1,2,3,4,5,6,7]',
      is_active INTEGER DEFAULT 1,
      xp_bonus INTEGER DEFAULT 20,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS routine_habits (
      id TEXT PRIMARY KEY,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      order_index INTEGER DEFAULT 0,
      UNIQUE(routine_id, habit_id)
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL REFERENCES habits(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      completed_at TEXT DEFAULT (datetime('now')),
      date TEXT NOT NULL,
      duration_actual INTEGER,
      mood_after INTEGER,
      note TEXT,
      xp_earned INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      habit_id TEXT REFERENCES habits(id),
      title TEXT NOT NULL,
      category TEXT DEFAULT 'productive',
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_seconds INTEGER,
      date TEXT NOT NULL,
      notes TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(user_id, date);
  `);
}

async function migrationV2(db: DatabaseAdapter): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS user_xp (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) UNIQUE,
      total_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      current_level_xp INTEGER DEFAULT 0,
      momentum_score REAL DEFAULT 0.0,
      longest_streak INTEGER DEFAULT 0,
      current_overall_streak INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS xp_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      xp_amount INTEGER NOT NULL,
      source TEXT NOT NULL,
      source_id TEXT,
      description TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      xp_reward INTEGER NOT NULL,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      requirement_current INTEGER DEFAULT 0,
      phase_required INTEGER DEFAULT 1,
      expires_at TEXT,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      image_uri TEXT,
      xp_cost INTEGER,
      is_unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT,
      type TEXT DEFAULT 'custom',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_xp_history_date ON xp_history(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(user_id, status);
  `);
}

async function migrationV3(db: DatabaseAdapter): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'note',
      tags TEXT DEFAULT '[]',
      phase INTEGER,
      is_pinned INTEGER DEFAULT 0,
      image_uris TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS priming_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      image_uri TEXT NOT NULL,
      affirmation TEXT,
      category TEXT DEFAULT 'goal',
      order_index INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS personal_metrics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      metric_name TEXT NOT NULL,
      metric_type TEXT DEFAULT 'scale',
      unit TEXT,
      is_active INTEGER DEFAULT 1,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS metric_entries (
      id TEXT PRIMARY KEY,
      metric_id TEXT NOT NULL REFERENCES personal_metrics(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      value TEXT NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_metric_entries_date ON metric_entries(user_id, date);
  `);
}

async function migrationV4(db: DatabaseAdapter): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      why TEXT NOT NULL DEFAULT '',
      deadline TEXT,
      status TEXT DEFAULT 'active',
      color TEXT,
      order_index INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sub_goals (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      goal_id TEXT REFERENCES goals(id),
      title TEXT NOT NULL,
      description TEXT,
      reward TEXT,
      reward_unlocked INTEGER DEFAULT 0,
      scheduled_date TEXT,
      scheduled_hour TEXT,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      status TEXT DEFAULT 'pending',
      order_index INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agenda_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      task_id TEXT REFERENCES tasks(id),
      routine_id TEXT REFERENCES routines(id),
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      date TEXT NOT NULL,
      type TEXT DEFAULT 'custom',
      color TEXT,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_sub_goals_goal ON sub_goals(goal_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(user_id, scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_goal ON tasks(user_id, goal_id);
    CREATE INDEX IF NOT EXISTS idx_agenda_date ON agenda_events(user_id, date);
  `);

  const alterStatements = [
    'ALTER TABLE notes ADD COLUMN linked_goal_id TEXT',
    'ALTER TABLE notes ADD COLUMN linked_task_id TEXT',
    'ALTER TABLE notes ADD COLUMN linked_event_id TEXT',
    'ALTER TABLE users ADD COLUMN profile_image_uri TEXT',
    'ALTER TABLE users ADD COLUMN dream_board_image_uri TEXT',
  ];

  for (const stmt of alterStatements) {
    try {
      await db.runAsync(stmt);
    } catch {
      // Coluna já existe — ignorar
    }
  }
}

async function migrationV5(db: DatabaseAdapter): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      why TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'active',
      color TEXT,
      order_index INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS smarter_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      objective_id TEXT REFERENCES objectives(id),
      title TEXT NOT NULL,
      specific TEXT NOT NULL DEFAULT '',
      metric TEXT NOT NULL DEFAULT '',
      baseline REAL DEFAULT 0,
      target REAL NOT NULL DEFAULT 0,
      metric_unit TEXT DEFAULT '',
      achievable TEXT DEFAULT '',
      relevant TEXT DEFAULT '',
      deadline TEXT NOT NULL,
      emotional TEXT DEFAULT '',
      review_frequency TEXT DEFAULT 'weekly',
      current_value REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      color TEXT,
      order_index INTEGER DEFAULT 0,
      completed_at TEXT,
      next_review_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS goal_checkpoints (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL REFERENCES smarter_goals(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      scheduled_date TEXT NOT NULL,
      notes TEXT,
      value_at_checkpoint REAL,
      is_completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT DEFAULT 'checking',
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'BRL',
      color TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      account_id TEXT REFERENCES finance_accounts(id),
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'outros',
      payment_method TEXT,
      date TEXT NOT NULL,
      due_date TEXT,
      status TEXT DEFAULT 'paid',
      description TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS finance_categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT DEFAULT '#8B6F47',
      icon TEXT DEFAULT 'cash',
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_subjects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      color TEXT DEFAULT '#4A7A9B',
      total_minutes INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      linked_goal_id TEXT REFERENCES smarter_goals(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      subject_id TEXT NOT NULL REFERENCES study_subjects(id),
      title TEXT,
      planned_minutes INTEGER DEFAULT 25,
      actual_minutes INTEGER DEFAULT 0,
      pomodoro_count INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      notes TEXT,
      linked_note_id TEXT REFERENCES notes(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      subject_id TEXT NOT NULL REFERENCES study_subjects(id),
      session_id TEXT REFERENCES study_sessions(id),
      title TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'note',
      media_uri TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gratitude_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      gratitudes TEXT NOT NULL DEFAULT '[]',
      emotion TEXT,
      highlight TEXT,
      linked_note_id TEXT REFERENCES notes(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cookie_jar (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      emotion_score INTEGER,
      image_uri TEXT,
      tags TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_smarter_goals_status ON smarter_goals(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_smarter_goals_objective ON smarter_goals(objective_id);
    CREATE INDEX IF NOT EXISTS idx_checkpoints_date ON goal_checkpoints(goal_id, scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_study_sessions_date ON study_sessions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_gratitude_date ON gratitude_entries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_cookie_jar_pinned ON cookie_jar(user_id, is_pinned);
  `);

  // ALTER TABLE em tabelas existentes
  const v5Alters = [
    'ALTER TABLE habits ADD COLUMN trigger TEXT',
    'ALTER TABLE habits ADD COLUMN cue TEXT',
    'ALTER TABLE habits ADD COLUMN desire TEXT',
    'ALTER TABLE habits ADD COLUMN implementation TEXT',
    'ALTER TABLE habits ADD COLUMN two_minute_version TEXT',
    'ALTER TABLE habits ADD COLUMN reward TEXT',
    'ALTER TABLE habits ADD COLUMN related_goal_id TEXT',
    'ALTER TABLE habits ADD COLUMN never_miss_count INTEGER DEFAULT 0',
    'ALTER TABLE habits ADD COLUMN notification_id TEXT',
    'ALTER TABLE habits ADD COLUMN notification_hour TEXT',
    'ALTER TABLE tasks ADD COLUMN is_pareto INTEGER DEFAULT 0',
    'ALTER TABLE tasks ADD COLUMN difficulty_level INTEGER',
    'ALTER TABLE tasks ADD COLUMN energy_required TEXT',
    'ALTER TABLE tasks ADD COLUMN smarter_goal_id TEXT',
    'ALTER TABLE tasks ADD COLUMN reward_points INTEGER',
    'ALTER TABLE tasks ADD COLUMN reward_type TEXT',
    'ALTER TABLE habit_logs ADD COLUMN is_missed INTEGER DEFAULT 0',
    'ALTER TABLE habit_logs ADD COLUMN missed_reason TEXT',
    'ALTER TABLE notes ADD COLUMN linked_study_subject_id TEXT',
    'ALTER TABLE notes ADD COLUMN linked_gratitude_id TEXT',
  ];
  for (const stmt of v5Alters) {
    try { await db.runAsync(stmt); } catch { /* coluna já existe */ }
  }
}

async function migrationV6(db: DatabaseAdapter): Promise<void> {
  await db.execAsync(`
    -- Nós do grafo: qualquer entrada da Segunda Mente
    CREATE TABLE IF NOT EXISTS brain_nodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL DEFAULT 'thought',
      title TEXT NOT NULL,
      content TEXT,
      tags TEXT DEFAULT '[]',
      linked_entity_id TEXT,
      linked_entity_type TEXT,
      is_pinned INTEGER DEFAULT 0,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Arestas do grafo: relações entre nós
    CREATE TABLE IF NOT EXISTS node_relations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      source_id TEXT NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
      relation_type TEXT NOT NULL DEFAULT 'related_to',
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(source_id, target_id, relation_type)
    );

    CREATE INDEX IF NOT EXISTS idx_brain_nodes_user ON brain_nodes(user_id, type);
    CREATE INDEX IF NOT EXISTS idx_brain_nodes_updated ON brain_nodes(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_node_relations_source ON node_relations(source_id);
    CREATE INDEX IF NOT EXISTS idx_node_relations_target ON node_relations(target_id);
    CREATE INDEX IF NOT EXISTS idx_node_relations_user ON node_relations(user_id);
  `);
}
