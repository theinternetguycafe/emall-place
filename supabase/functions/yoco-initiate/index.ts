
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


function validateYocoSecretKey(secretKey: string): void {
  // Validate that we have a secret key (must start with sk_)
  if (!secretKey) {
    console.error("[yoco-initiate] ERROR: YOCO_SECRET_KEY not configured");
    throw new Error("YOCO_SECRET_KEY not configured");
  }
  
  if (!secretKey.startsWith("sk_")) {
    console.error("[yoco-initiate] ERROR: YOCO_SECRET_KEY does not start with 'sk_' - appears to be public key");
    throw new Error("YOCO_SECRET_KEY invalid format - must be secret key");
  }
}


Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[yoco-initiate] Function invoked - method:", req.method);
    
    // DEBUG: Log environment at start
    const yocoMode = Deno.env.get("YOCO_MODE") || "sandbox";
    console.log("[yoco-initiate] DEBUG YOCO_MODE:", yocoMode);
    
    // Read Authorization header
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      console.log("[yoco-initiate] Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    console.log("[yoco-initiate] Verifying user token with Supabase...");
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.log("[yoco-initiate] User verification failed:", error?.message || "No user");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[yoco-initiate] User verified:", user.id);

    // Continue payment logic
    const { orderId, amount, description, buyerEmail, buyerName, metadata } = await req.json();
    if (!orderId || !amount || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: orderId, amount, description" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const yocoSecretKey = (Deno.env.get("YOCO_SECRET_KEY") || "").trim();
    console.log("[yoco-initiate] DEBUG YOCO_SECRET_KEY - prefix:", yocoSecretKey.slice(0, 8), "length:", yocoSecretKey.length);
    
    // Validate Yoco secret key
    validateYocoSecretKey(yocoSecretKey);

    const siteUrl = Deno.env.get("SITE_URL") || "https://example.com";

    // Use service role key for DB access only (not for user verification)
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey, { auth: { persistSession: false } });

    // Load order & ensure it belongs to caller
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, buyer_id, total_amount, status")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (order.buyer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden: order does not belong to this user" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify amount matches order
    const expectedAmount = Math.round(Number(order.total_amount) * 100);
    if (Number(amount) !== expectedAmount) {
      return new Response(
        JSON.stringify({ error: "Amount mismatch", expectedAmount, providedAmount: amount }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const successUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=success`;
    const cancelUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=cancelled`;
    const failureUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=failed`;

    // Build Yoco Checkouts API payload
    const checkoutPayload = {
      amount: expectedAmount, // Amount in cents
      currency: "ZAR",
      externalId: orderId,
      successUrl,
      cancelUrl,
      failureUrl,
      metadata: {
        orderId,
        buyerEmail: buyerEmail || user.email || "customer@example.com",
        buyerName: buyerName || "Customer",
        ...metadata,
      },
    };

    console.log("[yoco-initiate] Creating Yoco checkout with payload:", JSON.stringify(checkoutPayload, null, 2));

    // Call Yoco Checkouts API
    const yocoResp = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${yocoSecretKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
    });

    const yocoJson = await yocoResp.json();
    if (!yocoResp.ok) {
      console.error("[yoco-initiate] Yoco API error:", {
        status: yocoResp.status,
        statusText: yocoResp.statusText,
        message: yocoJson?.message || "Unknown error",
        error: yocoJson?.error,
      });
      
      // Provide helpful error message for 401
      let errorDetail = yocoJson?.message || "Yoco API error";
      if (yocoResp.status === 401 || yocoResp.status === 403) {
        errorDetail = "Invalid Yoco credentials - check YOCO_SECRET_KEY is correct";
      }
      
      return new Response(
        JSON.stringify({ error: errorDetail, details: yocoJson }),
        { status: yocoResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[yoco-initiate] Checkout created successfully:", yocoJson.id);

    // Store checkout ID immediately via upsert to ensure webhook correlation is deterministic
    try {
      const { error: upsertErr } = await admin
        .from("payments")
        .upsert({
          order_id: orderId,
          payment_method: "yoco",
          provider_reference: yocoJson.id,
          status: "pending",
          amount: order.total_amount,
        }, { onConflict: "order_id" });

      if (upsertErr) {
        console.error("[yoco-initiate] Warning: Failed to upsert payment record:", upsertErr);
        // Non-blocking - continue with redirect even if DB fails
      } else {
        console.log("[yoco-initiate] Payment record upserted with checkoutId:", yocoJson.id, "for order:", orderId);
      }
    } catch (paymentDbErr) {
      console.error("[yoco-initiate] Failed to record payment (non-blocking):", paymentDbErr);
    }

    // Extract redirect URL from response
    const redirectUrl = yocoJson?.redirectUrl;
    if (!redirectUrl) {
      console.error("[yoco-initiate] Missing redirectUrl in Yoco response", yocoJson);
      return new Response(
        JSON.stringify({ error: "Invalid checkout response", details: "No redirectUrl provided by Yoco" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl,
        paymentId: yocoJson.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[yoco-initiate] Error:", String(e?.message || e));
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(e?.message || e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});