'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LogOut, ShieldAlert, MessageCircle } from 'lucide-react'
import { logout } from '@/app/(auth)/actions'
import posthog from 'posthog-js'

export function Navbar({ userEmail, isAdmin = false, userId }: { userEmail?: string, isAdmin?: boolean, userId?: string }) {
  // Identify the logged-in dashboard user with PostHog on every page load
  useEffect(() => {
    if (userId) {
      posthog.identify(userId, { role: isAdmin ? 'admin' : 'viewer' })
    }
  }, [userId, isAdmin])

  function handleLogout() {
    posthog.capture('user_logged_out')
    posthog.reset()
  }

  return (
    <nav className="border-b border-[#1e3a5f] bg-[#0F1729] sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/makers%20logo%20sin%20fondo-jvNxpphOziJgTPMZw252yuXZwm5pLD.png"
            alt="Makers Fellowship"
            className="h-8"
          />
          <span className="text-white font-bold hidden sm:inline-block">Placements</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {isAdmin && (
            <>
              <Link href="/campaigns">
                <Button variant="ghost" size="sm" className="text-[#94a3b8] hover:text-white hover:bg-[#1e293b]">
                  <MessageCircle className="size-4 mr-2" />
                  <span className="hidden sm:inline">Campañas</span>
                </Button>
              </Link>
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-[#94a3b8] hover:text-white hover:bg-[#1e293b]">
                  <ShieldAlert className="size-4 mr-2" />
                  <span className="hidden sm:inline">Admin</span>
                </Button>
              </Link>
            </>
          )}
          
          <div className="flex items-center gap-4 border-l border-[#1e3a5f] pl-4 ml-2">
            <span className="text-sm text-[#94a3b8] hidden md:inline-block">{userEmail}</span>
            <form action={logout} onSubmit={handleLogout}>
              <Button variant="ghost" size="sm" type="submit" className="text-red-400 hover:text-red-300 hover:bg-red-950/30">
                <LogOut className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  )
}
