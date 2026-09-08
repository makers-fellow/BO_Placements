import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { signCVUrls } from "@/lib/supabase/storage"
import { CandidatesTable } from "./candidates-table"
import { Navbar } from "@/components/navbar"

export const metadata = {
  title: "Makers Fellowship - Candidatos",
  description: "Panel de candidatos de Makers Fellowship Placements",
}

export default async function HomePage() {
  let makers: any[] = []
  let fetchError: string | null = null
  let userStatus: 'pending' | 'approved' | 'rejected' | null = null
  let isAdmin = false
  let userEmail = ""
  let userId = ""

  try {
    const supabase = await createClient()
    
    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      userEmail = user.email || ""
      userId = user.id
      // Get dashboard user status
      const { data: dbUser } = await supabase
        .from('dashboard_users')
        .select('status, role')
        .eq('auth_id', user.id)
        .single()
        
      userStatus = dbUser?.status as any || 'pending'
      isAdmin = dbUser?.role === 'admin'
    }

    if (userStatus === 'approved') {
      // service_role: `placements_makers` está cerrada a anon/authenticated.
      // El acceso ya quedó autorizado arriba (sesión + status 'approved').
      const { data, error } = await createServiceClient()
      .from("placements_makers")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      fetchError = error.message
      } else {
        makers = data || []

        // El bucket de CVs es privado: los links del dashboard van firmados.
        const signed = await signCVUrls(makers.map((m) => m.cv_url))
        makers = makers.map((m) =>
          m.cv_url ? { ...m, cv_url: signed.get(m.cv_url) ?? null } : m,
        )
      }
    }
  } catch (err: any) {
    fetchError = err?.message || "No se pudo conectar con Supabase"
  }

  return (
    <div className="min-h-screen bg-[#0F1729]">
      {userEmail && <Navbar userEmail={userEmail} isAdmin={isAdmin} userId={userId} />}
      <main className="py-8 px-4 md:px-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 pb-8">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/makers%20logo%20sin%20fondo-jvNxpphOziJgTPMZw252yuXZwm5pLD.png"
              alt="Makers Fellowship"
              className="h-10"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                Candidatos
              </h1>
              <p className="text-[#C7D2FE] text-sm mt-1">
                {makers.length} makers registrados
              </p>
            </div>
          </div>

        {fetchError ? (
          <div className="rounded-xl border border-[#FCA5A5]/30 bg-[#FCA5A5]/10 p-6 text-center">
            <p className="text-[#FCA5A5] font-medium">Error al cargar candidatos</p>
            <p className="text-[#FCA5A5]/70 text-sm mt-2">{fetchError}</p>
          </div>
        ) : userStatus !== 'approved' ? (
          <div className="rounded-xl border border-[#1e3a5f] bg-[#1a2340]/60 p-12 text-center mt-12 max-w-xl mx-auto backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1e3a5f]/50 mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#C7D2FE]"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Pendiente de Aprobación</h2>
            <p className="text-[#94a3b8]">
              Tu cuenta ha sido creada y está siendo revisada por un administrador. 
              Tendrás acceso a los candidatos una vez que tu cuenta sea aprobada.
            </p>
          </div>
        ) : (
          <CandidatesTable makers={makers} />
        )}

        {/* Footer */}
          <div className="border-t border-[#1e3a5f] pt-8 pb-4 mt-8 text-center">
            <p className="text-[#C7D2FE] text-sm">
              Makers Fellowship · makers.ngo · team@makers.ngo
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
