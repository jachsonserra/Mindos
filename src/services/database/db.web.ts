import { createWebDatabase, type WebDatabaseAdapter } from './webDb';

// ─── Web Database (localStorage-based) ───────────────────────────────────────
// Este arquivo é carregado APENAS no web pelo Metro bundler (db.web.ts > db.ts)
// Não importa expo-sqlite para evitar o erro de wa-sqlite.wasm

export type DatabaseAdapter = WebDatabaseAdapter;

let db: DatabaseAdapter | null = null;

export async function getDatabase(): Promise<DatabaseAdapter> {
  if (!db) {
    db = createWebDatabase();
    await runMigrations(db);
  }
  return db!;
}

// ─── Migrations (web — todas as colunas inclusive as de V4/V5/V6) ─────────────

async function runMigrations(database: DatabaseAdapter): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, why_anchor TEXT NOT NULL,
      why_anchor_image_uri TEXT, profile_image_uri TEXT, dream_board_image_uri TEXT,
      current_phase INTEGER DEFAULT 1, onboarding_completed INTEGER DEFAULT 0,
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT, category TEXT DEFAULT 'custom', phase INTEGER DEFAULT 1,
      tool_type TEXT DEFAULT 'custom', xp_reward INTEGER DEFAULT 10,
      streak_count INTEGER DEFAULT 0, best_streak INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1, duration_minutes INTEGER, order_index INTEGER DEFAULT 0,
      trigger TEXT, cue TEXT, desire TEXT, implementation TEXT,
      two_minute_version TEXT, reward TEXT, related_goal_id TEXT,
      never_miss_count INTEGER DEFAULT 0, notification_id TEXT, notification_hour TEXT,
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT, type TEXT DEFAULT 'custom', phase INTEGER DEFAULT 1,
      trigger_time TEXT, days_of_week TEXT DEFAULT '[1,2,3,4,5,6,7]',
      is_active INTEGER DEFAULT 1, xp_bonus INTEGER DEFAULT 20,
      order_index INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS routine_habits (
      id TEXT PRIMARY KEY, routine_id TEXT NOT NULL, habit_id TEXT NOT NULL, order_index INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY, habit_id TEXT NOT NULL, user_id TEXT NOT NULL,
      completed_at TEXT, date TEXT NOT NULL, duration_actual INTEGER,
      mood_after INTEGER, note TEXT, xp_earned INTEGER DEFAULT 0,
      is_missed INTEGER DEFAULT 0, missed_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS time_entries (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, habit_id TEXT,
      title TEXT NOT NULL, category TEXT DEFAULT 'productive',
      started_at TEXT NOT NULL, ended_at TEXT, duration_seconds INTEGER,
      date TEXT NOT NULL, notes TEXT
    );

    CREATE TABLE IF NOT EXISTS user_xp (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      total_xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1,
      current_level_xp INTEGER DEFAULT 0, momentum_score REAL DEFAULT 0.0,
      longest_streak INTEGER DEFAULT 0, current_overall_streak INTEGER DEFAULT 0,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS xp_history (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, xp_amount INTEGER NOT NULL,
      source TEXT NOT NULL, source_id TEXT, description TEXT,
      date TEXT NOT NULL, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS missions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL, type TEXT NOT NULL, status TEXT DEFAULT 'active',
      xp_reward INTEGER NOT NULL, requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL, requirement_current INTEGER DEFAULT 0,
      phase_required INTEGER DEFAULT 1, expires_at TEXT, completed_at TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT, image_uri TEXT, xp_cost INTEGER,
      is_unlocked INTEGER DEFAULT 0, unlocked_at TEXT, type TEXT DEFAULT 'custom', created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT, content TEXT NOT NULL,
      type TEXT DEFAULT 'note', tags TEXT DEFAULT '[]', phase INTEGER,
      is_pinned INTEGER DEFAULT 0, image_uris TEXT DEFAULT '[]',
      linked_goal_id TEXT, linked_task_id TEXT, linked_event_id TEXT,
      linked_study_subject_id TEXT, linked_gratitude_id TEXT,
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS priming_items (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      image_uri TEXT NOT NULL, affirmation TEXT, category TEXT DEFAULT 'goal',
      order_index INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS personal_metrics (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, metric_name TEXT NOT NULL,
      metric_type TEXT DEFAULT 'scale', unit TEXT,
      is_active INTEGER DEFAULT 1, order_index INTEGER DEFAULT 0, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS metric_entries (
      id TEXT PRIMARY KEY, metric_id TEXT NOT NULL, user_id TEXT NOT NULL,
      value TEXT NOT NULL, date TEXT NOT NULL, notes TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      why TEXT DEFAULT '', deadline TEXT, status TEXT DEFAULT 'active',
      color TEXT, order_index INTEGER DEFAULT 0, completed_at TEXT,
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sub_goals (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, user_id TEXT NOT NULL,
      title TEXT NOT NULL, is_completed INTEGER DEFAULT 0,
      completed_at TEXT, order_index INTEGER DEFAULT 0, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, goal_id TEXT, smarter_goal_id TEXT,
      title TEXT NOT NULL, description TEXT, reward TEXT, reward_unlocked INTEGER DEFAULT 0,
      reward_points INTEGER, reward_type TEXT,
      scheduled_date TEXT, scheduled_hour TEXT, is_completed INTEGER DEFAULT 0,
      completed_at TEXT, status TEXT DEFAULT 'pending', order_index INTEGER DEFAULT 0,
      is_pareto INTEGER DEFAULT 0, difficulty_level INTEGER, energy_required TEXT,
      routine_id TEXT,
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agenda_events (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, task_id TEXT, routine_id TEXT,
      title TEXT NOT NULL, description TEXT, start_time TEXT NOT NULL,
      end_time TEXT, date TEXT NOT NULL, type TEXT DEFAULT 'custom',
      color TEXT, is_completed INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT, why TEXT DEFAULT '', status TEXT DEFAULT 'active',
      color TEXT, order_index INTEGER DEFAULT 0, completed_at TEXT,
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS smarter_goals (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, objective_id TEXT,
      title TEXT NOT NULL, specific TEXT DEFAULT '', metric TEXT DEFAULT '',
      baseline REAL DEFAULT 0, target REAL DEFAULT 0, metric_unit TEXT DEFAULT '',
      achievable TEXT DEFAULT '', relevant TEXT DEFAULT '',
      deadline TEXT NOT NULL, emotional TEXT DEFAULT '',
      review_frequency TEXT DEFAULT 'weekly', current_value REAL DEFAULT 0,
      status TEXT DEFAULT 'active', color TEXT, order_index INTEGER DEFAULT 0,
      completed_at TEXT, next_review_at TEXT, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS goal_checkpoints (
      id TEXT PRIMARY KEY, goal_id TEXT NOT NULL, user_id TEXT NOT NULL,
      scheduled_date TEXT NOT NULL, notes TEXT, value_at_checkpoint REAL,
      is_completed INTEGER DEFAULT 0, completed_at TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_accounts (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
      type TEXT DEFAULT 'checking', balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'BRL', color TEXT,
      is_active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, account_id TEXT,
      title TEXT NOT NULL, amount REAL NOT NULL, type TEXT NOT NULL,
      category TEXT DEFAULT 'outros', payment_method TEXT,
      date TEXT NOT NULL, due_date TEXT, status TEXT DEFAULT 'paid',
      description TEXT, is_recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT, tags TEXT DEFAULT '[]',
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS finance_categories (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
      type TEXT NOT NULL, color TEXT DEFAULT '#8B6F47',
      icon TEXT DEFAULT 'cash', is_default INTEGER DEFAULT 0, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS study_subjects (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT, color TEXT DEFAULT '#4A7A9B',
      total_minutes INTEGER DEFAULT 0, order_index INTEGER DEFAULT 0,
      linked_goal_id TEXT, is_active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject_id TEXT NOT NULL,
      title TEXT, planned_minutes INTEGER DEFAULT 25, actual_minutes INTEGER DEFAULT 0,
      pomodoro_count INTEGER DEFAULT 0, date TEXT NOT NULL,
      started_at TEXT, ended_at TEXT, notes TEXT, linked_note_id TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS study_notes (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject_id TEXT NOT NULL,
      session_id TEXT, title TEXT, content TEXT NOT NULL,
      type TEXT DEFAULT 'note', media_uri TEXT, tags TEXT DEFAULT '[]',
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS gratitude_entries (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
      gratitudes TEXT DEFAULT '[]', emotion TEXT, highlight TEXT,
      linked_note_id TEXT, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cookie_jar (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL,
      description TEXT NOT NULL, date TEXT NOT NULL,
      emotion_score INTEGER, image_uri TEXT, tags TEXT DEFAULT '[]',
      is_pinned INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS brain_nodes (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      type TEXT DEFAULT 'thought', title TEXT NOT NULL,
      content TEXT, tags TEXT DEFAULT '[]',
      linked_entity_id TEXT, linked_entity_type TEXT,
      is_pinned INTEGER DEFAULT 0, color TEXT,
      created_at TEXT, updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS node_relations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      source_id TEXT NOT NULL, target_id TEXT NOT NULL,
      relation_type TEXT DEFAULT 'related_to', note TEXT, created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS daily_checkins (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, date TEXT NOT NULL,
      morning_mood INTEGER, morning_feelings TEXT DEFAULT '[]',
      morning_note TEXT DEFAULT '', morning_answers TEXT DEFAULT '[]', morning_at TEXT,
      midday_mood INTEGER, midday_feelings TEXT DEFAULT '[]',
      midday_note TEXT DEFAULT '', midday_answers TEXT DEFAULT '[]', midday_at TEXT,
      evening_mood INTEGER, evening_feelings TEXT DEFAULT '[]',
      evening_note TEXT DEFAULT '', evening_answers TEXT DEFAULT '[]', evening_at TEXT,
      created_at TEXT, updated_at TEXT
    );
  `);
}
