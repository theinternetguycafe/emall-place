import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================
// WHATSAPP COMMERCE - Unified Bot Engine
// Router | State Manager | Automation Engine
// ============================================================

const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN");
const PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID");
const BOT_PHONE = Deno.env.get("BOT_PHONE") || "+27XXXXX";
const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================================
// MAIN WEBHOOK HANDLER
// ============================================================
serve(async (req) => {
  const url = new URL(req.url);

  // ✅ META WEBHOOK VERIFICATION
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const VERIFY_TOKEN = "emallplace_verify";

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 👇 KEEP YOUR EXISTING POST LOGIC BELOW
  try {    // Message handler (POST)
    if (req.method === "POST") {
      return await handlePostRequest(req);
    }

    return new Response("Method not allowed", { status: 405 });
  } catch (error: any) {
    console.error("[ERROR]", error.message);
    // Always return 200 so WhatsApp doesn't retry
    return new Response("OK", { status: 200 });
  }
});



// ============================================================
// POST: Message Handler
// ============================================================
async function handlePostRequest(req: Request): Promise<Response> {
  const body = await req.json();

  const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) {
    return new Response("OK", { status: 200 });
  }

  const senderPhone = message.from;
  const messageText = message.text?.body || "";
  const messageId = message.id;

  console.log(`[MESSAGE] ${senderPhone}: "${messageText}"`);

  try {
    // 1. Determine sender role
    const senderRole = await determineSenderRole(senderPhone);
    console.log(`[ROLE] ${senderPhone} → ${senderRole}`);

    // 2. Route to appropriate handler
    let reply = "";
    if (senderRole === "buyer") {
      reply = await handleBuyerMessage(senderPhone, messageText, messageId);
    } else if (senderRole === "seller") {
      reply = await handleSellerMessage(senderPhone, messageText, messageId);
    } else if (senderRole === "driver") {
      reply = await handleDriverMessage(senderPhone, messageText, messageId);
    }

    // 3. Send bot reply
    if (reply) {
      await sendWhatsAppMessage(senderPhone, reply);
    }
  } catch (err: any) {
    console.error("[HANDLER ERROR]", err.message);
  }

  return new Response("OK", { status: 200 });
}

// ============================================================
// ROLE DETECTION
// ============================================================
async function determineSenderRole(
  phone: string
): Promise<"buyer" | "seller" | "driver"> {
  // Check if seller
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("whatsapp_number", phone)
    .maybeSingle();

  if (seller) return "seller";

  // Check if driver
  const { data: driver } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .eq("role", "driver")
    .maybeSingle();

  if (driver) return "driver";

  // Default: buyer
  return "buyer";
}

