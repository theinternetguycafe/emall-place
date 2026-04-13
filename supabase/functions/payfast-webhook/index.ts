import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAYFAST_PASSPHRASE = Deno.env.get("PAYFAST_PASSPHRASE") || "";
const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN") || Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID") || "";

serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    // 1. Parse PayFast ITN data
    const formData = await req.formData();
    const payfastData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      payfastData[key] = value.toString();
    }

    console.log("[PayFast] Webhook received for order:", payfastData.m_payment_id);

    // 2. Extract order ID
    const orderId = payfastData.m_payment_id;
    if (!orderId) {
      return new Response(JSON.stringify({ error: "No order ID" }), { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 3. Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        id,
        buyer_phone,
        seller_id,
        product_id,
        total_amount,
        products(title),
        seller_profiles(store_name, seller_phone, whatsapp_number)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      console.error("[PayFast] Order not found:", orderId);
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    // 4. Handle status
    const paymentStatus = payfastData.payment_status?.toLowerCase() || "unknown";

    if (paymentStatus === "completed") {
      // ✅ PAYMENT SUCCESS
      await supabase.from("orders").update({
        payment_status: "paid",
        status: "finalized",
        paid_at: new Date().toISOString(),
      }).eq("id", orderId);

      await supabase.from("payments").update({
        status: "success",
        provider_reference: payfastData.pf_payment_id,
        paid_at: new Date().toISOString(),
      }).eq("order_id", orderId);

      // Log transaction
      await supabase.from("order_transactions").insert({
        order_id: orderId,
        event_type: "payment_received",
        event_description: `Payment received via PayFast (Ref: ${payfastData.pf_payment_id})`,
        actor_type: "system",
      });

      // 🚚 CREATE DISPATCH REQUEST (if delivery order)
      if (order.delivery_mode === "delivery") {
        const { data: delivery } = await supabase
          .from("whatsapp_deliveries")
          .insert({
            order_id: orderId,
            status: "pending",
            pickup_address: order.seller_id ? "TBD" : "Seller Store",
            dropoff_address: order.buyer_phone,
          })
          .select()
          .single();

        if (delivery) {
          const { data: dispatchReq } = await supabase
            .from("whatsapp_dispatch_requests")
            .insert({
              order_id: orderId,
              delivery_id: delivery.id,
              status: "waiting",
              broadcast_count: 0,
            })
            .select()
            .single();

          if (dispatchReq) {
            // Notify drivers (broadcast to all)
            const driverMsg = `
🚨 *NEW DELIVERY REQUEST!*

📦 Order: ${orderId.slice(0, 8).toUpperCase()}
💰 Payment: R${payfastData.amount_gross}
🏪 Type: WhatsApp Order

1️⃣ Accept
2️⃣ Skip
            `.trim();

            // Get all drivers and send them the request
            const { data: drivers } = await supabase
              .from("profiles")
              .select("phone")
              .eq("role", "driver");

            if (drivers && drivers.length > 0) {
              for (const driver of drivers) {
                await sendWhatsAppMessage(driver.phone, driverMsg);
              }
            }

            // Log dispatch creation
            await supabase.from("whatsapp_system_logs").insert({
              log_type: "other",
              reference_id: orderId,
              reference_type: "order",
              actor_type: "bot",
              message: `Dispatch request created for order ${orderId.slice(0, 8)}`,
            });
          }
        }
      }

      // Notify buyer
      const buyerMessage = `
✅ *Payment Successful!*
Your order has been confirmed! 🎉

*Order ID:* ${orderId.slice(0, 8).toUpperCase()}
*Product:* ${order.products?.title}
*Amount Paid:* R${payfastData.amount_gross}

📦 The seller is preparing your order.
      `.trim();
      await sendWhatsAppMessage(order.buyer_phone, buyerMessage);

      // Notify seller
      const sellerPhone = order.seller_profiles?.whatsapp_number || order.seller_profiles?.seller_phone;
      if (sellerPhone) {
        const sellerMessage = `
💰 *PAYMENT RECEIVED!*
Customer has paid for their order! 🎉

*Order ID:* ${orderId.slice(0, 8).toUpperCase()}
*Product:* ${order.products?.title}
*Amount:* R${payfastData.amount_gross}

👉 Process order and prepare for delivery.
        `.trim();
        await sendWhatsAppMessage(sellerPhone, sellerMessage);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error: any) {
    console.error("[PayFast Webhook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});

async function sendWhatsAppMessage(to: string, message: string): Promise<boolean> {
  if (!META_ACCESS_TOKEN || !PHONE_NUMBER_ID) return false;
  try {
    const formattedPhone = to.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "text",
        text: { body: message },
      }),
    });
    return response.ok;
  } catch (error) {
    console.error("[WhatsApp] Error:", error);
    return false;
  }
}
