-- ================================================
-- MacroMetric Database Migration 005
-- Add fasting hours to daily check-ins.
-- Run in Supabase SQL Editor.
-- ================================================

ALTER TABLE checkins
ADD COLUMN IF NOT EXISTS fasting_hours NUMERIC(5,2);
