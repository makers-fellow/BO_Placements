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
import { Search, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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

function LinkIcon({ url, label }: { url: string | null; label: string }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] text-[#86EFAC] hover:text-[#86EFAC]/80 transition-colors whitespace-nowrap"
      title={label}
    >
      {label}
      <ExternalLink className="size-3" />
    </a>
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
  const [sortKey, setSortKey] = useState<SortKey>("first_name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(0)

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
        m.first_name,
        m.last_name,
        m.email,
        m.current_role,
        m.location_city,
        m.seniority,
        m.search_status,
        ...(m.roles || []),
        ...(m.industries || []),
        ...(m.tools_skills || []),
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

      // Handle nulls
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Arrays: sort by length
      if (Array.isArray(aVal) && Array.isArray(bVal)) {
        return sortDir === "asc"
          ? aVal.length - bVal.length
          : bVal.length - aVal.length
      }

      // Numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }

      // Strings
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
    if (!min && !max) return <span className="text-[#94a3b8]">—</span>
    const fmt = (v: number) => v.toLocaleString()
    return (
      <span className="text-white text-xs whitespace-nowrap">
        {currency || "USD"} {min ? fmt(min) : "?"} – {max ? fmt(max) : "?"}
      </span>
    )
  }

  const columns: {
    key: string
    label: string
    sortable?: boolean
  }[] = [
    { key: "first_name", label: "Nombre", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "search_status", label: "Estado", sortable: true },
    { key: "current_role", label: "Rol actual", sortable: true },
    { key: "seniority", label: "Seniority", sortable: true },
    { key: "roles", label: "Roles de interés" },
    { key: "industries", label: "Industrias" },
    { key: "tools_skills", label: "Skills" },
    { key: "location_city", label: "Ciudad", sortable: true },
    { key: "full_time", label: "Full-time", sortable: true },
    { key: "company_type", label: "Tipo empresa" },
    { key: "salary", label: "Salario" },
    { key: "links", label: "Links" },
    { key: "strengths", label: "Fortalezas" },
    { key: "updated_at", label: "Actualizado", sortable: true },
  ]

  return (
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
                      col.sortable ? "cursor-pointer select-none hover:text-[#86EFAC] transition-colors" : ""
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
                    className="border-[#1e3a5f]/50 hover:bg-[#86EFAC]/5 transition-colors group"
                  >
                    {/* Name */}
                    <TableCell>
                      <Link
                        href={`/perfil/${maker.magic_link_token}`}
                        className="font-semibold text-white group-hover:text-[#86EFAC] transition-colors whitespace-nowrap"
                      >
                        {[maker.first_name, maker.last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </Link>
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

                    {/* Current Role */}
                    <TableCell>
                      <span className="text-white text-sm whitespace-nowrap">
                        {maker.current_role || <span className="text-[#94a3b8]">—</span>}
                      </span>
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

                    {/* Industries */}
                    <TableCell>
                      <PillList items={maker.industries || []} map={INDUSTRIES_MAP} />
                    </TableCell>

                    {/* Skills */}
                    <TableCell>
                      <PillList
                        items={maker.tools_skills || []}
                        map={TOOLS_MAP}
                        max={2}
                      />
                    </TableCell>

                    {/* City */}
                    <TableCell>
                      <span className="text-white text-sm whitespace-nowrap">
                        {maker.location_city || <span className="text-[#94a3b8]">—</span>}
                      </span>
                    </TableCell>

                    {/* Full-time */}
                    <TableCell>
                      <span
                        className={`text-xs font-medium ${
                          maker.full_time ? "text-[#86EFAC]" : "text-[#FCA5A5]"
                        }`}
                      >
                        {maker.full_time == null
                          ? "—"
                          : maker.full_time
                          ? "Sí"
                          : "No"}
                      </span>
                    </TableCell>

                    {/* Company Type */}
                    <TableCell>
                      <PillList
                        items={maker.company_type || []}
                        map={COMPANY_TYPE_MAP}
                        max={2}
                      />
                    </TableCell>

                    {/* Salary */}
                    <TableCell>
                      {formatSalary(
                        maker.salary_min,
                        maker.salary_max,
                        maker.salary_currency
                      )}
                    </TableCell>

                    {/* Links */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <LinkIcon url={maker.linkedin_url} label="LinkedIn" />
                        <LinkIcon url={maker.portfolio_url} label="Portfolio" />
                        <LinkIcon url={maker.github_url} label="GitHub" />
                        <LinkIcon url={maker.cv_url} label="CV" />
                      </div>
                    </TableCell>

                    {/* Strengths */}
                    <TableCell>
                      <span
                        className="text-[#C7D2FE] text-xs max-w-[200px] truncate block"
                        title={maker.strengths || ""}
                      >
                        {maker.strengths || <span className="text-[#94a3b8]">—</span>}
                      </span>
                    </TableCell>

                    {/* Updated at */}
                    <TableCell>
                      <span className="text-[#94a3b8] text-xs whitespace-nowrap">
                        {maker.updated_at
                          ? new Date(maker.updated_at).toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
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
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
  )
}
