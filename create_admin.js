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

// Admin credentials
const adminEmail = 'admin@emallplace.com'
const adminPassword = 'Admin123!@#'
const adminFullName = 'Super Admin'

console.log('🔐 Creating Admin Account')
console.log('=====================================')
console.log(`Email: ${adminEmail}`)
console.log(`Password: ${adminPassword}`)
console.log('')

async function createAdminAccount() {
  try {
    // Step 1: Sign up as admin
    console.log('📝 Step 1: Creating admin account...')
    const { data, error } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: adminFullName,
          role: 'admin'
        }
      }
    })

    if (error) {
      if (error.message.includes('already registered')) {
        console.log('⚠️  Admin account already exists!')
        console.log('   You can sign in with the credentials above.')
      } else {
        console.error('❌ Error creating admin account:', error.message)
      }
      return
    }

    console.log('✅ Admin account created successfully!')
    console.log(`   User ID: ${data.user?.id}`)
    console.log('')

    // Step 2: Wait for profile creation
    console.log('⏳ Step 2: Waiting for profile creation...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log('✅ Profile should be created')
    console.log('')

    // Step 3: Verify profile
    console.log('🔍 Step 3: Verifying admin profile...')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message)
    } else {
      console.log('✅ Profile verified!')
      console.log(`   Role: ${profile.role}`)
      console.log(`   Full Name: ${profile.full_name}`)
    }
    console.log('')

    console.log('=====================================')
    console.log('🎉 Admin Account Setup Complete!')
    console.log('=====================================')
    console.log('')
    console.log('📋 Login Credentials:')
    console.log(`   Email: ${adminEmail}`)
    console.log(`   Password: ${adminPassword}`)
    console.log('')
    console.log('🌐 Access Admin Dashboard:')
    console.log('   1. Go to: http://localhost:5173/auth')
    console.log('   2. Sign in with the credentials above')
    console.log('   3. You will see an "Admin" button in the header')
    console.log('   4. Click it to access the Admin Dashboard')
    console.log('')
    console.log('⚠️  IMPORTANT:')
    console.log('   - Save these credentials securely')
    console.log('   - Change the password after first login')
    console.log('   - Only users with role="admin" can access the dashboard')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

createAdminAccount()
