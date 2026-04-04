-- ================================================
-- MacroMetric Database Migration 005
-- Add intermittent fasting start/end times to check-ins.
-- Run in Supabase SQL Editor.
-- ================================================

ALTER TABLE checkins
ADD COLUMN IF NOT EXISTS fast_start_time TIME;

ALTER TABLE checkins
ADD COLUMN IF NOT EXISTS first_meal_time TIME;
