"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Linkedin,
  FileText,
  Link2,
  Copy,
  Check,
  MapPin,
  Briefcase,
  DollarSign,
  Wrench,
  Building2,
  Sparkles,
  MessageCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"

/* ── Label maps ──────────────────────────────────────────── */

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

const STATUS_MAP: Record<string, string> = {
  actively_seeking: "Buscando",
  open_to_offers: "Abierto",
}

const TOOLS_MAP: Record<string, string> = {
  agile: "Agile", scrum: "Scrum", kanban: "Kanban", design_thinking: "Design Thinking",
  okrs: "OKRs", roadmapping: "Roadmapping", discovery: "Discovery", ab_testing: "A/B Testing",
  user_research: "User Research", figma: "Figma", sketch: "Sketch", prototyping: "Prototyping",
  ux_writing: "UX Writing", sql: "SQL", python: "Python", excel_sheets: "Excel/Sheets",
  tableau: "Tableau", power_bi: "Power BI", react: "React", nodejs: "Node.js",
  typescript: "TypeScript", aws: "AWS", docker: "Docker",
}

/* ── Helpers ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "actively_seeking"
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
        isActive
          ? "bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/30"
          : "bg-[#C7D2FE]/10 text-[#C7D2FE] border border-[#C7D2FE]/20"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? "bg-[#86EFAC] animate-pulse" : "bg-[#C7D2FE]"
        }`}
      />
      {STATUS_MAP[status] || status}
    </span>
  )
}

function PillList({
  items,
  map,
  max = 3,
}: {
  items: string[]
  map: Record<string, string>
  max?: number
}) {
  if (!items || items.length === 0) return <span className="text-[#94a3b8]">—</span>
  const visible = items.slice(0, max)
  const remaining = items.length - max

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((item) => (
        <span
          key={item}
          className="px-2 py-0.5 rounded-full text-[11px] bg-[#1e3a5f]/60 text-[#C7D2FE] border border-[#1e3a5f] whitespace-nowrap"
        >
          {map[item] || item}
        </span>
      ))}
      {remaining > 0 && (
        <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#86EFAC]/10 text-[#86EFAC] border border-[#86EFAC]/20 whitespace-nowrap">
          +{remaining}
        </span>
      )}
    </div>
  )
}

function FullPillList({
  items,
  map,
}: {
  items: string[]
  map: Record<string, string>
}) {
  if (!items || items.length === 0) return <span className="text-[#94a3b8] text-sm">Sin información</span>

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="px-2.5 py-1 rounded-full text-xs bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/25"
        >
          {map[item] || item}
        </span>
      ))}
    </div>
  )
}

function ActionButton({
  href,
  icon: Icon,
  label,
  variant = "default",
}: {
  href: string | null
  icon: any
  label: string
  variant?: "default" | "primary"
}) {
  if (!href) {
    return (
      <span
        className="inline-flex items-center justify-center size-8 rounded-lg bg-[#1a2340]/40 text-[#94a3b8]/30 cursor-not-allowed"
        title={`${label} no disponible`}
      >
        <Icon className="size-3.5" />
      </span>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center size-8 rounded-lg transition-all ${
        variant === "primary"
          ? "bg-[#86EFAC]/15 text-[#86EFAC] hover:bg-[#86EFAC]/25 border border-[#86EFAC]/20"
          : "bg-[#1e3a5f]/50 text-[#C7D2FE] hover:bg-[#1e3a5f] hover:text-white border border-[#1e3a5f]"
      }`}
      title={label}
    >
      <Icon className="size-3.5" />
    </a>
  )
}

function CopyProfileButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/perfil/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center justify-center size-8 rounded-lg transition-all bg-[#86EFAC]/15 text-[#86EFAC] hover:bg-[#86EFAC]/25 border border-[#86EFAC]/20"
      title="Copiar link de perfil"
    >
      {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
    </button>
  )
}

function WhatsAppButton({ token, name, phone }: { token: string; name: string; phone?: string | null }) {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/perfil/${token}`
    // Texto por defecto. Puedes editarlo si "kapso" significa otra cosa.
    const text = encodeURIComponent(`Hola ${name || 'Maker'}, por favor completa tu perfil en Makers ingresando a este enlace: ${url}`)
    
    if (phone) {
      // Remover el '+' u otros caracteres no numéricos para la URL de WhatsApp
      const cleanPhone = phone.replace(/\D/g, '')
      window.open(`https://wa.me/${cleanPhone}?text=${text}`, "_blank")
    } else {
      window.open(`https://wa.me/?text=${text}`, "_blank")
    }
  }

  return (
    <button
      onClick={handleWhatsApp}
      className="inline-flex items-center justify-center size-8 rounded-lg transition-all bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 border border-[#25D366]/20"
      title={phone ? "Enviar WhatsApp directo" : "Enviar WhatsApp"}
    >
      <MessageCircle className="size-3.5" />
    </button>
  )
}

/* ── Sidebar detail section ──────────────────────────────── */

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: any
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center size-6 rounded-md bg-[#86EFAC]/10">
          <Icon className="size-3.5 text-[#86EFAC]" />
        </div>
        <span className="text-xs uppercase tracking-wider text-[#C7D2FE] font-semibold">
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-[#94a3b8] text-sm shrink-0">{label}</span>
      <span className="text-white text-sm text-right">{value}</span>
    </div>
  )
}

