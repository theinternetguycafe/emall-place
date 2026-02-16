
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};


function getYocoApiUrl(): string {
  const secretKey = Deno.env.get("YOCO_SECRET_KEY") || "";
  if (!secretKey || secretKey.includes("test") || secretKey.includes("sk_test")) {
    return "https://api.sandbox.yoco.com/v1";
  }
  return "https://api.yoco.com/v1";
}


Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[yoco-initiate] Function invoked - method:", req.method);
    
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

    const yocoSecretKey = Deno.env.get("YOCO_SECRET_KEY");
    if (!yocoSecretKey) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured (YOCO_SECRET_KEY missing)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const failureUrl = `${siteUrl}/#/checkout?order_id=${orderId}&status=failed`;
    const yocoApiUrl = getYocoApiUrl();

    const paymentLinkBody = {
      amount,
      customer: {
        email: buyerEmail || user.email || "customer@example.com",
        name: buyerName || "Customer",
      },
      description,
      redirectUrl: { success: successUrl, failure: failureUrl },
      metadata: { orderId, ...metadata },
    };

    const yocoResp = await fetch(`${yocoApiUrl}/links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yocoSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentLinkBody),
    });

    const yocoJson = await yocoResp.json();
    if (!yocoResp.ok) {
      console.log("[yoco-initiate] Yoco API error:", yocoJson?.message || "Unknown error");
      return new Response(
        JSON.stringify({ error: yocoJson?.message || "Yoco API error", details: yocoJson }),
        { status: yocoResp.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[yoco-initiate] Payment link created successfully:", yocoJson.id);

    // Determine checkout URL
    const checkoutUrl = yocoJson?.redirectUrl || yocoJson?.url;
    if (!checkoutUrl) {
      console.error("[yoco-initiate] Missing checkout URL in Yoco response", yocoJson);
      return new Response(
        JSON.stringify({ error: "Invalid payment link response", details: "No checkout URL provided by Yoco" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Best-effort payment record insertion
    try {
      await admin.from("payments").insert({
        order_id: orderId,
        payment_method: "yoco",
        provider_reference: yocoJson.id || yocoJson.reference || null,
        status: "pending",
        amount: order.total_amount,
        metadata: { yocoResponse: yocoJson },
      });
      console.log("[yoco-initiate] Payment record created for order:", orderId);
    } catch (paymentDbErr) {
      console.error("[yoco-initiate] Failed to record payment (non-blocking):", paymentDbErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        redirectUrl: checkoutUrl,
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