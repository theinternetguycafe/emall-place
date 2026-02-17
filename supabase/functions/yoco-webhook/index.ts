import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  // Webhook is server-to-server, no CORS needed
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    
    console.log("[yoco-webhook] Received webhook:", JSON.stringify(body, null, 2));

    // Verify webhook signature
    const signature = req.headers.get("x-yoco-signature") || "";
    const timestamp = req.headers.get("x-yoco-timestamp") || "";
    const webhookSecret = Deno.env.get("YOCO_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.error("[yoco-webhook] ERROR: YOCO_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500 }
      );
    }

    if (!signature) {
      console.error("[yoco-webhook] Missing x-yoco-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 401 }
      );
    }

    console.log("[yoco-webhook] Signature verification - received sig length:", signature.length, "first 6 chars:", signature.substring(0, 6));

    // Verify signature: HMAC-SHA256(secret, timestamp + body)
    // Try both hex and base64 formats
    const messageToSign = timestamp + bodyText;
    const expectedSigHex = await hmacSha256Hex(webhookSecret, messageToSign);
    const expectedSigBase64 = await hmacSha256Base64(webhookSecret, messageToSign);

    const isValidSignature = constantTimeCompare(signature, expectedSigHex) || constantTimeCompare(signature, expectedSigBase64);

    if (!isValidSignature) {
      console.error("[yoco-webhook] Invalid signature - expected hex:", expectedSigHex.substring(0, 10), "or base64:", expectedSigBase64.substring(0, 10));
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401 }
      );
    }

    console.log("[yoco-webhook] Signature verified successfully");

    // Extract webhook data
    const data = body.data || body;
    const checkoutId = data.id; // Primary checkout ID from response
    const checkoutIdFromMetadata = data.metadata?.checkoutId; // Backup from metadata
    const externalId = data.externalId; // Order ID from our system
    const statusRaw = data.status;
    const statusLower = statusRaw ? String(statusRaw).toLowerCase() : "";

    console.log("[yoco-webhook] Processing webhook - status:", statusLower, "checkoutId:", checkoutId, "checkoutIdFromMetadata:", checkoutIdFromMetadata, "externalId:", externalId);

    // Validate required fields
    if (!externalId) {
      console.error("[yoco-webhook] Missing externalId in webhook - cannot process");
      return new Response(
        JSON.stringify({ success: true, message: "Webhook processed" }),
        { status: 200 }
      );
    }

    // Verify checkoutId is available (from data.id or metadata)
    const finalCheckoutId = checkoutId || checkoutIdFromMetadata;
    if (!finalCheckoutId) {
      console.error("[yoco-webhook] Missing checkout ID in webhook - cannot verify payment");
      return new Response(
        JSON.stringify({ success: true, message: "Webhook processed" }),
        { status: 200 }
      );
    }

    // Initialize database client for filtering
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceKey,
      { auth: { persistSession: false } }
    );

    // SAFE FILTERING: Verify order exists and handle payment record gracefully
    try {
      // First, check if the order exists (this is our source of truth)
      const { data: order, error: orderErr } = await admin
        .from("orders")
        .select("id")
        .eq("id", externalId)
        .maybeSingle();

      if (orderErr || !order) {
        console.warn("[yoco-webhook] Order not found:", externalId, "- rejecting webhook");
        return new Response(
          JSON.stringify({ success: true, message: "Webhook processed" }),
          { status: 200 }
        );
      }

      console.log("[yoco-webhook] Order verified:", externalId);

      // Now check if a payment record exists for this order
      const { data: existingPayment, error: fetchErr } = await admin
        .from("payments")
        .select("id, provider_reference, order_id, status")
        .eq("order_id", externalId)
        .maybeSingle();

      if (fetchErr) {
        console.error("[yoco-webhook] Error fetching payment record:", fetchErr);
        return new Response(
          JSON.stringify({ success: true, message: "Webhook processed" }),
          { status: 200 }
        );
      }

      // If no payment row exists, create it
      if (!existingPayment) {
        console.log("[yoco-webhook] Payment row missing, creating one for order:", externalId);
        
        const { error: insertErr } = await admin
          .from("payments")
          .insert({
            order_id: externalId,
            payment_method: "yoco",
            provider_reference: finalCheckoutId,
            status: isPaid ? "paid" : isFailed ? "failed" : isCancelled ? "cancelled" : "pending",
            amount: 0, // Will be fetched from order if needed
            metadata: { created_by: "webhook" },
          });

        if (insertErr) {
          console.error("[yoco-webhook] Error creating payment record:", insertErr);
          return new Response(
            JSON.stringify({ success: true, message: "Webhook processed" }),
            { status: 200 }
          );
        }

        console.log("[yoco-webhook] Payment row created, continuing with status update");
      } else if (existingPayment.provider_reference && existingPayment.provider_reference !== finalCheckoutId) {
        // CheckoutId mismatch - log loudly but return 200 to prevent retry spam
        console.error("[yoco-webhook] CheckoutId mismatch - potential fraud or double-webhook", {
          finalCheckoutId,
          existing: existingPayment.provider_reference,
          externalId,
          incomingStatus: statusLower,
        });
        
        return new Response(
          JSON.stringify({ success: true, ignored: true, reason: "checkoutId_mismatch" }),
          { status: 200 }
        );
      } else {
        console.log("[yoco-webhook] Checkout ID verified - matches payment record for order:", externalId);
      }
    } catch (filterErr) {
      console.error("[yoco-webhook] Error in payment filtering logic:", filterErr);
      return new Response(
        JSON.stringify({ success: true, message: "Webhook processed" }),
        { status: 200 }
      );
    }

    // Check payment status
    const isPaid = ["completed", "succeeded", "success"].includes(statusLower);
    const isFailed = ["failed"].includes(statusLower);
    const isCancelled = ["cancelled", "canceled"].includes(statusLower);

    if (isPaid) {
      console.log("[yoco-webhook] Processing successful payment for order:", externalId);

      try {
        // Update payments table - only update status and provider_reference
        const { error: paymentErr } = await admin
          .from("payments")
          .update({
            status: "paid",
            provider_reference: finalCheckoutId,
          })
          .eq("order_id", externalId);

        if (paymentErr) {
          console.error("[yoco-webhook] Error updating payments:", paymentErr);
        } else {
          console.log("[yoco-webhook] Payment record updated for order:", externalId, "checkoutId:", finalCheckoutId);
        }

        // Update orders table
        const { error: orderErr } = await admin
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
          })
          .eq("id", externalId);

        if (orderErr) {
          console.error("[yoco-webhook] Error updating orders:", orderErr);
        } else {
          console.log("[yoco-webhook] Order status updated to processing:", externalId);
        }
      } catch (dbErr) {
        console.error("[yoco-webhook] Database error:", dbErr);
        // Still return 200 to prevent Yoco retry loop
      }
    } else if (isFailed || isCancelled) {
      console.log("[yoco-webhook] Processing failed/cancelled payment - status:", statusLower, "order:", externalId);

      try {
        const paymentStatus = isFailed ? "failed" : "cancelled";

        // Update payments table - only update status and provider_reference
        const { error: paymentErr } = await admin
          .from("payments")
          .update({
            status: paymentStatus,
            provider_reference: finalCheckoutId,
          })
          .eq("order_id", externalId);

        if (paymentErr) {
          console.error("[yoco-webhook] Error updating payment status:", paymentErr);
        } else {
          console.log("[yoco-webhook] Payment marked as", paymentStatus, "for order:", externalId);
        }

        // Update orders table
        const { error: orderErr } = await admin
          .from("orders")
          .update({
            payment_status: paymentStatus,
            status: "cancelled",
          })
          .eq("id", externalId);

        if (orderErr) {
          console.error("[yoco-webhook] Error updating order status:", orderErr);
        } else {
          console.log("[yoco-webhook] Order payment status and status updated to cancelled:", externalId);
        }
      } catch (dbErr) {
        console.error("[yoco-webhook] Database error:", dbErr);
      }
    } else {
      console.log("[yoco-webhook] Unknown payment status:", statusLower, "- ignoring webhook for order:", externalId);
    }

    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ success: true, message: "Webhook received" }),
      { status: 200 }
    );
  } catch (error) {
    console.error("[yoco-webhook] Error:", String(error?.message || error));
    // Return 200 even on error to prevent webhook retry loops
    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      { status: 200 }
    );
  }
});

// HMAC-SHA256 returning hex string
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const signatureArray = new Uint8Array(signature);
  
  // Return as hex string
  return Array.from(signatureArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// HMAC-SHA256 returning base64 string
async function hmacSha256Base64(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  
  // Convert to base64
  const signatureArray = new Uint8Array(signature);
  const binaryString = String.fromCharCode(...signatureArray);
  return btoa(binaryString);
}

// Timing-safe string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
