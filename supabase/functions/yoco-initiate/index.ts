import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getYocoApiUrl(): string {
  // Check if we have test keys (sandbox) or production keys
  const secretKey = Deno.env.get('YOCO_SECRET_KEY') || ''
  if (!secretKey || secretKey.includes('test') || secretKey.includes('sk_test')) {
    return 'https://api.sandbox.yoco.com/v1'
  }
  return 'https://api.yoco.com/v1'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, amount, description, buyerEmail, buyerName, metadata } = await req.json()

    // Validate required fields
    if (!orderId || !amount || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: orderId, amount, description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY')
    if (!yocoSecretKey) {
      console.error('[Yoco] YOCO_SECRET_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const siteUrl = Deno.env.get('SITE_URL') || 'https://example.com'

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get full order details for additional validation
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, total_amount, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[Yoco] Order not found:', orderError)
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify amount matches order
    const expectedAmount = Math.round(order.total_amount * 100)
    if (amount !== expectedAmount) {
      console.error('[Yoco] Amount mismatch:', { provided: amount, expected: expectedAmount })
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get site URL for redirects
    const successUrl = `${siteUrl}/#/checkout-success?order_id=${orderId}`
    const failureUrl = `${siteUrl}/#/checkout-cancelled?order_id=${orderId}`

    // Prepare Yoco payment link request
    const yocoApiUrl = getYocoApiUrl()
    const paymentLinkRequestBody = {
      amount: amount, // in cents
      customer: {
        email: buyerEmail || 'customer@example.com',
        name: buyerName || 'Customer',
      },
      description: description,
      redirectUrl: {
        success: successUrl,
        failure: failureUrl,
      },
      metadata: {
        orderId: orderId,
        ...metadata,
      },
    }

    console.log('[Yoco] Creating payment link with:', {
      amount: amount,
      orderId: orderId,
      apiUrl: yocoApiUrl,
    })

    // Call Yoco API to create payment link
    const yocoResponse = await fetch(`${yocoApiUrl}/links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentLinkRequestBody),
    })

    const yocoData = await yocoResponse.json()

    if (!yocoResponse.ok) {
      console.error('[Yoco] API error:', yocoData)
      return new Response(
        JSON.stringify({ 
          error: yocoData.message || 'Failed to create payment link',
          details: yocoData 
        }),
        { status: yocoResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store payment record in database
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        payment_method: 'yoco',
        provider_reference: yocoData.id || yocoData.reference,
        status: 'pending',
        amount: order.total_amount,
        metadata: {
          paymentLinkId: yocoData.id,
          yocoResponse: yocoData,
        },
      })

    if (paymentError) {
      console.error('[Yoco] Failed to store payment record:', paymentError)
    }

    console.log('[Yoco] Payment link created successfully:', yocoData.redirectUrl)

    return new Response(
      JSON.stringify({
        success: true,
        paymentLink: yocoData.redirectUrl,
        paymentId: yocoData.id,
        message: 'Payment link created successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[Yoco] Exception:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
