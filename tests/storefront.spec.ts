import { expect, Page, test } from '@playwright/test'

function json(data: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  }
}

const store = {
  id: 'store-1',
  owner_id: 'seller-1',
  store_name: 'North Star Atelier',
  tagline: 'Premium leather accessories from Johannesburg',
  description:
    'North Star Atelier curates premium accessories, home pieces, and travel essentials for shoppers who want standout craft and dependable service.',
  logo_url:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" rx="48" fill="%230f172a"/><text x="50%" y="56%" dominant-baseline="middle" text-anchor="middle" font-size="120" font-family="Arial" fill="white">N</text></svg>',
  banner_url:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="700"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%239a3412"/></linearGradient></defs><rect width="1600" height="700" fill="url(%23g)"/></svg>',
  status: 'active',
  created_at: '2026-03-01T00:00:00.000Z',
  seller_email: 'northstar@emallplace.local',
  seller_phone: '+27 82 000 0000',
  seller_location: 'Johannesburg, Gauteng',
  announcement_text: 'Winter Sale 50% Off',
  theme_color: '#0f172a',
  featured_product_ids: ['prod-1', 'prod-4'],
  average_rating: null,
  review_count: 0,
  store_policies: {
    shipping: 'Ships nationwide within 2 to 4 business days.',
    returns: 'Returns accepted within 14 days for unused items.',
    warranty: 'Six-month workmanship warranty on selected goods.',
  },
}

const categories = [
  {
    id: 'cat-accessories',
    name: 'Accessories',
    slug: 'accessories',
    image_url:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23e7e5e4"/></svg>',
  },
  {
    id: 'cat-decor',
    name: 'Decor',
    slug: 'decor',
    image_url:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23dbeafe"/></svg>',
  },
  {
    id: 'cat-clothing',
    name: 'Clothing',
    slug: 'clothing',
    image_url:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="%23dcfce7"/></svg>',
  },
]

const products = [
  {
    id: 'prod-1',
    seller_store_id: 'store-1',
    category_id: 'cat-accessories',
    title: 'Leather Travel Wallet',
    description: 'Full-grain travel wallet with card and passport storage.',
    price: 1800,
    stock: 8,
    status: 'approved',
    is_on_sale: true,
    sale_price: 1500,
    sale_starts_at: '2026-03-01T00:00:00.000Z',
    sale_ends_at: '2026-04-01T00:00:00.000Z',
    sale_label: 'Winter Sale',
    created_at: '2026-03-10T00:00:00.000Z',
    product_images: [
      {
        id: 'img-1',
        product_id: 'prod-1',
        url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="%23f5f5f4"/></svg>',
        sort_order: 0,
      },
    ],
  },
  {
    id: 'prod-2',
    seller_store_id: 'store-1',
    category_id: 'cat-decor',
    title: 'Sunset Wall Art',
    description: 'Framed statement wall art for modern interiors.',
    price: 2500,
    stock: 4,
    status: 'approved',
    is_on_sale: false,
    sale_price: null,
    sale_starts_at: null,
    sale_ends_at: null,
    sale_label: null,
    created_at: '2026-03-09T00:00:00.000Z',
    product_images: [
      {
        id: 'img-2',
        product_id: 'prod-2',
        url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="%23ede9fe"/></svg>',
        sort_order: 0,
      },
    ],
  },
  {
    id: 'prod-3',
    seller_store_id: 'store-1',
    category_id: 'cat-accessories',
    title: 'Canvas Utility Tote',
    description: 'Durable tote for everyday errands and market visits.',
    price: 900,
    stock: 0,
    status: 'approved',
    is_on_sale: false,
    sale_price: null,
    sale_starts_at: null,
    sale_ends_at: null,
    sale_label: null,
    created_at: '2026-03-08T00:00:00.000Z',
    product_images: [
      {
        id: 'img-3',
        product_id: 'prod-3',
        url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="%23fee2e2"/></svg>',
        sort_order: 0,
      },
    ],
  },
  {
    id: 'prod-4',
    seller_store_id: 'store-1',
    category_id: 'cat-clothing',
    title: 'Studio Overshirt',
    description: 'Structured overshirt cut for layered winter fits.',
    price: 1300,
    stock: 12,
    status: 'approved',
    is_on_sale: false,
    sale_price: null,
    sale_starts_at: null,
    sale_ends_at: null,
    sale_label: null,
    created_at: '2026-03-07T00:00:00.000Z',
    product_images: [
      {
        id: 'img-4',
        product_id: 'prod-4',
        url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="%23dcfce7"/></svg>',
        sort_order: 0,
      },
    ],
  },
]

