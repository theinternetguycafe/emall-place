import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile } from '../types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Cache profile in localStorage for instant loading
const PROFILE_CACHE_KEY = 'cached_profile'

function getCachedProfile(): Profile | null {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (e) {
    console.warn('[AuthContext] Failed to read cached profile:', e)
  }
  return null
}

function setCachedProfile(profile: Profile | null) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY)
    }
  } catch (e) {
    console.warn('[AuthContext] Failed to cache profile:', e)
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(() => getCachedProfile())
  const [loading, setLoading] = useState(true)
  const fetchingProfileFor = useRef<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    
    // Check for existing session immediately on mount
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        console.log('[AuthContext] Initial session check:', session?.user?.id)
        
        if (!mounted.current) return
        
        if (session?.user) {
          setUser(session.user)
          // Check if cached profile matches this user
          const cached = getCachedProfile()
          if (cached && cached.id === session.user.id) {
            console.log('[AuthContext] Using cached profile for instant load')
            setProfile(cached)
            setLoading(false) // Set loading false immediately with cached data
          }
          // Always fetch fresh profile in background (don't await)
          fetchProfile(session.user.id, !!cached) // pass true if we have cache to not block UI
        } else {
          setLoading(false)
        }
      } catch (e) {
        console.error('[AuthContext] Initial session check failed:', e)
        if (mounted.current) setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Event: ${event}`, session?.user?.id)
      
      if (session?.user) {
        setUser(session.user)
        
        // Skip if already fetching for this user
        if (fetchingProfileFor.current === session.user.id) {
          return
        }
        
        // For SIGNED_IN events, use cached profile immediately if available
        const cached = getCachedProfile()
        if (cached && cached.id === session.user.id) {
          setProfile(cached)
          setLoading(false)
        }
        
        // Fetch fresh profile (with small delay only for new signups)
        if (event === 'SIGNED_IN' && !cached) {
          // Only wait for DB trigger on fresh signup
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        
        await fetchProfile(session.user.id, !!cached)
      } else {
        setUser(null)
        setProfile(null)
        setCachedProfile(null)
        setLoading(false)
        fetchingProfileFor.current = null
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setCachedProfile(null)
        setLoading(false)
        fetchingProfileFor.current = null
      }
    })

    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string, isBackgroundRefresh = false) => {
    if (fetchingProfileFor.current === userId) {
      console.log('[AuthContext] Already fetching profile, skipping')
      return
    }
    
    try {
      fetchingProfileFor.current = userId
      // Only set loading true if we don't have cached data (not a background refresh)
      if (!isBackgroundRefresh) {
        setLoading(true)
      }
      console.log('[AuthContext] fetchProfile START for:', userId, isBackgroundRefresh ? '(background)' : '')
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (!mounted.current) return

      if (error) {
        console.error('[AuthContext] fetchProfile DB ERROR:', error)
        if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
          console.error('[AuthContext] JWT expired, signing out...')
          await signOut()
          return
        }
      }

      if (!data) {
        // Profile doesn't exist, create it (safety net)
        console.log('[AuthContext] Profile missing in DB, attempting safety net creation...')
        const { data: { user: userData } } = await supabase.auth.getUser()
        if (userData) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .upsert({
              id: userData.id,
              full_name: userData.user_metadata.full_name || '',
              role: userData.user_metadata.role || 'buyer'
            })
            .select()
            .maybeSingle()
          
          if (!createError && newProfile) {
            console.log('[AuthContext] Profile created/synced via safety net')
            setProfile(newProfile)
            setCachedProfile(newProfile)
          } else {
            // Create a minimal profile in memory
            const fallbackProfile: Profile = {
              id: userData.id,
              full_name: userData.user_metadata.full_name || '',
              role: userData.user_metadata.role || 'buyer',
              phone: null,
              created_at: new Date().toISOString()
            }
            setProfile(fallbackProfile)
          }
        }
      } else {
        console.log('[AuthContext] Profile loaded successfully, role:', data.role)
        setProfile(data)
        setCachedProfile(data)
      }
    } catch (error) {
      console.error('[AuthContext] Critical error in fetchProfile:', error)
      // On error, create a fallback profile from user metadata
      try {
        const { data: { user: userData } } = await supabase.auth.getUser()
        if (userData && mounted.current) {
          const fallbackProfile: Profile = {
            id: userData.id,
            full_name: userData.user_metadata.full_name || '',
            role: userData.user_metadata.role || 'buyer',
            phone: null,
            created_at: new Date().toISOString()
          }
          console.log('[AuthContext] Using fallback profile due to error')
          setProfile(fallbackProfile)
        }
      } catch (e) {
        console.error('[AuthContext] Failed to get user for fallback:', e)
      }
    } finally {
      console.log('[AuthContext] fetchProfile FINISHED for:', userId)
      fetchingProfileFor.current = null
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('[AuthContext] Signing out...')
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setCachedProfile(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
