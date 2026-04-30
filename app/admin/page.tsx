import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPage from './client-page'
import { Navbar } from '@/components/navbar'

export const metadata = {
  title: 'Makers Fellowship - Admin',
}

export default async function AdminRoute() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check if admin
  const { data: adminUser } = await supabase
    .from('dashboard_users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (adminUser?.role !== 'admin') {
    redirect('/')
  }

  // Fetch all users
  const { data: users } = await supabase
    .from('dashboard_users')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#0F1729]">
      <Navbar userEmail={user.email} isAdmin={true} />
      <main className="py-8 px-4 md:px-8 max-w-[1200px] mx-auto">
        <AdminPage users={users || []} />
      </main>
    </div>
  )
}
