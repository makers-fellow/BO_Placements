# Plan: WhatsApp Campaigns section (Kapso)

Feature: a new admin section to find makers whose profile is stale (no update in the last 30 days), pick an approved WhatsApp template, and mass-send a reminder asking if they're still looking for a job. Messages go out through **Kapso** (WhatsApp Cloud API proxy).

## Context you need (read first)

- This is a Next.js 16 App Router + Supabase app. Read `README.md` for the full picture.
- Data lives in Supabase table `placements_makers`. Relevant existing columns (verified in code):
  - `phone_e164` (text) — WhatsApp-ready phone, used by `WhatsAppButton` in `app/candidates-table.tsx:852`
  - `updated_at` — row-level timestamp
  - `profile_last_updated_at` — set explicitly when the maker saves their profile form (`app/perfil/[token]/actions.ts:95`). **Use this one for staleness**, falling back to `updated_at` when null.
  - `first_name`, `search_status`, `user_type`, `magic_link_token`
- Auth pattern: server components call `createClient()` from `lib/supabase/server.ts`, check `dashboard_users` for `status = 'approved'` and `role = 'admin'`. Copy the guard pattern from `app/admin/page.tsx`.
- UI conventions: dark theme `bg-[#0F1729]`, shadcn/ui components in `components/ui/`, Navbar in `components/navbar.tsx`, toasts via sonner. Match `app/admin/` styling.
- Kapso skills are installed at `.agents/skills/integrate-whatsapp/` (and `automate-whatsapp`, `observe-whatsapp`). Read `.agents/skills/integrate-whatsapp/SKILL.md` and `references/whatsapp-cloud-api-js.md` + `references/templates-reference.md` before writing Kapso code.

## Kapso essentials

- SDK: `npm install @kapso/whatsapp-cloud-api`
  ```ts
  import { WhatsAppClient } from "@kapso/whatsapp-cloud-api";
  const client = new WhatsAppClient({
    baseUrl: "https://api.kapso.ai/meta/whatsapp",
    kapsoApiKey: process.env.KAPSO_API_KEY!,
  });
  ```
- Sending a template:
  ```ts
  await client.messages.sendTemplate({
    phoneNumberId: process.env.KAPSO_PHONE_NUMBER_ID!,
    to: "+5215512345678", // phone_e164
    template: {
      name: "profile_reminder",
      language: { code: "es" },
      components: [{
        type: "body",
        parameters: [
          { type: "text", parameterName: "first_name", text: maker.first_name },
          { type: "text", parameterName: "profile_url", text: `${SITE_URL}/perfil/${maker.magic_link_token}` },
        ],
      }],
    },
  });
  ```
