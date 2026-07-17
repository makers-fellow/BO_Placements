import { WhatsAppClient } from '@kapso/whatsapp-cloud-api'

export function getKapsoClient() {
  return new WhatsAppClient({
    baseUrl: 'https://api.kapso.ai/meta/whatsapp',
    kapsoApiKey: process.env.KAPSO_API_KEY!,
  })
}

export interface KapsoTemplate {
  name: string
  language: string
  category: string
  parameterFormat: 'POSITIONAL' | 'NAMED'
  bodyText: string
  /** NAMED: variable names in order. POSITIONAL: one entry per {{n}} placeholder, in order. */
  bodyVariables: string[]
  /** Present when the template has a URL button with a variable in its URL (e.g. .../perfil/{{1}}). */
  urlButton: { index: number } | null
}

const NAMED_VAR_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g
const POSITIONAL_VAR_RE = /\{\{\s*(\d+)\s*\}\}/g

export async function listApprovedTemplates(): Promise<KapsoTemplate[]> {
  const businessAccountId = process.env.KAPSO_BUSINESS_ACCOUNT_ID
  const apiKey = process.env.KAPSO_API_KEY
  if (!businessAccountId || !apiKey) {
    throw new Error('Faltan KAPSO_BUSINESS_ACCOUNT_ID o KAPSO_API_KEY')
  }

  const res = await fetch(
    `https://api.kapso.ai/meta/whatsapp/v24.0/${businessAccountId}/message_templates`,
    {
      headers: { 'X-API-Key': apiKey },
      cache: 'no-store',
    },
  )

  if (!res.ok) {
    throw new Error(`Error al listar templates de Kapso (${res.status})`)
  }

  const json = await res.json()
  const templates = (json?.data || []) as any[]

  return templates
    .filter((t) => t.status === 'APPROVED')
    .map((t): KapsoTemplate => {
      const components = t.components || []
      const bodyComponent = components.find((c: any) => c.type === 'BODY')
      const bodyText: string = bodyComponent?.text || ''
      const parameterFormat: 'POSITIONAL' | 'NAMED' = t.parameter_format === 'NAMED' ? 'NAMED' : 'POSITIONAL'

      const bodyVariables =
        parameterFormat === 'NAMED'
          ? Array.from(bodyText.matchAll(NAMED_VAR_RE), (m) => m[1])
          : Array.from(bodyText.matchAll(POSITIONAL_VAR_RE), (m) => m[1]).sort(
              (a, b) => Number(a) - Number(b),
            )

      const buttonsComponent = components.find((c: any) => c.type === 'BUTTONS')
      const buttons: any[] = buttonsComponent?.buttons || []
      const urlButtonIndex = buttons.findIndex(
        (b) => b.type === 'URL' && typeof b.url === 'string' && /\{\{\s*\d+\s*\}\}/.test(b.url),
      )

      return {
        name: t.name,
        language: t.language,
        category: t.category,
        parameterFormat,
        bodyText,
        bodyVariables,
        urlButton: urlButtonIndex >= 0 ? { index: urlButtonIndex } : null,
      }
    })
}
