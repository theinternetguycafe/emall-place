import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkAndFixPolicy() {
  try {
    console.log('\n🔍 CHECKING SELLER_STORES RLS POLICIES')
    console.log('======================================\n')

    // Try a direct insert to see if it works
    console.log('1️⃣ Attempting to insert seller_stores directly...\n')

    const testStoreId = Math.random().toString(36).substring(7)
    const testUserId = 'ffffffff-ffff-ffff-ffff-ffffffffffff' // dummy UUID

    const { data, error } = await supabase
      .from('seller_stores')
      .insert({
        id: testStoreId,
        owner_id: testUserId,
        store_name: 'Test Store',
        status: 'pending'
      })
      .select()

    if (error) {
      console.error(`❌ Direct insert failed:`)
      console.error(`   Error: ${error.message}`)
      console.error(`   Code: ${error.code}`)
      console.error(`   Hint: ${error.hint}\n`)

      console.log('📋 The RLS policy is still blocking the insert.')
      console.log('   The issue is that triggers run with auth.uid() = NULL\n')

      console.log('🔧 SOLUTION: The policy needs to allow inserts when owner_id exists.')
      console.log('   We need to modify the trigger to use a different approach.\n')

      return false
    }

    console.log(`✅ Insert succeeded!`)
    console.log(`   The policy is now allowing inserts.\n`)

    // Clean up
    await supabase
      .from('seller_stores')
      .delete()
      .eq('id', testStoreId)

    return true

  } catch (err) {
    console.error('❌ Error:', err.message)
    return false
  }
}

checkAndFixPolicy()
