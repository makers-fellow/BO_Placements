'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateUserStatus(userId: string, status: 'approved' | 'rejected') {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado' }

  // Verify the current user is an admin
  const { data: adminUser } = await supabase
    .from('dashboard_users')
    .select('role')
    .eq('auth_id', user.id)
    .single()

  if (adminUser?.role !== 'admin') {
    return { error: 'Permisos insuficientes' }
  }

  const { error } = await supabase
    .from('dashboard_users')
    .update({ 
      status,
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}

export async function deleteUser(userId: string, authId: string) {
    const supabase = await createClient()
  
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }
  
    // Verify the current user is an admin
    const { data: adminUser } = await supabase
      .from('dashboard_users')
      .select('role')
      .eq('auth_id', user.id)
      .single()
  
    if (adminUser?.role !== 'admin') {
      return { error: 'Permisos insuficientes' }
    }
  
    // Important: we need service role to delete auth.users 
    // Wait, the user table has ON DELETE CASCADE. If we delete the auth user, it deletes the dashboard_users record.
    // For now we'll just delete from dashboard_users or keep it as rejected. 
    // Better to just keep it rejected to avoid complex auth.user deletion without service role key
    
    return { error: 'La eliminación completa requiere permisos de servicio. Por favor usa "Rechazar" en su lugar.' }
}
