"use server"

import { createServiceClient } from "@/lib/supabase/service"
import { CV_BUCKET, cvPathFromUrl } from "@/lib/supabase/storage"
import { getPostHogClient } from "@/lib/posthog-server"

export interface ProfileData {
  search_status: "actively_seeking" | "open_to_offers" | "not_looking"
  user_type: "seeker" | "founder" | "employed"
  // Seeker fields
  current_position: string
  seniority: "junior" | "mid" | "senior" | "lead" | "principal"
  roles: string[]
  industries: string[]
  tools: string[]
  city: string
  full_time: boolean
  company_type: string[]
  salary_min: number | null
  salary_max: number | null
  salary_currency: string
  linkedin_url: string
  portfolio_url: string
  github_url: string
  cv_url: string | null
  strengths: string
  fellowship_graduated: boolean | null
  // Founder fields
  startup_name: string
  startup_stage: string
  startup_industry: string[]
  founder_role: string
  // Employed fields
  employer_name: string
  employer_role: string
}

export interface ActionResult {
  success: boolean
  error?: string
}

export type SeekerSection = 1 | 2 | 3

async function persistMakerUpdate(
  token: string,
  updatePayload: Record<string, unknown>,
  logLabel: string
): Promise<ActionResult> {
  const supabase = createServiceClient()

  console.log(`[${logLabel}] Token:`, token)
  console.log(`[${logLabel}] Payload:`, JSON.stringify(updatePayload, null, 2))

  const { data: updatedRows, error, status, statusText } = await supabase
    .from("placements_makers")
    .update(updatePayload)
    .eq("magic_link_token", token)
    .select()

  console.log(`[${logLabel}] Status:`, status, statusText)
  console.log(`[${logLabel}] Error:`, error)
  console.log(`[${logLabel}] Updated rows:`, updatedRows?.length ?? 0)
  console.log(`[${logLabel}] Updated data:`, JSON.stringify(updatedRows, null, 2))

  if (error) {
    console.error(`[${logLabel}] Supabase error:`, JSON.stringify(error, null, 2))
    return { success: false, error: `Error Supabase: ${error.message} (code: ${error.code})` }
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.error(`[${logLabel}] No rows updated — possible RLS policy blocking the update or invalid token`)
    return { success: false, error: "No se pudo actualizar el perfil. Verifica que tu enlace sea válido." }
  }

  // Capture server-side profile update event
  const posthog = getPostHogClient()
  if (posthog) {
    posthog.capture({
      distinctId: token,
      event: 'profile_updated',
      properties: {
        action: logLabel,
        has_profile_timestamp: Boolean(updatePayload.profile_last_updated_at),
      },
    })
    await posthog.flush()
  }

  return { success: true }
}

export async function updateProfile(
  token: string,
  data: ProfileData
): Promise<ActionResult> {
  // La tabla y el bucket están cerrados a anon: el token es la credencial
  // y se valida en la propia consulta (.eq("magic_link_token", token)).
  if (!data.search_status) {
    return { success: false, error: "El estado de búsqueda es requerido" }
  }

  if (!data.user_type) {
    return { success: false, error: "El tipo de usuario es requerido" }
  }

  // Flow-specific validations
  if (data.user_type === "founder") {
    if (!data.startup_name?.trim()) {
      return { success: false, error: "El nombre de la startup es requerido" }
    }
    if (!data.founder_role?.trim()) {
      return { success: false, error: "Tu rol en la startup es requerido" }
    }
  }

  if (data.user_type === "employed") {
    if (!data.employer_name?.trim()) {
      return { success: false, error: "El nombre de la empresa es requerido" }
    }
    if (!data.employer_role?.trim()) {
      return { success: false, error: "Tu rol actual es requerido" }
    }
  }

  // Seeker-specific validations
  if (data.user_type === "seeker") {
    // Validate salary range
    if (data.salary_min && data.salary_max && data.salary_max < data.salary_min) {
      return { success: false, error: "El salario máximo debe ser mayor al mínimo" }
    }

    // Validate LinkedIn URL
    if (data.linkedin_url && !data.linkedin_url.includes("linkedin.com")) {
      return { success: false, error: "Ingresa una URL de LinkedIn válida" }
    }

    // Validate strengths length
    if (data.strengths && data.strengths.length > 500) {
      return { success: false, error: "Las fortalezas no pueden exceder 500 caracteres" }
    }
  }

  const updatePayload: Record<string, unknown> = {
    search_status: data.search_status,
    user_type: data.user_type,
    profile_last_updated_at: new Date().toISOString(),
  }

  if (data.user_type === "seeker") {
    // Include all seeker fields
    Object.assign(updatePayload, {
      current_position: data.current_position,
      seniority: data.seniority,
      roles: data.roles,
      industries: data.industries,
      tools: data.tools,
      city: data.city,
      full_time: data.full_time,
      company_type: data.company_type,
      salary_min: data.salary_min,
      salary_max: data.salary_max,
      salary_currency: data.salary_currency,
      linkedin_url: data.linkedin_url,
      portfolio_url: data.portfolio_url,
      github_url: data.github_url,
      cv_url: data.cv_url,
      strengths: data.strengths,
      fellowship_graduated: data.fellowship_graduated,
      // Clear other flow fields
      startup_name: null,
      startup_stage: null,
      startup_industry: null,
      founder_role: null,
      employer_name: null,
      employer_role: null,
    })
  } else if (data.user_type === "founder") {
    Object.assign(updatePayload, {
      startup_name: data.startup_name,
      startup_stage: data.startup_stage,
      startup_industry: data.startup_industry,
      founder_role: data.founder_role,
      // Clear employed fields
      employer_name: null,
      employer_role: null,
    })
  } else if (data.user_type === "employed") {
    Object.assign(updatePayload, {
      employer_name: data.employer_name,
      employer_role: data.employer_role,
      // Clear founder fields
      startup_name: null,
      startup_stage: null,
      startup_industry: null,
      founder_role: null,
    })
  }

  return persistMakerUpdate(token, updatePayload, "updateProfile")
}