async function setupStorefrontMocks(page: Page) {
  const email = 'seller@emallplace.local'

  await page.route('**/auth/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' })
      return
    }

    if (url.pathname.endsWith('/user')) {
      await route.fulfill(
        json({ id: 'seller-1', email: 'seller@emallplace.local', role: 'authenticated' })
      )
      return
    }

    if (url.pathname.endsWith('/token')) {
      await route.fulfill(
        json({
          access_token: 'test-access-token',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'test-refresh-token',
          user: {
            id: 'seller-1',
            aud: 'authenticated',
            role: 'authenticated',
            email,
            user_metadata: {
              full_name: 'North Star Seller',
              role: 'seller',
            },
          },
        })
      )
      return
    }

    await route.fulfill(json({}))
  })

  await page.route('**/rest/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const accept = request.headers()['accept'] || ''
    const wantsObject = accept.includes('vnd.pgrst.object+json')

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' })
      return
    }

    if (url.pathname.endsWith('/profiles') && request.method() === 'GET') {
      const profile = {
        id: 'seller-1',
        full_name: 'North Star Seller',
        role: 'seller',
        email,
      }
      await route.fulfill(json(wantsObject ? profile : [profile]))
      return
    }

    if (url.pathname.endsWith('/seller_stores') && request.method() === 'GET') {
      await route.fulfill(json(wantsObject ? store : [store]))
      return
    }

    if (url.pathname.endsWith('/seller_stores') && request.method() === 'PATCH') {
      await route.fulfill(json([store]))
      return
    }

    if (url.pathname.endsWith('/products') && request.method() === 'GET') {
      const requestedProductId = url.searchParams.get('id')?.replace('eq.', '')

      if (wantsObject && requestedProductId) {
        const product = products.find(candidate => candidate.id === requestedProductId)
        await route.fulfill(json(product ? { ...product, seller_store: store } : null))
        return
      }

      await route.fulfill(json(products))
      return
    }

    if (url.pathname.endsWith('/categories') && request.method() === 'GET') {
      await route.fulfill(json(categories))
      return
    }

    if (url.pathname.endsWith('/order_items') && request.method() === 'GET') {
      await route.fulfill(json([]))
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
  await setupStorefrontMocks(page)

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
          full_name: 'North Star Seller',
          role: 'seller',
        },
      },
    }

    const profile = {
      id: 'seller-1',
      full_name: 'North Star Seller',
      role: 'seller',
      email: 'seller@emallplace.local',
    }

    localStorage.setItem('sb-krbbibcoxvmcwgsugvvx-auth-token', JSON.stringify(session))
    localStorage.setItem('cached_profile', JSON.stringify(profile))
    localStorage.setItem('celebrationShown', 'true')
    localStorage.setItem('cart', '[]')
  })
})

test('seller dashboard opens the branded storefront preview', async ({ page }) => {
  await page.goto('/#/seller')

  await expect(page.getByText('Storefront Customization')).toBeVisible()
  await expect(page.getByText('Open Storefront Preview')).toBeVisible()

  await page.getByText('View Storefront').click()
  await expect(page).toHaveURL(/#\/store\/store-1$/)

  await expect(page.getByRole('heading', { name: 'North Star Atelier' }).first()).toBeVisible()
  await expect(page.getByText('Premium leather accessories from Johannesburg').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Follow Store', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Contact Seller', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Winter Sale 50% Off' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Featured Products' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'All Products' })).toBeVisible()

  const reviewsHeading = page.getByRole('heading', { name: 'Customer Reviews' })
  await reviewsHeading.scrollIntoViewIfNeeded()
  await expect(reviewsHeading).toBeVisible()

  const aboutHeading = page.getByRole('heading', { name: 'About This Store' })
  await aboutHeading.scrollIntoViewIfNeeded()
  await expect(aboutHeading).toBeVisible()

  const policiesHeading = page.getByRole('heading', { name: 'Policies & Information' })
  await policiesHeading.scrollIntoViewIfNeeded()
  await expect(policiesHeading).toBeVisible()
})

test('product details seller button opens the dedicated storefront', async ({ page }) => {
  await page.goto('/#/product/prod-1')

  await expect(page.getByRole('heading', { name: 'Leather Travel Wallet' })).toBeVisible()
  await page.getByRole('button', { name: /Sold by North Star Atelier/i }).click()
  await expect(page).toHaveURL(/#\/store\/store-1$/)
  await expect(page.getByRole('heading', { name: 'North Star Atelier' }).first()).toBeVisible()
})

test('storefront category filtering, availability controls, sorting, and quick add work', async ({ page }) => {
  await page.goto('/#/store/store-1')

  const allProductsSection = page.locator('[data-store-section="products"]')

  await expect(allProductsSection.getByText('Leather Travel Wallet')).toBeVisible()
  await expect(allProductsSection.getByText('Sunset Wall Art')).toBeVisible()
  await expect(allProductsSection.getByText('Canvas Utility Tote')).toBeVisible()
  await expect(allProductsSection.getByText('Studio Overshirt')).toBeVisible()

  const browseCategoriesSection = page.locator('[data-store-section="categories"]')

  await browseCategoriesSection.getByRole('button', { name: /Accessories/i }).click()
  await expect(allProductsSection.getByText('Leather Travel Wallet')).toBeVisible()
  await expect(allProductsSection.getByText('Canvas Utility Tote')).toBeVisible()
  await expect(allProductsSection.getByText('Sunset Wall Art')).toHaveCount(0)
  await expect(allProductsSection.getByText('Studio Overshirt')).toHaveCount(0)

  await page.getByRole('button', { name: 'Out of Stock' }).click()
  await expect(allProductsSection.getByText('Canvas Utility Tote')).toBeVisible()
  await expect(allProductsSection.getByText('Leather Travel Wallet')).toHaveCount(0)
  await expect(allProductsSection.getByRole('button', { name: 'Quick Add' })).toBeDisabled()

  await page.getByRole('button', { name: 'Reset Filters' }).click()
  await page.getByRole('button', { name: 'Price: High to Low' }).click()
  await expect(allProductsSection.locator('a[href*="#/product/"] h3').first()).toContainText('Sunset Wall Art')

  const featuredSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Featured Products' }),
  })

  await featuredSection.getByRole('button', { name: 'Quick Add' }).first().click()
  await expect(page.locator('a[href="#/cart"] span')).toHaveText('1')
})
