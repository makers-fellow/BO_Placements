import { createClient } from '@/lib/supabase/server'
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

  const { data: makers, error: makersError } = await supabase
    .from('placements_makers')
    .select(
      'id, first_name, full_name, email, phone_e164, search_status, user_type, cohort, profile_last_updated_at, updated_at, last_reminder_sent_at, magic_link_token',
    )
    .not('phone_e164', 'is', null)
    .order('updated_at', { ascending: true })

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
          makers={makers || []}
          fetchError={makersError?.message || null}
          campaigns={campaigns || []}
        />
      </main>
    </div>
  )
}
