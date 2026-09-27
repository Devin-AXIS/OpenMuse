CREATE TABLE IF NOT EXISTS agent_sessions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  title text NOT NULL DEFAULT '新对话',
  runtime text NOT NULL DEFAULT 'cloud-dsh' CHECK (runtime IN ('cloud-dsh', 'ipollowork-pc')),
  dsh_session_id text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS agent_sessions_user_updated_idx ON agent_sessions(user_id, updated_at DESC) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS agent_messages (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, id)
);
CREATE INDEX IF NOT EXISTS agent_messages_session_created_idx ON agent_messages(session_id, created_at);

CREATE TABLE IF NOT EXISTS user_memories (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  source_session_id text REFERENCES agent_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_memories_user_updated_idx ON user_memories(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS user_memories_search_idx ON user_memories USING gin (to_tsvector('simple', content));

CREATE TABLE IF NOT EXISTS workspace_attachments (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS workspace_attachments_user_idx ON workspace_attachments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_schedules (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  session_id text NOT NULL REFERENCES agent_sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  prompt text NOT NULL,
  cron_expression text,
  time_zone text NOT NULL DEFAULT 'UTC',
  run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((cron_expression IS NOT NULL AND run_at IS NULL) OR (cron_expression IS NULL AND run_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS agent_schedules_due_idx ON agent_schedules(next_run_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS agent_schedules_user_idx ON agent_schedules(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
