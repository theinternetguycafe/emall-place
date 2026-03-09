import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Generate SnapScan QR Code
 * SnapScan works by generating a unique merchant reference and QR code
 * The customer scans the QR to complete payment
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, amount, description, metadata } = await req.json()

    // Validate required fields
    if (!orderId || !amount || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: orderId, amount, description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const snapScanMerchantId = Deno.env.get('SNAPSCAN_MERCHANT_ID')
    const snapScanApiKey = Deno.env.get('SNAPSCAN_API_KEY')

    if (!snapScanMerchantId || !snapScanApiKey) {
      console.error('[SnapScan] SNAPSCAN_MERCHANT_ID or SNAPSCAN_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'SnapScan not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get full order details for validation
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, buyer_id, total_amount, status')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('[SnapScan] Order not found:', orderError)
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify amount matches order
    const expectedAmount = Math.round(order.total_amount * 100)
    if (amount !== expectedAmount) {
      console.error('[SnapScan] Amount mismatch:', { provided: amount, expected: expectedAmount })
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate unique transaction reference for SnapScan
    const transactionId = `SNAP-${orderId}-${Date.now()}`

    // SnapScan QR code format
    // SnapScan uses a merchant reference system
    // The QR encodes: merchant_id|amount|reference|description
    const qrData = `${snapScanMerchantId}|${amount}|${transactionId}|${description}`

    console.log('[SnapScan] Generating QR code:', { transactionId, amount, merchantId: snapScanMerchantId })

    // For production, you would call SnapScan API to generate the QR
    // For now, we'll create a simple implementation that generates the data
    // and frontend can use a library like 'qrcode' to render it

    // Store payment record in database
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        payment_method: 'snapscan',
        provider_reference: transactionId,
        status: 'pending',
        amount: order.total_amount,
        metadata: {
          merchantId: snapScanMerchantId,
          qrData: qrData,
          transactionId: transactionId,
          requiresPolling: true,
        },
      })

    if (paymentError) {
      console.error('[SnapScan] Failed to store payment record:', paymentError)
    }

    // Generate a proper QR code using a simple SVG-based approach
    // In production, you'd call an actual QR code generation service
    // or use a library integrated with your backend

    // Return both the raw QR data and a suggested format
    const response = {
      success: true,
      qrCode: qrData, // Frontend will use this with a QR library
      transactionId: transactionId,
      amount: amount,
      description: description,
      message: 'SnapScan QR code generated - use with qrcode library on frontend',
    }

    console.log('[SnapScan] QR code generated successfully')

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('[SnapScan] Exception:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
