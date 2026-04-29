import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "./profile-form"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function ProfilePage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  const { data: maker, error } = await supabase
    .from("placements_makers")
    .select("*")
    .eq("magic_link_token", token)
    .single()

  if (error || !maker) {
    return (
      <main className="min-h-screen bg-[#0F1729] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center text-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#FCA5A5]/20 flex items-center justify-center">
              <AlertCircle className="size-8 text-[#FCA5A5]" />
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Enlace no válido
            </h1>
            <p className="text-[#C7D2FE]">
              Este enlace de perfil no existe o ha expirado. Si crees que esto es un error, contacta al equipo de Makers Fellowship.
            </p>
            <a
              href="mailto:hola@makersfellowship.com"
              className="text-[#86EFAC] hover:underline"
            >
              hola@makersfellowship.com
            </a>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0F1729] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <ProfileForm
          token={token}
          firstName={maker.first_name}
          initialData={{
            name: maker.first_name,
            email: maker.email,
            search_status: maker.search_status,
            current_position: maker.current_position,
            seniority: maker.seniority,
            roles: maker.roles || [],
            industries: maker.industries || [],
            tools: maker.tools || [],
            city: maker.city,
            full_time: maker.full_time ?? true,
            company_type: maker.company_type || [],
            salary_min: maker.salary_min,
            salary_max: maker.salary_max,
            salary_currency: maker.salary_currency || "USD",
            linkedin_url: maker.linkedin_url,
            portfolio_url: maker.portfolio_url,
            github_url: maker.github_url,
            cv_url: maker.cv_url,
            strengths: maker.strengths,
          }}
        />
      </div>
    </main>
  )
}
