import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'

/**
 * Kapso WhatsApp webhook: updates delivery status of campaign messages.
 *
 * Configure in Kapso as a *phone-number* webhook (message events are not
 * delivered via project webhooks) pointing at:
 *   https://<host>/api/whatsapp/webhook
 * subscribed to whatsapp.message.delivered / .read / .failed / .sent.
 *
 * Must answer 200 within 10s or Kapso retries (10s, 40s, 90s).
 */

/** Status precedence: a late `delivered` must not overwrite a `read`. */
const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

const EVENT_TO_STATUS: Record<string, string> = {
  'whatsapp.message.sent': 'sent',
  'whatsapp.message.delivered': 'delivered',
  'whatsapp.message.read': 'read',
  'whatsapp.message.failed': 'failed',
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.KAPSO_WEBHOOK_SECRET
  if (!secret) return false
  if (!signature) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

async function applyEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: string,
  payload: any,
) {
  const newStatus = EVENT_TO_STATUS[event]
  if (!newStatus) return

  const waMessageId: string | undefined = payload?.message?.id
  if (!waMessageId) return

  // Only campaign messages are tracked; anything else (replies, manual sends) is ignored.
  const { data: message } = await supabase
    .from('whatsapp_campaign_messages')
    .select('id, campaign_id, status')
    .eq('wa_message_id', waMessageId)
    .maybeSingle()

  if (!message) return

  // Events can arrive out of order or duplicated (Kapso retries): never go backwards.
  if (STATUS_RANK[newStatus] <= STATUS_RANK[message.status ?? 'pending']) return

  const now = new Date().toISOString()
  const update: Record<string, any> = { status: newStatus }

  if (newStatus === 'delivered') update.delivered_at = now
  if (newStatus === 'read') {
    update.read_at = now
    // A read implies delivered, even if we never saw the delivered event.
    update.delivered_at = now
  }
  if (newStatus === 'failed') {
    const statuses: any[] = payload?.message?.kapso?.statuses || []
    const failure = [...statuses].reverse().find((s) => s.status === 'failed')
    const err = failure?.errors?.[0]
    update.error = err?.message || err?.title || 'Meta reportó el envío como fallido'
    update.error_code = typeof err?.code === 'number' ? err.code : null
  }

  await supabase.from('whatsapp_campaign_messages').update(update).eq('id', message.id)

  if (message.campaign_id && (newStatus === 'delivered' || newStatus === 'read' || newStatus === 'failed')) {
    await supabase.rpc('increment_campaign_counter', {
      p_campaign_id: message.campaign_id,
      p_counter: newStatus,
    })
  }
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  if (!verifySignature(rawBody, request.headers.get('x-webhook-signature'))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const headerEvent = request.headers.get('x-webhook-event')
  // Batched deliveries (X-Webhook-Batch: true) arrive as an array of events.
  const events: any[] = Array.isArray(body) ? body : [body]

  const supabase = createServiceClient()

  for (const item of events) {
    try {
      await applyEvent(supabase, item?.event || headerEvent || '', item)
    } catch (err) {
      // Swallow per-event errors: a 200 stops Kapso from retrying the whole batch,
      // and one bad event shouldn't discard the rest.
      console.error('[whatsapp-webhook] error procesando evento', err)
    }
  }

  return NextResponse.json({ ok: true })
}