/**
 * PATCH only the columns of one seeker wizard section.
 * Sections 1–2 do not touch profile_last_updated_at (WhatsApp staleness).
 * Section 3 sets the timestamp and clears founder/employed fields, like a finished seeker save.
 */
export async function updateSeekerSection(
  token: string,
  section: SeekerSection,
  data: ProfileData
): Promise<ActionResult> {
  if (data.search_status !== "actively_seeking" && data.search_status !== "open_to_offers") {
    return { success: false, error: "El estado de búsqueda es requerido" }
  }

  if (data.user_type !== "seeker") {
    return { success: false, error: "El tipo de usuario es requerido" }
  }

  if (section === 2) {
    if (data.salary_min && data.salary_max && data.salary_max < data.salary_min) {
      return { success: false, error: "El salario máximo debe ser mayor al mínimo" }
    }
  }

  if (section === 3) {
    if (data.linkedin_url && !data.linkedin_url.includes("linkedin.com")) {
      return { success: false, error: "Ingresa una URL de LinkedIn válida" }
    }
    if (data.strengths && data.strengths.length > 500) {
      return { success: false, error: "Las fortalezas no pueden exceder 500 caracteres" }
    }
  }

  let updatePayload: Record<string, unknown>

  if (section === 1) {
    updatePayload = {
      search_status: data.search_status,
      user_type: "seeker",
      current_position: data.current_position,
      seniority: data.seniority,
      roles: data.roles,
      industries: data.industries,
    }
  } else if (section === 2) {
    updatePayload = {
      tools: data.tools,
      city: data.city,
      full_time: data.full_time,
      company_type: data.company_type,
      salary_min: data.salary_min,
      salary_max: data.salary_max,
      salary_currency: data.salary_currency,
    }
  } else {
    updatePayload = {
      linkedin_url: data.linkedin_url,
      portfolio_url: data.portfolio_url,
      github_url: data.github_url,
      cv_url: data.cv_url,
      strengths: data.strengths,
      fellowship_graduated: data.fellowship_graduated,
      profile_last_updated_at: new Date().toISOString(),
      startup_name: null,
      startup_stage: null,
      startup_industry: null,
      founder_role: null,
      employer_name: null,
      employer_role: null,
    }
  }

  return persistMakerUpdate(token, updatePayload, `updateSeekerSection:${section}`)
}

export async function uploadCV(
  token: string,
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  // La tabla y el bucket están cerrados a anon: el token es la credencial
  // y se valida en la propia consulta (.eq("magic_link_token", token)).
  const supabase = createServiceClient()
  const file = formData.get("cv") as File

  if (!file) {
    return { success: false, error: "No se encontró el archivo" }
  }

  // Validate file type
  if (file.type !== "application/pdf") {
    return { success: false, error: "Solo se permiten archivos PDF" }
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: "El archivo no puede superar 5MB" }
  }

  const fileName = `${token}-${Date.now()}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(CV_BUCKET)
    .upload(fileName, file, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    console.error("Error uploading CV:", uploadError)
    return { success: false, error: "Error al subir el archivo. Intenta de nuevo." }
  }

  // El bucket es privado, así que esta URL no resuelve por sí sola: se sigue
  // guardando en cv_url como identificador estable del archivo, y quien la
  // necesita abrir pide una signed URL (dashboard) o pasa por /perfil/<token>/cv.
  const { data: urlData } = supabase.storage.from(CV_BUCKET).getPublicUrl(fileName)

  return { success: true, url: urlData.publicUrl }
}

export async function deleteCV(
  token: string,
  cvUrl: string
): Promise<ActionResult> {
  // La tabla y el bucket están cerrados a anon: el token es la credencial
  // y se valida en la propia consulta (.eq("magic_link_token", token)).
  const supabase = createServiceClient()

  const fileName = cvPathFromUrl(cvUrl)

  if (!fileName) {
    return { success: false, error: "URL de archivo inválida" }
  }

  const { error } = await supabase.storage.from(CV_BUCKET).remove([fileName])

  if (error) {
    console.error("Error deleting CV:", error)
    return { success: false, error: "Error al eliminar el archivo" }
  }

  return { success: true }
}
