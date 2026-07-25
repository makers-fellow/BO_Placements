'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { revalidatePath } from 'next/cache'
import { getKapsoClient, listApprovedTemplates, type KapsoTemplate } from '@/lib/kapso/client'

async function requireAdmin() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' as const, supabase: null, user: null }

  const { data: adminUser } = await supabase
    .from('dashboard_users')
    .select('role, status')
    .eq('auth_id', user.id)
    .single()

  if (adminUser?.role !== 'admin' || adminUser?.status !== 'approved') {
    return { error: 'Permisos insuficientes' as const, supabase: null, user: null }
  }

  return { error: null, supabase, user }
}

export async function getApprovedTemplates(): Promise<
  { templates: KapsoTemplate[]; error?: undefined } | { templates?: undefined; error: string }
> {
  const { error } = await requireAdmin()
  if (error) return { error }

  try {
    const templates = await listApprovedTemplates()
    return { templates }
  } catch (err: any) {
    return { error: err?.message || 'Error al obtener templates de Kapso' }
  }
}

const MAX_RECIPIENTS = 1000
const SEND_DELAY_MS = 150
/**
 * Destinatarios por invocación del server action. El envío es secuencial, así que
 * cada lote debe caber holgadamente en el timeout de la plataforma (60s en Vercel
 * Hobby): ~25 mensajes × (150ms de delay + latencia de Meta) ≈ 15-20s.
 * El cliente llama a `sendCampaignBatch` en bucle hasta que no queden pendientes.
 */
const BATCH_SIZE = 25

/**
 * Crea la campaña y una fila `pending` por destinatario. No envía nada:
 * el envío ocurre lote a lote en `sendCampaignBatch`.
 */
export async function createCampaign({
  name,
  templateName,
  templateLanguage,
  makerIds,
}: {
  name: string
  templateName: string
  templateLanguage: string
  makerIds: string[]
}) {
  const { error, supabase, user } = await requireAdmin()
  if (error || !supabase || !user) return { error: error || 'No autorizado' }

  if (!makerIds.length) return { error: 'No hay destinatarios seleccionados' }
  if (makerIds.length > MAX_RECIPIENTS) {
    return { error: `Máximo ${MAX_RECIPIENTS} destinatarios por campaña. Divide el envío en varias campañas.` }
  }

  // `placements_makers` está cerrada a anon/authenticated: va por service_role,
  // después de haber verificado admin en requireAdmin().
  const { data: makers, error: makersError } = await createServiceClient()
    .from('placements_makers')
    .select('id, phone_e164')
    .in('id', makerIds)
    .not('phone_e164', 'is', null)

  if (makersError) return { error: makersError.message }
  if (!makers || makers.length === 0) return { error: 'No se encontraron destinatarios válidos' }

  const approvedTemplates = await listApprovedTemplates()
  const template = approvedTemplates.find(
    (t) => t.name === templateName && t.language === templateLanguage,
  )
  if (!template) {
    return { error: 'El template seleccionado ya no está disponible o aprobado en Kapso' }
  }

  const { data: campaign, error: campaignError } = await supabase
    .from('whatsapp_campaigns')
    .insert({
      name,
      template_name: templateName,
      template_language: templateLanguage,
      created_by: user.id,
      recipient_count: makers.length,
      status: 'sending',
    })
    .select()
    .single()

  if (campaignError || !campaign) {
    return { error: campaignError?.message || 'No se pudo crear la campaña' }
  }

  const { error: messagesInsertError } = await supabase
    .from('whatsapp_campaign_messages')
    .insert(
      makers.map((m) => ({
        campaign_id: campaign.id,
        maker_id: m.id,
        phone_e164: m.phone_e164,
        status: 'pending',
      })),
    )

  if (messagesInsertError) {
    await supabase.from('whatsapp_campaigns').update({ status: 'failed' }).eq('id', campaign.id)
    return { error: messagesInsertError.message }
  }

  return { campaignId: campaign.id as string, total: makers.length, batchSize: BATCH_SIZE }
}

/**
 * Envía hasta BATCH_SIZE mensajes pendientes de una campaña. Idempotente respecto
 * de los ya enviados: siempre toma las filas que siguen en `pending`, así que si una
 * invocación se corta, la siguiente retoma donde quedó. Cuando no quedan pendientes
 * cierra la campaña con los contadores reales.
 */
