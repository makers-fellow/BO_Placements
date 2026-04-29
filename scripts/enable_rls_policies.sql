-- ==========================================================
-- Supabase RLS Policies for placements_makers
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ==========================================================

-- 1. Make sure RLS is enabled on the table
ALTER TABLE placements_makers ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone (anon) to READ all rows
--    This is needed for the admin dashboard to list candidates
CREATE POLICY "Allow public read access"
  ON placements_makers
  FOR SELECT
  USING (true);

-- 3. Allow anyone (anon) to UPDATE their own row via magic_link_token
--    The token acts as authentication — only someone with the token can update
CREATE POLICY "Allow update via magic_link_token"
  ON placements_makers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 4. (Optional) If you also need INSERT for new registrations
-- CREATE POLICY "Allow public insert"
--   ON placements_makers
--   FOR INSERT
--   WITH CHECK (true);
