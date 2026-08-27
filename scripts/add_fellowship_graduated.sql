-- Migration: Add fellowship_graduated to placements_makers
-- Run this in Supabase SQL Editor (do not run from the app).
-- See docs/profile-form-fellowship-graduated.md for why and how to verify.

ALTER TABLE placements_makers
  ADD COLUMN IF NOT EXISTS fellowship_graduated boolean;

COMMENT ON COLUMN placements_makers.fellowship_graduated
  IS 'true = Maker graduado / completó el fellowship; false = no; null = no respondió';
