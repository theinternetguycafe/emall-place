import { test, expect, Page } from '@playwright/test'

function json(data: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  }
}

async function setupDashboardMocks(page: Page) {
  const email = 'seller@emallplace.local'
  
  await page.route('**/auth/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    console.log('MOCK AUTH REQ:', request.method(), url.pathname)
    
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' })
      return
    }

    if (url.pathname.endsWith('/user')) {
      await route.fulfill(json({ id: 'seller-1', email: 'seller@emallplace.local', role: 'authenticated' }))
      return
    }

    await route.fulfill(json({}))
  })

  await page.route('**/rest/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    console.log('MOCK REST REQ:', request.method(), url.pathname)
    const accept = request.headers()['accept'] || ''
    const wantsObject = accept.includes('vnd.pgrst.object+json')

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' })
      return
    }

    if (url.pathname.endsWith('/profiles') && request.method() === 'GET') {
      const profile = {
        id: 'seller-1',
        full_name: 'Test Seller',
        role: 'seller',
        email,
      }
      await route.fulfill(json(wantsObject ? profile : [profile]))
      return
    }

    if (url.pathname.endsWith('/seller_stores') && request.method() === 'GET') {
      const store = {
        id: 'store-1',
        owner_id: 'seller-1',
        store_name: 'My Test Store',
        status: 'active',
        description: 'A great store'
      }
      await route.fulfill(json(wantsObject ? store : [store]))
      return
    }

    if (url.pathname.endsWith('/products') && request.method() === 'GET') {
      const products = [
        {
          id: 'prod-1',
          title: 'Handmade Wooden Chair',
          price: 1500,
          stock: 10,
          status: 'approved',
          seller_store_id: 'store-1',
          created_at: new Date().toISOString()
        },
        {
          id: 'prod-2',
          title: 'Township Sneaker',
          price: 800,
          stock: 25,
          status: 'approved',
          seller_store_id: 'store-1',
          created_at: new Date().toISOString()
        }
      ]
      await route.fulfill(json(products))
      return
    }

    if (url.pathname.endsWith('/order_items') && request.method() === 'GET') {
      const orderItems = [
        {
          id: 'item-1',
          orders: { id: 'ORD-123', created_at: new Date().toISOString(), profiles: { full_name: 'Sipho Nkosi' } },
          products: { title: 'Handmade Wooden Chair' },
          qty: 1,
          item_total: 1500,
          item_status: 'pending',
          seller_store_id: 'store-1'
        },
        {
          id: 'item-2',
          orders: { id: 'ORD-456', created_at: new Date().toISOString(), profiles: { full_name: 'Lerato Dlamini' } },
          products: { title: 'Township Sneaker' },
          qty: 2,
          item_total: 1600,
          item_status: 'shipped',
          seller_store_id: 'store-1'
        }
      ]
      await route.fulfill(json(orderItems))
      return
    }

    if (url.pathname.endsWith('/onboarding_progress') && request.method() === 'GET') {
      await route.fulfill(json([]))
      return
    }

    await route.fulfill(json([]))
  })
}

test.beforeEach(async ({ page }) => {
  await setupDashboardMocks(page)
  
  await page.addInitScript(() => {
    const session = {
      access_token: 'test-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'seller-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'seller@emallplace.local',
        user_metadata: {
          full_name: 'Test Seller',
          role: 'seller',
        }
      }
    }
    const profile = { id: 'seller-1', full_name: 'Test Seller', role: 'seller', email: 'seller@emallplace.local' }
    
    const authKey = 'sb-krbbibcoxvmcwgsugvvx-auth-token';
      
    localStorage.setItem(authKey, JSON.stringify(session))
    localStorage.setItem('cached_profile', JSON.stringify(profile))
    localStorage.setItem('celebrationShown', 'true') // skip celebration modal
  })
})

test('Dashboard filtering and layout functionality', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()))
  await page.goto('/#/seller')

  // Verify dashboard loaded
  await expect(page.getByText('Store Dashboard')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'My Test Store' })).toBeVisible()

  // 1. Check Product Filtering
  await expect(page.getByText('Handmade Wooden Chair')).toBeVisible()
  await expect(page.getByText('Township Sneaker')).toBeVisible()

  const searchInput = page.getByPlaceholder('Filter items...')
  
  // Search for "Chair"
  await searchInput.fill('Chair')
  await expect(page.getByText('Handmade Wooden Chair')).toBeVisible()
  await expect(page.getByText('Township Sneaker')).not.toBeVisible()

  // Search for non-existent product
  await searchInput.fill('NonExistentItem999')
  await expect(page.getByText('No products found matching your search.')).toBeVisible()
  await expect(page.getByText('Handmade Wooden Chair')).not.toBeVisible()

  // Clear search
  await searchInput.fill('')
  await expect(page.getByText('Handmade Wooden Chair')).toBeVisible()
  await expect(page.getByText('Township Sneaker')).toBeVisible()

  // 2. Switch to Orders tab
  await page.getByRole('button', { name: 'Order Fulfillment' }).click()
  
  // Verify orders loaded
  await expect(page.getByText('#ORD-123')).toBeVisible()
  await expect(page.getByText('Sipho Nkosi')).toBeVisible()
  await expect(page.getByText('#ORD-456')).toBeVisible()
  await expect(page.getByText('Lerato Dlamini')).toBeVisible()

  // Filter orders by Customer Name
  await searchInput.fill('Lerato')
  await expect(page.getByText('Lerato Dlamini')).toBeVisible()
  await expect(page.getByText('Sipho Nkosi')).not.toBeVisible()

  // Filter orders by Order ID
  await searchInput.fill('123')
  await expect(page.getByText('#ORD-123')).toBeVisible()
  await expect(page.getByText('#ORD-456')).not.toBeVisible()

  // Filter for non-existent order
  await searchInput.fill('UnknownOrder000')
  await expect(page.getByText('No orders found matching your search.')).toBeVisible()

  // 3. Layout checks (Mobile responsiveness)
  // Set viewport to mobile size
  await page.setViewportSize({ width: 375, height: 667 })
  
  // Ensure the table container has overflow-x-auto to prevent body scrolling
  const tableContainer = page.locator('.overflow-x-auto').first()
  await expect(tableContainer).toBeVisible()
  
  // Check if body has horizontal scroll
  const hasHorizontalScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth
  })
  expect(hasHorizontalScroll).toBe(false)
})