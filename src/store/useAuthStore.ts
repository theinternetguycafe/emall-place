import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Profile, SellerProfile } from '../types'

// ── Cache keys (kept identical to old AuthContext so existing sessions survive) ──
const PROFILE_CACHE_KEY = 'cached_profile'
const VERIFIED_CACHE_KEY = 'cached_verified'
const SELLER_PROFILE_CACHE_KEY = 'cached_seller_profile'

function readCache(): { profile: Profile | null; isVerified: boolean; sellerProfile: SellerProfile | null } {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    const verified = localStorage.getItem(VERIFIED_CACHE_KEY) === 'true'
    const rawSeller = localStorage.getItem(SELLER_PROFILE_CACHE_KEY)
    if (raw) {
      return {
        profile: JSON.parse(raw) as Profile,
        isVerified: verified,
        sellerProfile: rawSeller ? (JSON.parse(rawSeller) as SellerProfile) : null,
      }
    }
  } catch {}
  return { profile: null, isVerified: false, sellerProfile: null }
}

function writeCache(profile: Profile | null, isVerified: boolean, sellerProfile: SellerProfile | null) {
  try {
    if (profile) {
      localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile))
      localStorage.setItem(VERIFIED_CACHE_KEY, isVerified ? 'true' : 'false')
      if (sellerProfile) {
        localStorage.setItem(SELLER_PROFILE_CACHE_KEY, JSON.stringify(sellerProfile))
      } else {
        localStorage.removeItem(SELLER_PROFILE_CACHE_KEY)
      }
    } else {
      localStorage.removeItem(PROFILE_CACHE_KEY)
      localStorage.removeItem(VERIFIED_CACHE_KEY)
      localStorage.removeItem(SELLER_PROFILE_CACHE_KEY)
    }
  } catch {}
}

// ── Module-level guard prevents concurrent fetches for the same user ──
let _fetchingFor: string | null = null

// ── Seed initial state from cache so first render is instant ──
const _cache = readCache()

interface AuthState {
  user: User | null
  profile: Profile | null
  sellerProfile: SellerProfile | null
  isVerified: boolean
  loading: boolean
  role: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  /** Call once on app mount — returns cleanup fn for useEffect */
  initialize: () => () => void
  logout: () => Promise<void>
  /** Re-fetch seller_profiles after onboarding completes */
  refreshSellerProfile: () => Promise<void>
  /** Internal — exposed for use in initialize & onAuthStateChange */
  _fetchProfile: (userId: string, background?: boolean) => Promise<void>
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // ── State (pre-seeded from cache) ────────────────────────────────────────────
  user: null,
  profile: _cache.profile,
  sellerProfile: _cache.sellerProfile,
  isVerified: _cache.isVerified,
  loading: true,
  role: _cache.profile?.role ?? null,
  isAuthenticated: false,

  // ── initialize ───────────────────────────────────────────────────────────────
  initialize: () => {
    let mounted = true

    // Bootstrap current session
    ;(async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (!mounted) return
        if (error) throw error

        if (session?.user) {
          set({ user: session.user, isAuthenticated: true })
          const c = readCache()
          if (c.profile && c.profile.id === session.user.id) {
            set({
              profile: c.profile,
              isVerified: c.isVerified,
              sellerProfile: c.sellerProfile,
              role: c.profile.role,
            })
          }
          await get()._fetchProfile(session.user.id, !!c.profile)
        } else {
          set({ user: null, profile: null, sellerProfile: null, isVerified: false, loading: false, isAuthenticated: false, role: null })
          writeCache(null, false, null)
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        console.error('[AuthStore] init error:', err)
        if (mounted) set({ loading: false })
      }
    })()

