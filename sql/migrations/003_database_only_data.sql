-- ================================================
-- MacroMetric Database Migration 003
-- Database-only storage for milestones, event goals,
-- release notes, and feature requests.
-- Run in Supabase SQL Editor.
-- ================================================

-- 1) Event goals (extra goals besides active race_goals row)
CREATE TABLE IF NOT EXISTS event_goals (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT,
  race_date DATE NOT NULL,
  target_weight NUMERIC(6,2) NOT NULL DEFAULT 80,
  weekly_target NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_goals_user_id ON event_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_event_goals_race_date ON event_goals(race_date);

-- 2) Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_milestones_user_id ON milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_milestones_date ON milestones(date);

-- 3) Release notes
CREATE TABLE IF NOT EXISTS release_notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_release_notes_user_id ON release_notes(user_id);

-- 4) Feature requests
CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests(user_id);
