import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { signCVUrl } from '@/lib/supabase/storage'

/**
 * Redirige al CV del maker con una signed URL fresca.
 *
 * Existe porque las signed URLs expiran: guardar una en `cv_url` o en el estado
 * del formulario dejaría links muertos. El maker (que tiene el token) entra acá
 * y siempre recibe una URL válida.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: maker } = await supabase
    .from('placements_makers')
    .select('cv_url')
    .eq('magic_link_token', token)
    .maybeSingle()

  if (!maker?.cv_url) {
    return NextResponse.json({ error: 'CV no encontrado' }, { status: 404 })
  }

  const signedUrl = await signCVUrl(maker.cv_url)
  if (!signedUrl) {
    return NextResponse.json({ error: 'No se pudo generar el enlace al CV' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrl)
}
