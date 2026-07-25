import { createServiceClient } from '@/lib/supabase/service'

export const CV_BUCKET = 'CVs Makers'

/** Cuánto vive una signed URL de CV. Suficiente para abrir el PDF, no para compartirlo. */
const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * `placements_makers.cv_url` guarda la URL "pública" que devolvía getPublicUrl.
 * Con el bucket privado esa URL ya no resuelve, pero el nombre del archivo sigue
 * siendo el último segmento, así que sirve igual como identificador.
 */
export function cvPathFromUrl(cvUrl: string | null | undefined): string | null {
  if (!cvUrl) return null
  const withoutQuery = cvUrl.split('?')[0]
  const fileName = withoutQuery.split('/').pop()
  return fileName ? decodeURIComponent(fileName) : null
}

/** Signed URL para un CV. Devuelve null si no hay archivo o si el firmado falla. */
export async function signCVUrl(cvUrl: string | null | undefined): Promise<string | null> {
  const path = cvPathFromUrl(cvUrl)
  if (!path) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error) {
    console.error('[storage] no se pudo firmar el CV', path, error.message)
    return null
  }

  return data?.signedUrl ?? null
}

/**
 * Firma varios CVs en una sola llamada (el dashboard lista cientos de makers).
 * Devuelve un mapa `cv_url original -> signed URL`.
 */
export async function signCVUrls(
  cvUrls: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  const pairs = cvUrls
    .map((url) => ({ url, path: cvPathFromUrl(url) }))
    .filter((p): p is { url: string; path: string } => Boolean(p.url && p.path))

  if (pairs.length === 0) return result

  const supabase = createServiceClient()
  const { data, error } = await supabase.storage
    .from(CV_BUCKET)
    .createSignedUrls(
      pairs.map((p) => p.path),
      SIGNED_URL_TTL_SECONDS,
    )

  if (error || !data) {
    console.error('[storage] no se pudieron firmar los CVs', error?.message)
    return result
  }

  // createSignedUrls respeta el orden de los paths pedidos.
  data.forEach((entry, i) => {
    if (entry.signedUrl && !entry.error) {
      result.set(pairs[i].url, entry.signedUrl)
    }
  })

  return result
}
