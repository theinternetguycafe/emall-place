import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserRole } from '../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F8F6]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 animate-pulse">Synchronizing Session</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (allowedRoles) {
    if (!profile || !allowedRoles.includes(profile.role)) {
      return <Navigate to="/" replace />
    }
  }

  return <>{children}</>
}
