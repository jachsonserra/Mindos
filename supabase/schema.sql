-- ============================================================
--  MindOS — Schema Supabase (PostgreSQL)
--  Execute este arquivo no SQL Editor do seu projeto Supabase
--  em: supabase.com → seu projeto → SQL Editor → New Query
-- ============================================================
-- ATENÇÃO: execute na ordem exata abaixo. As tabelas com FK
-- precisam vir depois das tabelas que elas referenciam.
-- ============================================================

-- ── Extensões ────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- MIGRATION V1 — Core: users, habits, routines, logs
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  why_anchor   TEXT NOT NULL DEFAULT '',
  why_anchor_image_uri TEXT,
  profile_image_uri    TEXT,
  dream_board_image_uri TEXT,
  current_phase        INTEGER DEFAULT 1,
  onboarding_completed INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habits (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  description        TEXT,
  category           TEXT NOT NULL DEFAULT 'custom',
  phase              INTEGER NOT NULL DEFAULT 1,
  tool_type          TEXT NOT NULL DEFAULT 'custom',
  xp_reward          INTEGER DEFAULT 10,
  streak_count       INTEGER DEFAULT 0,
  best_streak        INTEGER DEFAULT 0,
  is_active          INTEGER DEFAULT 1,
  duration_minutes   INTEGER,
  order_index        INTEGER DEFAULT 0,
  -- Loop do hábito (Atomic Habits)
  trigger            TEXT,
  cue                TEXT,
  desire             TEXT,
  implementation     TEXT,
  two_minute_version TEXT,
  reward             TEXT,
  related_goal_id    TEXT,
  never_miss_count   INTEGER DEFAULT 0,
  notification_id    TEXT,
  notification_hour  TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routines (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL DEFAULT 'custom',
  phase        INTEGER DEFAULT 1,
  trigger_time TEXT,
  days_of_week TEXT DEFAULT '[1,2,3,4,5,6,7]',
  is_active    INTEGER DEFAULT 1,
  xp_bonus     INTEGER DEFAULT 20,
  order_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routine_habits (
  id          TEXT PRIMARY KEY,
  routine_id  TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  habit_id    TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  UNIQUE(routine_id, habit_id)
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id            TEXT PRIMARY KEY,
  habit_id      TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_at  TIMESTAMPTZ DEFAULT NOW(),
  date          TEXT NOT NULL,
  duration_actual INTEGER,
  mood_after    INTEGER,
  note          TEXT,
  xp_earned     INTEGER DEFAULT 0,
  is_missed     INTEGER DEFAULT 0,
  missed_reason TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION V2 — Gamificação: XP, missões, recompensas
-- ============================================================

CREATE TABLE IF NOT EXISTS user_xp (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  total_xp                INTEGER DEFAULT 0,
  level                   INTEGER DEFAULT 1,
  current_level_xp        INTEGER DEFAULT 0,
  momentum_score          REAL DEFAULT 0.0,
  longest_streak          INTEGER DEFAULT 0,
  current_overall_streak  INTEGER DEFAULT 0,
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xp_history (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_amount   INTEGER NOT NULL,
  source      TEXT NOT NULL,
  source_id   TEXT,
  description TEXT,
  date        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS missions (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  type                 TEXT NOT NULL,
  status               TEXT DEFAULT 'active',
  xp_reward            INTEGER NOT NULL,
  requirement_type     TEXT NOT NULL,
  requirement_value    INTEGER NOT NULL,
  requirement_current  INTEGER DEFAULT 0,
  phase_required       INTEGER DEFAULT 1,
  expires_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rewards (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  image_uri   TEXT,
  xp_cost     INTEGER,
  is_unlocked INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ,
  type        TEXT DEFAULT 'custom',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION V3 — Segunda Mente: notas, priming, métricas
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id                       TEXT PRIMARY KEY,
  user_id                  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                    TEXT,
  content                  TEXT NOT NULL,
  type                     TEXT DEFAULT 'note',
  tags                     TEXT DEFAULT '[]',
  phase                    INTEGER,
  is_pinned                INTEGER DEFAULT 0,
  image_uris               TEXT DEFAULT '[]',
  linked_goal_id           TEXT,
  linked_task_id           TEXT,
  linked_event_id          TEXT,
  linked_study_subject_id  TEXT,
  linked_gratitude_id      TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS priming_items (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  image_uri   TEXT NOT NULL,
  affirmation TEXT,
  category    TEXT DEFAULT 'goal',
  order_index INTEGER DEFAULT 0,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personal_metrics (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_type TEXT DEFAULT 'scale',
  unit        TEXT,
  is_active   INTEGER DEFAULT 1,
  order_index INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS metric_entries (
  id         TEXT PRIMARY KEY,
  metric_id  TEXT NOT NULL REFERENCES personal_metrics(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value      TEXT NOT NULL,
  date       TEXT NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION V4 — Metas simples, tarefas, agenda
-- ============================================================

CREATE TABLE IF NOT EXISTS goals (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  why          TEXT NOT NULL DEFAULT '',
  deadline     TEXT,
  status       TEXT DEFAULT 'active',
  color        TEXT,
  order_index  INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sub_goals (
  id           TEXT PRIMARY KEY,
  goal_id      TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  order_index  INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id        TEXT REFERENCES goals(id),
  title          TEXT NOT NULL,
  description    TEXT,
  reward         TEXT,
  reward_unlocked INTEGER DEFAULT 0,
  scheduled_date TEXT,
  scheduled_hour TEXT,
  is_completed   INTEGER DEFAULT 0,
  completed_at   TIMESTAMPTZ,
  status         TEXT DEFAULT 'pending',
  order_index    INTEGER DEFAULT 0,
  is_pareto      INTEGER DEFAULT 0,
  difficulty_level INTEGER,
  energy_required TEXT,
  smarter_goal_id TEXT,
  reward_points  INTEGER,
  reward_type    TEXT,
  routine_id     TEXT,
  habit_id       TEXT REFERENCES habits(id),
  recurrence     TEXT DEFAULT 'once',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agenda_events (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id      TEXT REFERENCES tasks(id),
  routine_id   TEXT REFERENCES routines(id),
  title        TEXT NOT NULL,
  description  TEXT,
  start_time   TEXT NOT NULL,
  end_time     TEXT,
  date         TEXT NOT NULL,
  type         TEXT DEFAULT 'custom',
  color        TEXT,
  is_completed INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION V5 — Objetivos SMARTER, Estudos, Gratidão
-- ============================================================

CREATE TABLE IF NOT EXISTS objectives (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  why          TEXT NOT NULL DEFAULT '',
  status       TEXT DEFAULT 'active',
  color        TEXT,
  order_index  INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS smarter_goals (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  objective_id     TEXT REFERENCES objectives(id),
  title            TEXT NOT NULL,
  specific         TEXT NOT NULL DEFAULT '',
  metric           TEXT NOT NULL DEFAULT '',
  baseline         REAL DEFAULT 0,
  target           REAL NOT NULL DEFAULT 0,
  metric_unit      TEXT DEFAULT '',
  achievable       TEXT DEFAULT '',
  relevant         TEXT DEFAULT '',
  deadline         TEXT NOT NULL,
  emotional        TEXT DEFAULT '',
  review_frequency TEXT DEFAULT 'weekly',
  current_value    REAL DEFAULT 0,
  status           TEXT DEFAULT 'active',
  color            TEXT,
  order_index      INTEGER DEFAULT 0,
  completed_at     TIMESTAMPTZ,
  next_review_at   TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_checkpoints (
  id                  TEXT PRIMARY KEY,
  goal_id             TEXT NOT NULL REFERENCES smarter_goals(id) ON DELETE CASCADE,
  user_id             TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date      TEXT NOT NULL,
  notes               TEXT,
  value_at_checkpoint REAL,
  is_completed        INTEGER DEFAULT 0,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_subjects (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  color          TEXT DEFAULT '#4A7A9B',
  total_minutes  INTEGER DEFAULT 0,
  order_index    INTEGER DEFAULT 0,
  linked_goal_id TEXT REFERENCES smarter_goals(id),
  is_active      INTEGER DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id       TEXT NOT NULL REFERENCES study_subjects(id) ON DELETE CASCADE,
  title            TEXT,
  planned_minutes  INTEGER DEFAULT 25,
  actual_minutes   INTEGER DEFAULT 0,
  pomodoro_count   INTEGER DEFAULT 0,
  date             TEXT NOT NULL,
  started_at       TIMESTAMPTZ,
  ended_at         TIMESTAMPTZ,
  notes            TEXT,
  linked_note_id   TEXT REFERENCES notes(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_notes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES study_subjects(id) ON DELETE CASCADE,
  session_id TEXT REFERENCES study_sessions(id),
  title      TEXT,
  content    TEXT NOT NULL,
  type       TEXT DEFAULT 'note',
  media_uri  TEXT,
  tags       TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gratitude_entries (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date           TEXT NOT NULL,
  gratitudes     TEXT NOT NULL DEFAULT '[]',
  emotion        TEXT,
  highlight      TEXT,
  linked_note_id TEXT REFERENCES notes(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cookie_jar (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  date          TEXT NOT NULL,
  emotion_score INTEGER,
  image_uri     TEXT,
  tags          TEXT DEFAULT '[]',
  is_pinned     INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MIGRATION V6 — Segunda Mente: grafo de nós
-- ============================================================

CREATE TABLE IF NOT EXISTS brain_nodes (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type               TEXT NOT NULL DEFAULT 'thought',
  title              TEXT NOT NULL,
  content            TEXT,
  tags               TEXT DEFAULT '[]',
  linked_entity_id   TEXT,
  linked_entity_type TEXT,
  is_pinned          INTEGER DEFAULT 0,
  color              TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS node_relations (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id     TEXT NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
  target_id     TEXT NOT NULL REFERENCES brain_nodes(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL DEFAULT 'related_to',
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, target_id, relation_type)
);

-- ============================================================
-- MIGRATION V8 — Check-ins diários
-- ============================================================

CREATE TABLE IF NOT EXISTS daily_checkins (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  morning_mood    INTEGER,
  morning_feelings TEXT,
  morning_note    TEXT,
  morning_answers TEXT,
  morning_at      TEXT,
  midday_mood     INTEGER,
  midday_feelings TEXT,
  midday_note     TEXT,
  midday_answers  TEXT,
  midday_at       TEXT,
  evening_mood    INTEGER,
  evening_feelings TEXT,
  evening_note    TEXT,
  evening_answers TEXT,
  evening_at      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_habits_user       ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date   ON habit_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_tasks_date        ON tasks(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tasks_goal        ON tasks(user_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_agenda_date       ON agenda_events(user_id, date);
CREATE INDEX IF NOT EXISTS idx_xp_history_date   ON xp_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_missions_status   ON missions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notes_type        ON notes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_metric_entries    ON metric_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_objectives_status ON objectives(user_id, status);
CREATE INDEX IF NOT EXISTS idx_smarter_goals     ON smarter_goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_smarter_obj       ON smarter_goals(objective_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints       ON goal_checkpoints(goal_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_study_sessions    ON study_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_gratitude_date    ON gratitude_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_brain_nodes       ON brain_nodes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_node_rel_source   ON node_relations(source_id);
CREATE INDEX IF NOT EXISTS idx_node_rel_target   ON node_relations(target_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date     ON daily_checkins(user_id, date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Garante que cada usuário só acessa os próprios dados
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_habits     ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp            ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE priming_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_metrics   ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_goals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives         ENABLE ROW LEVEL SECURITY;
ALTER TABLE smarter_goals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_checkpoints   ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_subjects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE gratitude_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cookie_jar         ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_nodes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE node_relations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins     ENABLE ROW LEVEL SECURITY;

-- ── Políticas: usuário acessa apenas seus próprios dados ──────────────────────

-- users: o próprio usuário acessa seu registro (auth.uid() == id)
CREATE POLICY "users_own" ON users
  FOR ALL USING (auth.uid()::text = id);

-- Macro para tabelas com user_id
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'habits','routines','habit_logs','user_xp','xp_history',
    'missions','rewards','notes','priming_items','personal_metrics',
    'metric_entries','goals','sub_goals','tasks','agenda_events',
    'objectives','smarter_goals','goal_checkpoints',
    'study_subjects','study_sessions','study_notes',
    'gratitude_entries','cookie_jar','brain_nodes',
    'node_relations','daily_checkins'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format(
      'CREATE POLICY "%s_own" ON %I FOR ALL USING (auth.uid()::text = user_id)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- routine_habits: acesso via join na tabela routines (user_id)
CREATE POLICY "routine_habits_own" ON routine_habits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM routines r
      WHERE r.id = routine_habits.routine_id
        AND auth.uid()::text = r.user_id
    )
  );

-- ============================================================
-- FIM DO SCHEMA
-- ============================================================
-- Após executar este SQL, configure no Supabase:
-- 1. Authentication → Email → habilitar "Confirm email" se quiser
-- 2. Authentication → URL Configuration → adicionar seu domínio
-- 3. Settings → API → copiar URL e anon key para o .env.local
-- ============================================================
