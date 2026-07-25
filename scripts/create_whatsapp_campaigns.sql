-- Migration: WhatsApp campaigns (Kapso) for stale-profile reminders
-- Run this in Supabase SQL Editor
--
-- Idempotente: se puede correr varias veces. Las tablas usan IF NOT EXISTS y las
-- policies llevan DROP IF EXISTS delante, porque Postgres no soporta
-- CREATE POLICY IF NOT EXISTS y re-correr el script daba error 42710.

-- Track when a maker was last reminded via WhatsApp
ALTER TABLE placements_makers
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;

-- Campaigns: one row per batch send
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'es',
  created_by uuid REFERENCES auth.users(id),
  recipient_count int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Campaign messages: one row per recipient per campaign
CREATE TABLE IF NOT EXISTS whatsapp_campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
  maker_id uuid REFERENCES placements_makers(id) ON DELETE SET NULL,
  phone_e164 text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  wa_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_messages_campaign_id
  ON whatsapp_campaign_messages(campaign_id);

-- RLS: only approved admins (dashboard_users) can read/write campaigns
ALTER TABLE whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_campaign_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read campaigns" ON whatsapp_campaigns;
CREATE POLICY "Admins can read campaigns"
  ON whatsapp_campaigns FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Admins can insert campaigns" ON whatsapp_campaigns;
CREATE POLICY "Admins can insert campaigns"
  ON whatsapp_campaigns FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Admins can update campaigns" ON whatsapp_campaigns;
CREATE POLICY "Admins can update campaigns"
  ON whatsapp_campaigns FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Admins can read campaign messages" ON whatsapp_campaign_messages;
CREATE POLICY "Admins can read campaign messages"
  ON whatsapp_campaign_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Admins can insert campaign messages" ON whatsapp_campaign_messages;
CREATE POLICY "Admins can insert campaign messages"
  ON whatsapp_campaign_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Admins can update campaign messages" ON whatsapp_campaign_messages;
CREATE POLICY "Admins can update campaign messages"
  ON whatsapp_campaign_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dashboard_users
      WHERE dashboard_users.auth_id = auth.uid()
        AND dashboard_users.role = 'admin'
        AND dashboard_users.status = 'approved'
    )
  );

-- Admins also need to update placements_makers.last_reminder_sent_at.
-- The existing "Allow update via magic_link_token" policy (USING (true)) already
-- permits this for the anon/authenticated role, so no extra policy is required here.
