import { expect, Page, test } from '@playwright/test'

type MockState = {
  store: {
    id: string
    owner_id: string
    store_name: string
    description: string | null
    status: string
    created_at: string
  } | null
  completedSteps: Set<string>
  email: string
}

function json(data: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  }
}

function createSession(email: string) {
  const user = {
    id: 'seller-user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    email_confirmed_at: '2026-03-08T00:00:00.000Z',
    phone: '',
    confirmed_at: '2026-03-08T00:00:00.000Z',
    last_sign_in_at: '2026-03-08T00:00:00.000Z',
    app_metadata: {
      provider: 'email',
      providers: ['email'],
    },
    user_metadata: {
      full_name: 'Spotlight Seller',
      role: 'seller',
      store_name: 'Spotlight Atelier',
    },
    identities: [],
    created_at: '2026-03-08T00:00:00.000Z',
    updated_at: '2026-03-08T00:00:00.000Z',
  }

  return {
    access_token: 'test-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'test-refresh-token',
    user,
  }
}

async function setupSupabaseMocks(page: Page) {
  const state: MockState = {
    store: null,
    completedSteps: new Set<string>(),
    email: 'seller-onboarding@test.local',
  }

  await page.route('**/auth/v1/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    const session = createSession(state.email)

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' })
      return
    }

    if (url.pathname.endsWith('/signup') && request.method() === 'POST') {
      const payload = request.postDataJSON() as { email?: string }
      state.email = payload.email || state.email
      await route.fulfill(json(createSession(state.email)))
      return
    }

    if (url.pathname.endsWith('/token')) {
      await route.fulfill(json(session))
      return
    }

    if (url.pathname.endsWith('/user')) {
      await route.fulfill(json(session.user))
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
        id: 'seller-user-1',
        full_name: 'Spotlight Seller',
        role: 'seller',
        phone: null,
        email: state.email,
        date_of_birth: null,
        gender: null,
        municipality: null,
        province: null,
        created_at: '2026-03-08T00:00:00.000Z',
      }

      await route.fulfill(json(wantsObject ? profile : [profile]))
      return
    }

    if (url.pathname.endsWith('/seller_stores') && request.method() === 'GET') {
      await route.fulfill(json(state.store ? (wantsObject ? state.store : [state.store]) : null))
      return
    }

    if (url.pathname.endsWith('/seller_stores') && request.method() === 'POST') {
      const payload = request.postDataJSON()
      const row = Array.isArray(payload) ? payload[0] : payload
      state.store = {
        id: 'store-1',
        owner_id: row.owner_id,
        store_name: row.store_name,
        description: null,
        status: row.status || 'pending',
        created_at: '2026-03-08T00:00:00.000Z',
      }
      await route.fulfill(json([state.store], 201))
      return
    }

    if (url.pathname.endsWith('/onboarding_progress') && request.method() === 'GET') {
      const rows = Array.from(state.completedSteps).map(stepId => ({ step_id: stepId }))
      await route.fulfill(json(rows))
      return
    }

    if (url.pathname.endsWith('/onboarding_progress') && request.method() === 'POST') {
      const payload = request.postDataJSON()
      const rows = Array.isArray(payload) ? payload : [payload]

      for (const row of rows) {
        if (row?.step_id) {
          if (row.skipped || row.completed_at) {
            state.completedSteps.add(row.step_id)
          }
        }
      }

      await route.fulfill(json(rows, 201))
      return
    }

    if (url.pathname.endsWith('/products') && request.method() === 'GET') {
      await route.fulfill(json([]))
      return
    }

    if (url.pathname.endsWith('/order_items') && request.method() === 'GET') {
      await route.fulfill(json([]))
      return
    }

    await route.fulfill(json([]))
  })

  return state
}

