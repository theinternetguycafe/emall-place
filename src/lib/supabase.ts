import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
console.log('supabase client init url:', supabaseUrl)

// Singleton pattern using global to survive HMR
declare global {
  interface Window {
    __supabaseInstance?: SupabaseClient
  }
}

// Only create new instance if one doesn't exist
if (!window.__supabaseInstance) {
  window.__supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  })
  console.log('[Supabase] Created new singleton client')
} else {
  console.log('[Supabase] Reusing existing singleton client')
}

export const supabase = window.__supabaseInstance!
