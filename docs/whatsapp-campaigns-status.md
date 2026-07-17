# WhatsApp Campaigns — status and remaining steps

Implementation of the plan in `docs/whatsapp-campaigns-plan.md` is code-complete and builds cleanly. This doc tracks what's done, what deviated from the original plan (based on the real Kapso template), and what's left before it's live in production.

## Done

- `scripts/create_whatsapp_campaigns.sql` — migration for `whatsapp_campaigns`, `whatsapp_campaign_messages`, and `placements_makers.last_reminder_sent_at`. **Not yet run in Supabase.**
- `lib/kapso/client.ts` — Kapso client + `listApprovedTemplates()`.
- `app/campaigns/actions.ts` — `getApprovedTemplates()`, `sendCampaign()` (both admin-gated server actions).
- `app/campaigns/page.tsx` + `app/campaigns/client-page.tsx` — the `/campaigns` admin page (staleness filter, recipient table, template picker, confirm dialog, campaign history).
- Navbar updated with a "Campañas" link for admins.
- README updated with the new section, tables, and env vars.
- `@kapso/whatsapp-cloud-api` installed.
- `.env.local` populated with `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_BUSINESS_ACCOUNT_ID`, and (after the user provided them) `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `npm run build` passes; `npx tsc --noEmit` shows no errors in the new files.
- Confirmed via `curl` against the real Kapso API that the actual approved template is **`update_placements_form`** (`APPROVED`, category `MARKETING`, language `es_AR`) — not the `first_name`/`profile_url` NAMED-param template assumed in the original plan. It uses:
  - Body: one **positional** `{{1}}` = first name.
  - A URL button: `https://bo-placements.vercel.app/perfil/{{1}}`, where `{{1}}` is the maker's `magic_link_token` (not a full URL).
- `lib/kapso/client.ts` and `app/campaigns/actions.ts` were rewritten to support positional-parameter templates with a URL button, and the send payload was manually verified against Meta's expected shape (see `references/templates-reference.md` send-time examples in `.agents/skills/integrate-whatsapp/`). The built payload for a maker `{first_name: "Andy", magic_link_token: "test-token-123"}` was:
  ```json
  {
    "name": "update_placements_form",
    "language": { "code": "es_AR" },
    "components": [
      { "type": "body", "parameters": [{ "type": "text", "text": "Andy" }] },
      { "type": "button", "sub_type": "url", "index": "0", "parameters": [{ "type": "text", "text": "test-token-123" }] }
    ]
  }
  ```
  This matches Meta's expected format exactly.

## Not done / remaining

1. **Run the SQL migration.** Open Supabase SQL Editor and run `scripts/create_whatsapp_campaigns.sql`. Without this, `/campaigns` will load but `sendCampaign` will fail on insert.
2. **Send a real test message.** Not done yet — the user deferred this. Before trusting the feature for real makers:
   - Easiest path: log in as an admin on `/campaigns`, select a single maker whose `phone_e164` you control (or temporarily edit a test row in Supabase to your own phone), pick `update_placements_form`, and send.
   - Alternative: send directly via Kapso CLI/API without going through the app, e.g.:
     ```bash
     curl -s -X POST "https://api.kapso.ai/meta/whatsapp/v24.0/851226351403761/messages" \
       -H "X-API-Key: $KAPSO_API_KEY" -H "Content-Type: application/json" \
       -d '{
         "messaging_product": "whatsapp",
         "to": "+549XXXXXXXXXX",
         "type": "template",
         "template": {
           "name": "update_placements_form",
           "language": { "code": "es_AR" },
           "components": [
             { "type": "body", "parameters": [{ "type": "text", "text": "Andy" }] },
             { "type": "button", "sub_type": "url", "index": "0", "parameters": [{ "type": "text", "text": "<a-real-magic-link-token>" }] }
           ]
         }
       }'
     ```
   - Confirm: message arrives with correct name and a working "Actualizar mi estado" button pointing to `/perfil/<token>`.
3. **Full logged-in walkthrough of `/campaigns`.** Only the unauthenticated redirect (`/campaigns` → `/login`, 307) was verified in this session — nobody has loaded the page as an authenticated admin yet. Check: stale-makers list renders with correct relative dates, threshold buttons (30/60/90) refilter correctly, template dropdown shows `update_placements_form`, confirm dialog and toast work, and a completed campaign shows up in the history section.
4. **Vercel env vars.** `KAPSO_API_KEY`, `KAPSO_PHONE_NUMBER_ID`, `KAPSO_BUSINESS_ACCOUNT_ID` need to be added in Vercel → Settings → Environment Variables (Production, and Preview if used), then redeploy. (Supabase vars presumably already exist there.)
5. **Commit and push.** Nothing from this feature has been committed yet. `git status` currently shows:
   - Modified: `README.md`, `components/navbar.tsx`, `package.json`, `package-lock.json`
   - New: `app/campaigns/`, `lib/kapso/`, `scripts/create_whatsapp_campaigns.sql`, `docs/`
   - Also untracked from earlier in this session, unrelated to this feature: `scripts/add_not_looking_enum.sql` (pre-existing, not part of this feature — confirm with the user before including it in the same commit or leave it out)
   - `.agents/`, `.claude/`, `skills-lock.json` — installed by `npx skills add gokapso/agent-skills`; decide whether these should be committed (so the skill docs travel with the repo for future sessions) or left local/gitignored.
   - `tsconfig.tsbuildinfo` — build artifact from `tsc --noEmit`, should NOT be committed (add to `.gitignore` or just delete it).

## Notes for whoever picks this up

- Real template name is `update_placements_form`, language `es_AR`. If a different/newer template is approved later with NAMED params instead, the code already handles both `parameterFormat` cases (see `lib/kapso/client.ts` and the `sendCampaign` loop in `app/campaigns/actions.ts`), so no rewrite should be needed — just re-verify the payload shape.
- `MAX_RECIPIENTS = 250` and `SEND_DELAY_MS = 150` are in `app/campaigns/actions.ts` if rate limits need tuning.
- The Kapso sandbox number (`phone_number_id: 597907523413541`, WABA `2102230076919824`) is commented out in `.env.local` if testing without touching the production Makers Fellowship number is preferred — but note the approved template `update_placements_form` is tied to the production WABA (`1608619990103126`), so it likely won't be usable from the sandbox WABA without recreating/approving it there too.