/* ── Sort config ─────────────────────────────────────────── */

type SortDir = "asc" | "desc" | null
type SortKey = string

const ROWS_PER_PAGE = 20

/* ── Main component ──────────────────────────────────────── */

interface CandidatesTableProps {
  makers: any[]
}

export function CandidatesTable({ makers }: CandidatesTableProps) {
  const [search, setSearch] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("full_name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(0)
  const [selectedMaker, setSelectedMaker] = useState<any | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : sortDir === "desc" ? null : "asc")
      if (sortDir === "desc") setSortKey("")
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
    setPage(0)
  }

  const openDetail = (maker: any) => {
    setSelectedMaker(maker)
    setSheetOpen(true)
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey)
      return <ArrowUpDown className="size-3 text-[#94a3b8]/40" />
    if (sortDir === "asc") return <ArrowUp className="size-3 text-[#86EFAC]" />
    return <ArrowDown className="size-3 text-[#86EFAC]" />
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return makers

    return makers.filter((m) => {
      const searchable = [
        m.full_name,
        m.email,
        m.current_position,
        m.city,
        m.seniority,
        m.search_status,
        ...(m.roles || []),
        ...(m.industries || []),
        ...(m.tools || []),
        ...(m.company_type || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(q)
    })
  }, [makers, search])

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered

    return [...filtered].sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      if (Array.isArray(aVal) && Array.isArray(bVal)) {
        return sortDir === "asc"
          ? aVal.length - bVal.length
          : bVal.length - aVal.length
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }

      aVal = String(aVal).toLowerCase()
      bVal = String(bVal).toLowerCase()
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / ROWS_PER_PAGE))
  const paginated = sorted.slice(
    page * ROWS_PER_PAGE,
    (page + 1) * ROWS_PER_PAGE
  )

  const formatSalary = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return null
    const fmt = (v: number) => v.toLocaleString()
    return `${currency || "USD"} ${min ? fmt(min) : "?"} – ${max ? fmt(max) : "?"}`
  }

  const columns: { key: string; label: string; sortable?: boolean }[] = [
    { key: "full_name", label: "Full Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "search_status", label: "Estado", sortable: true },
    { key: "seniority", label: "Seniority", sortable: true },
    { key: "roles", label: "Roles de interés" },
    { key: "actions", label: "Acciones" },
  ]

  return (
    <>
      <div className="space-y-4">
        {/* Search bar */}
        <Card className="border-[#1e3a5f] bg-[#1a2340]/60 backdrop-blur-sm">
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94a3b8]" />
              <Input
                id="search-candidates"
                placeholder="Buscar por nombre, rol, skill, ciudad..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(0)
                }}
                className="pl-10 bg-[#0F1729] border-[#1e3a5f] text-white placeholder:text-[#94a3b8] h-11 focus:border-[#86EFAC] focus:ring-[#86EFAC]/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-[#1e3a5f] bg-[#1a2340]/60 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#1e3a5f] hover:bg-transparent">
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={`text-[#C7D2FE] text-xs uppercase tracking-wider font-semibold bg-[#0F1729]/60 ${
                        col.sortable
                          ? "cursor-pointer select-none hover:text-[#86EFAC] transition-colors"
                          : ""
                      }`}
                      onClick={col.sortable ? () => handleSort(col.key) : undefined}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {col.sortable && <SortIcon columnKey={col.key} />}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-12 text-[#94a3b8]"
                    >
                      {search
                        ? "No se encontraron candidatos con esa búsqueda"
                        : "No hay candidatos registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((maker) => (
                    <TableRow
                      key={maker.id}
                      className="border-[#1e3a5f]/50 hover:bg-[#86EFAC]/5 transition-colors group cursor-pointer"
                      onClick={() => openDetail(maker)}
                    >
                      {/* Name */}
                      <TableCell>
                        <span className="font-semibold text-white group-hover:text-[#86EFAC] transition-colors whitespace-nowrap">
                          {maker.full_name || "—"}
                        </span>
                      </TableCell>

                      {/* Email */}
                      <TableCell>
                        <span className="text-[#C7D2FE] text-sm">
                          {maker.email || "—"}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {maker.search_status ? (
                          <StatusBadge status={maker.search_status} />
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )}
                      </TableCell>

                      {/* Seniority */}
                      <TableCell>
                        {maker.seniority ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-[#86EFAC]/10 text-[#86EFAC] border border-[#86EFAC]/20 whitespace-nowrap">
                            {SENIORITY_MAP[maker.seniority] || maker.seniority}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8]">—</span>
                        )}
                      </TableCell>

                      {/* Roles */}
                      <TableCell>
                        <PillList items={maker.roles || []} map={ROLES_MAP} />
                      </TableCell>

                      {/* Action Buttons */}
                      <TableCell>
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionButton
                            href={maker.linkedin_url}
                            icon={Linkedin}
                            label="LinkedIn"
                          />
                          <ActionButton
                            href={maker.cv_url}
                            icon={FileText}
                            label="CV"
                          />
                          <CopyProfileButton token={maker.magic_link_token} />
                          <WhatsAppButton token={maker.magic_link_token} name={maker.full_name} phone={maker.phone_e164} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {sorted.length > ROWS_PER_PAGE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#1e3a5f]">
              <p className="text-[#94a3b8] text-sm">
                Mostrando {page * ROWS_PER_PAGE + 1}–
                {Math.min((page + 1) * ROWS_PER_PAGE, sorted.length)} de{" "}
                {sorted.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="border-[#1e3a5f] text-[#C7D2FE] hover:bg-[#86EFAC]/10 hover:border-[#86EFAC] disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-[#C7D2FE] text-sm min-w-[80px] text-center">
                  {page + 1} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page === totalPages - 1}
                  className="border-[#1e3a5f] text-[#C7D2FE] hover:bg-[#86EFAC]/10 hover:border-[#86EFAC] disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Results count */}
        <p className="text-[#94a3b8] text-xs text-center">
          {search
            ? `${sorted.length} resultado${sorted.length !== 1 ? "s" : ""} encontrado${sorted.length !== 1 ? "s" : ""}`
            : `${makers.length} candidato${makers.length !== 1 ? "s" : ""} total${makers.length !== 1 ? "es" : ""}`}
        </p>
      </div>

      {/* ── Detail Sidebar ──────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="bg-[#0F1729] border-[#1e3a5f] w-full sm:max-w-md p-0"
        >
          {selectedMaker && (
            <>
              <SheetHeader className="p-6 pb-4 border-b border-[#1e3a5f]">
                <SheetTitle className="text-2xl font-extrabold text-white">
                  {selectedMaker.full_name || "Maker"}
                </SheetTitle>
                <SheetDescription className="text-[#C7D2FE]">
                  {selectedMaker.email || "Sin email"}
                </SheetDescription>

                {/* Status */}
                {selectedMaker.search_status && (
                  <div className="mt-2">
                    <StatusBadge status={selectedMaker.search_status} />
                  </div>
                )}

                {/* Quick action buttons */}
                <div className="flex items-center gap-2 mt-4">
                  {selectedMaker.linkedin_url && (
                    <a
                      href={selectedMaker.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e3a5f]/50 text-[#C7D2FE] hover:bg-[#1e3a5f] hover:text-white transition-all border border-[#1e3a5f]"
                    >
                      <Linkedin className="size-3.5" />
                      LinkedIn
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  {selectedMaker.cv_url && (
                    <a
                      href={selectedMaker.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e3a5f]/50 text-[#C7D2FE] hover:bg-[#1e3a5f] hover:text-white transition-all border border-[#1e3a5f]"
                    >
                      <FileText className="size-3.5" />
                      CV
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  {selectedMaker.portfolio_url && (
                    <a
                      href={selectedMaker.portfolio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e3a5f]/50 text-[#C7D2FE] hover:bg-[#1e3a5f] hover:text-white transition-all border border-[#1e3a5f]"
                    >
                      <Link2 className="size-3.5" />
                      Portfolio
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  {selectedMaker.github_url && (
                    <a
                      href={selectedMaker.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e3a5f]/50 text-[#C7D2FE] hover:bg-[#1e3a5f] hover:text-white transition-all border border-[#1e3a5f]"
                    >
                      <Link2 className="size-3.5" />
                      GitHub
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                  <CopyProfileButton token={selectedMaker.magic_link_token} />
                  <WhatsAppButton token={selectedMaker.magic_link_token} name={selectedMaker.full_name} phone={selectedMaker.phone_e164} />
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">
                  {/* Perfil profesional */}
                  <DetailSection icon={Briefcase} title="Perfil profesional">
                    <div className="space-y-2 bg-[#1a2340]/60 rounded-xl p-4 border border-[#1e3a5f]/50">
                      <InfoRow label="Rol actual" value={selectedMaker.current_position} />
                      <InfoRow
                        label="Seniority"
                        value={
                          selectedMaker.seniority
                            ? SENIORITY_MAP[selectedMaker.seniority] || selectedMaker.seniority
                            : null
                        }
                      />
                      <InfoRow
                        label="Disponibilidad"
                        value={
                          selectedMaker.full_time == null
                            ? null
                            : selectedMaker.full_time
                            ? "Tiempo completo"
                            : "Tiempo parcial"
                        }
                      />
                    </div>
                  </DetailSection>

                  {/* Roles de interés */}
                  <DetailSection icon={Briefcase} title="Roles de interés">
                    <FullPillList items={selectedMaker.roles || []} map={ROLES_MAP} />
                  </DetailSection>

                  {/* Industrias */}
                  <DetailSection icon={Building2} title="Industrias">
                    <FullPillList items={selectedMaker.industries || []} map={INDUSTRIES_MAP} />
                  </DetailSection>

                  {/* Skills */}
                  <DetailSection icon={Wrench} title="Tools y Skills">
                    <FullPillList items={selectedMaker.tools || []} map={TOOLS_MAP} />
                  </DetailSection>

                  {/* Ubicación */}
                  <DetailSection icon={MapPin} title="Ubicación">
                    <div className="bg-[#1a2340]/60 rounded-xl p-4 border border-[#1e3a5f]/50">
                      <InfoRow label="Ciudad" value={selectedMaker.city} />
                    </div>
                  </DetailSection>

                  {/* Tipo de empresa */}
                  <DetailSection icon={Building2} title="Tipo de empresa">
                    <FullPillList items={selectedMaker.company_type || []} map={COMPANY_TYPE_MAP} />
                  </DetailSection>

                  {/* Salario */}
                  <DetailSection icon={DollarSign} title="Pretensión salarial">
                    <div className="bg-[#1a2340]/60 rounded-xl p-4 border border-[#1e3a5f]/50">
                      <p className="text-white text-sm">
                        {formatSalary(
                          selectedMaker.salary_min,
                          selectedMaker.salary_max,
                          selectedMaker.salary_currency
                        ) || (
                          <span className="text-[#94a3b8]">Sin información</span>
                        )}
                      </p>
                    </div>
                  </DetailSection>

                  {/* Fortalezas */}
                  {selectedMaker.strengths && (
                    <DetailSection icon={Sparkles} title="Fortalezas">
                      <div className="bg-[#1a2340]/60 rounded-xl p-4 border border-[#1e3a5f]/50">
                        <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">
                          {selectedMaker.strengths}
                        </p>
                      </div>
                    </DetailSection>
                  )}

                  {/* Timestamps */}
                  <div className="pt-4 border-t border-[#1e3a5f] space-y-1">
                    {selectedMaker.updated_at && (
                      <p className="text-[#94a3b8] text-xs">
                        Actualizado:{" "}
                        {new Date(selectedMaker.updated_at).toLocaleDateString(
                          "es-ES",
                          { day: "2-digit", month: "long", year: "numeric" }
                        )}
                      </p>
                    )}
                    {selectedMaker.created_at && (
                      <p className="text-[#94a3b8] text-xs">
                        Registrado:{" "}
                        {new Date(selectedMaker.created_at).toLocaleDateString(
                          "es-ES",
                          { day: "2-digit", month: "long", year: "numeric" }
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