// ============================================================
// BUYER FLOW
// ============================================================
async function handleBuyerMessage(
  buyerPhone: string,
  messageText: string,
  messageId: string
): Promise<string> {
  // Step 1: Extract product ID from message
  // Format: "Hi (ID:product-uuid)" or just "(ID:product-uuid)"
  const productMatch = messageText.match(/\(ID:([a-zA-Z0-9-]+)\)/);
  const productId = productMatch?.[1];

  if (!productId) {
    // No product - show welcome
    return `👋 Welcome to EmallPlace!\n\n🛍️ Browse products and share the link to chat with sellers.\n\n🌐 https://emallplace.com`;
  }

  // Step 2: Fetch product details
  const { data: product, error: productError } = await supabase
    .from("products")
    .select(
      `
      id,
      title,
      price,
      description,
      seller_store_id,
      seller_stores!inner(
        owner_id,
        seller_profiles!inner(id, whatsapp_number)
      )
    `
    )
    .eq("id", productId)
    .maybeSingle();

  if (!product) {
    return `❌ Product not found. Please check the link.`;
  }

  // Step 3: Get or create conversation
  let { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, state")
    .eq("buyer_phone", buyerPhone)
    .eq("product_id", productId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    // Create new conversation — store buyer_name and seller_phone
    // for faster routing with fewer joins later
    const seller = product.seller_stores?.[0]?.seller_profiles?.[0];

    const { data: newConv, error: convError } = await supabase
      .from("whatsapp_conversations")
      .insert({
        buyer_phone: buyerPhone,
        product_id: productId,
        seller_id: seller?.id,
        seller_phone: seller?.whatsapp_number ?? null,
        status: "active",
        state: "VIEWING_PRODUCT",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (convError) {
      console.error("[CREATE CONVERSATION ERROR]", convError);
      return `⚠️ Something went wrong. Please try again.`;
    }

    conversation = newConv;

    // Log event
    await logSystemEvent({
      event_type: "conversation_created",
      reference_id: conversation.id,
      reference_type: "conversation",
      message: `Buyer inquired about: ${product.title}`,
      actor_type: "buyer",
      metadata: { product_id: productId, buyer_phone: buyerPhone },
    });

    console.log(`[CONVERSATION] Created ${conversation.id} for ${buyerPhone}`);
  }

  // Step 4: Store incoming message
  const { error: msgError } = await supabase
    .from("whatsapp_messages")
    .insert({
      conversation_id: conversation.id,
      sender: "buyer",
      message: messageText,
    });

  if (msgError) {
    console.error("[MESSAGE INSERT ERROR]", msgError);
  }

  // Step 5: Handle state-based responses
  const userInput = messageText.trim();

  if (userInput === "1" && conversation.state === "VIEWING_PRODUCT") {
    // Buy now
    return await handleBuyNow(conversation.id, product);
  } else if (userInput === "2" && conversation.state === "VIEWING_PRODUCT") {
    // Ask seller
    return await handleAskSeller(conversation.id, product);
  } else if (userInput === "3") {
    // Browse more
    return `🌐 Visit EmallPlace:\nhttps://emallplace.com\n\n💬 Share any product link to ask about it!`;
  } else if (
    userInput === "1" &&
    conversation.state === "WAITING_FOR_SELLER"
  ) {
    // Confirm order after seller response
    return await handleBuyNow(conversation.id, product);
  } else if (conversation.state === "VIEWING_PRODUCT") {
    // First time - show product menu
    return renderProductMenu(product);
  } else {
    // Unexpected state or input
    return `❓ I didn't understand that. Please reply with:\n\n1️⃣ Buy\n2️⃣ Ask Seller\n3️⃣ Browse More`;
  }
}

// Handle "Buy Now" flow
async function handleBuyNow(
  conversationId: string,
  product: any
): Promise<string> {
  try {
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    // Resolve seller_profiles.id via owner_id
    let sellerProfileId: string | null = null;
    const ownerUserId = product.seller_stores?.[0]?.owner_id;
    if (ownerUserId) {
      const { data: sp } = await supabase
        .from("seller_profiles")
        .select("id")
        .eq("user_id", ownerUserId)
        .maybeSingle();
      sellerProfileId = sp?.id ?? null;
    }

    // Create order — link conversation_id for full traceability
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        conversation_id: conversationId,
        product_id: product.id,
        seller_id: sellerProfileId,
        buyer_phone: conversation.buyer_phone,
        status: "pending",
        payment_status: "unpaid",
        total_amount: product.price,
        total_commission: 0,
        quantity: 1,
        unit_price: product.price,
        subtotal: product.price,
        delivery_fee: 0,
        delivery_mode: "delivery",
      })
      .select()
      .single();

    if (orderError) {
      console.error("[ORDER CREATE ERROR]", orderError);
      return `⚠️ Error creating order. Try again.`;
    }

    // Update conversation state
    await supabase
      .from("whatsapp_conversations")
      .update({ state: "AWAITING_PAYMENT" })
      .eq("id", conversationId);

    // Generate Yoco payment link (direct API — no user auth needed)
    const yocoCheckout = await generateYocoCheckout({
      order_id: order.id,
      amount: product.price,
      description: product.title,
    });

    const paymentLink = yocoCheckout?.redirectUrl
      ?? `${Deno.env.get("APP_URL") || "https://emallplace.com"}/#/checkout?order_id=${order.id}&provider=yoco`;

    // Store payment record
    await supabase
      .from("payments")
      .insert({
        order_id: order.id,
        provider: "yoco",
        status: "pending",
        payment_url: paymentLink,
        payment_reference: yocoCheckout?.checkoutId ?? null,
        amount: product.price,
        currency: "ZAR",
      });

    // Log event
    await logSystemEvent({
      event_type: "order_created",
      reference_id: order.id,
      reference_type: "order",
      message: `Order created for ${product.title}`,
      actor_type: "bot",
      metadata: { amount: product.price },
    });

    // Notify seller
    const sellerPhone =
      product.seller_stores?.[0]?.seller_profiles?.[0]?.whatsapp_number;
    if (sellerPhone) {
      const sellerMsg = `📦 New Order!\n\n🛒 ${product.title}\n💰 R${product.price}\n👤 Buyer: ${conversation.buyer_phone}\n\n⏳ Awaiting payment...`;
      await sendWhatsAppMessage(sellerPhone, sellerMsg);
    }

    return `🛒 Order created!\n\n💳 Complete payment:\n${paymentLink}\n\n⏳ We'll confirm delivery details once payment clears.`;
  } catch (err: any) {
    console.error("[BUY NOW ERROR]", err.message);
    return `⚠️ Something went wrong. Please try again.`;
  }
}

// Handle "Ask Seller" flow
async function handleAskSeller(
  conversationId: string,
  product: any
): Promise<string> {
  // Update conversation state
  await supabase
    .from("whatsapp_conversations")
    .update({ state: "WAITING_FOR_SELLER" })
    .eq("id", conversationId);

  // Log event
  await logSystemEvent({
    event_type: "conversation_updated",
    reference_id: conversationId,
    reference_type: "conversation",
    message: "Buyer asking question",
    actor_type: "bot",
    actor_id: null,
  });

  // Notify seller
  const sellerPhone =
    product.seller_stores?.[0]?.seller_profiles?.[0]?.whatsapp_number;
  if (sellerPhone) {
    const { data: conversation } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    const sellerMsg = `📬 New Inquiry!\n\n🛒 Product: ${product.title}\n👤 Buyer: +${conversation.buyer_phone}\n\n💬 They're waiting for your response. Reply here!`;
    await sendWhatsAppMessage(sellerPhone, sellerMsg);
  }

  return `✍️ Go ahead - ask your question!\n\n⏳ The seller will respond shortly.`;
}

function renderProductMenu(product: any): string {
  return `🛒 *${product.title}*\n💰 R${product.price}\n\n${product.description || "High quality product!"}\n\n1️⃣ Buy Now\n2️⃣ Ask Seller\n3️⃣ Browse More`;
}

// ============================================================
// SELLER FLOW
// ============================================================
async function handleSellerMessage(
  sellerPhone: string,
  messageText: string,
  messageId: string
): Promise<string> {
  // Find seller
  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id, user_id")
    .eq("whatsapp_number", sellerPhone)
    .maybeSingle();

  if (!seller) {
    return `⚠️ Seller account not found. Contact support.`;
  }

  // Get pending conversation (waiting for seller response)
  const { data: conversation } = await supabase
    .from("whatsapp_conversations")
    .select("id, buyer_phone, state")
    .eq("seller_id", seller.id)
    .eq("state", "WAITING_FOR_SELLER")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    return `📭 No pending inquiries.\n\n📊 Dashboard: https://emallplace.com/seller`;
  }

  // Store seller message
  await supabase.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    sender: "seller",
    message: messageText,
  });

  // Forward to buyer
  const buyerMsg = `📨 Seller replied:\n\n"${messageText}"\n\n1️⃣ Buy Now\n2️⃣ Ask More\n3️⃣ Browse`;
  await sendWhatsAppMessage(conversation.buyer_phone, buyerMsg);

  // Update state
  await supabase
    .from("whatsapp_conversations")
    .update({ state: "WAITING_FOR_BUYER" })
    .eq("id", conversation.id);

  // Log event
  await logSystemEvent({
    event_type: "message_sent",
    reference_id: conversation.id,
    reference_type: "conversation",
    message: `Seller responded to inquiry`,
    actor_type: "seller",
    actor_id: seller.user_id,
  });

  return `✅ Response sent to buyer!`;
}

