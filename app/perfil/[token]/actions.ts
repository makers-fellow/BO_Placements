"use server"

import { createClient } from "@/lib/supabase/server"

export interface ProfileData {
  search_status: "actively_seeking" | "open_to_offers"
  current_role: string
  seniority: "junior" | "mid" | "senior" | "lead" | "principal"
  roles: string[]
  industries: string[]
  tools_skills: string[]
  location_city: string
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
}

export interface ActionResult {
  success: boolean
  error?: string
}

export async function updateProfile(
  token: string,
  data: ProfileData
): Promise<ActionResult> {
  const supabase = await createClient()

  // Validate required fields
  if (!data.search_status) {
    return { success: false, error: "El estado de búsqueda es requerido" }
  }

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

  const updatePayload = {
    search_status: data.search_status,
    current_role: data.current_role,
    seniority: data.seniority,
    roles: data.roles,
    industries: data.industries,
    tools_skills: data.tools_skills,
    location_city: data.location_city,
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
    profile_last_updated_at: new Date().toISOString(),
  }

  console.log("[updateProfile] Token:", token)
  console.log("[updateProfile] Payload:", JSON.stringify(updatePayload, null, 2))

  const { data: updatedRows, error, count, status, statusText } = await supabase
    .from("placements_makers")
    .update(updatePayload)
    .eq("magic_link_token", token)
    .select()

  console.log("[updateProfile] Status:", status, statusText)
  console.log("[updateProfile] Error:", error)
  console.log("[updateProfile] Updated rows:", updatedRows?.length ?? 0)
  console.log("[updateProfile] Updated data:", JSON.stringify(updatedRows, null, 2))

  if (error) {
    console.error("[updateProfile] Supabase error:", JSON.stringify(error, null, 2))
    return { success: false, error: `Error Supabase: ${error.message} (code: ${error.code})` }
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.error("[updateProfile] No rows updated — possible RLS policy blocking the update or invalid token")
    return { success: false, error: "No se pudo actualizar el perfil. Verifica que tu enlace sea válido." }
  }

  return { success: true }
}

export async function uploadCV(
  token: string,
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const supabase = await createClient()
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
    .from("CVs Makers")
    .upload(fileName, file, {
      contentType: "application/pdf",
      upsert: true,
    })

  if (uploadError) {
    console.error("Error uploading CV:", uploadError)
    return { success: false, error: "Error al subir el archivo. Intenta de nuevo." }
  }

  const { data: urlData } = supabase.storage.from("CVs Makers").getPublicUrl(fileName)

  return { success: true, url: urlData.publicUrl }
}

export async function deleteCV(
  token: string,
  cvUrl: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Extract filename from URL
  const fileName = cvUrl.split("/").pop()
  
  if (!fileName) {
    return { success: false, error: "URL de archivo inválida" }
  }

  const { error } = await supabase.storage.from("CVs Makers").remove([fileName])

  if (error) {
    console.error("Error deleting CV:", error)
    return { success: false, error: "Error al eliminar el archivo" }
  }

  return { success: true }
}
