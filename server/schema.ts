export const DATABASE_SCHEMA_SQL = `
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

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

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

CREATE INDEX IF NOT EXISTS idx_my_foods_user_id ON my_foods(user_id);

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

CREATE INDEX IF NOT EXISTS idx_food_logs_user_id ON food_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_food_id ON food_logs(food_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(date);

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

CREATE INDEX IF NOT EXISTS idx_presets_user_id ON presets(user_id);

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
  vitals JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);

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

CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);

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

CREATE INDEX IF NOT EXISTS idx_event_goals_user_id ON event_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_event_goals_race_date ON event_goals(race_date);
CREATE INDEX IF NOT EXISTS idx_event_goals_start_date ON event_goals(start_date);

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

CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);

CREATE TABLE IF NOT EXISTS release_notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_release_notes_user_id ON release_notes(user_id);

CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests(user_id);
`;
