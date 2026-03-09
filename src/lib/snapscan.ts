import { supabase } from './supabase'

export interface SnapScanQRRequest {
  amount: number // in cents (ZAR)
  orderId: string
  description: string
}

export interface SnapScanQRResponse {
  success: boolean
  qrCode?: string
  transactionId?: string
  error?: string
}

/**
 * Generate SnapScan QR Code (via Supabase Edge Function)
 * - Ensures user is logged in (session exists)
 * - Ensures order is visible (RLS check)
 * - Updates order using VALID enum values from your schema
 * - Invokes Edge Function using supabase.functions.invoke (auto JWT)
 */
export async function generateSnapScanQR(
  orderId: string,
  totalAmount: number,
  items: any[]
): Promise<{ qrCode: string; transactionId: string; error: string | null }> {
  try {
    console.log('[SnapScan] Generating QR code for order:', orderId)

    // 0) Ensure session exists
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession()
    if (sessionErr) {
      console.error('[SnapScan] Session read error:', sessionErr)
      return { qrCode: '', transactionId: '', error: `Auth session error: ${sessionErr.message}` }
    }
    if (!sessionData.session) {
      return { qrCode: '', transactionId: '', error: 'No active session. Please sign in again.' }
    }

    // 1) Ensure order exists/visible (diagnose RLS vs wrong orderId)
    const { data: existingOrder, error: existsErr } = await supabase
      .from('orders')
      .select('id, buyer_id, status, payment_status, total_amount')
      .eq('id', orderId)
      .maybeSingle()

    if (existsErr) {
      console.error('[SnapScan] Error checking order existence:', existsErr)
      return { qrCode: '', transactionId: '', error: `Order lookup failed: ${existsErr.message}` }
    }
    if (!existingOrder) {
      console.error('[SnapScan] Order not found/visible:', orderId)
      return { qrCode: '', transactionId: '', error: 'Order not found or not accessible (RLS).' }
    }

    // 2) Update order with VALID enums only
    // ✅ status allowed: pending | processing | completed | cancelled
    // ✅ payment_status allowed: unpaid | paid | failed
    //
    // We keep it as pending + unpaid while QR is being paid.
    const { data: updatedRows, error: updateErr } = await supabase
      .from('orders')
      .update({
        status: 'pending',
        payment_status: 'unpaid',
      })
      .eq('id', orderId)
      .select('id')

    if (updateErr) {
      console.error('[SnapScan] Error updating order:', updateErr)
      return { qrCode: '', transactionId: '', error: `Failed to update order: ${updateErr.message}` }
    }
    if (!updatedRows || updatedRows.length === 0) {
      console.error('[SnapScan] Update matched 0 rows (RLS blocked).', { orderId })
      return {
        qrCode: '',
        transactionId: '',
        error: 'Order update blocked (RLS). Ensure orders UPDATE policy allows buyer to update own order.',
      }
    }

    // 3) Invoke Edge Function (auth auto-included)
    const itemNames = (items || [])
      .map((item: any) => item?.product?.title)
      .filter(Boolean)
      .join(', ')

    const amountInCents = Math.round(Number(totalAmount || 0) * 100)

    const { data: fnData, error: fnError } = await supabase.functions.invoke('snapscan-initiate', {
      body: {
        orderId,
        amount: amountInCents,
        description: `Order #${orderId}${itemNames ? ` - ${itemNames}` : ''}`,
        metadata: {
          items: itemNames,
          itemCount: Array.isArray(items) ? items.length : 0,
        },
      },
    })

    if (fnError) {
      console.error('[SnapScan] Initiate function error:', fnError)
      return { qrCode: '', transactionId: '', error: fnError.message || 'Failed to generate SnapScan QR' }
    }

    const qrCode = (fnData as any)?.qrCode
    const transactionId = (fnData as any)?.transactionId || orderId

    if (!qrCode) {
      console.error('[SnapScan] Missing qrCode in function response:', fnData)
      return { qrCode: '', transactionId: '', error: 'Invalid response from SnapScan (missing qrCode).' }
    }

    console.log('[SnapScan] QR generated successfully:', transactionId)
    return { qrCode, transactionId, error: null }
  } catch (error: any) {
    console.error('[SnapScan] Exception:', error)
    return { qrCode: '', transactionId: '', error: error?.message || 'Unexpected error generating QR' }
  }
}

/**
 * Verify SnapScan payment status via polling (reads order row)
 */
export async function verifySnapScanPaymentStatus(orderId: string): Promise<{ paid: boolean; status: string }> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      console.error('[SnapScan] Error fetching order:', error)
      return { paid: false, status: 'error' }
    }
    if (!order) return { paid: false, status: 'not_found' }

    const paid = order.payment_status === 'paid'
    console.log(`[SnapScan] Payment status for ${orderId}: ${order.payment_status}`)
    return { paid, status: order.status }
  } catch (error: any) {
    console.error('[SnapScan] Verify error:', error)
    return { paid: false, status: 'error' }
  }
}