import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * SnapScan Webhook Handler
 * Receives payment confirmation from SnapScan when customer completes QR scan payment
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[SnapScan Webhook] Received webhook:', JSON.stringify(body, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse SnapScan webhook payload
    // SnapScan typically sends: { reference, amount, status, timestamp }
    const { reference: transactionId, amount, status: paymentStatus } = body

    if (!transactionId) {
      console.error('[SnapScan Webhook] No reference in payload')
      return new Response(
        JSON.stringify({ error: 'No reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[SnapScan Webhook] Processing:', { transactionId, paymentStatus })

    // Extract orderId from transaction reference (SNAP-{orderId}-{timestamp})
    const parts = transactionId.split('-')
    let orderId = ''
    if (parts.length >= 2 && parts[0] === 'SNAP') {
      orderId = parts[1]
    }

    if (!orderId) {
      console.error('[SnapScan Webhook] Could not extract orderId from:', transactionId)
      return new Response(
        JSON.stringify({ error: 'Invalid transaction reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Map SnapScan status to our payment status
    let mappedStatus = 'pending'
    let orderStatus = 'pending_payment'

    switch (paymentStatus?.toLowerCase()) {
      case 'completed':
      case 'success':
      case 'paid':
        mappedStatus = 'completed'
        orderStatus = 'processing'
        console.log('[SnapScan Webhook] Payment completed for order:', orderId)
        break

      case 'failed':
      case 'declined':
        mappedStatus = 'failed'
        orderStatus = 'pending'
        console.log('[SnapScan Webhook] Payment failed for order:', orderId)
        break

      case 'cancelled':
        mappedStatus = 'cancelled'
        orderStatus = 'pending'
        console.log('[SnapScan Webhook] Payment cancelled for order:', orderId)
        break

      default:
        console.log('[SnapScan Webhook] Unknown status:', paymentStatus)
    }

    // Update payment record
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: mappedStatus,
        metadata: {
          snapScanStatus: paymentStatus,
          webhookReceived: new Date().toISOString(),
          amount: amount,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('provider_reference', transactionId)

    if (paymentUpdateError) {
      console.error('[SnapScan Webhook] Failed to update payment:', paymentUpdateError)
    }

    // Update order if payment completed
    if (mappedStatus === 'completed') {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: orderStatus,
        })
        .eq('id', orderId)

      if (orderUpdateError) {
        console.error('[SnapScan Webhook] Failed to update order:', orderUpdateError)
      } else {
        console.log('[SnapScan Webhook] Order updated:', orderId)
      }
    } else if (mappedStatus === 'failed' || mappedStatus === 'cancelled') {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'pending',
        })
        .eq('id', orderId)

      if (orderUpdateError) {
        console.error('[SnapScan Webhook] Failed to update failed order:', orderUpdateError)
      }
    }

    console.log('[SnapScan Webhook] Webhook processed successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[SnapScan Webhook] Exception:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
