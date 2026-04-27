import { createClient } from "@/lib/supabase/server"
import { CandidatesTable } from "./candidates-table"

export const metadata = {
  title: "Makers Fellowship - Candidatos",
  description: "Panel de candidatos de Makers Fellowship Placements",
}

export default async function HomePage() {
  let makers: any[] = []
  let fetchError: string | null = null

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("placements_makers")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      fetchError = error.message
    } else {
      makers = data || []
    }
  } catch (err: any) {
    fetchError = err?.message || "No se pudo conectar con Supabase"
  }

  return (
    <main className="min-h-screen bg-[#0F1729] py-8 px-4 md:px-8">
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
  )
}
