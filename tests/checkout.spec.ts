import { test, expect, Page } from '@playwright/test';

function json(data: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  };
}

async function setupCheckoutMocks(page: Page) {
  const email = 'buyer@emallplace.local';
  const userId = 'buyer-1';

  // 1. Mock Auth
  await page.route('**/auth/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' });
      return;
    }

    if (url.pathname.endsWith('/session')) {
      await route.fulfill(
        json({
          session: {
            access_token: 'test-access-token',
            user: { id: userId, email },
          },
        })
      );
      return;
    }

    if (url.pathname.endsWith('/user')) {
      await route.fulfill(json({ id: userId, email, role: 'authenticated' }));
      return;
    }

    await route.fulfill(json({}));
  });

  // 2. Mock Cart Database calls for checkout operations
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 200, body: '' });
      return;
    }

    // Creating an order returns an id
    if (url.pathname.endsWith('/orders') && request.method() === 'POST') {
      await route.fulfill(json({ id: 'mock-order-123' }));
      return;
    }

    // Creating order items returns success
    if (url.pathname.endsWith('/order_items') && request.method() === 'POST') {
      await route.fulfill(json([{ id: 'mock-order-item-1' }]));
      return;
    }

    // Verify Yoco Payment Status via database orders fetch
    if (url.pathname.endsWith('/orders') && request.method() === 'GET') {
      const urlStr = request.url();
      if (urlStr.includes('mock-order-123')) {
        // Assume successful if we are querying it after redirect
        // PostgREST returns an array for GET requests, maybeSingle handles it
        await route.fulfill(json([{ payment_status: 'paid', status: 'completed' }]));
        return;
      }
    }

    await route.fulfill(json([]));
  });
}

test.describe('Checkout Flow (Mocked Yoco)', () => {
  test.beforeEach(async ({ page }) => {
    await setupCheckoutMocks(page);

    // Setup Local Storage to bypass auth wall and populate cart
    await page.addInitScript(() => {
      const session = {
        access_token: 'test-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'test-refresh-token',
        user: {
          id: 'buyer-1',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'buyer@emallplace.local',
          user_metadata: { full_name: 'Test Buyer', role: 'buyer' },
        },
      };
      const profile = { id: 'buyer-1', full_name: 'Test Buyer', role: 'buyer', email: 'buyer@emallplace.local' };
      const authKey = 'sb-krbbibcoxvmcwgsugvvx-auth-token';

      localStorage.setItem(authKey, JSON.stringify(session));
      localStorage.setItem('cached_profile', JSON.stringify(profile));

      // Mock Cart Items
      const cartItems = [
        {
          product: {
            id: 'prod-1',
            seller_store_id: 'store-1',
            title: 'Mock Product',
            price: 100,
          },
          quantity: 2,
        },
      ];
      localStorage.setItem('cart', JSON.stringify(cartItems));
    });
  });

  test('Successful checkout flow creates order and verifies payment', async ({ page }) => {
    // Intercept Edge Function for Yoco Initiate
    await page.route('**/functions/v1/yoco-initiate', async (route) => {
      const payload = JSON.parse(route.request().postData() || '{}');
      
      // Ensure the Math is correct on payload
      expect(payload.amount).toBe(20000); // 200 ZAR in cents
      expect(payload.orderId).toBe('mock-order-123');
      
      await route.fulfill(
        json({ redirectUrl: '/#/checkout?order_id=mock-order-123&status=success' })
      );
    });

    await page.goto('/#/checkout');
    
    // Wait for network requests to settle
    await page.waitForTimeout(500);

    // Expect cart total (2 items * 100) = 200
    await expect(page.getByText('R 200').first()).toBeVisible();

    // Click Pay Now
    await page.getByRole('button', { name: 'Pay Now' }).click();

    // Wait for the success redirect and UI state
    await expect(page.getByText('Payment Successful!')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('mock-order-123')).toBeVisible();
    
    // Check that cart is cleared in local storage
    const cart = await page.evaluate(() => localStorage.getItem('cart'));
    expect(cart).toBe('[]');
  });

  test('Declined card shows correct error message and no ghost state', async ({ page }) => {
    await page.route('**/functions/v1/yoco-initiate', async (route) => {
      // Simulate Yoco responding with an error redirect
      await route.fulfill(
        json({ redirectUrl: '/#/checkout?order_id=mock-order-123&status=failed&error=card_declined' })
      );
    });

    await page.goto('/#/checkout');
    await page.getByRole('button', { name: 'Pay Now' }).click();

    // Validate failure state
    await expect(page.getByText('Payment Failed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Your card was declined by your bank. Please try another card.')).toBeVisible();
    
    // Cart should NOT be cleared on failure
    const cart = await page.evaluate(() => localStorage.getItem('cart'));
    expect(cart).not.toBe('[]');
    expect(cart).toContain('Mock Product');
  });

  test('Network timeout handles gracefully', async ({ page }) => {
    await page.route('**/functions/v1/yoco-initiate', async (route) => {
      await route.abort('timedout');
    });

    await page.goto('/#/checkout');
    await page.getByRole('button', { name: 'Pay Now' }).click();

    // The toast and error alert should catch network failure mapped to our message
    await expect(page.getByText('Network connection lost').first()).toBeVisible({ timeout: 10000 });
  });
  
  test('User refreshes mid-redirect avoids ghost state', async ({ page }) => {
    // If user comes to checkout with just a cancelled URL
    await page.goto('/#/checkout?order_id=mock-order-123&status=cancelled');

    await expect(page.getByText('Payment Failed')).toBeVisible();
    await expect(page.getByText('Payment was cancelled. Feel free to try again.')).toBeVisible();
  });
});
