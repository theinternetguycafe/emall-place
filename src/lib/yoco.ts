import { supabase } from './supabase'

// Yoco Configuration
const YOCO_CONFIG = {
  publicKey: import.meta.env.VITE_YOCO_PUBLIC_KEY || 'pk_test_placeholder',
  secretKey: import.meta.env.VITE_YOCO_SECRET_KEY,
  isSandbox: !import.meta.env.VITE_YOCO_SECRET_KEY || import.meta.env.VITE_YOCO_SECRET_KEY.includes('test'),
  baseUrl: 'https://api.yoco.com/v1',
  // If you have test keys, use them; otherwise production
  apiUrl: (import.meta.env.VITE_YOCO_SECRET_KEY?.includes('test') || !import.meta.env.VITE_YOCO_SECRET_KEY)
    ? 'https://api.sandbox.yoco.com/v1'
    : 'https://api.yoco.com/v1'
}

export interface YocoPaymentLinkRequest {
  amount: number // in cents (ZAR)
  orderId: string
  buyerEmail?: string
  buyerName?: string
  description: string
}

export interface YocoPaymentResponse {
  success: boolean
  paymentLink?: string
  paymentId?: string
  error?: string
}

/**
 * Create a Yoco Payment Link (server-side via Edge Function)
 * This delegates to the backend to keep secret keys safe
 */
export async function createYocoPaymentLink(
  orderId: string,
  totalAmount: number,
  items: any[],
  buyerEmail?: string,
  buyerName?: string
): Promise<{ redirectUrl: string; error: string | null }> {
  try {
    console.log('[Yoco] Creating payment link for order:', orderId)

    // Update order status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'pending_payment',
        payment_status: 'pending',
        payment_method: 'yoco'
      })
      .eq('id', orderId)
      .select()
      .single()

    if (orderError) {
      console.error('[Yoco] Error updating order:', orderError)
      return { redirectUrl: '', error: `Failed to update order: ${orderError.message}` }
    }

    console.log('[Yoco] Order updated to pending_payment:', order)

    // Call the backend Edge Function to create payment link
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    const funcUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/yoco-initiate`

    const itemNames = items.map((item: any) => item.product.title).join(', ')
    const amountInCents = Math.round(totalAmount * 100) // Yoco uses cents

    const resp = await fetch(funcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: amountInCents,
        description: `Order #${orderId} - ${itemNames}`,
        buyerEmail: buyerEmail || undefined,
        buyerName: buyerName || undefined,
        metadata: {
          items: itemNames,
          itemCount: items.length
        }
      })
    })

    const json = await resp.json()

    if (!resp.ok) {
      console.error('[Yoco] Initiate function error:', json)
      return { redirectUrl: '', error: json.error || 'Failed to create Yoco payment' }
    }

    if (!json.paymentLink) {
      console.error('[Yoco] No payment link in response:', json)
      return { redirectUrl: '', error: 'Invalid response from payment service' }
    }

    console.log('[Yoco] Payment link created successfully')
    return { redirectUrl: json.paymentLink, error: null }
  } catch (error: any) {
    console.error('[Yoco] Exception:', error)
    return { redirectUrl: '', error: error.message || 'Unexpected error creating payment' }
  }
}

/**
 * Verify Yoco payment status
 */
export async function verifyYocoPaymentStatus(orderId: string): Promise<{ paid: boolean; status: string }> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('[Yoco] Error fetching order:', error)
      return { paid: false, status: 'error' }
    }

    const paid = order.payment_status === 'paid'
    console.log(`[Yoco] Payment status for ${orderId}: ${order.payment_status}`)

    return { paid, status: order.status }
  } catch (error: any) {
    console.error('[Yoco] Verify error:', error)
    return { paid: false, status: 'error' }
  }
}
