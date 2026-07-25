import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import CampaignsClientPage from './client-page'
import { Navbar } from '@/components/navbar'

export const metadata = {
  title: 'Makers Fellowship - Campañas WhatsApp',
}

export const maxDuration = 300

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminUser } = await supabase
    .from('dashboard_users')
    .select('role, status')
    .eq('auth_id', user.id)
    .single()

  if (adminUser?.role !== 'admin' || adminUser?.status !== 'approved') {
    redirect('/')
  }

  // service_role: `placements_makers` está cerrada a anon/authenticated y el
  // acceso ya quedó autorizado arriba (sesión + rol admin aprobado).
  const serviceClient = createServiceClient()

  // PostgREST corta en 1000 filas por request (db-max-rows), así que paginamos:
  // el filtrado por antigüedad es client-side y necesita la lista completa.
  const PAGE_SIZE = 1000
  const MAX_PAGES = 10
  const makers: any[] = []
  let makersError: { message: string } | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await serviceClient
      .from('placements_makers')
      .select(
        'id, first_name, full_name, email, phone_e164, search_status, user_type, cohort, profile_last_updated_at, updated_at, last_reminder_sent_at, magic_link_token',
      )
      .not('phone_e164', 'is', null)
      .order('updated_at', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      makersError = error
      break
    }
    makers.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }

  const { data: campaigns } = await supabase
    .from('whatsapp_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen bg-[#0F1729]">
      <Navbar userEmail={user.email} isAdmin={true} />
      <main className="py-8 px-4 md:px-8 max-w-[1400px] mx-auto">
        <div className="pb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Campañas de WhatsApp</h1>
          <p className="text-[#C7D2FE] text-sm mt-1">
            Envía recordatorios masivos a makers con perfil desactualizado
          </p>
        </div>
        <CampaignsClientPage
          makers={makers}
          fetchError={makersError?.message || null}
          campaigns={campaigns || []}
        />
      </main>
    </div>
  )
}
