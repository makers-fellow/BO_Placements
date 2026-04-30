'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateUserStatus } from './actions'
import { useToast } from '@/hooks/use-toast'
import { Check, X, Clock, ShieldAlert } from 'lucide-react'

export default function AdminPage({ users }: { users: any[] }) {
  const { toast } = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleStatusChange = async (userId: string, status: 'approved' | 'rejected') => {
    setLoadingId(userId)
    const result = await updateUserStatus(userId, status)
    setLoadingId(null)
    
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error
      })
    } else {
      toast({
        title: 'Estado actualizado',
        description: `Usuario ha sido ${status === 'approved' ? 'aprobado' : 'rechazado'}`
      })
    }
  }

  const pendingUsers = users.filter(u => u.status === 'pending')
  const otherUsers = users.filter(u => u.status !== 'pending')

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Solicitudes Pendientes</h2>
        {pendingUsers.length === 0 ? (
          <Card className="border-[#1e3a5f] bg-[#1a2340]/60">
            <CardContent className="p-6 text-center text-[#94a3b8]">
              No hay solicitudes pendientes.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pendingUsers.map(user => (
              <UserCard 
                key={user.id} 
                user={user} 
                onStatusChange={handleStatusChange} 
                isLoading={loadingId === user.id} 
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Usuarios Registrados</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {otherUsers.map(user => (
            <UserCard 
              key={user.id} 
              user={user} 
              onStatusChange={handleStatusChange} 
              isLoading={loadingId === user.id} 
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function UserCard({ user, onStatusChange, isLoading }: { user: any, onStatusChange: any, isLoading: boolean }) {
  return (
    <Card className="border-[#1e3a5f] bg-[#0F1729]/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex justify-between items-start">
          <span className="truncate pr-2">{user.full_name}</span>
          <StatusBadge status={user.status} role={user.role} />
        </CardTitle>
        <div className="text-sm text-[#94a3b8]">{user.email}</div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-[#64748b] mb-4">
          Registrado el {new Date(user.created_at).toLocaleDateString()}
        </div>
        
        {user.role !== 'admin' && (
          <div className="flex gap-2">
            {user.status !== 'approved' && (
              <Button 
                size="sm" 
                onClick={() => onStatusChange(user.id, 'approved')}
                disabled={isLoading}
                className="flex-1 bg-[#86EFAC] text-[#0F1729] hover:bg-[#86EFAC]/90"
              >
                <Check className="size-4 mr-1" /> Aprobar
              </Button>
            )}
            {user.status !== 'rejected' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => onStatusChange(user.id, 'rejected')}
                disabled={isLoading}
                className="flex-1 border-red-900/50 text-red-400 hover:bg-red-950/30 hover:text-red-300"
              >
                <X className="size-4 mr-1" /> Rechazar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status, role }: { status: string, role: string }) {
  if (role === 'admin') {
    return <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-500/20"><ShieldAlert className="size-3 mr-1"/> Admin</span>
  }
  
  switch (status) {
    case 'approved':
      return <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-[#86EFAC] ring-1 ring-inset ring-green-500/20"><Check className="size-3 mr-1"/> Aprobado</span>
    case 'rejected':
      return <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20"><X className="size-3 mr-1"/> Rechazado</span>
    default:
      return <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-1 text-xs font-medium text-yellow-400 ring-1 ring-inset ring-yellow-500/20"><Clock className="size-3 mr-1"/> Pendiente</span>
  }
}
