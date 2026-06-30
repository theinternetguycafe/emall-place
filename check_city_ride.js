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

async function checkCityRide() {
  try {
    console.log('🚗 Checking City Ride My Car seller status...\n')

    // Find City Ride My Car seller
    const { data: sellers, error: sellerError } = await supabase
      .from('seller_profiles')
      .select('id, store_name, onboarding_completed, kyc_status, seller_type')
      .ilike('store_name', '%city%ride%')

    if (sellerError) {
      console.error('❌ Error fetching sellers:', sellerError)
      return
    }

    if (sellers.length === 0) {
      console.log('❌ No seller found with "city ride" in name')
      return
    }

    const seller = sellers[0]
    console.log(`✅ Found Seller: ${seller.store_name}`)
    console.log(`   ID: ${seller.id}`)
    console.log(`   Onboarding: ${seller.onboarding_completed ? '✅ COMPLETED' : '❌ NOT COMPLETED'}`)
    console.log(`   KYC Status: ${seller.kyc_status}`)
    console.log(`   Seller Type: ${seller.seller_type}`)
    console.log('')

    // Check products
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, status, stock')
      .eq('seller_id', seller.id)

    if (productsError) {
      console.error('❌ Error fetching products:', productsError)
      return
    }

    console.log(`📦 Products: ${products.length}`)
    if (products.length === 0) {
      console.log('⚠️  No products found for this seller!')
    } else {
      products.forEach(p => {
        console.log(`   • ${p.title}`)
        console.log(`     Status: ${p.status} | Stock: ${p.stock}`)
      })
    }

    console.log('')
    console.log('🔍 Analysis:')
    if (!seller.onboarding_completed) {
      console.log('❌ ISSUE: Seller onboarding is NOT completed')
      console.log('   → Products won\'t show in marketplace (Shop.tsx requires onboarding_completed=true)')
    } else if (seller.kyc_status !== 'approved') {
      console.log(`❌ ISSUE: Seller KYC status is "${seller.kyc_status}" (not "approved")`)
      console.log('   → Products won\'t show in marketplace (Shop.tsx requires kyc_status="approved")')
    } else {
      const approvedCount = products.filter(p => p.status === 'approved').length
      if (approvedCount === 0) {
        console.log('❌ ISSUE: No products have status="approved"')
        console.log('   → Products won\'t show anywhere')
      } else {
        const highStockCount = products.filter(p => p.stock >= 999).length
        if (highStockCount === products.length) {
          console.log('❌ ISSUE: All products have stock >= 999')
          console.log('   → Products filtered out by .lt("stock", 999) in Shop.tsx')
        } else {
          console.log('✅ Seller and products should be visible!')
        }
      }
    }

  } catch (err) {
    console.error('💥 Error:', err)
  }
}

checkCityRide()