- Listing templates (to populate the template picker): Meta proxy `GET /{business_account_id}/message_templates` with header `X-API-Key: $KAPSO_API_KEY`, base `https://api.kapso.ai/meta/whatsapp/v24.0`. Only offer templates with `status === "APPROVED"`. Templates themselves are created/approved in the Kapso/Meta dashboard — **out of scope for this feature**; the app only lists and sends.
- Outbound messages outside a 24h session window **must** be templates (this whole feature is template-based, so that's satisfied).
- New env vars (add to `.env.local` and Vercel):
  ```
  KAPSO_API_KEY=
  KAPSO_PHONE_NUMBER_ID=        # Meta phone_number_id, from `kapso whatsapp numbers list`
  KAPSO_BUSINESS_ACCOUNT_ID=    # WABA id, needed for template listing
  ```
  All are server-only secrets — never expose with `NEXT_PUBLIC_`.

## Step 1 — DB migration (`scripts/create_whatsapp_campaigns.sql`)

Follow the existing convention: a SQL file the team runs manually in the Supabase SQL editor. Create:

```sql
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_name text NOT NULL,
  template_language text NOT NULL DEFAULT 'es',
  created_by uuid REFERENCES auth.users(id),
  recipient_count int NOT NULL DEFAULT 0,
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','completed','failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS whatsapp_campaign_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES whatsapp_campaigns(id) ON DELETE CASCADE,
  maker_id uuid,                -- FK to placements_makers.id
  phone_e164 text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  wa_message_id text,           -- Meta message id returned on send
  error text,
  sent_at timestamptz
);
```

Enable RLS on both; policies: authenticated users who are approved admins in `dashboard_users` can select/insert/update (mirror the admin policies in `scripts/auth_setup.sql`). Server actions run with the user's session, so policies must allow admins.

Also record contact attempts on the maker: `ALTER TABLE placements_makers ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamptz;` — update it on each successful send, and show it in the campaign recipient list so admins don't re-spam someone reminded recently.

## Step 2 — Page: `app/campaigns/page.tsx` (server component)

- Guard: same as `app/admin/page.tsx` — redirect non-logged-in to `/login`, non-admin to `/`. (Middleware already protects the route since it's not in the public list — verify, don't change `middleware.ts`.)
- Fetch stale makers server-side:
  ```ts
  const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
  supabase.from("placements_makers").select("id, first_name, email, phone_e164, search_status, user_type, profile_last_updated_at, updated_at, last_reminder_sent_at, magic_link_token, cohort")
    .or(`profile_last_updated_at.lt.${cutoff},and(profile_last_updated_at.is.null,updated_at.lt.${cutoff})`)
    .not("phone_e164", "is", null)
  ```
  Exclude `user_type = 'employed'` and `search_status = 'not_looking'` by default (they already told us they're not looking) but show a toggle to include them.
- Fetch past campaigns from `whatsapp_campaigns` for a history section.
- Render a client component `app/campaigns/client-page.tsx` with the data.
- Add a "Campañas" link to `components/navbar.tsx`, visible only when `isAdmin` (next to the existing Admin link).

## Step 3 — Client UI: `app/campaigns/client-page.tsx`

Single-page flow, in Spanish, matching the existing dark UI:

1. **Recipient list**: table of stale makers (name, phone, cohort, "última actualización" as relative date, "último recordatorio"). All pre-checked; checkboxes to exclude individuals; staleness threshold selector (30/60/90 days — re-filter client-side, so fetch with the loosest cutoff of 30 days server-side and pass raw dates down... simpler: fetch ALL makers with the fields above and filter entirely client-side, consistent with how `candidates-table.tsx` already filters client-side).
2. **Template picker**: dropdown populated from a server action `getApprovedTemplates()` that calls the Kapso template list endpoint. Show the template body text as a preview with variables highlighted. Assume the template body uses named params `{{first_name}}` and `{{profile_url}}`; map them at send time. If a selected template has other variables, show a warning that only `first_name`/`profile_url` are auto-filled.
3. **Send**: button `Enviar a N makers` → confirmation dialog (`components/ui/alert-dialog`) stating count and template name → calls the send server action → progress/result state → toast with `sent/failed` summary and refresh of history.

## Step 4 — Server actions: `app/campaigns/actions.ts`

`'use server'` file, same style as `app/admin/actions.ts`. Every action re-checks admin (never trust the client):

- `getApprovedTemplates()`: `fetch` to `https://api.kapso.ai/meta/whatsapp/v24.0/${KAPSO_BUSINESS_ACCOUNT_ID}/message_templates` with `X-API-Key`; return `{ name, language, category, bodyText, variables }[]` for `status === "APPROVED"` only.
- `sendCampaign({ name, templateName, templateLanguage, makerIds })`:
  1. Re-verify admin; re-fetch the makers by id from Supabase (get fresh `phone_e164`, `first_name`, `magic_link_token`) — don't accept phone numbers from the client.
  2. Insert the `whatsapp_campaigns` row (`status: 'sending'`) and one `whatsapp_campaign_messages` row per recipient.
  3. Loop sequentially with a small delay (~150ms between sends; Meta's default pair-rate limit) using `client.messages.sendTemplate(...)`. Per message: on success store `wa_message_id`, mark `sent`, update `last_reminder_sent_at`; on error store `error`, mark `failed`. One failure must not abort the loop.
  4. Finalize campaign row (`completed`, counts, `completed_at`) and return the summary.
  - Cap recipients per campaign at ~250 for now; a Next.js server action must finish within the platform timeout (on Vercel, check `maxDuration`; set `export const maxDuration = 300` on the route segment if needed). If the list exceeds the cap, tell the user to split — do NOT build a queue system in this iteration.

## Step 5 — Verify

1. `npm run build` passes.
2. With env vars set, load `/campaigns` as an admin: stale list renders with correct relative dates; a non-admin gets redirected.
3. Template dropdown shows real approved templates from Kapso.
4. Send a test campaign to a single maker whose `phone_e164` is a team member's phone (edit a test row in Supabase if needed). Confirm: WhatsApp message arrives with the correct name + working profile link, `whatsapp_campaign_messages.status = 'sent'` with `wa_message_id`, `last_reminder_sent_at` updated, campaign appears in history.
5. Force a failure (bogus phone like `+10000000000`) and confirm the row is marked `failed` with an error, and the campaign still completes.

## Out of scope (do not build now)

- Template creation/editing inside the app (managed in Kapso dashboard).
- Delivery/read-status webhooks (would use Kapso phone-number webhooks; later iteration).
- Reply handling / inbox (Kapso inbox embed is a candidate for later).
- Scheduled/automatic recurring campaigns.
