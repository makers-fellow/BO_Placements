'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { login } from '../actions'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(formData: FormData) {
    setIsPending(true)
    setError(null)
    
    const result = await login(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsPending(false)
    }
    // Si no hay error, login() hace redirect('/')
  }

  return (
    <Card className="border-[#1e3a5f] bg-[#0F1729]/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold text-white">Iniciar Sesión</CardTitle>
        <CardDescription className="text-[#94a3b8]">
          Ingresa tus credenciales para acceder al dashboard
        </CardDescription>
      </CardHeader>
      <form action={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-md">
              <AlertCircle className="size-4" />
              <p>{error}</p>
            </div>
          )}
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
            {isPending ? "Ingresando..." : "Iniciar Sesión"}
          </Button>
          <div className="text-sm text-center text-[#94a3b8]">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-[#86EFAC] hover:underline font-medium">
              Regístrate
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
