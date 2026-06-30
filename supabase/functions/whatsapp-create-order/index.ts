import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================
// WhatsApp: Create Order & Initiate Payment
// Triggered when buyer confirms purchase via WhatsApp
// ============================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface CreateOrderRequest {
  buyer_phone: string;
  product_id: string;
  conversation_id?: string;
  quantity?: number;
  delivery_mode?: "delivery" | "pickup";
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    const payload: CreateOrderRequest = await req.json();
    const {
      buyer_phone,
      product_id,
      conversation_id,
      quantity = 1,
      delivery_mode = "delivery",
    } = payload;

    console.log(`[ORDER] Creating for ${buyer_phone}: Product ${product_id}`);

    // 1. Validate product exists & get details
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `id, title, price, seller_store_id, stock, 
         seller_stores(id, owner_id)`
      )
      .eq("id", product_id)
      .single();

    if (productError || !product) {
      return responseJson({ error: "Product not found" }, 400);
    }

    // 2. Check stock
    if (product.stock < quantity) {
      return responseJson({ error: "Insufficient stock" }, 400);
    }

    // 3. Get or create buyer profile
    let { data: buyerProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", buyer_phone)
      .maybeSingle();

    if (!buyerProfile) {
      // Create buyer profile (guest)
      const { data: newProfile } = await supabase
        .from("profiles")
        .insert({
          phone: buyer_phone,
          role: "buyer",
          full_name: `Guest ${buyer_phone.slice(-4)}`,
        })
        .select()
        .single();
      buyerProfile = newProfile;
    }

    // 4. Calculate totals
    const subtotal = product.price * quantity;
    const deliveryFee = delivery_mode === "delivery" ? 50 : 0;
    const totalAmount = subtotal + deliveryFee;
    const commission = totalAmount * 0.1;

    // 5. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: buyerProfile.id,
        buyer_phone: buyer_phone,
        product_id: product_id,
        seller_id: product.seller_stores?.owner_id,
        quantity: quantity,
        unit_price: product.price,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        delivery_mode: delivery_mode,
        total_amount: totalAmount,
        total_commission: commission,
        payment_status: "unpaid",
        status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      console.error("[ORDER ERROR]", orderError);
      return responseJson({ error: "Failed to create order" }, 500);
    }

    // 6. Create order items
    await supabase.from("order_items").insert({
      order_id: order.id,
      seller_store_id: product.seller_store_id,
      product_id: product_id,
      qty: quantity,
      unit_price: product.price,
      item_total: subtotal,
      commission_amount: subtotal * 0.1,
      item_status: "pending",
    });

    // 7. Generate PayFast payment URL
    const paymentUrl = generatePayFastUrl({
      order_id: order.id,
      amount: totalAmount,
      description: `${product.title} x${quantity}`,
    });

    // 8. Store payment record
    await supabase.from("payments").insert({
      order_id: order.id,
      provider: "payfast",
      status: "pending",
      payment_url: paymentUrl,
    });

    // 9. Update conversation state
    if (conversation_id) {
      await supabase
        .from("whatsapp_conversations")
        .update({
          state: "AWAITING_PAYMENT",
          metadata: JSON.stringify({ order_id: order.id }),
        })
        .eq("id", conversation_id);
    }

    // 10. Send buyer confirmation
    const buyerMsg = `
🧾 *Order Created!*
📦 ${product.title}
💰 R${totalAmount.toFixed(2)}

💳 *Pay here:*
${paymentUrl}

After payment, seller will contact you.`.trim();
    await sendWhatsAppMessage(buyer_phone, buyerMsg);

    // 11. Log event
    await supabase.from("whatsapp_system_logs").insert({
      log_type: "order_created",
      reference_id: order.id,
      reference_type: "order",
      actor_type: "buyer",
      actor_phone: buyer_phone,
      message: `Order: ${product.title} x${quantity} = R${totalAmount.toFixed(2)}`,
    });

    return responseJson({
      success: true,
      order_id: order.id,
      payment_url: paymentUrl,
      total_amount: totalAmount,
    });
  } catch (err: any) {
    console.error("[ERROR]", err);
    return responseJson({ error: err.message }, 500);
  }
});

// ============================================================
// Helpers
// ============================================================

function generatePayFastUrl(options: {
  order_id: string;
  amount: number;
  description: string;
}): string {
  const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID") || "10000100";
  const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY") || "46f1cd6dfb60d9bbe94f3fa1433eb2b1";
  const appUrl = Deno.env.get("APP_URL") || "https://emallplace.com";

  const params = new URLSearchParams({
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${appUrl}/payment-success`,
    cancel_url: `${appUrl}/payment-cancelled`,
    notify_url: `${supabaseUrl}/functions/v1/payfast-webhook`,
    m_payment_id: options.order_id,
    amount: options.amount.toFixed(2),
    item_name: options.description,
    custom_str1: "whatsapp",
  });

  return `https://www.payfast.co.za/eng/process?${params.toString()}`;
}

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!metaAccessToken || !phoneNumberId) {
    console.log("[MOCK] Would send to", to, ":", text);
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${metaAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text },
    }),
  });

  if (!response.ok) {
    console.error("[META API ERROR]", await response.text());
  }
}

function responseJson(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
