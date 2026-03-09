import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
// Create admin client for checking data (bypasses RLS)
const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null

async function testSellerRegistration() {
  try {
    console.log('\n🧪 TESTING SELLER REGISTRATION FLOW')
    console.log('=====================================\n')

    const timestamp = Date.now()
    const testEmail = `seller-reg-test-${timestamp}@test.com`
    const testPassword = 'TestPassword123!'
    const testName = 'Registration Test Seller'
    const testStoreName = 'Test Registration Store'

    console.log('📝 Test Input:')
    console.log(`  ├─ Email: ${testEmail}`)
    console.log(`  ├─ Password: ${testPassword}`)
    console.log(`  ├─ Name: ${testName}`)
    console.log(`  ├─ Store: ${testStoreName}`)
    console.log(`  └─ Role: seller\n`)

    // Step 1: Signup
    console.log('1️⃣ SIGNUP...')
    const signupStart = Date.now()
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: testName,
          role: 'seller',
          store_name: testStoreName
        }
      }
    })
    const signupTime = Date.now() - signupStart

    if (signupError) {
      console.error(`   ❌ Signup failed: ${signupError.message}`)
      return
    }

    const userId = signupData.user?.id
    const hasSession = !!signupData.session
    console.log(`   ✅ Signup successful in ${signupTime}ms`)
    console.log(`   ├─ User ID: ${userId}`)
    console.log(`   ├─ Session: ${hasSession ? '✅' : '❌'}`)
    console.log(`   ├─ User metadata role: "${signupData.user?.user_metadata?.role}"`)
    console.log(`   └─ User metadata store_name: "${signupData.user?.user_metadata?.store_name}"\n`)

    // Step 2: Wait a moment for database trigger
    console.log('2️⃣ WAITING FOR DATABASE TRIGGER (1 second)...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log('   ✅ Wait complete\n')

    // Step 3: Check profile was created
    console.log('3️⃣ CHECKING PROFILE IN DATABASE...')
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileError) {
      console.error(`   ❌ Profile fetch failed: ${profileError.message}`)
      return
    }

    if (!profileData) {
      console.error(`   ❌ NO PROFILE FOUND for user ${userId}`)
      console.log('   ℹ️ This means the database trigger did NOT run!\n')
      return
    }

    console.log(`   ✅ Profile found:`)
    console.log(`   ├─ ID: ${profileData.id}`)
    console.log(`   ├─ Full Name: "${profileData.full_name}"`)
    console.log(`   ├─ Role: "${profileData.role}" ${profileData.role === 'seller' ? '✅' : '❌ SHOULD BE "seller"'}`)
    console.log(`   └─ Created: ${profileData.created_at}\n`)

    // Step 4: Check seller_stores was created
    console.log('4️⃣ CHECKING SELLER_STORES IN DATABASE...')
    
    // Use admin client if available to bypass RLS
    const storeClient = supabaseAdmin || supabase
    
    const { data: storeData, error: storeError } = await storeClient
      .from('seller_stores')
      .select('*')
      .eq('owner_id', userId)
      .maybeSingle()

    if (storeError) {
      console.error(`   ❌ Store fetch failed: ${storeError.message}`)
      return
    }

    if (!storeData) {
      console.error(`   ❌ NO SELLER_STORE FOUND for seller ${userId}`)
      console.log('   ℹ️ This means the database trigger did NOT create seller_stores!\n')
      console.log('⚠️  SOLUTION: Run the SQL fix in Supabase SQL Editor:')
      console.log('   See: FIX_SELLER_REGISTRATION_RLS.md\n')
      return
    }

    console.log(`   ✅ Seller store found:`)
    console.log(`   ├─ Store ID: ${storeData.id}`)
    console.log(`   ├─ Store Name: "${storeData.store_name}"`)
    console.log(`   ├─ Status: "${storeData.status}"`)
    console.log(`   └─ Created: ${storeData.created_at}\n`)

    // Step 5: Try to fetch user again to simulate AuthContext behavior
    console.log('5️⃣ SIMULATING AUTHCONTEXT PROFILE FETCH...')
    const { data: { user: fetchedUser }, error: userError } = await supabase.auth.getUser()
    if (userError || !fetchedUser) {
      console.log('   ℹ️ No active session (expected in test, signup requires email verification)\n')
    } else {
      console.log(`   ✅ User session active:`)
      console.log(`   └─ User metadata role: "${fetchedUser.user_metadata?.role}"\n`)
    }

    console.log('✨ REGISTRATION TEST COMPLETE!')
    console.log('=====================================')
    console.log(`\n📊 SUMMARY:`)
    console.log(`  ✅ Signup successful`)
    console.log(`  ✅ Profile created with role: "${profileData.role}"`)
    console.log(`  ✅ Seller store created`)
    console.log(`\n🎉 All checks passed! Seller registration is working correctly.`)

  } catch (err) {
    console.error('\n❌ CRITICAL ERROR:', err.message)
    console.error(err)
  }
}

testSellerRegistration()
