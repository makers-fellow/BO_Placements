-- Migration: Add user_type and conditional flow columns to placements_makers
-- Run this in Supabase SQL Editor

ALTER TABLE placements_makers 
  ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'seeker',
  ADD COLUMN IF NOT EXISTS startup_name text,
  ADD COLUMN IF NOT EXISTS startup_stage text,
  ADD COLUMN IF NOT EXISTS startup_industry text[],
  ADD COLUMN IF NOT EXISTS founder_role text,
  ADD COLUMN IF NOT EXISTS employer_name text,
  ADD COLUMN IF NOT EXISTS employer_role text;

-- Add a comment for documentation
COMMENT ON COLUMN placements_makers.user_type IS 'seeker | founder | employed';
COMMENT ON COLUMN placements_makers.startup_name IS 'Founder flow: startup name';
COMMENT ON COLUMN placements_makers.startup_stage IS 'Founder flow: pre_seed | seed | series_a | series_b_plus';
COMMENT ON COLUMN placements_makers.startup_industry IS 'Founder flow: industries array';
COMMENT ON COLUMN placements_makers.founder_role IS 'Founder flow: role in startup (CEO, CTO, etc.)';
COMMENT ON COLUMN placements_makers.employer_name IS 'Employed flow: company name';
COMMENT ON COLUMN placements_makers.employer_role IS 'Employed flow: current role';
