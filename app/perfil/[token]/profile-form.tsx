"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PillSelect, GroupedPillSelect } from "@/components/ui/pill-select"
import { AlertCircle, Upload, X, FileText, Loader2 } from "lucide-react"
import { updateProfile, uploadCV, deleteCV, type ProfileData } from "./actions"
import { ConfirmationView } from "./confirmation-view"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface ProfileFormProps {
  token: string
  firstName?: string
  initialData: Partial<ProfileData> & { name?: string; email?: string }
}

const ROLES_OPTIONS = [
  { value: "product_manager", label: "Product Manager" },
  { value: "product_designer", label: "Product Designer" },
  { value: "engineering_manager", label: "Engineering Manager" },
  { value: "frontend_dev", label: "Frontend Dev" },
  { value: "backend_dev", label: "Backend Dev" },
  { value: "fullstack_dev", label: "Full Stack Dev" },
  { value: "data_analyst", label: "Data Analyst" },
  { value: "data_scientist", label: "Data Scientist" },
  { value: "devops_sre", label: "DevOps/SRE" },
  { value: "growth_marketing", label: "Growth/Marketing" },
]

const INDUSTRIES_OPTIONS = [
  { value: "fintech", label: "Fintech" },
  { value: "healthtech", label: "Healthtech" },
  { value: "edtech", label: "Edtech" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "b2b_saas", label: "B2B SaaS" },
  { value: "consumer", label: "Consumer" },
  { value: "deep_tech", label: "Deep Tech" },
  { value: "climate_impact", label: "Climate/Impact" },
  { value: "media_entertainment", label: "Media/Entertainment" },
]

const TOOLS_SKILLS_GROUPS = [
  {
    label: "Metodologías",
    options: [
      { value: "agile", label: "Agile" },
      { value: "scrum", label: "Scrum" },
      { value: "kanban", label: "Kanban" },
      { value: "design_thinking", label: "Design Thinking" },
      { value: "okrs", label: "OKRs" },
    ],
  },
  {
    label: "Producto",
    options: [
      { value: "roadmapping", label: "Roadmapping" },
      { value: "discovery", label: "Discovery" },
      { value: "ab_testing", label: "A/B Testing" },
      { value: "user_research", label: "User Research" },
    ],
  },
  {
    label: "Diseño",
    options: [
      { value: "figma", label: "Figma" },
      { value: "sketch", label: "Sketch" },
      { value: "prototyping", label: "Prototyping" },
      { value: "ux_writing", label: "UX Writing" },
    ],
  },
  {
    label: "Data",
    options: [
      { value: "sql", label: "SQL" },
      { value: "python", label: "Python" },
      { value: "excel_sheets", label: "Excel/Sheets" },
      { value: "tableau", label: "Tableau" },
      { value: "power_bi", label: "Power BI" },
    ],
  },
  {
    label: "Dev",
    options: [
      { value: "react", label: "React" },
      { value: "nodejs", label: "Node.js" },
      { value: "typescript", label: "TypeScript" },
      { value: "aws", label: "AWS" },
      { value: "docker", label: "Docker" },
    ],
  },
]

const COMPANY_TYPE_OPTIONS = [
  { value: "startup_early", label: "Startup early-stage" },
  { value: "scaleup", label: "Scale-up" },
  { value: "corporate", label: "Corporativo" },
  { value: "agency_consulting", label: "Agencia/Consultora" },
]

const SENIORITY_OPTIONS = [
  { value: "junior", label: "Junior" },
  { value: "mid", label: "Mid" },
  { value: "senior", label: "Senior" },
  { value: "lead", label: "Lead" },
  { value: "principal", label: "Principal" },
]

