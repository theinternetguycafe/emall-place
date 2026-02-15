import { supabase } from './supabase'

import { FunctionsHttpError } from '@supabase/supabase-js'
export async function createYocoPaymentLink(
  orderId: string,
  totalAmount: number,
  items: any[],
  buyerEmail?: string,
  buyerName?: string
): Promise<{ redirectUrl: string; error: string | null }> {
  try {
    console.log('[Yoco] Creating payment link for order:', orderId)

    // 0) Must have a session (JWT)
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr) return { redirectUrl: '', error: sessionErr.message }
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return { redirectUrl: '', error: 'No active session. Please sign in again.' }

    // 1) Confirm order visible
    const { data: existingOrder, error: existsErr } = await supabase
      .from('orders')
      .select('id, buyer_id, status, payment_status')
      .eq('id', orderId)
      .maybeSingle()

    if (existsErr) return { redirectUrl: '', error: `Order lookup failed: ${existsErr.message}` }
    if (!existingOrder) return { redirectUrl: '', error: 'Order not found or not accessible (RLS).' }

    // 2) Update order flags (only columns that exist)
    const { data: updatedRows, error: updateErr } = await supabase
      .from('orders')
      .update({ status: 'pending', payment_status: 'unpaid' })
      .eq('id', orderId)
      .select('id')

    if (updateErr) return { redirectUrl: '', error: `Failed to update order: ${updateErr.message}` }
    if (!updatedRows || updatedRows.length === 0) {
      return { redirectUrl: '', error: 'Order update blocked (RLS).' }
    }

    // 3) Invoke Edge Function (FORCE auth header)
    const itemNames = (items || [])
      .map((i: any) => i?.product?.title)
      .filter(Boolean)
      .join(', ')

    const amountInCents = Math.round(Number(totalAmount || 0) * 100)

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
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY!
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

    const paymentLink = (fnData as any)?.paymentLink
    if (!paymentLink) return { redirectUrl: '', error: 'Invalid response from payment service (missing paymentLink).' }

    console.log('[Yoco] Payment link created successfully:', paymentLink)
    return { redirectUrl: paymentLink, error: null }
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