import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client with the service_role key: bypasses RLS.
 *
 * `placements_makers` y el bucket de CVs están cerrados a `anon`/`authenticated`
 * (ver scripts/lock_down_*.sql), así que todo acceso a ellos pasa por acá.
 * La autorización se hace ANTES, en cada caller: sesión + rol admin en las
 * páginas del dashboard, `magic_link_token` en las rutas de perfil, firma HMAC
 * en el webhook.
 *
 * Never import this from a client component and never expose
 * SUPABASE_SERVICE_ROLE_KEY with NEXT_PUBLIC_.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY')
  }

  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
