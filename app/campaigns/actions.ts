'use server'

import { createClient } from '@/lib/supabase/server'
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

const MAX_RECIPIENTS = 250
const SEND_DELAY_MS = 150

export async function sendCampaign({
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
    return { error: `Máximo ${MAX_RECIPIENTS} destinatarios por campaña. Divide el envío en lotes más pequeños.` }
  }

  const { data: makers, error: makersError } = await supabase
    .from('placements_makers')
    .select('id, first_name, phone_e164, magic_link_token')
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

  const { data: messageRows, error: messagesInsertError } = await supabase
    .from('whatsapp_campaign_messages')
    .insert(
      makers.map((m) => ({
        campaign_id: campaign.id,
        maker_id: m.id,
        phone_e164: m.phone_e164,
        status: 'pending',
      })),
    )
    .select()

  if (messagesInsertError || !messageRows) {
    await supabase.from('whatsapp_campaigns').update({ status: 'failed' }).eq('id', campaign.id)
    return { error: messagesInsertError?.message || 'No se pudieron registrar los mensajes' }
  }

  const client = getKapsoClient()
  const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID!

  let sent = 0
  let failed = 0

  for (const maker of makers) {
    const messageRow = messageRows.find((r) => r.maker_id === maker.id)
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
          name: templateName,
          language: { code: templateLanguage },
          components,
        },
      })

      const waMessageId = (result as any)?.messages?.[0]?.id || (result as any)?.id || null

      await supabase
        .from('whatsapp_campaign_messages')
        .update({ status: 'sent', wa_message_id: waMessageId, sent_at: new Date().toISOString() })
        .eq('id', messageRow?.id)

      await supabase
        .from('placements_makers')
        .update({ last_reminder_sent_at: new Date().toISOString() })
        .eq('id', maker.id)

      sent += 1
    } catch (err: any) {
      await supabase
        .from('whatsapp_campaign_messages')
        .update({ status: 'failed', error: err?.message || 'Error desconocido' })
        .eq('id', messageRow?.id)

      failed += 1
    }

    await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS))
  }

  await supabase
    .from('whatsapp_campaigns')
    .update({
      status: 'completed',
      sent_count: sent,
      failed_count: failed,
      completed_at: new Date().toISOString(),
    })
    .eq('id', campaign.id)

  revalidatePath('/campaigns')

  return { success: true, sent, failed, total: makers.length }
}
