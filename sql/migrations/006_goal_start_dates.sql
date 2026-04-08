-- ================================================
-- MacroMetric Database Migration 006
-- Add optional start_date to active and saved goals
-- so journeys can show a goal-start marker.
-- Run in Supabase SQL Editor.
-- ================================================

ALTER TABLE IF EXISTS race_goals
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE IF EXISTS event_goals
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Backfill saved event goals from their created_at timestamp when possible.
UPDATE event_goals
SET start_date = TO_TIMESTAMP(created_at / 1000.0)::DATE
WHERE start_date IS NULL
  AND created_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_event_goals_start_date ON event_goals(start_date);
