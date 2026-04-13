import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSellers() {
  console.log('--- APPROVED & ONBOARDED SELLERS ---')
  const { data, error } = await supabase
    .from('seller_profiles')
    .select('id, store_name, seller_type, is_online, onboarding_completed, kyc_status, latitude, longitude')
    .eq('onboarding_completed', true)
    .eq('kyc_status', 'approved')

  if (error) {
    console.error('Error fetching sellers:', error)
    return
  }

  console.log('Total:', data.length)
  data.forEach(s => {
    console.log(`[${s.id.slice(0, 8)}] ${s.store_name?.padEnd(20)} | Type: ${s.seller_type?.padEnd(8)} | Online: ${s.is_online} | Lat/Lng: ${s.latitude}, ${s.longitude}`)
  })

  console.log('\n--- PENDING/ONBOARDING SELLERS (Recently created) ---')
  const { data: pending } = await supabase
    .from('seller_profiles')
    .select('id, store_name, seller_type, is_online, onboarding_completed, kyc_status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  pending?.forEach(s => {
    console.log(`[${s.id.slice(0, 8)}] ${s.store_name?.padEnd(20)} | Type: ${s.seller_type?.padEnd(8)} | Onboarded: ${s.onboarding_completed} | KYC: ${s.kyc_status}`)
  })
}

checkSellers()
