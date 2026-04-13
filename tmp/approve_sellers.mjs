import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function approveSellers() {
  console.log('🚀 Approving all pending sellers...')
  
  const { data, error } = await supabase
    .from('seller_profiles')
    .update({ 
      kyc_status: 'approved',
      onboarding_completed: true,
      is_online: true
    })
    .neq('kyc_status', 'approved') // Only update those that aren't approved yet

  if (error) {
    console.error('❌ Error approving sellers:', error)
    return
  }

  console.log('✅ Approved all pending sellers successfully.')
  
  // Also list them for verification
  const { data: list } = await supabase
    .from('seller_profiles')
    .select('id, store_name, kyc_status')
    .eq('kyc_status', 'approved')
    
  console.log('Current Approved Sellers:', list?.length)
  list?.forEach(s => console.log(`- [${s.id.slice(0,8)}] ${s.store_name}`))
}

approveSellers()