export async function sendCampaignBatch({ campaignId }: { campaignId: string }) {
  const { error, supabase } = await requireAdmin()
  if (error || !supabase) return { error: error || 'No autorizado' }

  const { data: campaign, error: campaignError } = await supabase
    .from('whatsapp_campaigns')
    .select('id, template_name, template_language, status')
    .eq('id', campaignId)
    .single()

  if (campaignError || !campaign) return { error: 'Campaña no encontrada' }

  const { data: pending, error: pendingError } = await supabase
    .from('whatsapp_campaign_messages')
    .select('id, maker_id, phone_e164')
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')
    .order('id', { ascending: true })
    .limit(BATCH_SIZE)

  if (pendingError) return { error: pendingError.message }

  if (!pending || pending.length === 0) {
    const summary = await finalizeCampaign(supabase, campaignId)
    revalidatePath('/campaigns')
    return { ...summary, sent: 0, failed: 0, remaining: 0, done: true }
  }

  const approvedTemplates = await listApprovedTemplates()
  const template = approvedTemplates.find(
    (t) => t.name === campaign.template_name && t.language === campaign.template_language,
  )
  if (!template) {
    return { error: 'El template seleccionado ya no está disponible o aprobado en Kapso' }
  }

  // Datos frescos del maker: nunca se confía en lo que manda el cliente.
  // Vía service_role, igual que en createCampaign.
  const service = createServiceClient()
  const { data: makers, error: makersError } = await service
    .from('placements_makers')
    .select('id, first_name, phone_e164, magic_link_token')
    .in(
      'id',
      pending.map((p) => p.maker_id),
    )

  if (makersError) return { error: makersError.message }

  const client = getKapsoClient()
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID!

  let sent = 0
  let failed = 0

  for (const messageRow of pending) {
    const maker = makers?.find((m) => m.id === messageRow.maker_id)

    if (!maker || !maker.phone_e164) {
      await supabase
        .from('whatsapp_campaign_messages')
        .update({ status: 'failed', error: 'Maker sin teléfono o inexistente' })
        .eq('id', messageRow.id)
      failed += 1
      continue
    }

    const firstName = maker.first_name || 'maker'

    const bodyParameters =
      template.parameterFormat === 'NAMED'
        ? template.bodyVariables.map((varName) => ({
            type: 'text' as const,
            parameterName: varName,
            text: varName === 'first_name' ? firstName : maker.magic_link_token,
          }))
        : template.bodyVariables.map((_, i) => ({
            type: 'text' as const,
            text: i === 0 ? firstName : maker.magic_link_token,
          }))

    const components: any[] = []
    if (bodyParameters.length > 0) {
      components.push({ type: 'body', parameters: bodyParameters })
    }
    if (template.urlButton) {
      components.push({
        type: 'button',
        sub_type: 'url',
        index: String(template.urlButton.index),
        parameters: [{ type: 'text', text: maker.magic_link_token }],
      })
    }

    try {
      const result = await client.messages.sendTemplate({
        phoneNumberId,
        to: maker.phone_e164,
        template: {
          name: campaign.template_name,
          language: { code: campaign.template_language },
          components,
        },
      })

      const waMessageId = (result as any)?.messages?.[0]?.id || (result as any)?.id || null

      await supabase
        .from('whatsapp_campaign_messages')
        .update({ status: 'sent', wa_message_id: waMessageId, sent_at: new Date().toISOString() })
        .eq('id', messageRow.id)

      await service
        .from('placements_makers')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', maker.id)

      sent += 1
    } catch (err: any) {
      await supabase
        .from('whatsapp_campaign_messages')
        .update({ status: 'failed', error: err?.message || 'Error desconocido' })
        .eq('id', messageRow.id)

      failed += 1
    }

    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS))
  }

  const { count: remaining } = await supabase
    .from('whatsapp_campaign_messages')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'pending')

  const done = (remaining ?? 0) === 0
  const summary = done ? await finalizeCampaign(supabase, campaignId) : {}

  revalidatePath('/campaigns')

  return { ...summary, sent, failed, remaining: remaining ?? 0, done }
}

/** Cierra la campaña recontando los estados reales de sus mensajes. */
async function finalizeCampaign(supabase: any, campaignId: string) {
  const { count: sentTotal } = await supabase
    .from('whatsapp_campaign_messages')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'sent')

  const { count: failedTotal } = await supabase
    .from('whatsapp_campaign_messages')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'failed')

  await supabase
    .from('whatsapp_campaigns')
    .update({
      status: 'completed',
      sent_count: sentTotal ?? 0,
      failed_count: failedTotal ?? 0,
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  return { sentTotal: sentTotal ?? 0, failedTotal: failedTotal ?? 0 }
}
