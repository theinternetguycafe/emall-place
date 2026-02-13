import { supabase } from './supabase'

// SnapScan Configuration
const SNAPSCAN_CONFIG = {
  merchantId: import.meta.env.VITE_SNAPSCAN_MERCHANT_ID || 'test_merchant',
  apiKey: import.meta.env.VITE_SNAPSCAN_API_KEY,
  isSandbox: !import.meta.env.VITE_SNAPSCAN_API_KEY || import.meta.env.VITE_SNAPSCAN_API_KEY.includes('test'),
  baseUrl: 'https://api.snapscan.io/v1'
}

export interface SnapScanQRRequest {
  amount: number // in cents (ZAR)
  orderId: string
  description: string
}

export interface SnapScanQRResponse {
  success: boolean
  qrCode?: string
  qrCodeUrl?: string
  transactionId?: string
  error?: string
}

/**
 * Generate SnapScan QR Code (server-side via Edge Function)
 * Returns a QR code image that can be displayed to user
 */
export async function generateSnapScanQR(
  orderId: string,
  totalAmount: number,
  items: any[]
): Promise<{ qrCode: string; transactionId: string; error: string | null }> {
  try {
    console.log('[SnapScan] Generating QR code for order:', orderId)

    // Update order status
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'pending_payment',
        payment_status: 'pending',
        payment_method: 'snapscan'
      })
      .eq('id', orderId)
      .select()
      .single()

    if (orderError) {
      console.error('[SnapScan] Error updating order:', orderError)
      return { qrCode: '', transactionId: '', error: `Failed to update order: ${orderError.message}` }
    }

    console.log('[SnapScan] Order updated to pending_payment:', order)

    // Call the backend Edge Function to generate QR
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    const funcUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/snapscan-initiate`

    const itemNames = items.map((item: any) => item.product.title).join(', ')
    const amountInCents = Math.round(totalAmount * 100) // SnapScan uses cents

    const resp = await fetch(funcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: amountInCents,
        description: `Order #${orderId} - ${itemNames}`,
        metadata: {
          items: itemNames,
          itemCount: items.length
        }
      })
    })

    const json = await resp.json()

    if (!resp.ok) {
      console.error('[SnapScan] Initiate function error:', json)
      return { qrCode: '', transactionId: '', error: json.error || 'Failed to generate SnapScan QR' }
    }

    if (!json.qrCode) {
      console.error('[SnapScan] No QR code in response:', json)
      return { qrCode: '', transactionId: '', error: 'Invalid response from QR service' }
    }

    console.log('[SnapScan] QR code generated successfully')
    return { 
      qrCode: json.qrCode, 
      transactionId: json.transactionId || orderId,
      error: null 
    }
  } catch (error: any) {
    console.error('[SnapScan] Exception:', error)
    return { qrCode: '', transactionId: '', error: error.message || 'Unexpected error generating QR' }
  }
}

/**
 * Verify SnapScan payment status via polling
 */
export async function verifySnapScanPaymentStatus(orderId: string): Promise<{ paid: boolean; status: string }> {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select('payment_status, status')
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('[SnapScan] Error fetching order:', error)
      return { paid: false, status: 'error' }
    }

    const paid = order.payment_status === 'paid'
    console.log(`[SnapScan] Payment status for ${orderId}: ${order.payment_status}`)

    return { paid, status: order.status }
  } catch (error: any) {
    console.error('[SnapScan] Verify error:', error)
    return { paid: false, status: 'error' }
  }
}

/**
 * Generate a simple SVG-based QR code for local testing
 * In production, use a real QR library or API
 */
export function generateLocalQRCode(data: string): string {
  // This is a placeholder for local development
  // In production, use qrcode library: npm install qrcode
  // Then use: import QRCode from 'qrcode'; QRCode.toDataURL(data)
  
  // For now, return a data URL of a simple placeholder
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect fill='%23fff' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-size='12' fill='%23000'%3E%3Ctspan x='50%25' dy='.3em'%3ESnapScan QR%3C/tspan%3E%3Ctspan x='50%25' dy='.3em'%3E${data.substring(0, 15)}...%3C/tspan%3E%3C/text%3E%3C/svg%3E`
}
