import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('[Yoco Webhook] Received webhook:', JSON.stringify(body, null, 2))

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Yoco webhook contains event details
    const { data: paymentData, id: webhookId, type, createdAt } = body

    if (!paymentData || !type) {
      console.error('[Yoco Webhook] Invalid webhook structure')
      return new Response(
        JSON.stringify({ error: 'Invalid webhook' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('[Yoco Webhook] Event type:', type)
    console.log('[Yoco Webhook] Payment data:', paymentData)

    // Extract order ID from metadata
    const orderId = paymentData.metadata?.orderId
    if (!orderId) {
      console.error('[Yoco Webhook] No orderId in metadata')
      return new Response(
        JSON.stringify({ error: 'No orderId in metadata' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different Yoco event types
    let paymentStatus = 'pending'
    let orderStatus = 'pending'

    switch (type) {
      case 'links.paid':
      case 'payment.completed':
        paymentStatus = 'completed'
        orderStatus = 'processing'
        console.log('[Yoco Webhook] Payment completed for order:', orderId)
        break

      case 'links.failed':
      case 'payment.failed':
        paymentStatus = 'failed'
        orderStatus = 'pending'
        console.log('[Yoco Webhook] Payment failed for order:', orderId)
        break

      case 'links.cancelled':
      case 'payment.cancelled':
        paymentStatus = 'cancelled'
        orderStatus = 'pending'
        console.log('[Yoco Webhook] Payment cancelled for order:', orderId)
        break

      default:
        console.log('[Yoco Webhook] Unknown event type, treating as processing')
    }

    // Update payment record
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        provider_reference: paymentData.id || webhookId,
        metadata: {
          webhookEvent: type,
          webhookId: webhookId,
          yocoPaymentData: paymentData,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId)

    if (paymentUpdateError) {
      console.error('[Yoco Webhook] Failed to update payment record:', paymentUpdateError)
    }

    // Update order status only if payment is completed
    if (paymentStatus === 'completed') {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: orderStatus,
        })
        .eq('id', orderId)

      if (orderUpdateError) {
        console.error('[Yoco Webhook] Failed to update order:', orderUpdateError)
      } else {
        console.log('[Yoco Webhook] Order updated successfully:', orderId)
      }
    } else if (paymentStatus === 'failed' || paymentStatus === 'cancelled') {
      const { error: orderUpdateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'failed',
          status: 'pending',
        })
        .eq('id', orderId)

      if (orderUpdateError) {
        console.error('[Yoco Webhook] Failed to update failed order:', orderUpdateError)
      }
    }

    console.log('[Yoco Webhook] Webhook processed successfully for order:', orderId)

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[Yoco Webhook] Exception:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
