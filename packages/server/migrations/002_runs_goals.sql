CREATE TABLE IF NOT EXISTS agent_runs (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  user_message_id text REFERENCES agent_messages(id) ON DELETE SET NULL,
  assistant_message_id text REFERENCES agent_messages(id) ON DELETE SET NULL,
  schedule_id text REFERENCES agent_schedules(id) ON DELETE SET NULL,
  idempotency_key text,
  trigger_kind text NOT NULL DEFAULT 'chat' CHECK (trigger_kind IN ('chat', 'schedule')),
  runtime text NOT NULL DEFAULT 'cloud-dsh' CHECK (runtime IN ('cloud-dsh', 'ipollowork-pc')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_runs_idempotency_idx
  ON agent_runs(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_runs_user_created_idx ON agent_runs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_session_created_idx ON agent_runs(session_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_goals (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  source_session_id text REFERENCES agent_sessions(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  next_action text,
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_goals_user_updated_idx ON user_goals(user_id, updated_at DESC);
