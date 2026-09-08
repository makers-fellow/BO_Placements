'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getPostHogClient } from '@/lib/posthog-server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Capture server-side login event
  const posthog = getPostHogClient()
  if (posthog && data.user?.id) {
    posthog.capture({
      distinctId: data.user.id,
      event: 'user_logged_in',
      properties: { source: 'email_password' },
    })
    await posthog.flush()
  }

  redirect('/')
}

export async function register(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const supabase = await createClient()

  // 1. Sign up the user in auth.users
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // 2. Insert into dashboard_users if auth creation was successful
  if (data.user) {
    const { error: dbError } = await supabase
      .from('dashboard_users')
      .insert({
        auth_id: data.user.id,
        email: email,
        full_name: fullName,
        status: 'pending', // default is pending anyway
        role: 'viewer'     // default is viewer anyway
      })

    if (dbError) {
      console.error('Error inserting dashboard_user:', dbError)
      // Even if this fails, they are in auth.users, but we should probably tell them
      return { error: 'Error al crear el perfil de usuario. Contacta a soporte.' }
    }
  }

  return { success: true }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
