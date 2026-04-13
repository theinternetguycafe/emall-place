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
    .ilike('store_name', '%dev test%')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Search results for "dev test":')
  data.forEach(s => {
    console.log(`- [${s.id}] Name: ${s.store_name} | Status: ${s.kyc_status} | Onboarded: ${s.onboarding_completed} | Lat/Lng: ${s.latitude}, ${s.longitude}`)
  })
}

verify()