// ============================================================
// DRIVER FLOW
// ============================================================
async function handleDriverMessage(
  driverPhone: string,
  messageText: string,
  messageId: string
): Promise<string> {
  // Find driver
  const { data: driver } = await supabase
    .from("profiles")
    .select("id")
    .eq("phone", driverPhone)
    .eq("role", "driver")
    .maybeSingle();

  if (!driver) {
    return `⚠️ Driver profile not found.`;
  }

  const reply = messageText.trim();

  if (reply === "1") {
    // Accept dispatch
    return await handleDriverAccept(driver.id, driverPhone);
  } else if (reply === "2") {
    return `⏭️ Skipped. Next request coming soon.`;
  } else {
    return `🚗 Delivery Driver Menu\n\n1️⃣ Accept Dispatch\n2️⃣ Skip`;
  }
}

async function handleDriverAccept(
  driverId: string,
  driverPhone: string
): Promise<string> {
  try {
    // Step 1: Get oldest waiting dispatch request
    const { data: dispatchReq } = await supabase
      .from("whatsapp_dispatch_requests")
      .select("id, order_id, delivery_id")
      .eq("status", "waiting")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!dispatchReq) {
      return `📭 No active delivery requests at the moment.`;
    }

    // Step 2: ATOMIC accept — only succeeds if status is STILL 'waiting'
    // This prevents race conditions when multiple drivers press "1" simultaneously
    const { data: claimed, error: claimError } = await supabase
      .from("whatsapp_dispatch_requests")
      .update({
        status: "accepted",
        accepted_by_driver_id: driverId,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", dispatchReq.id)
      .eq("status", "waiting")   // ← atomic guard: only first driver wins
      .select()
      .maybeSingle();

    if (claimError || !claimed) {
      // Another driver got there first
      return `⚡ Another driver just accepted this delivery. Stay tuned for the next one!`;
    }

    // Step 3: Update the existing delivery record (created by yoco-webhook)
    await supabase
      .from("whatsapp_deliveries")
      .update({
        driver_id: driverId,
        driver_phone: driverPhone,
        status: "assigned",
      })
      .eq("id", dispatchReq.delivery_id);

    // Step 4: Get order for buyer notification
    const { data: order } = await supabase
      .from("orders")
      .select("buyer_phone, total_amount")
      .eq("id", dispatchReq.order_id)
      .single();

    // Step 5: Get delivery details for addresses
    const { data: delivery } = await supabase
      .from("whatsapp_deliveries")
      .select("pickup_address, dropoff_address")
      .eq("id", dispatchReq.delivery_id)
      .single();

    // Step 6: Notify buyer
    if (order?.buyer_phone) {
      const buyerMsg = `🚗 *Driver Assigned!*\n\n👤 Driver is on the way.\n📍 Pickup: ${delivery?.pickup_address ?? "Seller store"}\n🏠 Your address will be confirmed shortly.\n\nThank you for your order! 🎉`;
      await sendWhatsAppMessage(order.buyer_phone, buyerMsg);
    }

    // Step 7: Log event
    await logSystemEvent({
      event_type: "driver_assigned",
      reference_id: dispatchReq.order_id,
      reference_type: "order",
      message: "Driver accepted delivery",
      actor_type: "driver",
      metadata: { driver_phone: driverPhone, driver_id: driverId },
    });

    return `✅ Delivery accepted!\n\n📍 Pickup: ${delivery?.pickup_address ?? "Seller store"}\n🏠 Dropoff: ${delivery?.dropoff_address ?? "Buyer address"}\n\nHead to pickup location. Reply:\n1️⃣ Picked up\n2️⃣ Delivered`;
  } catch (err: any) {
    console.error("[DRIVER ACCEPT ERROR]", err.message);
    return `⚠️ Something went wrong. Try again.`;
  }
}

// ============================================================
// UTILITIES
// ============================================================

/**
 * Calls the Yoco Checkouts API directly using the secret key.
 * Returns the hosted payment page URL + checkout ID.
 * No user authentication required — safe for bot/service-role flows.
 */
async function generateYocoCheckout(options: {
  order_id: string;
  amount: number; // in ZAR (Rands)
  description: string;
}): Promise<{ redirectUrl: string; checkoutId: string } | null> {
  const yocoSecretKey = Deno.env.get("YOCO_SECRET_KEY")?.trim();
  const appUrl = Deno.env.get("APP_URL") || "https://emallplace.com";

  if (!yocoSecretKey?.startsWith("sk_")) {
    console.error("[YOCO] YOCO_SECRET_KEY not configured — falling back to app checkout URL");
    return null;
  }

  const amountInCents = Math.round(options.amount * 100);

  const payload = {
    amount: amountInCents,
    currency: "ZAR",
    externalId: options.order_id,
    successUrl: `${appUrl}/payment-success?order_id=${options.order_id}`,
    cancelUrl: `${appUrl}/payment-cancelled?order_id=${options.order_id}`,
    failureUrl: `${appUrl}/payment-failed?order_id=${options.order_id}`,
    metadata: {
      orderId: options.order_id,
      description: options.description,
      channel: "whatsapp",
    },
  };

  try {
    const resp = await fetch("https://payments.yoco.com/api/checkouts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yocoSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await resp.json();
    if (!resp.ok) {
      console.error("[YOCO] Checkout creation failed:", json);
      return null;
    }

    console.log("[YOCO] Checkout created:", json.id);
    return { redirectUrl: json.redirectUrl, checkoutId: json.id };
  } catch (err: any) {
    console.error("[YOCO] Fetch error:", err.message);
    return null;
  }
}

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!META_ACCESS_TOKEN || !PHONE_NUMBER_ID) {
    console.log(`[WHATSAPP MOCK] → ${to}: ${text}`);
    return;
  }

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${META_ACCESS_TOKEN}`,
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
      const error = await response.text();
      console.error(`[WHATSAPP ERROR] ${response.status}: ${error}`);
    } else {
      console.log(`[WHATSAPP] ✓ Sent to ${to}`);
    }
  } catch (err: any) {
    console.error(`[WHATSAPP SEND ERROR]`, err.message);
  }
}

interface LogSystemEventParams {
  event_type: string;
  reference_id?: string;
  reference_type?: string;
  message: string;
  actor_type?: string;
  actor_id?: string | null;
  metadata?: Record<string, any>;
}

async function logSystemEvent(params: LogSystemEventParams): Promise<void> {
  try {
    await supabase.from("whatsapp_system_logs").insert({
      log_type: params.event_type === "conversation_created" ? "conversation_created"
        : params.event_type === "order_created" ? "order_created"
        : params.event_type === "message_sent" ? "message_sent"
        : params.event_type === "driver_assigned" ? "driver_assigned"
        : "other",
      reference_id: params.reference_id,
      reference_type: params.reference_type || "system",
      message: params.message,
      actor_type: params.actor_type || "bot",
      actor_phone: null,
      metadata: params.metadata || {},
    });
  } catch (err: any) {
    console.error("[LOG ERROR]", err.message);
  }
}
