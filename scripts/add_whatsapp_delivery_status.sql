-- Migration: delivery/read status for WhatsApp campaign messages (Kapso webhooks)
-- Run this in Supabase SQL Editor, AFTER create_whatsapp_campaigns.sql

-- 1. Allow the richer statuses reported by Meta via the Kapso webhook.
ALTER TABLE whatsapp_campaign_messages
  DROP CONSTRAINT IF EXISTS whatsapp_campaign_messages_status_check;

ALTER TABLE whatsapp_campaign_messages
  ADD CONSTRAINT whatsapp_campaign_messages_status_check
  CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed'));

ALTER TABLE whatsapp_campaign_messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS error_code int;

-- The webhook looks messages up by the wamid returned at send time.
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_messages_wa_message_id
  ON whatsapp_campaign_messages(wa_message_id);

-- 2. Aggregate counters on the campaign, so the history doesn't need to scan
--    every message row.
ALTER TABLE whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS delivered_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_count int NOT NULL DEFAULT 0;

-- 3. Atomic increment used by the webhook. Webhook events for the same campaign
--    arrive concurrently, so read-modify-write from the app would lose updates.
CREATE OR REPLACE FUNCTION increment_campaign_counter(
  p_campaign_id uuid,
  p_counter text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_counter = 'delivered' THEN
    UPDATE whatsapp_campaigns
      SET delivered_count = delivered_count + 1
      WHERE id = p_campaign_id;
  ELSIF p_counter = 'read' THEN
    UPDATE whatsapp_campaigns
      SET read_count = read_count + 1
      WHERE id = p_campaign_id;
  ELSIF p_counter = 'failed' THEN
    UPDATE whatsapp_campaigns
      SET failed_count = failed_count + 1,
          sent_count = GREATEST(sent_count - 1, 0)
      WHERE id = p_campaign_id;
  END IF;
END;
$$;

-- The webhook route calls this with the service_role key (RLS is bypassed);
-- no additional grants are needed for the app's anon/authenticated roles.
