import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// ============================================================
// WhatsApp Dispatch: Driver acceptance and delivery management
// ============================================================

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DispatchAction {
  action: "accept" | "reject" | "pickup" | "deliver" | "update_location";
  driver_phone: string;
  dispatch_request_id?: string;
  delivery_id?: string;
  coordinates?: { lat: number; lng: number };
  notes?: string;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return responseJson({ error: "Method not allowed" }, 405);
    }

    const payload: DispatchAction = await req.json();
    const { action, driver_phone, dispatch_request_id, delivery_id, coordinates, notes } = payload;

    console.log(`[DISPATCH] ${driver_phone} => ${action}`);

    // Get driver profile
    const { data: driver } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("phone", driver_phone)
      .eq("role", "driver")
      .maybeSingle();

    if (!driver) {
      return responseJson({ error: "Driver not found" }, 404);
    }

    // ============================================================
    // ACTION: Accept Dispatch Request
    // ============================================================
    if (action === "accept" && dispatch_request_id) {
      const { data: dispatchReq, error: fetchErr } = await supabase
        .from("whatsapp_dispatch_requests")
        .select("id, order_id, delivery_id, status")
        .eq("id", dispatch_request_id)
        .maybeSingle();

      if (fetchErr || !dispatchReq || dispatchReq.status !== "waiting") {
        return responseJson(
          { error: "Dispatch request not available" },
          400
        );
      }

      // Update dispatch request
      await supabase
        .from("whatsapp_dispatch_requests")
        .update({
          status: "accepted",
          accepted_by_driver_id: driver.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", dispatch_request_id);

      // Update delivery
      await supabase
        .from("whatsapp_deliveries")
        .update({
          driver_id: driver.id,
          driver_phone: driver_phone,
          status: "assigned",
        })
        .eq("id", dispatchReq.delivery_id);

      // Update order state
      await supabase
        .from("whatsapp_conversations")
        .update({
          state: "DELIVERY_ASSIGNED",
        })
        .eq("id", dispatchReq.order_id);

      // Get order for buyer notification
      const { data: order } = await supabase
        .from("orders")
        .select("buyer_phone")
        .eq("id", dispatchReq.order_id)
        .single();

      // Notify buyer
      const buyerMsg = `
✅ *Driver Assigned!*
🚗 Your driver is on the way.

👤 Driver: ${driver.full_name}
📞 Phone: ${driver_phone}

Your delivery will arrive soon!`;
      await sendWhatsAppMessage(order?.buyer_phone, buyerMsg);

      // Confirm to driver
      const driverMsg = `
✅ *Dispatch Accepted!*

Order ID: ${dispatchReq.order_id.slice(0, 8).toUpperCase()}
📍 Pickup + Delivery info sent separately

Respond:
1️⃣ Picked up
2️⃣ Delivered`;
      await sendWhatsAppMessage(driver_phone, driverMsg);

      // Log event
      await supabase.from("whatsapp_system_logs").insert({
        log_type: "driver_assigned",
        reference_id: dispatchReq.order_id,
        reference_type: "order",
        actor_type: "driver",
        actor_phone: driver_phone,
        message: `Driver ${driver.full_name} accepted dispatch`,
      });

      return responseJson({
        success: true,
        message: "Dispatch accepted",
        delivery_id: dispatchReq.delivery_id,
      });
    }

    // ============================================================
    // ACTION: Pickup Complete
    // ============================================================
    if (action === "pickup" && delivery_id) {
      const { data: delivery } = await supabase
        .from("whatsapp_deliveries")
        .select("order_id, driver_phone")
        .eq("id", delivery_id)
        .single();

      await supabase
        .from("whatsapp_deliveries")
        .update({
          status: "picked_up",
          pickup_coordinates: coordinates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery_id);

      // Notify seller
      const sellerMsg = `
📦 *Order Picked Up!*
Driver is now heading to deliver.

Order: ${delivery.order_id.slice(0, 8).toUpperCase()}`;
      // Note: Send to seller phone from order

      return responseJson({ success: true, message: "Pickup confirmed" });
    }

    // ============================================================
    // ACTION: Delivery Complete
    // ============================================================
    if (action === "deliver" && delivery_id) {
      const { data: delivery } = await supabase
        .from("whatsapp_deliveries")
        .select("order_id")
        .eq("id", delivery_id)
        .single();

      await supabase
        .from("whatsapp_deliveries")
        .update({
          status: "delivered",
          dropoff_coordinates: coordinates,
          actual_delivery_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery_id);

      // Update order
      await supabase
        .from("orders")
        .update({
          status: "completed",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", delivery.order_id);

      // Update conversation
      await supabase
        .from("whatsapp_conversations")
        .update({ state: "COMPLETED" })
        .eq("id", delivery.order_id);

      // Get buyer phone
      const { data: order } = await supabase
        .from("orders")
        .select("buyer_phone")
        .eq("id", delivery.order_id)
        .single();

      // Notify buyer
      const buyerMsg = `
✅ *Delivery Complete!*
Your order has arrived. Thank you! 🎉

📦 Keep your receipt for returns.
⭐ Rate this delivery: [link]`;
      await sendWhatsAppMessage(order?.buyer_phone, buyerMsg);

      // Log event
      await supabase.from("whatsapp_system_logs").insert({
        log_type: "delivery_completed",
        reference_id: delivery.order_id,
        reference_type: "order",
        actor_type: "driver",
        actor_phone: driver_phone,
        message: `Delivery completed by ${driver.full_name}`,
      });

      return responseJson({ success: true, message: "Delivery confirmed" });
    }

    // ============================================================
    // ACTION: Update Location (real-time tracking)
    // ============================================================
    if (action === "update_location" && delivery_id && coordinates) {
      await supabase
        .from("whatsapp_deliveries")
        .update({
          dropoff_coordinates: coordinates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", delivery_id);

      return responseJson({ success: true, message: "Location updated" });
    }

    return responseJson({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("[ERROR]", err);
    return responseJson({ error: err.message }, 500);
  }
});

// ============================================================
// Helpers
// ============================================================

async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!metaAccessToken || !phoneNumberId) {
    console.log("[MOCK] Would send to", to);
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
