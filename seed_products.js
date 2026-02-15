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

async function seedProducts() {
  try {
    console.log('🌱 Seeding Products & Test Seller...')
    console.log('=====================================')
    console.log('')

    // Step 1: Create test seller account
    console.log('📝 Step 1: Creating test seller account...')
    const timestamp = Date.now()
    const sellerEmail = `seller${timestamp}@test.com`
    const sellerPassword = 'SellerPassword123!'

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: sellerEmail,
      password: sellerPassword,
      options: {
        data: {
          full_name: 'Test Seller',
          role: 'seller'
        }
      }
    })

    if (signUpError && !signUpError.message.includes('already registered')) {
      console.error('❌ Seller signup failed:', signUpError.message)
      return
    }

    const sellerId = signUpData?.user?.id || 'need-to-manually-get-seller-id'
    console.log(`✅ Seller created/exists (ID: ${sellerId})`)
    console.log('')

    // Step 2: Create seller store
    console.log('🏪 Step 2: Creating seller store...')
    const { data: storeData, error: storeError } = await supabase
      .from('seller_stores')
      .insert({
        owner_id: sellerId,
        store_name: 'Test Store',
        description: 'A test store for marketplace',
        status: 'active'
      })
      .select()
      .single()

    if (storeError) {
      console.error('❌ Store creation failed:', storeError.message)
      return
    }

    console.log(`✅ Store created (ID: ${storeData.id})`)
    console.log('')

    // Step 3: Get categories
    console.log('📂 Step 3: Fetching categories...')
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')

    if (catError || !categories || categories.length === 0) {
      console.error('❌ No categories found. Make sure migrations are applied.')
      return
    }

    console.log(`✅ Found ${categories.length} categories`)
    console.log('')

    // Step 4: Create test products
    console.log('🛍️  Step 4: Creating test products...')
    const testProducts = [
      {
        seller_store_id: storeData.id,
        category_id: categories[0].id,
        title: 'Premium Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 299.99,
        stock: 15,
        status: 'approved'
      },
      {
        seller_store_id: storeData.id,
        category_id: categories[1].id,
        title: 'Elegant Cotton T-Shirt',
        description: '100% organic cotton, comfortable and durable',
        price: 49.99,
        stock: 50,
        status: 'approved'
      },
      {
        seller_store_id: storeData.id,
        category_id: categories[2].id,
        title: 'Modern Plant Pot',
        description: 'Beautiful ceramic plant pot for your home',
        price: 34.99,
        stock: 20,
        status: 'approved'
      },
      {
        seller_store_id: storeData.id,
        category_id: categories[3].id,
        title: 'Professional Yoga Mat',
        description: 'Non-slip yoga mat, perfect for all fitness levels',
        price: 59.99,
        stock: 30,
        status: 'approved'
      },
      {
        seller_store_id: storeData.id,
        category_id: categories[4].id,
        title: 'Natural Face Serum',
        description: 'Organic face serum with essential oils',
        price: 79.99,
        stock: 25,
        status: 'approved'
      },
      {
        seller_store_id: storeData.id,
        category_id: categories[0].id,
        title: 'Smart LED Desk Lamp',
        description: 'Dimmable LED lamp with USB charging port',
        price: 89.99,
        stock: 12,
        status: 'approved'
      }
    ]

    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .insert(testProducts)
      .select()

    if (productsError) {
      console.error('❌ Product creation failed:', productsError.message)
      return
    }

    console.log(`✅ Created ${productsData.length} approved products`)
    console.log('')

    // Step 5: Add sample images to products
    console.log('🖼️  Step 5: Adding product images...')
    const imageUrls = [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=500',
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=500',
      'https://images.unsplash.com/photo-1578500494198-246f612d03b3?auto=format&fit=crop&q=80&w=500',
      'https://images.unsplash.com/photo-1599599810694-cd5c6df6e8dd?auto=format&fit=crop&q=80&w=500',
      'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&q=80&w=500',
      'https://images.unsplash.com/photo-1565636192335-14c46fa1af23?auto=format&fit=crop&q=80&w=500'
    ]

    const productImages = productsData.map((product, index) => ({
      product_id: product.id,
      url: imageUrls[index % imageUrls.length],
      sort_order: 0
    }))

    const { error: imagesError } = await supabase
      .from('product_images')
      .insert(productImages)

    if (imagesError) {
      console.error('❌ Image insertion failed:', imagesError.message)
      return
    }

    console.log(`✅ Added images to all products`)
    console.log('')

    console.log('🎉 SUCCESS! Products are now seeded and visible!')
    console.log('=====================================')
    console.log('Seller Email: ' + sellerEmail)
    console.log('Password: ' + sellerPassword)
    console.log('')
    console.log('Go to http://localhost:5173/emall-place/ to see your products!')

  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

seedProducts()
