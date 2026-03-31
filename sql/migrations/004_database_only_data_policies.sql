-- ================================================
-- MacroMetric Database Migration 004
-- RLS policies for database-only data tables
-- Run in Supabase SQL Editor.
-- ================================================

ALTER TABLE IF EXISTS event_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS release_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_goals_select_own" ON event_goals;
DROP POLICY IF EXISTS "event_goals_insert_own" ON event_goals;
DROP POLICY IF EXISTS "event_goals_update_own" ON event_goals;
DROP POLICY IF EXISTS "event_goals_delete_own" ON event_goals;

CREATE POLICY "event_goals_select_own" ON event_goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "event_goals_insert_own" ON event_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_goals_update_own" ON event_goals
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "event_goals_delete_own" ON event_goals
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "milestones_select_own" ON milestones;
DROP POLICY IF EXISTS "milestones_insert_own" ON milestones;
DROP POLICY IF EXISTS "milestones_update_own" ON milestones;
DROP POLICY IF EXISTS "milestones_delete_own" ON milestones;

CREATE POLICY "milestones_select_own" ON milestones
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "milestones_insert_own" ON milestones
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milestones_update_own" ON milestones
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "milestones_delete_own" ON milestones
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "release_notes_select_own" ON release_notes;
DROP POLICY IF EXISTS "release_notes_insert_own" ON release_notes;
DROP POLICY IF EXISTS "release_notes_update_own" ON release_notes;
DROP POLICY IF EXISTS "release_notes_delete_own" ON release_notes;

CREATE POLICY "release_notes_select_own" ON release_notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "release_notes_insert_own" ON release_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "release_notes_update_own" ON release_notes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "release_notes_delete_own" ON release_notes
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "feature_requests_select_own" ON feature_requests;
DROP POLICY IF EXISTS "feature_requests_insert_own" ON feature_requests;
DROP POLICY IF EXISTS "feature_requests_update_own" ON feature_requests;
DROP POLICY IF EXISTS "feature_requests_delete_own" ON feature_requests;

CREATE POLICY "feature_requests_select_own" ON feature_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "feature_requests_insert_own" ON feature_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feature_requests_update_own" ON feature_requests
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "feature_requests_delete_own" ON feature_requests
  FOR DELETE USING (auth.uid() = user_id);
