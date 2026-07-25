# WhatsApp Campaigns — status and remaining steps

Implementation of the plan in `docs/whatsapp-campaigns-plan.md` is code-complete, merged to `main`, and deployed to production on Vercel. This doc tracks what's done and what's left.

## Done

### Code (all merged to `main`, deployed to prod)

- `scripts/create_whatsapp_campaigns.sql` — migration for `whatsapp_campaigns`, `whatsapp_campaign_messages`, and `placements_makers.last_reminder_sent_at`. ✅ Run in Supabase.
- `scripts/add_whatsapp_delivery_status.sql` — extends message statuses (`delivered`, `read`), adds `delivered_at`/`read_at`/`error_code` columns, index on `wa_message_id`, campaign-level counters, and `increment_campaign_counter` RPC function. ✅ Run in Supabase.
- `scripts/lock_down_placements_rls.sql` — closes `placements_makers` to anon/authenticated. ✅ Run in Supabase.
- `scripts/lock_down_cv_storage.sql` — locks CV storage bucket. ✅ Run in Supabase.
- `lib/kapso/client.ts` — Kapso client + `listApprovedTemplates()`.
- `app/campaigns/actions.ts` — `createCampaign()`, `sendCampaignBatch()` (batch sending, resumable), `getApprovedTemplates()`. All admin-gated.
- `app/campaigns/page.tsx` + `app/campaigns/client-page.tsx` — the `/campaigns` admin page (staleness filter, recipient table, template picker, confirm dialog, campaign history).
- `app/api/whatsapp/webhook/route.ts` — delivery status webhook (handles `sent`, `delivered`, `read`, `failed` events from Kapso).
- `lib/supabase/service.ts` — service_role Supabase client for bypassing RLS in server-side code.
- Navbar updated with a "Campañas" link for admins.
- README updated with the new section, tables, and env vars.
- `@kapso/whatsapp-cloud-api` installed.
- `npm run build` passes.
- Confirmed via `curl` against the real Kapso API that the actual approved template is **`update_placements_form`** (`APPROVED`, category `MARKETING`, language `es_AR`). It uses:
  - Body: one **positional** `{{1}}` = first name.
  - A URL button: `https://bo-placements.vercel.app/perfil/{{1}}`, where `{{1}}` is the maker's `magic_link_token`.

### Infrastructure

- ✅ SQL migrations run in Supabase (all 4 scripts).
- ✅ Vercel env vars set: `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_BUSINESS_ACCOUNT_ID`, `KAPSO_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
- ✅ Kapso webhook created and active:
  - **ID**: `d04951c0-c921-4cae-ab31-4301a7b7fade`
  - **URL**: `https://bo-placements.vercel.app/api/whatsapp/webhook`
  - **Events**: `whatsapp.message.sent`, `whatsapp.message.delivered`, `whatsapp.message.read`, `whatsapp.message.failed`
  - **Kind**: kapso, payload v2
  - **Test delivery**: verified ✅ (Kapso test event returned `success: true`)
- ✅ Branch `test` merged to `main` (fast-forward, 6 commits) and pushed.
- ✅ Production deploy triggered on Vercel.
- ✅ Webhook route responds 401 to unsigned requests (correct behavior).
- ✅ `/campaigns` redirects to `/login` for unauthenticated users (307).

## Not done / remaining

1. **Send a real test message.** Log in as admin on `/campaigns`, select a single maker whose `phone_e164` you control (or temporarily edit a test row in Supabase to your own phone), pick `update_placements_form`, and send. Confirm:
   - WhatsApp message arrives with the correct name.
   - "Actualizar mi estado" button points to `/perfil/<token>` and loads the profile form.
   - Campaign shows up in the history section.
   - Delivery status webhook updates the message row (`delivered` → `read`).

2. **Full logged-in walkthrough of `/campaigns`.** Verify as an authenticated admin:
   - Stale-makers list renders with correct relative dates.
   - Threshold buttons (30/60/90 days) refilter correctly.
   - Template dropdown shows `update_placements_form`.
   - Confirm dialog and toast work.
   - Force a failure (bogus phone like `+10000000000`) and confirm the row is marked `failed` with an error, and the campaign still completes the rest.

## Notes for whoever picks this up

- Real template name is `update_placements_form`, language `es_AR`. If a different/newer template is approved later with NAMED params instead, the code already handles both `parameterFormat` cases (see `lib/kapso/client.ts` and the `sendCampaignBatch` loop in `app/campaigns/actions.ts`), so no rewrite should be needed — just re-verify the payload shape.
- `MAX_RECIPIENTS = 1000`, `BATCH_SIZE = 25`, and `SEND_DELAY_MS = 150` are in `app/campaigns/actions.ts` if rate limits need tuning.
- The Kapso sandbox number (`phone_number_id: 597907523413541`, WABA `2102230076919824`) is commented out in `.env.local` if testing without touching the production Makers Fellowship number is preferred — but note the approved template `update_placements_form` is tied to the production WABA (`1608619990103126`), so it likely won't be usable from the sandbox WABA without recreating/approving it there too.
- There's also an older inactive webhook (`ba3e5aab-...`) pointing to an ngrok URL for `whatsapp.message.received` — it can be deleted when no longer needed.
