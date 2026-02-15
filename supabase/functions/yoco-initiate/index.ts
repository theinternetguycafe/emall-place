import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function getYocoApiUrl(): string {
  const secretKey = Deno.env.get('YOCO_SECRET_KEY') || ''
  if (!secretKey || secretKey.includes('test') || secretKey.includes('sk_test')) {
    return 'https://api.sandbox.yoco.com/v1'
  }
  return 'https://api.yoco.com/v1'
}

serve(async (req) => {
  // ✅ CORS preflight first
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ Require auth header
    const authHeader = req.headers.get('authorization') || ''
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

    if (!jwt) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('ANON_KEY') || '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // ✅ Validate user using ANON client + user JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', details: userErr?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // ✅ Service client for DB access
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { orderId, amount, description, buyerEmail, buyerName, metadata } = await req.json()

    if (!orderId || !amount || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: orderId, amount, description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY')
    if (!yocoSecretKey) {
      return new Response(
        JSON.stringify({ error: 'Payment service not configured (YOCO_SECRET_KEY missing)' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const siteUrl = Deno.env.get('SITE_URL') || 'https://example.com'

    // ✅ Load order & ensure it belongs to caller
    const { data: order, error: orderErr } = await admin
      .from('orders')
      .select('id, buyer_id, total_amount, status')
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (order.buyer_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: order does not belong to this user' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Verify amount matches order
    const expectedAmount = Math.round(Number(order.total_amount) * 100)
    if (Number(amount) !== expectedAmount) {
      return new Response(
        JSON.stringify({ error: 'Amount mismatch', expectedAmount, providedAmount: amount }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const successUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=success`
    const failureUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=cancelled`

    const yocoApiUrl = getYocoApiUrl()

    const paymentLinkBody = {
      amount,
      customer: {
        email: buyerEmail || userData.user.email || 'customer@example.com',
        name: buyerName || 'Customer',
      },
      description,
      redirectUrl: { success: successUrl, failure: failureUrl },
      metadata: { orderId, ...metadata },
    }

    const yocoResp = await fetch(`${yocoApiUrl}/links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentLinkBody),
    })

    const yocoJson = await yocoResp.json()

    if (!yocoResp.ok) {
      return new Response(
        JSON.stringify({ error: yocoJson?.message || 'Yoco API error', details: yocoJson }),
        { status: yocoResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ Upsert payment record
    await admin.from('payments').insert({
      order_id: orderId,
      payment_method: 'yoco',
      provider_reference: yocoJson.id || yocoJson.reference || null,
      status: 'pending',
      amount: order.total_amount,
      metadata: { yocoResponse: yocoJson },
    })

    return new Response(
      JSON.stringify({
        success: true,
        paymentLink: yocoJson.redirectUrl,
        paymentId: yocoJson.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})