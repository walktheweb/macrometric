-- MacroMetric Postgres schema for the self-hosted stack.
-- The API also auto-initializes this schema on startup for local/dev usage.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at BIGINT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS my_foods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  calories NUMERIC(10,2) NOT NULL DEFAULT 0,
  protein NUMERIC(10,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(10,2) NOT NULL DEFAULT 0,
  fat NUMERIC(10,2) NOT NULL DEFAULT 0,
  serving TEXT NOT NULL DEFAULT '1 serving',
  serving_size NUMERIC(10,2),
  net_carbs NUMERIC(10,2),
  package_weight NUMERIC(10,2),
  package_count NUMERIC(10,2),
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS food_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id TEXT,
  name TEXT NOT NULL DEFAULT '',
  brand TEXT,
  calories NUMERIC(10,2) NOT NULL DEFAULT 0,
  protein NUMERIC(10,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(10,2) NOT NULL DEFAULT 0,
  fat NUMERIC(10,2) NOT NULL DEFAULT 0,
  serving TEXT NOT NULL DEFAULT '1 serving',
  serving_size NUMERIC(10,2),
  net_carbs NUMERIC(10,2),
  package_weight NUMERIC(10,2),
  package_count NUMERIC(10,2),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS presets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand TEXT,
  calories NUMERIC(10,2) NOT NULL DEFAULT 0,
  protein NUMERIC(10,2) NOT NULL DEFAULT 0,
  carbs NUMERIC(10,2) NOT NULL DEFAULT 0,
  fat NUMERIC(10,2) NOT NULL DEFAULT 0,
  serving TEXT NOT NULL DEFAULT '1 serving',
  serving_size NUMERIC(10,2),
  net_carbs NUMERIC(10,2),
  package_weight NUMERIC(10,2),
  package_count NUMERIC(10,2),
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS goals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calories NUMERIC(10,2) NOT NULL DEFAULT 1500,
  protein NUMERIC(10,2) NOT NULL DEFAULT 20,
  carbs NUMERIC(10,2) NOT NULL DEFAULT 5,
  fat NUMERIC(10,2) NOT NULL DEFAULT 75,
  weight NUMERIC(10,2),
  height NUMERIC(10,2),
  target_bmi NUMERIC(10,2)
);

CREATE TABLE IF NOT EXISTS checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  checkin_time TIME DEFAULT '12:00',
  weight NUMERIC(10,2),
  fast_start_time TIME,
  first_meal_time TIME,
  ketones NUMERIC(10,2),
  glucose NUMERIC(10,2),
  heart_rate NUMERIC(10,2),
  bp_high NUMERIC(10,2),
  bp_low NUMERIC(10,2),
  steps INTEGER DEFAULT 0,
  saturation NUMERIC(10,2),
  cholesterol NUMERIC(10,2),
  ferritin NUMERIC(10,2),
  notes TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS fasting_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  source_checkin_id TEXT UNIQUE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_fasting_sessions_user_id ON fasting_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_fasting_sessions_date ON fasting_sessions(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fasting_sessions_active_user
  ON fasting_sessions(user_id)
  WHERE end_time IS NULL;

CREATE TABLE IF NOT EXISTS step_goals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_goal INTEGER NOT NULL DEFAULT 10000,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  distance NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 0,
  avg_speed NUMERIC(10,2) NOT NULL DEFAULT 0,
  avg_heart_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS race_goals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT,
  start_date DATE,
  race_date DATE NOT NULL,
  target_weight NUMERIC(10,2) NOT NULL DEFAULT 80,
  weekly_target NUMERIC(10,2) NOT NULL DEFAULT 0.5
);

CREATE TABLE IF NOT EXISTS event_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_name TEXT,
  start_date DATE,
  race_date DATE NOT NULL,
  target_weight NUMERIC(10,2) NOT NULL DEFAULT 80,
  weekly_target NUMERIC(10,2) NOT NULL DEFAULT 0.5,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS release_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at BIGINT NOT NULL
);
