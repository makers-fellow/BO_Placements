'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { getApprovedTemplates, createCampaign, sendCampaignBatch } from './actions'
import type { KapsoTemplate } from '@/lib/kapso/client'
import {
  Send,
  AlertTriangle,
  MessageCircle,
  Clock,
  CheckCircle2,
  CheckCheck,
  Eye,
  XCircle,
} from 'lucide-react'

interface Maker {
  id: string
  first_name: string | null
  full_name: string | null
  email: string | null
  phone_e164: string | null
  search_status: string | null
  user_type: string | null
  cohort: string | null
  profile_last_updated_at: string | null
  updated_at: string | null
  last_reminder_sent_at: string | null
  magic_link_token: string
}

interface Campaign {
  id: string
  name: string
  template_name: string
  status: string
  recipient_count: number
  sent_count: number
  failed_count: number
  delivered_count?: number | null
  read_count?: number | null
  created_at: string
  completed_at: string | null
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'Nunca'
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`
  return `Hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`
}

function staleDays(maker: Maker): number | null {
  const ref = maker.profile_last_updated_at || maker.updated_at
  if (!ref) return null
  return Math.floor((Date.now() - new Date(ref).getTime()) / (1000 * 60 * 60 * 24))
}

const THRESHOLD_OPTIONS = [30, 60, 90] as const

export default function CampaignsClientPage({
  makers,
  fetchError,
  campaigns,
}: {
  makers: Maker[]
  fetchError: string | null
  campaigns: Campaign[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [threshold, setThreshold] = useState<(typeof THRESHOLD_OPTIONS)[number]>(30)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [templates, setTemplates] = useState<KapsoTemplate[] | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    getApprovedTemplates().then((res) => {
      if (res.error) setTemplatesError(res.error)
      else setTemplates(res.templates || [])
    })
  }, [])

  const staleMakers = useMemo(() => {
    return makers.filter((m) => {
      const days = staleDays(m)
      if (days === null || days < threshold) return false
      if (!includeInactive && (m.user_type === 'employed' || m.search_status === 'not_looking')) {
        return false
      }
      return true
    })
  }, [makers, threshold, includeInactive])

  useEffect(() => {
    setSelectedIds(new Set(staleMakers.map((m) => m.id)))
  }, [staleMakers])

  const selectedTemplate = templates?.find((t) => t.name === selectedTemplateName) || null
  // We only auto-fill the first body variable (nombre) and the URL button (link mágico).
  // Any additional body variables beyond the first aren't populated with real data.
  const extraBodyVariableCount = selectedTemplate
    ? Math.max(0, selectedTemplate.bodyVariables.length - 1)
    : 0

  const toggleMaker = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds((prev) =>
      prev.size === staleMakers.length ? new Set() : new Set(staleMakers.map((m) => m.id)),
    )
  }

  const handleSend = async () => {
    if (!selectedTemplate) return
    setSending(true)
    setConfirmOpen(false)

    const created = (await createCampaign({
      name: `Recordatorio ${new Date().toLocaleDateString('es-ES')}`,
      templateName: selectedTemplate.name,
      templateLanguage: selectedTemplate.language,
      makerIds: Array.from(selectedIds),
    })) as { error?: string; campaignId?: string; total?: number }

    if (created.error || !created.campaignId) {
      setSending(false)
      toast({
        variant: 'destructive',
        title: 'Error al crear la campaña',
        description: created.error || 'No se pudo crear la campaña',
      })
      return
    }

    const campaignId = created.campaignId
    const total = created.total ?? selectedIds.size
    setProgress({ done: 0, total })

    // El envío va por lotes: cada llamada manda unos pocos mensajes y devuelve
    // cuántos quedan, así ninguna request se acerca al timeout de la plataforma.
    let sent = 0
    let failed = 0

    while (true) {
      const batch = (await sendCampaignBatch({ campaignId })) as {
        error?: string
        sent?: number
        failed?: number
        remaining?: number
        done?: boolean
      }

      if (batch.error) {
        setSending(false)
        setProgress(null)
        toast({
          variant: 'destructive',
          title: 'Envío interrumpido',
          description: `${batch.error}. Los mensajes ya enviados se conservan; vuelve a intentarlo para reanudar.`,
        })
        router.refresh()
        return
      }

      sent += batch.sent ?? 0
      failed += batch.failed ?? 0
      setProgress({ done: total - (batch.remaining ?? 0), total })

      if (batch.done) break
    }

    setSending(false)
    setProgress(null)

    toast({
      title: 'Campaña enviada',
      description: `${sent} enviados, ${failed} fallidos de ${total} makers`,
    })

    // Refresca el historial y los `last_reminder_sent_at` recién actualizados.
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-[#1e3a5f] bg-[#1a2340]/60 backdrop-blur-sm">
        <CardContent className="py-4 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#94a3b8]">Perfil desactualizado hace más de:</span>
              <div className="flex items-center gap-1">
                {THRESHOLD_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setThreshold(opt)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      threshold === opt
                        ? 'bg-[#86EFAC]/15 text-[#86EFAC] border border-[#86EFAC]/30'
                        : 'bg-[#0F1729] text-[#94a3b8] border border-[#1e3a5f] hover:border-[#86EFAC]/30'
                    }`}
                  >
                    {opt} días
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
              <Checkbox checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(!!v)} />
              Incluir empleados y makers que no buscan trabajo
            </label>

            <span className="text-xs text-[#C7D2FE] ml-auto">
              {staleMakers.length} maker{staleMakers.length !== 1 ? 's' : ''} con perfil desactualizado
            </span>
          </div>
        </CardContent>
      </Card>

      {fetchError && (
        <div className="rounded-xl border border-[#FCA5A5]/30 bg-[#FCA5A5]/10 p-6 text-center">
          <p className="text-[#FCA5A5] font-medium">Error al cargar candidatos</p>
          <p className="text-[#FCA5A5]/70 text-sm mt-2">{fetchError}</p>
        </div>
      )}

      {/* Recipients table */}
      <Card className="border-[#1e3a5f] bg-[#1a2340]/60 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#1e3a5f] hover:bg-transparent">
                <TableHead className="bg-[#0F1729]/60 w-10">
                  <Checkbox
                    checked={staleMakers.length > 0 && selectedIds.size === staleMakers.length}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead className="text-[#C7D2FE] text-xs uppercase tracking-wider font-semibold bg-[#0F1729]/60">
                  Nombre
                </TableHead>
                <TableHead className="text-[#C7D2FE] text-xs uppercase tracking-wider font-semibold bg-[#0F1729]/60">
                  Teléfono
                </TableHead>
                <TableHead className="text-[#C7D2FE] text-xs uppercase tracking-wider font-semibold bg-[#0F1729]/60">
                  Cohort
                </TableHead>
                <TableHead className="text-[#C7D2FE] text-xs uppercase tracking-wider font-semibold bg-[#0F1729]/60">
                  Última actualización
                </TableHead>
                <TableHead className="text-[#C7D2FE] text-xs uppercase tracking-wider font-semibold bg-[#0F1729]/60">
                  Último recordatorio
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staleMakers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-[#94a3b8]">
                    No hay makers con perfil desactualizado según este filtro
                  </TableCell>
                </TableRow>
              ) : (
                staleMakers.map((maker) => (
                  <TableRow key={maker.id} className="border-[#1e3a5f]/50">
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(maker.id)}
                        onCheckedChange={() => toggleMaker(maker.id)}
                      />
                    </TableCell>
                    <TableCell className="text-white font-medium whitespace-nowrap">
                      {maker.full_name || maker.first_name || '—'}
                    </TableCell>
                    <TableCell className="text-[#C7D2FE] text-sm whitespace-nowrap">
                      {maker.phone_e164}
                    </TableCell>
                    <TableCell className="text-[#94a3b8] text-sm whitespace-nowrap">
                      {maker.cohort || '—'}
                    </TableCell>
                    <TableCell className="text-[#94a3b8] text-xs whitespace-nowrap">
                      {formatRelativeDate(maker.profile_last_updated_at || maker.updated_at)}
                    </TableCell>
                    <TableCell className="text-[#94a3b8] text-xs whitespace-nowrap">
                      {formatRelativeDate(maker.last_reminder_sent_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Template picker + send */}
      <Card className="border-[#1e3a5f] bg-[#1a2340]/60 backdrop-blur-sm">
        <CardContent className="py-4 space-y-4">
          <h2 className="text-lg font-bold text-white">Template de WhatsApp</h2>

          {templatesError && (
            <p className="text-[#FCA5A5] text-sm">{templatesError}</p>
          )}

          {templates && templates.length === 0 && !templatesError && (
            <p className="text-[#94a3b8] text-sm">
              No hay templates aprobados en Kapso todavía. Créalos y espera la aprobación de Meta.
            </p>
          )}

          {templates && templates.length > 0 && (
            <div className="space-y-3">
              <Select value={selectedTemplateName} onValueChange={setSelectedTemplateName}>
                <SelectTrigger className="w-full sm:w-80 bg-[#0F1729] border-[#1e3a5f] text-white">
                  <SelectValue placeholder="Elige un template aprobado" />
                </SelectTrigger>
                <SelectContent className="bg-[#0F1729] border-[#1e3a5f] text-white">
                  {templates.map((t) => (
                    <SelectItem key={t.name} value={t.name}>
                      {t.name} ({t.language})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <div className="bg-[#0F1729] rounded-xl p-4 border border-[#1e3a5f]/50 space-y-2">
                  <p className="text-white text-sm whitespace-pre-wrap">{selectedTemplate.bodyText}</p>
                  <p className="text-[#94a3b8] text-xs">
                    Se completa automáticamente: primer nombre del maker
                    {selectedTemplate.urlButton && ' y el link de su perfil (botón)'}.
                  </p>
                  {extraBodyVariableCount > 0 && (
                    <div className="flex items-start gap-2 text-[#FBBF24] text-xs mt-2">
                      <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                      <span>
                        Este template tiene {extraBodyVariableCount} variable
                        {extraBodyVariableCount > 1 ? 's' : ''} adicional
                        {extraBodyVariableCount > 1 ? 'es' : ''} en el cuerpo que no se rellena
                        automáticamente con datos reales.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!selectedTemplate || selectedIds.size === 0 || sending}
            className="bg-[#86EFAC] text-[#0F1729] hover:bg-[#86EFAC]/90"
          >
            <Send className="size-4 mr-2" />
            {sending
              ? progress
                ? `Enviando… ${progress.done}/${progress.total}`
                : 'Enviando…'
              : `Enviar a ${selectedIds.size} maker${selectedIds.size !== 1 ? 's' : ''}`}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-[#1e3a5f] bg-[#1a2340]/60 backdrop-blur-sm">
        <CardContent className="py-4 space-y-3">
          <h2 className="text-lg font-bold text-white">Historial de campañas</h2>
          {campaigns.length === 0 ? (
            <p className="text-[#94a3b8] text-sm">Todavía no se ha enviado ninguna campaña.</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 bg-[#0F1729] rounded-lg p-3 border border-[#1e3a5f]/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageCircle className="size-4 text-[#86EFAC] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate">{c.name}</p>
                      <p className="text-[#94a3b8] text-xs">{c.template_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <CampaignStatusBadge status={c.status} />
                    <span className="flex items-center gap-1 text-[#86EFAC]" title="Enviados">
                      <CheckCircle2 className="size-3" /> {c.sent_count}
                    </span>
                    <span className="flex items-center gap-1 text-[#93C5FD]" title="Entregados">
                      <CheckCheck className="size-3" /> {c.delivered_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-[#C4B5FD]" title="Leídos">
                      <Eye className="size-3" /> {c.read_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1 text-[#FCA5A5]" title="Fallidos">
                      <XCircle className="size-3" /> {c.failed_count}
                    </span>
                    <span className="text-[#94a3b8]">
                      {new Date(c.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-[#0F1729] border-[#1e3a5f] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirmar envío masivo</AlertDialogTitle>
            <AlertDialogDescription className="text-[#94a3b8]">
              Se enviará el template "{selectedTemplate?.name}" a {selectedIds.size} maker
              {selectedIds.size !== 1 ? 's' : ''} vía WhatsApp. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#1e3a5f] text-[#C7D2FE] bg-transparent hover:bg-[#1e3a5f]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              className="bg-[#86EFAC] text-[#0F1729] hover:bg-[#86EFAC]/90"
            >
              Confirmar envío
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: 'Borrador', color: 'text-[#94a3b8]', icon: Clock },
    sending: { label: 'Enviando', color: 'text-[#C7D2FE]', icon: Clock },
    completed: { label: 'Completada', color: 'text-[#86EFAC]', icon: CheckCircle2 },
    failed: { label: 'Fallida', color: 'text-[#FCA5A5]', icon: XCircle },
  }
  const cfg = map[status] || map.draft
  const Icon = cfg.icon
  return (
    <span className={`flex items-center gap-1 ${cfg.color}`}>
      <Icon className="size-3" /> {cfg.label}
    </span>
  )
}