test('seller registration starts the spotlight immediately and the dashboard checklist uses the new modern CTA', async ({ page }) => {
  await setupSupabaseMocks(page)

  await page.goto('/#/auth?signup=true')

  await page.getByRole('button', { name: 'Seller' }).click()
  await page.getByPlaceholder('John Doe').fill('Spotlight Seller')
  await page.getByPlaceholder('My Artisan Shop').first().fill('Spotlight Atelier')
  await page.locator('input[type="email"]').fill('seller-onboarding@test.local')
  await page.locator('input[type="password"]').fill('TestPassword123!')
  await page.getByRole('button', { name: 'Create' }).click()

  await page.waitForFunction(() => localStorage.getItem('pendingSellerSpotlightTour') === 'true')
  await page.evaluate(() => {
    const session = {
      access_token: 'test-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'seller-user-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'seller-onboarding@test.local',
        email_confirmed_at: '2026-03-08T00:00:00.000Z',
        phone: '',
        confirmed_at: '2026-03-08T00:00:00.000Z',
        last_sign_in_at: '2026-03-08T00:00:00.000Z',
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        user_metadata: {
          full_name: 'Spotlight Seller',
          role: 'seller',
          store_name: 'Spotlight Atelier',
        },
        identities: [],
        created_at: '2026-03-08T00:00:00.000Z',
        updated_at: '2026-03-08T00:00:00.000Z',
      },
    }

    const profile = {
      id: 'seller-user-1',
      full_name: 'Spotlight Seller',
      role: 'seller',
      phone: null,
      email: 'seller-onboarding@test.local',
      date_of_birth: null,
      gender: null,
      municipality: null,
      province: null,
      created_at: '2026-03-08T00:00:00.000Z',
    }

    localStorage.setItem('sb-krbbibcoxvmcwgsugvvx-auth-token', JSON.stringify(session))
    localStorage.setItem('cached_profile', JSON.stringify(profile))
  })

  await page.goto('/#/seller')
  await expect(page.getByText('Guided Spotlight')).toBeVisible()
  await expect(page.getByText('Welcome to your seller studio')).toBeVisible()

  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Start by opening your storefront')).toBeVisible()

  await page.getByRole('button', { name: 'Start Selling' }).click()
  await expect(page.getByText('Choose a name buyers will remember')).toBeVisible()

  await page.locator('input[placeholder="My Artisan Shop"]').fill('Spotlight Atelier')
  await expect(page.getByText('Choose a name buyers will remember')).toBeVisible()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Create the workspace and continue')).toBeVisible()

  await page.waitForTimeout(2000)
  await page.getByRole('button', { name: 'Create Store' }).click({ force: true })
  await expect(page.locator('h3.text-xl.font-black', { hasText: 'Polish the profile buyers will see' })).toBeVisible({ timeout: 60000 })
  await page.getByRole('button', { name: 'Close tour' }).click()

  await expect(page.getByText('Launch checklist')).toBeVisible()
  await expect(page.getByText('Replay Spotlight')).toBeVisible()
  await expect(page.getByText('Do this now')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Add Product' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Add Your First Product' }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Replay Spotlight' }).click()
  await expect(page.getByText('Guided Spotlight')).toBeVisible()
  await expect(page.getByText('Welcome to your seller studio')).toBeVisible()
})

test('seller sign in refreshes into the logged-in shell automatically', async ({ page }) => {
  await setupSupabaseMocks(page)

  await page.addInitScript(() => {
    if (sessionStorage.getItem('seedSellerSessionOnNextLoad') !== 'true') {
      return
    }

    const session = {
      access_token: 'test-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'test-refresh-token',
      user: {
        id: 'seller-user-1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'seller-onboarding@test.local',
        email_confirmed_at: '2026-03-08T00:00:00.000Z',
        phone: '',
        confirmed_at: '2026-03-08T00:00:00.000Z',
        last_sign_in_at: '2026-03-08T00:00:00.000Z',
        app_metadata: {
          provider: 'email',
          providers: ['email'],
        },
        user_metadata: {
          full_name: 'Spotlight Seller',
          role: 'seller',
          store_name: 'Spotlight Atelier',
        },
        identities: [],
        created_at: '2026-03-08T00:00:00.000Z',
        updated_at: '2026-03-08T00:00:00.000Z',
      },
    }

    const profile = {
      id: 'seller-user-1',
      full_name: 'Spotlight Seller',
      role: 'seller',
      phone: null,
      email: 'seller-onboarding@test.local',
      date_of_birth: null,
      gender: null,
      municipality: null,
      province: null,
      created_at: '2026-03-08T00:00:00.000Z',
    }

    localStorage.setItem('sb-krbbibcoxvmcwgsugvvx-auth-token', JSON.stringify(session))
    localStorage.setItem('cached_profile', JSON.stringify(profile))
    sessionStorage.removeItem('seedSellerSessionOnNextLoad')
  })

  await page.goto('/#/auth')
  await page.evaluate(() => {
    sessionStorage.setItem('seedSellerSessionOnNextLoad', 'true')
  })
  await page.locator('input[type="email"]').fill('seller-onboarding@test.local')
  await page.locator('input[type="password"]').fill('TestPassword123!')
  await page.locator('form').getByRole('button', { name: 'Sign In' }).click()

  await page.waitForURL(/#\/$/)
  await expect(page.getByRole('button', { name: 'Seller Hub' })).toBeVisible()
  await expect(page.locator('a[href="#/account"]')).toBeVisible()
})