const STARTUP_STAGE_OPTIONS = [
  { value: "pre_seed", label: "Pre-seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Serie A" },
  { value: "series_b_plus", label: "Serie B+" },
]

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-[#FCA5A5] text-sm mt-2">
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function ProfileForm({ token, firstName, initialData }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  // Form state
  const [searchStatus, setSearchStatus] = useState<"actively_seeking" | "open_to_offers" | "not_looking" | "">(
    initialData.search_status || ""
  )
  const [currentRole, setCurrentRole] = useState(initialData.current_position || "")
  const [seniority, setSeniority] = useState(initialData.seniority || "")
  const [roles, setRoles] = useState<string[]>(initialData.roles || [])
  const [industries, setIndustries] = useState<string[]>(initialData.industries || [])
  const [toolsSkills, setToolsSkills] = useState<string[]>(initialData.tools || [])
  const [locationCity, setLocationCity] = useState(initialData.city || "")
  const [fullTime, setFullTime] = useState(initialData.full_time ?? true)
  const [companyType, setCompanyType] = useState<string[]>(initialData.company_type || [])
  const [salaryMin, setSalaryMin] = useState(initialData.salary_min?.toString() || "")
  const [salaryMax, setSalaryMax] = useState(initialData.salary_max?.toString() || "")
  const [salaryCurrency, setSalaryCurrency] = useState(initialData.salary_currency || "USD")
  const [linkedinUrl, setLinkedinUrl] = useState(initialData.linkedin_url || "")
  const [portfolioUrl, setPortfolioUrl] = useState(initialData.portfolio_url || "")
  const [githubUrl, setGithubUrl] = useState(initialData.github_url || "")
  const [cvUrl, setCvUrl] = useState(initialData.cv_url || "")
  const [cvFileName, setCvFileName] = useState("")
  const [strengths, setStrengths] = useState(initialData.strengths || "")

  // Conditional flow state
  const [flowType, setFlowType] = useState<"seeker" | "founder" | "employed">(
    (initialData as any).user_type || "seeker"
  )
  const [startupName, setStartupName] = useState((initialData as any).startup_name || "")
  const [startupStage, setStartupStage] = useState((initialData as any).startup_stage || "")
  const [startupIndustry, setStartupIndustry] = useState<string[]>((initialData as any).startup_industry || [])
  const [founderRole, setFounderRole] = useState((initialData as any).founder_role || "")
  const [employerName, setEmployerName] = useState((initialData as any).employer_name || "")
  const [employerRole, setEmployerRole] = useState((initialData as any).employer_role || "")

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!searchStatus) {
      newErrors.search_status = "Selecciona tu estado de búsqueda"
    }

    if (searchStatus === "not_looking" && flowType !== "founder" && flowType !== "employed") {
      newErrors.flow_type = "Selecciona tu situación actual"
    }

    if (flowType === "founder") {
      if (!startupName.trim()) newErrors.startup_name = "El nombre de la startup es requerido"
      if (!founderRole.trim()) newErrors.founder_role = "Tu rol es requerido"
    }

    if (flowType === "employed") {
      if (!employerName.trim()) newErrors.employer_name = "El nombre de la empresa es requerido"
      if (!employerRole.trim()) newErrors.employer_role = "Tu rol es requerido"
    }

    if (flowType === "seeker") {
      if (salaryMin && salaryMax && Number(salaryMax) < Number(salaryMin)) {
        newErrors.salary = "El máximo debe ser mayor al mínimo"
      }
      if (linkedinUrl && !linkedinUrl.includes("linkedin.com")) {
        newErrors.linkedin = "Ingresa una URL de LinkedIn válida"
      }
      if (strengths.length > 500) {
        newErrors.strengths = "Máximo 500 caracteres"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      setErrors((prev) => ({ ...prev, cv: "Solo se permiten archivos PDF" }))
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, cv: "El archivo no puede superar 5MB" }))
      return
    }

    setIsUploading(true)
    setErrors((prev) => {
      const { cv, ...rest } = prev
      return rest
    })

    const formData = new FormData()
    formData.append("cv", file)

    const result = await uploadCV(token, formData)

    setIsUploading(false)

    if (result.success && result.url) {
      setCvUrl(result.url)
      setCvFileName(file.name)
    } else {
      toast({
        variant: "destructive",
        title: "Error al subir CV",
        description: result.error || "Error al subir el archivo",
      })
    }
  }

  const handleDeleteCV = async () => {
    if (!cvUrl) return

    const result = await deleteCV(token, cvUrl)

    if (result.success) {
      setCvUrl("")
      setCvFileName("")
    } else {
      toast({
        variant: "destructive",
        title: "Error al eliminar CV",
        description: result.error || "Error al eliminar el archivo",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    startTransition(async () => {
      const data: ProfileData = {
        search_status: searchStatus as ProfileData["search_status"],
        user_type: flowType,
        current_position: currentRole,
        seniority: seniority as ProfileData["seniority"],
        roles,
        industries,
        tools: toolsSkills,
        city: locationCity,
        full_time: fullTime,
        company_type: companyType,
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        salary_currency: salaryCurrency,
        linkedin_url: linkedinUrl,
        portfolio_url: portfolioUrl,
        github_url: githubUrl,
        cv_url: cvUrl || null,
        strengths,
        startup_name: startupName,
        startup_stage: startupStage,
        startup_industry: startupIndustry,
        founder_role: founderRole,
        employer_name: employerName,
        employer_role: employerRole,
      }

      const result = await updateProfile(token, data)

      if (result.success) {
        setSubmitted(true)
      } else {
        toast({
          variant: "destructive",
          title: "Error al guardar perfil",
          description: result.error || "Error al guardar. Intenta de nuevo.",
        })
      }
    })
  }

  if (submitted) {
    return (
      <ConfirmationView
        name={initialData.name || "Maker"}
        data={{
          search_status: searchStatus as ProfileData["search_status"],
          user_type: flowType,
          current_position: currentRole,
          seniority: seniority as ProfileData["seniority"],
          roles,
          industries,
          tools: toolsSkills,
          city: locationCity,
          full_time: fullTime,
          company_type: companyType,
          salary_min: salaryMin ? Number(salaryMin) : null,
          salary_max: salaryMax ? Number(salaryMax) : null,
          salary_currency: salaryCurrency,
          linkedin_url: linkedinUrl,
          portfolio_url: portfolioUrl,
          github_url: githubUrl,
          cv_url: cvUrl || null,
          strengths,
          startup_name: startupName,
          startup_stage: startupStage,
          startup_industry: startupIndustry,
          founder_role: founderRole,
          employer_name: employerName,
          employer_role: employerRole,
        }}
        onEdit={() => setSubmitted(false)}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Main Title Section */}
      <div className="text-center space-y-6 pb-6 pt-4">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/makers%20logo%20sin%20fondo-jvNxpphOziJgTPMZw252yuXZwm5pLD.png"
          alt="Makers Fellowship"
          className="h-10 mx-auto"
        />
        <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
          Tu próxima oportunidad
        </h1>
        <p className="text-[#C7D2FE] text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
          Hola {firstName || "Maker"} 👋 Mantén{" "}
          <span className="text-[#86EFAC] font-semibold">tu perfil al día</span>
          {" "}y conectamos contigo cuando llegue la vacante indicada.
        </p>
      </div>

      {/* Section 1: Search Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Estado de búsqueda</CardTitle>
          <CardDescription>¿Cómo estás en tu búsqueda de empleo?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => { setSearchStatus("actively_seeking"); setFlowType("seeker"); }}
              className={cn(
                "flex flex-col items-start p-4 rounded-xl border-2 transition-all min-h-[88px]",
                "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
                searchStatus === "actively_seeking"
                  ? "border-[#86EFAC] bg-[#86EFAC]/10"
                  : "border-[#1e3a5f] hover:border-[#86EFAC]/50"
              )}
            >
              <span className="font-semibold text-white">Buscando activamente</span>
              <span className="text-sm text-[#C7D2FE] mt-1">
                Estoy abierto a entrevistas y listo para empezar pronto
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setSearchStatus("open_to_offers"); setFlowType("seeker"); }}
              className={cn(
                "flex flex-col items-start p-4 rounded-xl border-2 transition-all min-h-[88px]",
                "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
                searchStatus === "open_to_offers"
                  ? "border-[#86EFAC] bg-[#86EFAC]/10"
                  : "border-[#1e3a5f] hover:border-[#86EFAC]/50"
              )}
            >
              <span className="font-semibold text-white">Abierto a ofertas</span>
              <span className="text-sm text-[#C7D2FE] mt-1">
                Escucho oportunidades interesantes, sin prisa
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSearchStatus("not_looking")}
            className={cn(
              "w-full flex flex-col items-start p-4 rounded-xl border-2 transition-all",
              "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
              searchStatus === "not_looking"
                ? "border-[#86EFAC] bg-[#86EFAC]/10"
                : "border-[#1e3a5f] hover:border-[#86EFAC]/50"
            )}
          >
            <span className="font-semibold text-white">No busco trabajo</span>
            <span className="text-sm text-[#C7D2FE] mt-1">
              Estoy empleado o soy founder, no busco activamente
            </span>
          </button>
          {errors.search_status && <ErrorMessage message={errors.search_status} />}
        </CardContent>
      </Card>

      {/* Sub-question: Founder or Employed? */}
      {searchStatus === "not_looking" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-extrabold">¿Sos founder de una startup?</CardTitle>
            <CardDescription>Contanos más sobre tu situación actual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFlowType("founder")}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border-2 transition-all min-h-[88px]",
                  "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
                  flowType === "founder"
                    ? "border-[#86EFAC] bg-[#86EFAC]/10"
                    : "border-[#1e3a5f] hover:border-[#86EFAC]/50"
                )}
              >
                <span className="font-semibold text-white">Sí, soy founder</span>
                <span className="text-sm text-[#C7D2FE] mt-1">
                  Tengo mi propia startup o emprendimiento
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFlowType("employed")}
                className={cn(
                  "flex flex-col items-start p-4 rounded-xl border-2 transition-all min-h-[88px]",
                  "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
                  flowType === "employed"
                    ? "border-[#86EFAC] bg-[#86EFAC]/10"
                    : "border-[#1e3a5f] hover:border-[#86EFAC]/50"
                )}
              >
                <span className="font-semibold text-white">No, estoy empleado en otra empresa</span>
                <span className="text-sm text-[#C7D2FE] mt-1">
                  Trabajo en relación de dependencia
                </span>
              </button>
            </div>
            {errors.flow_type && <ErrorMessage message={errors.flow_type} />}
          </CardContent>
        </Card>
      )}

      {/* FOUNDER FLOW */}
      {searchStatus === "not_looking" && flowType === "founder" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-extrabold">Sobre tu startup</CardTitle>
              <CardDescription>Contanos sobre tu emprendimiento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="startup_name" className="text-white">
                  Nombre de la startup *
                </Label>
                <Input
                  id="startup_name"
                  value={startupName}
                  onChange={(e) => setStartupName(e.target.value)}
                  placeholder="Ej: Mi Startup"
                  className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
                />
                {errors.startup_name && <ErrorMessage message={errors.startup_name} />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="startup_stage" className="text-white">
                  Etapa
                </Label>
                <Select value={startupStage} onValueChange={setStartupStage}>
                  <SelectTrigger className="bg-[#1a2340] border-[#1e3a5f] text-white w-full">
                    <SelectValue placeholder="Selecciona la etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {STARTUP_STAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Industria</Label>
                <PillSelect
                  options={INDUSTRIES_OPTIONS}
                  value={startupIndustry}
                  onChange={setStartupIndustry}
                  max={5}
                  showCount
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-extrabold">Tu rol</CardTitle>
              <CardDescription>¿Qué hacés en tu startup?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="founder_role" className="text-white">
                Rol en la startup *
              </Label>
              <Input
                id="founder_role"
                value={founderRole}
                onChange={(e) => setFounderRole(e.target.value)}
                placeholder="Ej: CEO, CTO, CPO"
                className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
              />
              {errors.founder_role && <ErrorMessage message={errors.founder_role} />}
            </CardContent>
          </Card>
        </>
      )}

      {/* EMPLOYED FLOW */}
      {searchStatus === "not_looking" && flowType === "employed" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-extrabold">Tu empleo actual</CardTitle>
            <CardDescription>Contanos dónde estás trabajando</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employer_name" className="text-white">
                Nombre de la empresa *
              </Label>
              <Input
                id="employer_name"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                placeholder="Ej: Mercado Libre"
                className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
              />
              {errors.employer_name && <ErrorMessage message={errors.employer_name} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer_role" className="text-white">
                Tu rol actual *
              </Label>
              <Input
                id="employer_role"
                value={employerRole}
                onChange={(e) => setEmployerRole(e.target.value)}
                placeholder="Ej: Senior Software Engineer"
                className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
              />
              {errors.employer_role && <ErrorMessage message={errors.employer_role} />}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEEKER FLOW */}
      {flowType === "seeker" && searchStatus !== "not_looking" && (<>
      {/* Section 2: Professional Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Perfil profesional</CardTitle>
          <CardDescription>¿En qué estás hoy?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="current_role" className="text-white">
              ¿Cuál es tu rol actual?
            </Label>
            <Input
              id="current_role"
              value={currentRole}
              onChange={(e) => setCurrentRole(e.target.value)}
              placeholder="Ej: Senior Product Manager"
              className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-white">Nivel de seniority</Label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSeniority(option.value)}
                  className={cn(
                    "min-h-[44px] px-4 py-2 rounded-full text-sm transition-all",
                    "focus:outline-none focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]",
                    seniority === option.value
                      ? "bg-[#86EFAC] text-[#0F1729] font-semibold"
                      : "border border-[#1e3a5f] text-[#C7D2FE] hover:border-[#86EFAC] hover:text-white"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Roles of Interest */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Roles de interés</CardTitle>
          <CardDescription>¿Qué te gustaría construir?</CardDescription>
        </CardHeader>
        <CardContent>
          <PillSelect
            options={ROLES_OPTIONS}
            value={roles}
            onChange={setRoles}
          />
        </CardContent>
      </Card>

      {/* Section 4: Industries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Industrias</CardTitle>
          <CardDescription>Industrias donde quieres impacto (máx 5)</CardDescription>
        </CardHeader>
        <CardContent>
          <PillSelect
            options={INDUSTRIES_OPTIONS}
            value={industries}
            onChange={setIndustries}
            max={5}
            showCount
          />
        </CardContent>
      </Card>

      {/* Section 5: Tools & Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Tools y Skills</CardTitle>
          <CardDescription>Tu stack de trabajo</CardDescription>
        </CardHeader>
        <CardContent>
          <GroupedPillSelect
            groups={TOOLS_SKILLS_GROUPS}
            value={toolsSkills}
            onChange={setToolsSkills}
          />
        </CardContent>
      </Card>

      {/* Section 6: Location */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Ubicación</CardTitle>
          <CardDescription>Tu base de operaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="location_city" className="text-white">
              Ciudad
            </Label>
            <Input
              id="location_city"
              value={locationCity}
              onChange={(e) => setLocationCity(e.target.value)}
              placeholder="Ej: Ciudad de México"
              className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-[#1a2340] border border-[#1e3a5f]">
            <Label htmlFor="full_time" className="text-white cursor-pointer">
              Disponible para tiempo completo
            </Label>
            <Switch
              id="full_time"
              checked={fullTime}
              onCheckedChange={setFullTime}
              className="data-[state=checked]:bg-[#86EFAC]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 7: Company Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Tipo de empresa</CardTitle>
          <CardDescription>Dónde quieres crecer</CardDescription>
        </CardHeader>
        <CardContent>
          <PillSelect
            options={COMPANY_TYPE_OPTIONS}
            value={companyType}
            onChange={setCompanyType}
          />
        </CardContent>
      </Card>

      {/* Section 8: Salary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Pretensión salarial</CardTitle>
          <CardDescription>Tu expectativa salarial (confidencial)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="salary_min" className="text-white">
                Mínimo
              </Label>
              <Input
                id="salary_min"
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="Ej: 3000"
                className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="salary_max" className="text-white">
                Máximo
              </Label>
              <Input
                id="salary_max"
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="Ej: 5000"
                className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
              />
            </div>
            <div className="sm:w-32 space-y-2">
              <Label htmlFor="salary_currency" className="text-white">
                Moneda
              </Label>
              <Select value={salaryCurrency} onValueChange={setSalaryCurrency}>
                <SelectTrigger className="bg-[#1a2340] border-[#1e3a5f] text-white w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MXN">MXN</SelectItem>
                  <SelectItem value="COP">COP</SelectItem>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="CLP">CLP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {errors.salary && <ErrorMessage message={errors.salary} />}
        </CardContent>
      </Card>

      {/* Section 9: Links & CV */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Links y CV</CardTitle>
          <CardDescription>Conecta tus perfiles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="linkedin_url" className="text-white">
              LinkedIn
            </Label>
            <Input
              id="linkedin_url"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/tu-perfil"
              className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
            />
            {errors.linkedin && <ErrorMessage message={errors.linkedin} />}
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio_url" className="text-white">
              Portfolio (opcional)
            </Label>
            <Input
              id="portfolio_url"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://tu-portfolio.com"
              className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github_url" className="text-white">
              GitHub (opcional)
            </Label>
            <Input
              id="github_url"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/tu-usuario"
              className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white">CV (PDF, máx. 5MB)</Label>
            {cvUrl ? (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#1a2340] border border-[#1e3a5f]">
                <FileText className="size-5 text-[#86EFAC]" />
                <span className="flex-1 text-white truncate">
                  {cvFileName || "CV subido"}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteCV}
                  className="text-[#FCA5A5] hover:text-[#FCA5A5] hover:bg-[#FCA5A5]/10"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor="cv_upload"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all min-h-[120px]",
                  "border-[#1e3a5f] hover:border-[#86EFAC]/50",
                  "focus-within:ring-2 focus-within:ring-[#86EFAC] focus-within:ring-offset-2 focus-within:ring-offset-[#0F1729]",
                  isUploading && "opacity-50 pointer-events-none"
                )}
              >
                {isUploading ? (
                  <Loader2 className="size-6 text-[#86EFAC] animate-spin" />
                ) : (
                  <Upload className="size-6 text-[#C7D2FE]" />
                )}
                <span className="text-[#C7D2FE] text-sm">
                  {isUploading ? "Subiendo..." : "Arrastra tu CV aquí o haz clic para seleccionar"}
                </span>
                <input
                  id="cv_upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="sr-only"
                  disabled={isUploading}
                />
              </label>
            )}
            {errors.cv && <ErrorMessage message={errors.cv} />}
          </div>
        </CardContent>
      </Card>

      {/* Section 10: Strengths */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-extrabold">Fortalezas</CardTitle>
          <CardDescription>
            ¿Qué te hace destacar?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="Describe qué te hace destacar como profesional..."
            className="bg-[#1a2340] border-[#1e3a5f] text-white placeholder:text-[#C7D2FE]/60 min-h-[120px]"
            maxLength={500}
          />
          <div className="flex justify-between items-center">
            <div>{errors.strengths && <ErrorMessage message={errors.strengths} />}</div>
            <span className={cn(
              "text-sm",
              strengths.length > 450 ? "text-[#FCA5A5]" : "text-[#C7D2FE]"
            )}>
              {strengths.length} / 500
            </span>
          </div>
        </CardContent>
      </Card>
      </>)}

      {/* Submit Button - Sticky on mobile */}
      <div className="sticky bottom-0 bg-[#0F1729] py-4 -mx-4 px-4 sm:static sm:bg-transparent sm:py-0 sm:mx-0 sm:px-0">
        <Button
          type="submit"
          disabled={isPending}
          className="w-full h-12 text-base font-semibold bg-[#86EFAC] text-[#0F1729] hover:bg-[#86EFAC]/90 focus:ring-2 focus:ring-[#86EFAC] focus:ring-offset-2 focus:ring-offset-[#0F1729]"
        >
          {isPending ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              Guardando...
            </>
          ) : flowType === "founder" ? (
            "Guardar como founder"
          ) : flowType === "employed" ? (
            "Guardar como empleado"
          ) : searchStatus === "not_looking" ? (
            "Confirmar estado"
          ) : (
            "Guardar y activar mi perfil"
          )}
        </Button>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e3a5f] pt-8 pb-4 text-center">
        <p className="text-[#C7D2FE] text-sm">
          Makers Fellowship · makers.ngo · team@makers.ngo
        </p>
      </div>
    </form>
  )
}
