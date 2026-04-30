-- ==========================================================
-- Auth Setup for BO Placements Dashboard
-- Run this in Supabase SQL Editor AFTER enabling Email Auth
-- ==========================================================

-- 1. Create dashboard_users table
CREATE TABLE IF NOT EXISTS dashboard_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email text NOT NULL,
  full_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'admin')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE dashboard_users ENABLE ROW LEVEL SECURITY;

-- 3. Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON dashboard_users FOR SELECT
  USING (auth.uid() = auth_id);

-- 4. Admins can read all users
CREATE POLICY "Admins can read all users"
  ON dashboard_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE auth_id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- 5. Admins can update user status
CREATE POLICY "Admins can update users"
  ON dashboard_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE auth_id = auth.uid() AND role = 'admin' AND status = 'approved'
    )
  );

-- 6. Allow authenticated users to insert their own row (on registration)
CREATE POLICY "Users can insert own profile"
  ON dashboard_users FOR INSERT
  WITH CHECK (auth.uid() = auth_id);
