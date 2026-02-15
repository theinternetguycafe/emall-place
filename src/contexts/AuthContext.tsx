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
  const mounted = useRef(false)
  const didInit = useRef(false)

  useEffect(() => {
    mounted.current = true;
    if (didInit.current) return;
    didInit.current = true;

    void (async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!mounted.current) return;
        if (error) throw error;
        console.log('[AuthContext] Initial session check:', session?.user?.id);
        if (session?.user) {
          setUser(session.user);
          const cached = getCachedProfile();
          if (cached && cached.id === session.user.id) {
            console.log('[AuthContext] Using cached profile for instant load');
            setProfile(cached);
          }
          await fetchProfile(session.user.id, !!cached);
        } else {
          setUser(null);
          setProfile(null);
          setCachedProfile(null);
        }
        setLoading(false);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.error('[AuthContext] Initial session check failed:', err);
        if (mounted.current) setLoading(false);
      }
    })().catch((err) => {
      if (err?.name === 'AbortError') return;
      console.error('[AuthContext] Unhandled initializeAuth:', err);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      void (async () => {
        if (!mounted.current) return;
        console.log(`[AuthContext] Event: ${event}`, session?.user?.id);
        if (session?.user) {
          setUser(session.user);
          const cached = getCachedProfile();
          if (cached && cached.id === session.user.id) {
            setProfile(cached);
          }
          await fetchProfile(session.user.id, !!cached);
        } else {
          setUser(null);
          setProfile(null);
          setCachedProfile(null);
        }
        setLoading(false);
      })().catch(err => {
        if (err?.name === 'AbortError') return;
        console.error('[AuthContext] Unhandled auth change:', err);
      });
    });

    return () => {
      mounted.current = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

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
          console.error('[AuthContext] JWT expired, attempting session refresh...')
          const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession()
          if (!refreshErr && refreshed?.session?.access_token) {
            console.log('[AuthContext] Session refreshed, retrying profile fetch...')
            return await fetchProfile(userId, isBackgroundRefresh)
          }
          console.error('[AuthContext] Session refresh failed, signing out...')
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
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
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
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
