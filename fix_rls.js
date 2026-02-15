import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixRLSPolicies() {
  try {
    console.log('🔧 Fixing RLS policies via SQL...\n')

    // Get the service role key from environment or use anon key
    const serviceKey = process.env.SUPABASE_SERVICE_KEY || supabaseAnonKey
    const adminClient = createClient(supabaseUrl, serviceKey)

    // Try to drop the problematic policy
    const { data, error } = await adminClient
      .from('_rls_policies')
      .select('*')
      .eq('name', 'Stores with approved products are viewable')

    console.log('📋 Instructions to fix:')
    console.log('1. Go to https://app.supabase.com')
    console.log('2. Sign in and select your project')
    console.log('3. Go to "SQL Editor" → "New Query"')
    console.log('4. Copy & paste this SQL:')
    console.log('')
    console.log('DROP POLICY IF EXISTS "Stores with approved products are viewable" ON public.seller_stores;')
    console.log('')
    console.log('5. Click "Run" (Ctrl+Enter)')
    console.log('6. Refresh your browser - products should now load!')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

fixRLSPolicies()
