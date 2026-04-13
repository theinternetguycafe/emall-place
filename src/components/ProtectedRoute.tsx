import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { UserRole } from '../types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, isVerified, loading } = useAuthStore()
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

  // Block unverified sellers from protected routes EXCEPT onboarding.
  // Also check localStorage cache as a fallback — after onboarding completes,
  // the store was just created but the store may not have re-fetched yet.
  const cachedVerified = (() => {
    try { return localStorage.getItem('cached_verified') === 'true' } catch { return false }
  })()

  if (profile?.role === 'seller' && !isVerified && !cachedVerified && !location.pathname.includes('/onboarding')) {
    return <Navigate to="/seller/onboarding" replace />
  }

  return <>{children}</>
}
