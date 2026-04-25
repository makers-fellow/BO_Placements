"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Pencil, ExternalLink } from "lucide-react"
import type { ProfileData } from "./actions"

const ROLES_MAP: Record<string, string> = {
  product_manager: "Product Manager",
  product_designer: "Product Designer",
  engineering_manager: "Engineering Manager",
  frontend_dev: "Frontend Dev",
  backend_dev: "Backend Dev",
  fullstack_dev: "Full Stack Dev",
  data_analyst: "Data Analyst",
  data_scientist: "Data Scientist",
  devops_sre: "DevOps/SRE",
  growth_marketing: "Growth/Marketing",
}

const INDUSTRIES_MAP: Record<string, string> = {
  fintech: "Fintech",
  healthtech: "Healthtech",
  edtech: "Edtech",
  ecommerce: "E-commerce",
  b2b_saas: "B2B SaaS",
  consumer: "Consumer",
  deep_tech: "Deep Tech",
  climate_impact: "Climate/Impact",
  media_entertainment: "Media/Entertainment",
}

const COMPANY_TYPE_MAP: Record<string, string> = {
  startup_early: "Startup early-stage",
  scaleup: "Scale-up",
  corporate: "Corporativo",
  agency_consulting: "Agencia/Consultora",
}

const SENIORITY_MAP: Record<string, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  lead: "Lead",
  principal: "Principal",
}

const TOOLS_MAP: Record<string, string> = {
  agile: "Agile",
  scrum: "Scrum",
  kanban: "Kanban",
  design_thinking: "Design Thinking",
  okrs: "OKRs",
  roadmapping: "Roadmapping",
  discovery: "Discovery",
  ab_testing: "A/B Testing",
  user_research: "User Research",
  figma: "Figma",
  sketch: "Sketch",
  prototyping: "Prototyping",
  ux_writing: "UX Writing",
  sql: "SQL",
  python: "Python",
  excel_sheets: "Excel/Sheets",
  tableau: "Tableau",
  power_bi: "Power BI",
  react: "React",
  nodejs: "Node.js",
  typescript: "TypeScript",
  aws: "AWS",
  docker: "Docker",
}

interface ConfirmationViewProps {
  name: string
  data: ProfileData
  onEdit: () => void
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  
  return (
    <div className="space-y-1">
      <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
        {label}
      </span>
      <p className="text-white">{value}</p>
    </div>
  )
}

function PillList({ items, map }: { items: string[]; map: Record<string, string> }) {
  if (!items || items.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="px-3 py-1 rounded-full text-sm bg-[#86EFAC]/20 text-[#86EFAC] border border-[#86EFAC]/30"
        >
          {map[item] || item}
        </span>
      ))}
    </div>
  )
}

export function ConfirmationView({ name, data, onEdit }: ConfirmationViewProps) {
  const formatSalary = () => {
    if (!data.salary_min && !data.salary_max) return null
    const min = data.salary_min?.toLocaleString() || "N/A"
    const max = data.salary_max?.toLocaleString() || "N/A"
    return `${data.salary_currency} ${min} - ${max}`
  }

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#86EFAC]/20">
          <CheckCircle className="size-8 text-[#86EFAC]" />
        </div>
        <h1 className="text-3xl font-extrabold text-white">
          Perfil actualizado
        </h1>
        <p className="text-[#C7D2FE] text-base max-w-md mx-auto">
          Gracias {name}, tu perfil ha sido guardado exitosamente. Aquí está un resumen de tu información.
        </p>
      </div>

      {/* Profile Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-extrabold">Resumen del perfil</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="border-[#1e3a5f] text-white hover:bg-[#86EFAC]/10 hover:border-[#86EFAC]"
          >
            <Pencil className="size-4 mr-2" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-[#86EFAC]/10 border border-[#86EFAC]/30">
            <div className="w-3 h-3 rounded-full bg-[#86EFAC] animate-pulse" />
            <span className="text-white font-medium">
              {data.search_status === "actively_seeking"
                ? "Buscando activamente"
                : "Abierto a ofertas"}
            </span>
          </div>

          {/* Professional Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoItem label="Rol actual" value={data.current_role} />
            <InfoItem label="Seniority" value={SENIORITY_MAP[data.seniority]} />
            <InfoItem label="Ubicación" value={data.location_city} />
            <InfoItem
              label="Disponibilidad"
              value={data.full_time ? "Tiempo completo" : "Tiempo parcial"}
            />
          </div>

          {/* Roles */}
          {data.roles.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
                Roles de interés
              </span>
              <PillList items={data.roles} map={ROLES_MAP} />
            </div>
          )}

          {/* Industries */}
          {data.industries.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
                Industrias
              </span>
              <PillList items={data.industries} map={INDUSTRIES_MAP} />
            </div>
          )}

          {/* Tools & Skills */}
          {data.tools_skills.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
                Tools y Skills
              </span>
              <PillList items={data.tools_skills} map={TOOLS_MAP} />
            </div>
          )}

          {/* Company Type */}
          {data.company_type.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
                Tipo de empresa
              </span>
              <PillList items={data.company_type} map={COMPANY_TYPE_MAP} />
            </div>
          )}

          {/* Salary */}
          <InfoItem label="Pretensión salarial" value={formatSalary()} />

          {/* Links */}
          <div className="space-y-3">
            <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
              Links
            </span>
            <div className="flex flex-wrap gap-3">
              {data.linkedin_url && (
                <a
                  href={data.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e3a5f] text-white hover:border-[#86EFAC] hover:text-[#86EFAC] transition-colors"
                >
                  LinkedIn
                  <ExternalLink className="size-3" />
                </a>
              )}
              {data.portfolio_url && (
                <a
                  href={data.portfolio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e3a5f] text-white hover:border-[#86EFAC] hover:text-[#86EFAC] transition-colors"
                >
                  Portfolio
                  <ExternalLink className="size-3" />
                </a>
              )}
              {data.github_url && (
                <a
                  href={data.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e3a5f] text-white hover:border-[#86EFAC] hover:text-[#86EFAC] transition-colors"
                >
                  GitHub
                  <ExternalLink className="size-3" />
                </a>
              )}
              {data.cv_url && (
                <a
                  href={data.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1e3a5f] text-white hover:border-[#86EFAC] hover:text-[#86EFAC] transition-colors"
                >
                  CV
                  <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          </div>

          {/* Strengths */}
          {data.strengths && (
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-medium">
                Fortalezas
              </span>
              <p className="text-white whitespace-pre-wrap">{data.strengths}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Button */}
      <Button
        onClick={onEdit}
        className="w-full h-12 text-base font-semibold bg-[#86EFAC] text-[#0F1729] hover:bg-[#86EFAC]/90"
      >
        Editar perfil
      </Button>
    </div>
  )
}
