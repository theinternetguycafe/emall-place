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

async function checkAndApproveProducts() {
  try {
    console.log('🔍 Checking products...\n')

    // Check all products
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, title, status, stock, seller_store_id, product_images(*)')

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError)
      return
    }

    console.log(`Found ${allProducts.length} total products:\n`)
    allProducts.forEach(p => {
      console.log(`  • ${p.title}`)
      console.log(`    Status: ${p.status}`)
      console.log(`    Stock: ${p.stock}`)
      console.log(`    Images: ${p.product_images?.length || 0}`)
      console.log('')
    })

    // Check how many are approved
    const approved = allProducts.filter(p => p.status === 'approved')
    console.log(`\n✅ Approved products: ${approved.length}`)
    console.log(`⏳ Pending products: ${allProducts.filter(p => p.status === 'pending').length}`)
    console.log(`🔒 Hidden products: ${allProducts.filter(p => p.status === 'hidden').length}`)

    if (approved.length === 0 && allProducts.length > 0) {
      console.log('\n📝 Approving all products...')
      const { error: updateError } = await supabase
        .from('products')
        .update({ status: 'approved' })
        .neq('status', 'approved')

      if (updateError) {
        console.error('❌ Error updating products:', updateError)
      } else {
        console.log('✅ All products approved!')
        console.log('\n🚀 Refresh your browser to see the products!')
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkAndApproveProducts()
