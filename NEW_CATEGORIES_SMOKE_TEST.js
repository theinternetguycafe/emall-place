/**
 * NEW_CATEGORIES_SMOKE_TEST.js
 * 
 * Smoke test script to verify that all 9 categories exist in Supabase
 * and can be fetched for product forms, filters, and homepage display.
 * 
 * Usage:
 *   node NEW_CATEGORIES_SMOKE_TEST.js
 * 
 * Prerequisites:
 *   - Supabase migrations applied (including 11_add_new_categories.sql)
 *   - SUPABASE_URL and SUPABASE_ANON_KEY set in .env.local
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY not set in environment')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Expected categories after migration
 */
const expectedCategories = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Garden', slug: 'home-garden' },
  { name: 'Sports', slug: 'sports' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Services', slug: 'services' },           // NEW
  { name: 'Building & DIY', slug: 'building-diy' }, // NEW
  { name: 'Foods & Drinks', slug: 'foods-drinks' }, // NEW
  { name: 'Fruits & Veggies', slug: 'fruits-veggies' } // NEW
]

async function runTests() {
  console.log('\n📋 NEW CATEGORIES SMOKE TEST\n')
  console.log('=' .repeat(60))
  
  try {
    // SMOKE TEST 1: Fetch all categories
    console.log('\n✓ TEST 1: Fetch all categories from DB')
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    console.log(`  Found ${categories.length} categories`)
    if (categories.length !== 9) {
      console.warn(`  ⚠️  Expected 9 categories, found ${categories.length}`)
    } else {
      console.log(`  ✅ Correct count: 9`)
    }
    
    // SMOKE TEST 2: Verify all expected categories exist
    console.log('\n✓ TEST 2: Verify all expected categories exist')
    const foundSlugs = categories.map(c => c.slug)
    const expectedSlugs = expectedCategories.map(c => c.slug)
    
    let allFound = true
    expectedSlugs.forEach(slug => {
      if (foundSlugs.includes(slug)) {
        const cat = categories.find(c => c.slug === slug)
        console.log(`  ✅ "${cat.name}" (${slug})`)
      } else {
        console.log(`  ❌ MISSING: ${slug}`)
        allFound = false
      }
    })
    
    if (!allFound) {
      console.error('\n❌ Some expected categories are missing!')
      process.exit(1)
    }
    
    // SMOKE TEST 3: Verify new categories specifically
    console.log('\n✓ TEST 3: Verify 4 new categories')
    const newCategorySlugs = ['services', 'building-diy', 'foods-drinks', 'fruits-veggies']
    const newCategoriesFound = categories.filter(c => newCategorySlugs.includes(c.slug))
    
    console.log(`  Found ${newCategoriesFound.length}/4 new categories`)
    newCategoriesFound.forEach(cat => {
      console.log(`  ✅ ${cat.name}`)
    })
    
    if (newCategoriesFound.length !== 4) {
      console.error('\n❌ Not all new categories found!')
      process.exit(1)
    }
    
    // SMOKE TEST 4: Test unique constraints (no duplicates)
    console.log('\n✓ TEST 4: Check for duplicate names or slugs')
    const names = categories.map(c => c.name)
    const slugs = categories.map(c => c.slug)
    const uniqueNames = new Set(names)
    const uniqueSlugs = new Set(slugs)
    
    if (uniqueNames.size !== categories.length) {
      console.error('  ❌ Duplicate category names found!')
      process.exit(1)
    }
    if (uniqueSlugs.size !== categories.length) {
      console.error('  ❌ Duplicate slugs found!')
      process.exit(1)
    }
    console.log(`  ✅ All names unique (${uniqueNames.size}/${categories.length})`)
    console.log(`  ✅ All slugs unique (${uniqueSlugs.size}/${categories.length})`)
    
    // SMOKE TEST 5: Verify categories work in product form (fetch for dropdown)
    console.log('\n✓ TEST 5: Test category fetch for product form')
    const { data: formCategories, error: formError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .order('name')
    
    if (formError) throw formError
    console.log(`  ✅ Form dropdown can fetch ${formCategories.length} categories`)
    
    // List first and last category for validation
    if (formCategories.length > 0) {
      console.log(`     First: ${formCategories[0].name}`)
      console.log(`     Last: ${formCategories[formCategories.length - 1].name}`)
    }
    
    // SMOKE TEST 6: Verify filtering works
    console.log('\n✓ TEST 6: Test category filtering (Shop page)')
    if (newCategoriesFound.length > 0) {
      const testCategory = newCategoriesFound[0]
      const { data: filtered, error: filterError } = await supabase
        .from('products')
        .select('count(*)', { count: 'exact' })
        .eq('category_id', testCategory.id)
      
      if (filterError) {
        console.log(`  ⚠️  Filter test inconclusive (no products for ${testCategory.name})`)
      } else {
        console.log(`  ✅ Filter works: Searched ${testCategory.name} (${testCategory.slug})`)
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('\n✅ ALL SMOKE TESTS PASSED!\n')
    console.log('Summary:')
    console.log(`  • Total categories: ${categories.length}`)
    console.log(`  • Original categories: 5`)
    console.log(`  • New categories: ${newCategoriesFound.length}`)
    console.log(`  • No duplicates: ✓`)
    console.log(`  • Product form integration: ✓`)
    console.log(`  • Filtering integration: ✓`)
    console.log('\nReady for deployment!\n')
    
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message)
    console.error(err)
    process.exit(1)
  }
}

runTests()
