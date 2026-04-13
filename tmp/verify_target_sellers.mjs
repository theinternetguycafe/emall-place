import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function verify() {
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('*')
    .in('id', ['713ceb86-4fbf-4076-a798-233bbd1b5a5b', 'd71f4cce-7140-4100-be87-5757962c0199'])

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Verification of target sellers:')
  data.forEach(s => {
    console.log(`- [${s.id}] Status: ${s.kyc_status} | Onboarded: ${s.onboarding_completed} | Lat/Lng: ${s.latitude}, ${s.longitude}`)
  })
}

verify()
