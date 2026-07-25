-- Fix: Add 'not_looking' to the search_status enum
-- Run this in Supabase SQL Editor

ALTER TYPE search_status ADD VALUE IF NOT EXISTS 'not_looking';