    // Realtime auth state subscription (created synchronously so cleanup works)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      console.log(`[AuthStore] Event: ${event}`, session?.user?.id)
      ;(async () => {
        if (session?.user) {
          set({ user: session.user, isAuthenticated: true })
          const c = readCache()
          if (c.profile && c.profile.id === session.user.id) {
            set({
              profile: c.profile,
              isVerified: c.isVerified,
              sellerProfile: c.sellerProfile,
              role: c.profile.role,
            })
          }
          await get()._fetchProfile(session.user.id, !!c.profile)
        } else {
          set({ user: null, profile: null, sellerProfile: null, isVerified: false, loading: false, isAuthenticated: false, role: null })
          writeCache(null, false, null)
        }
      })()
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  },

  // ── logout ───────────────────────────────────────────────────────────────────
  logout: async () => {
    console.log('[AuthStore] Signing out...')
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    set({ user: null, profile: null, sellerProfile: null, isVerified: false, loading: false, isAuthenticated: false, role: null })
    writeCache(null, false, null)
  },

  // ── refreshSellerProfile ──────────────────────────────────────────────────────
  refreshSellerProfile: async () => {
    const { user, profile } = get()
    if (!user) return
    const { data } = await supabase
      .from('seller_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (data) {
      const isVerified = !!data.onboarding_completed
      set({ sellerProfile: data, isVerified })
      writeCache(profile, isVerified, data)
      // Update verified cache key explicitly so ProtectedRoute picks it up
      try { localStorage.setItem(VERIFIED_CACHE_KEY, isVerified ? 'true' : 'false') } catch {}
    }
  },

  // ── _fetchProfile ─────────────────────────────────────────────────────────────
  _fetchProfile: async (userId: string, background = false) => {
    if (_fetchingFor === userId) {
      console.log('[AuthStore] Already fetching for this user, skipping')
      return
    }
    _fetchingFor = userId

    try {
      if (!background) set({ loading: true })
      console.log('[AuthStore] _fetchProfile START:', userId, background ? '(background)' : '')

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('[AuthStore] profiles fetch error:', error)
        if (error.code === 'PGRST303' || error.message?.includes('JWT expired')) {
          const { data: refreshed, error: rErr } = await supabase.auth.refreshSession()
          if (!rErr && refreshed?.session) {
            _fetchingFor = null
            return get()._fetchProfile(userId, background)
          }
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
          set({ isVerified: false })
          return
        }
      }

      let profileData = data

      // Safety: wait for DB trigger if profile missing
      if (!profileData) {
        console.log('[AuthStore] Profile not found, waiting for trigger...')
        await new Promise(r => setTimeout(r, 500))
        const { data: retry } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
        profileData = retry
      }

      // Safety net: upsert from user metadata
      if (!profileData) {
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) {
          const { data: created } = await supabase
            .from('profiles')
            .upsert({ id: u.id, full_name: u.user_metadata.full_name || '', role: u.user_metadata.role || 'buyer' })
            .select()
            .maybeSingle()
          profileData = created
        }
      }

      if (profileData) {
        let isVerified = profileData.role !== 'seller'
        let spData: SellerProfile | null = null

        if (profileData.role === 'seller') {
          const { data: sp } = await supabase
            .from('seller_profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()

          if (sp?.onboarding_completed) {
            isVerified = true
            spData = sp
          } else {
            isVerified = false
          }
        }

        console.log('[AuthStore] Profile loaded, role:', profileData.role, '| isVerified:', isVerified)
        set({ profile: profileData, sellerProfile: spData, isVerified, role: profileData.role })
        writeCache(profileData, isVerified, spData)
      } else {
        // Absolute fallback — in-memory profile from session metadata
        const { data: { user: u } } = await supabase.auth.getUser()
        if (u) {
          const fallback: Profile = {
            id: u.id,
            full_name: u.user_metadata.full_name || '',
            role: u.user_metadata.role || 'buyer',
            phone: null,
            email: null,
            date_of_birth: null,
            gender: null,
            municipality: null,
            province: null,
            created_at: new Date().toISOString(),
          }
          set({ profile: fallback, isVerified: fallback.role !== 'seller', role: fallback.role })
        }
      }
    } catch (err) {
      console.error('[AuthStore] _fetchProfile critical error:', err)
    } finally {
      _fetchingFor = null
      set({ loading: false })
      console.log('[AuthStore] _fetchProfile DONE:', userId)
    }
  },
}))
