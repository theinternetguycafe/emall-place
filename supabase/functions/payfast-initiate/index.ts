import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createHash } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, amount, itemName, buyerEmail } = await req.json()

    if (!orderId || !amount || !itemName) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const merchantId = Deno.env.get('PAYFAST_MERCHANT_ID') || '10000100'
    const merchantKey = Deno.env.get('PAYFAST_MERCHANT_KEY') || '46f09bd501ee1'
    const passphrase = Deno.env.get('PAYFAST_PASSPHRASE') || 'jt7nu683m6u3p'
    const isSandbox = Deno.env.get('PAYFAST_SANDBOX') !== 'false'
    const baseUrl = isSandbox ? 'https://sandbox.payfast.co.za' : 'https://www.payfast.co.za'
    
    // Use the site's base URL for redirects
    const siteUrl = Deno.env.get('SITE_URL') || 'https://theinternetguycafe.github.io/emall-place'
    
    // HashRouter uses #, so we need to be careful with URLs
    // PayFast redirects to return_url, and we'll append order_id and status
    const returnUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=success`
    const cancelUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=cancelled`
    
    // notify_url MUST be a real URL that PayFast can call.
    // Prefer the public Functions subdomain (functions.supabase.co) so PayFast can reach it.
    const supabaseUrlEnv = Deno.env.get('SUPABASE_URL') || ''
    let notifyUrl = ''
    try {
      const parsed = new URL(supabaseUrlEnv)
      const host = parsed.host.replace('.supabase.co', '.functions.supabase.co')
      notifyUrl = `https://${host}/payfast-itn`
    } catch (_e) {
      // fallback to the v1 functions path if parsing fails
      notifyUrl = `${supabaseUrlEnv.replace(/\/$/, '')}/functions/v1/payfast-itn`
    }

    const data: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      m_payment_id: orderId,
      amount: amount.toFixed(2),
      item_name: itemName.substring(0, 100),
    }

    if (buyerEmail) {
      data.email_address = buyerEmail
    }

    // Generate signature using alphabetical key order (per PayFast recommendations)
    const keys = Object.keys(data).sort()
    const signatureString = keys
      .filter((k) => data[k] !== undefined && data[k] !== '')
      .map((k) => `${k}=${encodeURIComponent(data[k]).replace(/%20/g, '+')}`)
      .join('&') + (passphrase ? `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}` : '')

    const signature = createHash('md5').update(signatureString).digest('hex')

    const formFields = {
      ...data,
      signature
    }

    const redirectUrl = `${baseUrl}/eng/process?${new URLSearchParams(formFields).toString()}`

    return new Response(
      JSON.stringify({ redirectUrl, formFields }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
