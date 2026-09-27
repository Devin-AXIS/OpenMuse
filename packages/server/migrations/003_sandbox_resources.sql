CREATE TABLE IF NOT EXISTS user_runtime_resources (
  user_id text PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  e2b_volume_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS llm_proxy_usage (
  user_id text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  usage_day date NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  request_bytes bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_day)
);
