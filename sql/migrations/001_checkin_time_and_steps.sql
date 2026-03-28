-- ================================================
-- MacroMetric Database Migration
-- Run this in Supabase SQL Editor
-- ================================================

-- 1. Add time column to checkins
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS checkin_time TIME DEFAULT '12:00';

-- 2. Set existing check-ins to noon
UPDATE checkins SET checkin_time = '12:00' WHERE checkin_time IS NULL;

-- 3. Add steps column to checkins
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS steps INTEGER DEFAULT 0;

-- 4. Create step_goals table
CREATE TABLE IF NOT EXISTS step_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  daily_goal INTEGER DEFAULT 10000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_step_goals_user_id ON step_goals(user_id);

-- ================================================
-- Optional: Rename race_goals to event_goals
-- (This is optional - race_goals still works)
-- ALTER TABLE race_goals RENAME TO event_goals;
-- ================================================
