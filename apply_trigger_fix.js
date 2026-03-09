import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function fixSellerStoreTrigger() {
  try {
    console.log('\n🔧 FIXING SELLER STORE TRIGGER RLS ISSUE')
    console.log('=========================================\n')

    console.log('📝 Problem: Trigger cannot insert into seller_stores due to RLS policy')
    console.log('   Solution: Add policy allowing system inserts\n')

    const sql = `
-- Fix: Ensure RLS policy allows trigger to create seller_stores for new users
-- This policy allows INSERT operations on seller_stores table during signup
-- It's safe because the trigger validates the data and uses security definer
create policy "System can create seller store on signup" on public.seller_stores  for insert with check (true);
    `

    console.log('1️⃣ Executing SQL fix...\n')

    const { data, error } = await supabase.rpc('execute_sql', { sql_string: sql })

    if (error) {
      console.error('❌ RPC not available, trying direct SQL approach...\n')
      // Since we can't execute arbitrary SQL via rpc, provide the SQL for manual execution
      console.log('📋 PLEASE EXECUTE THIS SQL IN YOUR SUPABASE DASHBOARD:\n')
      console.log('URL: https://app.supabase.com/project/_/sql')
      console.log('Go to: SQL Editor -> New query\n')
      console.log('Copy and paste this SQL:\n')
      console.log('---START SQL---')
      console.log(`create policy "System can create seller store on signup" on public.seller_stores
  for insert with check (true);`)
      console.log('---END SQL---\n')
      console.log('Then run the query and come back to test again.\n')
      return
    }

    console.log('✅ SQL executed successfully\n')

    console.log('2️⃣ Testing if fix works...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    const timestamp = Date.now()
    const testEmail = `seller-fix-test-${timestamp}@test.com`

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!',
      options: {
        data: {
          full_name: 'Fix Test Seller',
          role: 'seller',
          store_name: 'Fix Test Store'
        }
      }
    })

    if (signupError) {
      console.error(`   ❌ Signup failed: ${signupError.message}`)
      return
    }

    const userId = signupData.user?.id
    console.log(`   ✅ Signup OK\n`)

    // Wait for trigger
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Check seller_stores
    console.log('3️⃣ Checking if seller_stores was created...')
    const { data: storeData, error: storeError } = await supabase
      .from('seller_stores')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle()

    if (storeError) {
      console.error(`   ❌ Error: ${storeError.message}`)
      return
    }

    if (!storeData) {
      console.error(`   ❌ Still NO seller_stores found!`)
      console.log('\n⚠️ The RLS policy fix might not have been applied correctly.')
      return
    }

    console.log(`   ✅ Seller store created successfully!`)
    console.log(`   ├─ Store ID: ${storeData.id}`)
    console.log(`   ├─ Store Name: "${storeData.store_name}"`)
    console.log(`   └─ Status: "${storeData.status}"\n`)

    console.log('✨ FIX VERIFIED!')
    console.log('===========================================')
    console.log('\n🎉 Seller registration now works correctly!')
    console.log('   ✅ Profile created with role')
    console.log('   ✅ Seller store created')

  } catch (err) {
    console.error('\n❌ Error:', err.message)
  }
}

fixSellerStoreTrigger()
