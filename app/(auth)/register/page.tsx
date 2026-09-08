'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { register } from '../actions'
import posthog from 'posthog-js'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    
    const result = await register(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    } else if (result?.success) {
      posthog.capture('user_registered')
      setIsSuccess(true)
      setIsPending(false)
    }
  }

  if (isSuccess) {
    return (
      <Card className="border-[#1e3a5f] bg-[#0F1729]/80 backdrop-blur-sm text-center py-6">
        <CardContent className="space-y-6 pt-6">
          <div className="flex justify-center">
            <div className="rounded-full bg-[#86EFAC]/20 p-3">
              <CheckCircle2 className="size-12 text-[#86EFAC]" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">¡Registro completado!</h2>
            <p className="text-[#94a3b8]">
              Tu cuenta ha sido creada y está pendiente de aprobación.
              Recibirás acceso una vez que un administrador te habilite.
            </p>
          </div>
          <div className="pt-4">
            <Button asChild className="w-full bg-[#1e293b] text-white hover:bg-[#334155] border border-[#334155]">
              <Link href="/login">
                Volver a Iniciar Sesión
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[#1e3a5f] bg-[#0F1729]/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-white">Crear cuenta</CardTitle>
        <CardDescription className="text-[#94a3b8]">
          Solicita acceso al dashboard de Makers
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md">
              <AlertCircle className="size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-white">Nombre Completo</Label>
            <Input 
              id="fullName" 
              name="fullName" 
              type="text" 
              required 
              placeholder="Ej: Jane Doe"
              className="bg-[#1e293b] border-[#334155] text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              required 
              placeholder="nombre@empresa.com"
              className="bg-[#1e293b] border-[#334155] text-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white">Contraseña</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              required
              minLength={6}
              className="bg-[#1e293b] border-[#334155] text-white"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            className="w-full bg-[#86EFAC] text-[#0F1729] hover:bg-[#86EFAC]/90 font-semibold" 
            type="submit" 
            disabled={isPending}
          >
            {isPending ? "Registrando..." : "Crear cuenta"}
          </Button>
          <div className="text-sm text-center text-[#94a3b8]">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-[#86EFAC] hover:underline font-medium">
              Inicia Sesión
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
