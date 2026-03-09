// supabase/functions/snapscan-initiate/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // ✅ CORS preflight FIRST (preflight has no auth header)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ JWT verification AFTER OPTIONS
    const authHeader = req.headers.get('authorization') || ''
    const jwt = authHeader.replace('Bearer ', '').trim()

    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase keys not configured (SUPABASE_URL / ANON / SERVICE_ROLE)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Use ANON client to validate the user JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Use SERVICE ROLE client for DB ops
    const admin = createClient(supabaseUrl, serviceKey)

    const { orderId, amount, description, metadata } = await req.json()

    if (!orderId || !amount || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: orderId, amount, description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const snapScanMerchantId = Deno.env.get('SNAPSCAN_MERCHANT_ID') || ''
    const snapScanApiKey = Deno.env.get('SNAPSCAN_API_KEY') || ''

    if (!snapScanMerchantId || !snapScanApiKey) {
      return new Response(
        JSON.stringify({ error: 'SnapScan not configured (SNAPSCAN_MERCHANT_ID / SNAPSCAN_API_KEY)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Load order + enforce ownership
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, buyer_id, total_amount, status, payment_status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (order.buyer_id !== userData.user.id) {
      return new Response(
        JSON.stringify({ error: 'Not allowed to pay for this order' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Amount validation
    const expectedAmount = Math.round(Number(order.total_amount) * 100)
    if (amount !== expectedAmount) {
      return new Response(
        JSON.stringify({ error: 'Amount mismatch', expected: expectedAmount, provided: amount }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Generate unique transaction reference
    const transactionId = `SNAP-${orderId}-${Date.now()}`

    // ✅ QR data payload (your simplified format)
    const qrData = `${snapScanMerchantId}|${amount}|${transactionId}|${description}`

    // ✅ (Optional but recommended) Update order flags here using your VALID enums
    // Your DB enums:
    // status: pending | processing | completed | cancelled
    // payment_status: unpaid | paid | failed
    //
    // If you want to mark "awaiting payment" without adding new enums:
    // keep status='pending' and payment_status='unpaid'
    await admin
      .from('orders')
      .update({ status: 'pending', payment_status: 'unpaid' })
      .eq('id', orderId)

    // ✅ Store payment record if you have payments table
    // If you don't have this table yet, comment this out.
    const { error: paymentError } = await admin.from('payments').insert({
      order_id: orderId,
      payment_method: 'snapscan',
      provider_reference: transactionId,
      status: 'pending',
      amount: Number(order.total_amount),
      metadata: {
        merchantId: snapScanMerchantId,
        qrData,
        transactionId,
        requiresPolling: true,
        ...(metadata || {}),
      },
    })

    if (paymentError) {
      console.error('[SnapScan] Failed to store payment record:', paymentError)
      // We don't fail the whole request for this; QR can still work
    }

    return new Response(
      JSON.stringify({
        success: true,
        qrCode: qrData, // frontend renders with qrcode library
        transactionId,
        amount,
        description,
        message: 'SnapScan QR code generated',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[SnapScan] Exception:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})