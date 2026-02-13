import { supabase } from './supabase'

// PayFast Configuration
const PAYFAST_CONFIG = {
  // These should be environment variables in production
  merchantId: import.meta.env.VITE_PAYFAST_MERCHANT_ID || '10000100',
  merchantKey: import.meta.env.VITE_PAYFAST_MERCHANT_KEY || 'sandbox_key',
  apiKey: import.meta.env.VITE_PAYFAST_API_KEY || 'sandbox_api_key',
  passphrase: import.meta.env.VITE_PAYFAST_PASSPHRASE || 'sandbox_passphrase',
  // Use sandbox for testing, live for production
  isSandbox: import.meta.env.VITE_PAYFAST_SANDBOX !== 'false',
  baseUrl: import.meta.env.VITE_PAYFAST_SANDBOX !== 'false' 
    ? 'https://sandbox.payfast.co.za'
    : 'https://api.payfast.co.za'
}

export interface PayFastPaymentRequest {
  merchant_id: string
  merchant_key: string
  amount: number
  item_name: string
  m_payment_id: string
  return_url: string
  cancel_url: string
  notify_url: string
  signature?: string
}

export interface PayFastPaymentResponse {
  success: boolean
  redirect_url?: string
  error?: string
}

/**
 * Generate MD5 signature for PayFast
 * This must be done server-side for security
 */
export function generatePayFastSignature(params: PayFastPaymentRequest): string {
  // This is a placeholder - in production, this should be done by a backend service
  // The signature is generated using the passphrase and ordered parameters
  console.warn('⚠️  Signature generation should be done server-side')
  return 'placeholder_signature'
}

/**
 * Create a PayFast payment request
 * This creates a pending order and returns redirect URL
 */
export async function createPayFastPayment(
  orderId: string,
  totalAmount: number,
  items: any[],
  buyerEmail?: string
): Promise<{ redirectUrl: string; error: string | null }> {
  try {
    console.log('[PayFast] Creating payment request for order:', orderId)

    // Step 1: Create/update order with pending_payment status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'pending_payment',
        payment_status: 'pending'
      })
      .eq('id', orderId)
      .select()
      .single()

    if (orderError) {
      console.error('[PayFast] Error updating order:', orderError)
      return { redirectUrl: '', error: `Failed to update order: ${orderError.message}` }
    }

    console.log('[PayFast] Order updated to pending_payment:', order)

    // Instead of generating signatures client-side, call the backend Edge Function
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    const funcUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/payfast-initiate`

    const itemNames = items.map((item: any) => item.product.title).join(', ')

    const resp = await fetch(funcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: totalAmount,
        itemName: `Order #${orderId} - ${itemNames}`,
        buyerEmail: buyerEmail || undefined
      })
    })

    const json = await resp.json()

    if (!resp.ok) {
      console.error('[PayFast] Initiate function error:', json)
      return { redirectUrl: '', error: json.error || 'Failed to initiate PayFast payment' }
    }

    // The function returns `redirectUrl` and `formFields`. Build a POST form and auto-submit to PayFast.
    const { redirectUrl, formFields } = json as { redirectUrl: string; formFields: Record<string, string> }

    try {
      const targetOrigin = new URL(redirectUrl).origin
      const action = `${targetOrigin}/eng/process`

      const form = document.createElement('form')
      form.method = 'POST'
      form.action = action

      Object.entries(formFields || {}).forEach(([k, v]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = k
        input.value = v
        form.appendChild(input)
      })

      document.body.appendChild(form)
      form.submit()
      return { redirectUrl: action, error: null }
    } catch (err: any) {
      console.error('[PayFast] Failed to submit form automatically:', err)
      // Fallback: return redirectUrl so caller can navigate
      return { redirectUrl: redirectUrl || '', error: null }
    }
  } catch (error) {
    console.error('[PayFast] Unexpected error:', error)
    return { redirectUrl: '', error: error instanceof Error ? error.message : 'An unexpected error occurred' }
  }
}

/**
 * Verify payment status from ITN callback
 */
export async function verifyPaymentStatus(orderId: string): Promise<{ paid: boolean; status: string }> {
  try {
    console.log('[PayFast] Verifying payment status for order:', orderId)

    // Check if order is marked as paid
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError) {
      console.error('[PayFast] Error fetching order:', orderError)
      return { paid: false, status: 'error' }
    }

    const isPaid = order.payment_status === 'paid' || order.status === 'completed'
    const status = order.status

    console.log('[PayFast] Payment status:', { paid: isPaid, status })

    return { paid: isPaid, status }

  } catch (error) {
    console.error('[PayFast] Unexpected error:', error)
    return { paid: false, status: 'error' }
  }
}
