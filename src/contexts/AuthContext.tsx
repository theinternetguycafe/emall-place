/**
 * AuthContext — Bridge Layer
 *
 * The heavy auth logic now lives in useAuthStore (Zustand singleton).
 * This file remains for two purposes:
 *   1. AuthProvider: mounts once in App.tsx, calls store.initialize() to start
 *      the Supabase session + realtime subscription.
 *   2. useAuth(): backward-compatible hook so all 22 existing consumers
 *      continue to work with zero changes.
 *
 * New code should import from useAuthStore directly.
 */
import React, { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'

// Re-export types that existing consumers may import from here
export type { Profile, SellerProfile } from '../types'

// ── AuthProvider ──────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Initialize the Zustand store once on mount.
    // initialize() starts the Supabase session check + auth subscription
    // and returns a cleanup fn to unsubscribe when the app unmounts.
    cleanupRef.current = useAuthStore.getState().initialize()

    return () => {
      cleanupRef.current?.()
    }
  }, [])

  return <>{children}</>
}

// ── useAuth ───────────────────────────────────────────────────────────────────
// Backward-compatible hook — reads directly from the Zustand store.
// All 22 existing consumers work with zero changes.
export const useAuth = () => {
  const {
    user,
    profile,
    sellerProfile,
    role,
    isAuthenticated,
    isVerified,
    loading,
    logout,
    refreshSellerProfile,
  } = useAuthStore()

  return {
    user,
    profile,
    sellerProfile,
    role,
    isAuthenticated,
    isVerified,
    loading,
    signOut: logout,
    refreshSellerProfile,
  }
}
