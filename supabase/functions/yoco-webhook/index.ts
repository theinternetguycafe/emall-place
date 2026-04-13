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
        .select("id, payment_reference, order_id, status")
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
            provider: "yoco",
            payment_reference: finalCheckoutId,
            status: isPaid ? "completed" : isFailed ? "failed" : isCancelled ? "failed" : "pending",
            amount: 0,
            currency: "ZAR",
          });

        if (insertErr) {
          console.error("[yoco-webhook] Error creating payment record:", insertErr);
          return new Response(
            JSON.stringify({ success: true, message: "Webhook processed" }),
            { status: 200 }
          );
        }

        console.log("[yoco-webhook] Payment row created, continuing with status update");
      } else if (existingPayment.payment_reference && existingPayment.payment_reference !== finalCheckoutId) {
        // CheckoutId mismatch
        console.error("[yoco-webhook] CheckoutId mismatch - potential fraud or double-webhook", {
          finalCheckoutId,
          existing: existingPayment.payment_reference,
          externalId,
          incomingStatus: statusLower,
        });

        return new Response(
          JSON.stringify({ success: true, ignored: true, reason: "checkoutId_mismatch" }),
          { status: 200 }
        );
      } else {
        console.log("[yoco-webhook] Checkout ID verified for order:", externalId);
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
        // Update payments table
        const { error: paymentErr } = await admin
          .from("payments")
          .update({
            status: "completed",
            payment_reference: finalCheckoutId,
          })
          .eq("order_id", externalId);

        if (paymentErr) {
          console.error("[yoco-webhook] Error updating payments:", paymentErr);
        } else {
          console.log("[yoco-webhook] Payment marked completed for order:", externalId);
        }

        // Update orders table
        const { data: order, error: orderErr } = await admin
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
            paid_at: new Date().toISOString(),
          })
          .eq("id", externalId)
          .select("*")
          .single();

        if (orderErr) {
          console.error("[yoco-webhook] Error updating orders:", orderErr);
        } else {
          console.log("[yoco-webhook] Order status updated to processing:", externalId);
        }

        // Log to order_transactions
        await admin.from("order_transactions").insert({
          order_id: externalId,
          event_type: "payment_received",
          event_description: `Payment received via Yoco (Ref: ${finalCheckoutId})`,
          actor_type: "system",
        });

        // 📱 Send buyer WhatsApp notification (if WhatsApp order)
        const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
        const PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID");

        if (order?.buyer_phone && META_ACCESS_TOKEN && PHONE_NUMBER_ID) {
          const buyerMsg = `✅ *Payment Successful!*\nYour order has been confirmed! 🎉\n\n*Order ID:* ${externalId.slice(0, 8).toUpperCase()}\n*Amount Paid:* R${data.amount ? (data.amount / 100).toFixed(2) : order.total_amount}\n\n📦 The seller is preparing your order.`;
          await sendWhatsAppMessage(order.buyer_phone, buyerMsg, META_ACCESS_TOKEN, PHONE_NUMBER_ID);
        }

        // 🚚 CREATE DISPATCH REQUEST for delivery orders
        if (order && order.delivery_mode === "delivery") {
          console.log("[yoco-webhook] Creating dispatch for order:", externalId);

          // Create delivery record first
          const { data: delivery, error: deliveryErr } = await admin
            .from("whatsapp_deliveries")
            .insert({
              order_id: externalId,
              status: "pending",
              pickup_address: "Seller Store",
              dropoff_address: order.buyer_phone || "Buyer Address",
            })
            .select()
            .single();

          if (deliveryErr) {
            console.error("[yoco-webhook] Error creating delivery:", deliveryErr);
          } else {
            // Create dispatch request linked to delivery
            const { data: dispatchReq, error: dispatchErr } = await admin
              .from("whatsapp_dispatch_requests")
              .insert({
                order_id: externalId,
                delivery_id: delivery.id,
                status: "waiting",
                broadcast_count: 0,
              })
              .select()
              .single();

            if (dispatchErr) {
              console.error("[yoco-webhook] Error creating dispatch request:", dispatchErr);
            } else {
              console.log("[yoco-webhook] Dispatch request created:", dispatchReq?.id);

              // 📢 Broadcast to all drivers
              const { data: drivers } = await admin
                .from("profiles")
                .select("phone")
                .eq("role", "driver");

              if (drivers && drivers.length > 0 && META_ACCESS_TOKEN && PHONE_NUMBER_ID) {
                const driverMsg = `🚨 *NEW DELIVERY REQUEST!*\n\n📦 Order: ${externalId.slice(0, 8).toUpperCase()}\n💰 Amount: R${order.total_amount}\n\n1️⃣ Accept\n2️⃣ Skip`;
                for (const driver of drivers) {
                  await sendWhatsAppMessage(driver.phone, driverMsg, META_ACCESS_TOKEN, PHONE_NUMBER_ID);
                }
                console.log("[yoco-webhook] Broadcast to", drivers.length, "drivers");
              }

              // Log dispatch event
              await admin.from("whatsapp_system_logs").insert({
                log_type: "other",
                reference_id: externalId,
                reference_type: "order",
                actor_type: "bot",
                message: `Dispatch request created and broadcasted to drivers`,
              });
            }
          }
        }
      } catch (dbErr) {
        console.error("[yoco-webhook] Database error:", dbErr);
      }
    } else if (isFailed || isCancelled) {
      console.log("[yoco-webhook] Processing failed/cancelled payment - status:", statusLower, "order:", externalId);

      try {
        const paymentStatus = "failed"; // both failed & cancelled map to 'failed'

        const { error: paymentErr } = await admin
          .from("payments")
          .update({
            status: paymentStatus,
            payment_reference: finalCheckoutId,
          })
          .eq("order_id", externalId);

        if (paymentErr) {
          console.error("[yoco-webhook] Error updating payment status:", paymentErr);
        } else {
          console.log("[yoco-webhook] Payment marked as", paymentStatus, "for order:", externalId);
        }

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
          console.log("[yoco-webhook] Order marked cancelled:", externalId);
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

// Send WhatsApp message via Meta API
async function sendWhatsAppMessage(
  to: string,
  message: string,
  accessToken: string,
  phoneNumberId: string
): Promise<void> {
  try {
    const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: to,
        type: "text",
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[WHATSAPP ERROR] ${response.status}: ${error}`);
    } else {
      console.log(`[WHATSAPP] ✓ Sent to ${to}`);
    }
  } catch (err: any) {
    console.error(`[WHATSAPP SEND ERROR]`, err.message);
  }
}
