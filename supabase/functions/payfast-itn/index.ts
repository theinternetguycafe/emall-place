import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS handled for debug, though ITN is POST from PayFast
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const payload: Record<string, string> = {}
    formData.forEach((value, key) => {
      payload[key] = value.toString()
    })

    console.log('[PayFast ITN] Received payload:', payload)

    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID') || '10000100'
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') || 'jt7nu683m6u3p'

    // 1. Verify Merchant ID
    if (payload['merchant_id'] !== merchantId) {
      console.error('[PayFast ITN] Merchant ID mismatch')
      return new Response('Invalid Merchant ID', { status: 400 })
    }

    // 2. Verify Signature - build signature from sorted keys (excluding signature)
    const keys = Object.keys(payload).filter(key => key !== 'signature').sort()
    const signatureString = keys
      .filter((k) => payload[k] !== undefined && payload[k] !== '')
      .map((k) => `${k}=${encodeURIComponent(payload[k]).replace(/%20/g, '+')}`)
      .join('&') + (passphrase ? `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}` : '')

    const calculatedSignature = createHash('md5').update(signatureString).digest('hex')

    if (calculatedSignature !== (payload['signature'] || '')) {
      console.error('[PayFast ITN] Signature mismatch', {
        received: payload['signature'],
        calculated: calculatedSignature,
        signatureString
      })
      return new Response('Invalid signature', { status: 400 })
    }

    // 3. Initialize Supabase Client (using SERVICE_ROLE_KEY instead of SUPABASE_SERVICE_ROLE_KEY)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const orderId = payload['m_payment_id']
    const paymentStatus = payload['payment_status']
    const amountGross = parseFloat(payload['amount_gross'])

    // 4. Verify Order and Amount
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[PayFast ITN] Order not found:', orderId)
      return new Response('Order not found', { status: 404 })
    }

    if (Math.abs(order.total_amount - amountGross) > 0.01) {
      console.error('[PayFast ITN] Amount mismatch:', { order: order.total_amount, gross: amountGross })
      return new Response('Amount mismatch', { status: 400 })
    }

    // 5. Update Order Status
    if (paymentStatus === 'COMPLETE') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'processing'
        })
        .eq('id', orderId)

      if (updateError) {
        console.error('[PayFast ITN] Error updating order:', updateError)
        return new Response('Update failed', { status: 500 })
      }
      console.log('[PayFast ITN] Order marked as PAID:', orderId)
    } else if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
      await supabase
        .from('orders')
        .update({
          payment_status: 'failed'
        })
        .eq('id', orderId)
      console.log('[PayFast ITN] Order marked as FAILED:', orderId)
    }

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('[PayFast ITN] Unexpected error:', error)
    return new Response(error.message, { status: 500 })
  }
})
