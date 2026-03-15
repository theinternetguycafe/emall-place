import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_KEY') || ''

serve(async (req: Request) => {
  try {
    // Only accept POST and GET requests
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get current time in ISO format
    const now = new Date().toISOString()

    // Update all products with expired sales
    const { data, error } = await supabase
      .from('products')
      .update({ is_on_sale: false })
      .lt('sale_ends_at', now)
      .eq('is_on_sale', true)
      .select()

    if (error) {
      console.error('Error expiring sales:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const expiredCount = data?.length || 0
    const message = `Successfully expired ${expiredCount} sale(s)`

    console.log(message)
    return new Response(
      JSON.stringify({ 
        success: true, 
        message,
        expiredCount,
        timestamp: now
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (err) {
    console.error('Error in auto-expire-sales function:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
