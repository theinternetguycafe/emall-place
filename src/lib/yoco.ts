import { supabase } from './supabase'

import { FunctionsHttpError } from '@supabase/supabase-js'
export async function createYocoPaymentLink(
  orderId: string,
  totalAmount: number,
  items: any[],
  accessToken: string,
  buyerEmail?: string,
  buyerName?: string
): Promise<{ redirectUrl: string; error: string | null }> {
  try {
    console.log('[Yoco] Creating payment link for order:', orderId)

    // Validate accessToken exists
    if (!accessToken) return { redirectUrl: '', error: 'No active session. Please sign in again.' }

    // Build item names for description
    const itemNames = (items || [])
      .map((i: any) => i?.product?.title)
      .filter(Boolean)
      .join(', ')

    const amountInCents = Math.round(Number(totalAmount || 0) * 100)

    // Invoke Edge Function with Authorization header only
    const { data: fnData, error: fnError } = await supabase.functions.invoke('yoco-initiate', {
      body: {
        orderId,
        amount: amountInCents,
        description: `Order #${orderId}${itemNames ? ` - ${itemNames}` : ''}`,
        buyerEmail: buyerEmail || undefined,
        buyerName: buyerName || undefined,
        metadata: {
          items: itemNames,
          itemCount: Array.isArray(items) ? items.length : 0
        }
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })

    if (fnError) {
      if (fnError instanceof FunctionsHttpError) {
        const res = fnError.context
        let details: any = null
        try { details = await res.json() } catch {}
        console.error('[Yoco] Function error details:', details)
        return { redirectUrl: '', error: details?.error || fnError.message }
      }
      return { redirectUrl: '', error: fnError.message }
    }

    // Support both redirectUrl and paymentLink, prefer redirectUrl
    const redirectUrl = (fnData as any)?.redirectUrl || (fnData as any)?.paymentLink
    if (!redirectUrl) {
      return { redirectUrl: '', error: 'Invalid response from payment service (missing redirectUrl or paymentLink).' }
    }

    console.log('[Yoco] Payment link created successfully:', redirectUrl)
    return { redirectUrl, error: null }
  } catch (e: any) {
    console.error('[Yoco] Exception:', e)
    return { redirectUrl: '', error: e?.message || 'Unexpected error creating payment' }
  }
}

/**
 * Verify Yoco payment status (reads order row)
 */
export async function verifyYocoPaymentStatus(orderId: string): Promise<{ paid: boolean; status: string }> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      console.error('[Yoco] Error fetching order:', error)
      return { paid: false, status: 'error' }
    }
    if (!order) return { paid: false, status: 'not_found' }

    const paid = order.payment_status === 'paid'
    console.log(`[Yoco] Payment status for ${orderId}: ${order.payment_status}`)
    return { paid, status: order.status }
  } catch (error: any) {
    console.error('[Yoco] Verify error:', error)
    return { paid: false, status: 'error' }
  }
}