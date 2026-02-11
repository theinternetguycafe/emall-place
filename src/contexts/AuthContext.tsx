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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingProfileFor = useRef<string | null>(null)

  useEffect(() => {
    // Single point of truth for auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] Event: ${event}`, session?.user?.id)
      
      if (session?.user) {
        setUser(session.user)
        // If we don't have a profile OR the user has changed, fetch it
        if (!profile || profile.id !== session.user.id) {
          // If we're already fetching for this user, don't start again
          if (fetchingProfileFor.current === session.user.id) {
            console.log(`[AuthContext] Already fetching profile for ${session.user.id}, skipping redundant call`)
            return
          }
          
          // For SIGNED_IN events (like after signup), wait a moment for the DB trigger
          if (event === 'SIGNED_IN') {
            console.log('[AuthContext] SIGNED_IN detected, waiting 1s for trigger...')
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
        fetchingProfileFor.current = null
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setLoading(false)
        fetchingProfileFor.current = null
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // Remove profile dependency to prevent infinite loop

  const fetchProfile = async (userId: string) => {
    if (fetchingProfileFor.current === userId) {
      console.log('[AuthContext] Already fetching profile, skipping')
      return
    }
    
    try {
      fetchingProfileFor.current = userId
      setLoading(true)
      console.log('[AuthContext] fetchProfile START for:', userId)
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
      )
      
      const dbPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      const { data, error } = await Promise.race([dbPromise, timeoutPromise]) as any

      if (error) {
        console.error('[AuthContext] fetchProfile DB ERROR:', error)
        if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
          console.error('[AuthContext] JWT expired, signing out...')
          await signOut()
          return
        }
        // Don't throw, just log and continue
        console.error('[AuthContext] Continuing despite error:', error.message)
      }

      if (!data) {
        // Profile doesn't exist, create it (safety net)
        console.log('[AuthContext] Profile missing in DB, attempting safety net creation...')
        try {
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
            } else {
              console.error('[AuthContext] Safety net failed:', createError)
              // Create a minimal profile in memory to prevent infinite loading
              setProfile({
                id: userData.id,
                full_name: userData.user_metadata.full_name || '',
                role: userData.user_metadata.role || 'buyer',
                phone: null,
                created_at: new Date().toISOString()
              })
            }
          }
        } catch (safetyNetError) {
          console.error('[AuthContext] Safety net exception:', safetyNetError)
          // Create a minimal profile in memory to prevent infinite loading
          const { data: { user: userData } } = await supabase.auth.getUser()
          if (userData) {
            setProfile({
              id: userData.id,
              full_name: userData.user_metadata.full_name || '',
              role: userData.user_metadata.role || 'buyer',
              phone: null,
              created_at: new Date().toISOString()
            })
          }
        }
      } else {
        console.log('[AuthContext] Profile loaded successfully, role:', data.role)
        setProfile(data)
      }
    } catch (error) {
      console.error('[AuthContext] Critical error in fetchProfile:', error)
      // Ensure loading is set to false even on error
      setLoading(false)
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
