# PHASE 3: Code Examples & Quick Reference

## 🔗 Integration Points (Where Code Goes)

### 1. WhatsApp Bot Webhook Handler

**File**: `src/functions/whatsapp-webhook.ts` or wherever your bot webhook is

```typescript
// When user sends message, extract action
export async function handleWhatsAppMessage(req: Request) {
  const body = await req.json()
  const phoneNumber = body.messages[0].from
  const text = body.messages[0].text?.body || ""
  const context = body.messages[0].context // Contains product_id from previous message

  // 1. Check if it's a button click
  if (body.messages[0].type === "button") {
    const buttonPayload = body.messages[0].button?.text
    
    // 2. Handle product selection
    if (buttonPayload?.startsWith("Product:")) {
      const productId = buttonPayload.split(":")[1].trim()
      
      // Show buy/chat options
      const replyMarkup = {
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "What would you like to do?",
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: `buy_${productId}`,
                  title: "1️⃣ Buy Now",
                },
              },
              {
                type: "reply",
                reply: {
                  id: `ask_${productId}`,
                  title: "2️⃣ Ask Seller",
                },
              },
            ],
          },
        },
      }
      
      await sendWhatsAppInteractive(phoneNumber, replyMarkup)
    }
    
    // 3. Handle Buy Now click
    if (buttonPayload?.startsWith("1️⃣") || buttonPayload === "Buy Now") {
      const productId = context?.product_id
      
      // Trigger order creation
      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/whatsapp-create-order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_KEY")}`,
          },
          body: JSON.stringify({
            type: "order_create",
            from: phoneNumber,
            product_id: productId,
          }),
        }
      )
      
      const result = await response.json()
      
      if (!result.success) {
        // Send error message
        await sendWhatsAppMessage(
          phoneNumber,
          `❌ Couldn't create order. Try again or contact support.`
        )
      }
      // Success message sent by whatsapp-create-order function
    }
  }
}
```

---

### 2. Seller Dashboard Orders Tab

**File**: `src/pages/SellerDashboard.tsx`

```typescript
// Add to component state
const [orders, setOrders] = useState<any[]>([])
const [filteredOrders, setFilteredOrders] = useState<any[]>([])

// Add to useEffect
useEffect(() => {
  if (store?.id) {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from("order_items")
        .select(`
          *,
          orders(
            id,
            buyer_phone,
            total_amount,
            payment_status,
            status,
            delivery_address,
            created_at,
            paid_at
          ),
          products(title, price),
          profiles:orders(full_name)
        `)
        .eq("seller_id", store.id)
        .order("id", { ascending: false })

      if (data) {
        setOrders(data)
        // Apply status filter
        const filtered = data.filter(o => {
          if (statusFilter === "pending") return o.orders?.payment_status === "unpaid"
          if (statusFilter === "paid") return o.orders?.payment_status === "paid"
          if (statusFilter === "dispatched") return o.item_status === "dispatched"
          if (statusFilter === "completed") return o.item_status === "delivered"
          return true
        })
        setFilteredOrders(filtered)
      }
    }
    fetchOrders()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel("order_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `seller_id=eq.${store.id}`,
        },
        () => {
          fetchOrders() // Refresh on any change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }
}, [store?.id])

// Add tab button
<TabBtn
  active={tab === "orders"}
  onClick={() => setTab("orders")}
  label="Orders"
  count={orders.filter((o) => o.orders?.payment_status === "paid").length}
/>

// Add orders tab content
{tab === "orders" && (
  <div className="space-y-4">
    {/* Status filter */}
    <div className="flex gap-2">
      {["all", "pending", "paid", "dispatched", "completed"].map((status) => (
        <button
          key={status}
          onClick={() => setStatusFilter(status)}
          className={`px-4 py-2 rounded-lg font-bold uppercase text-xs ${
            statusFilter === status
              ? "bg-slate-900 text-white"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          {status === "pending"
            ? "Awaiting Payment"
            : status === "paid"
            ? "Paid"
            : status === "dispatched"
            ? "Shipped"
            : status === "completed"
            ? "Delivered"
            : "All Orders"}
        </button>
      ))}
    </div>

    {/* Orders table */}
    <SellerOrdersTable
      filteredOrders={filteredOrders}
      searchQuery={searchQuery}
      updateItemStatus={updateItemStatus}
      sellerType={store?.seller_type}
    />
  </div>
)}
```

---

### 3. Update Order Status (Trigger Notifications)

**File**: `src/pages/SellerDashboard.tsx`

```typescript
const updateItemStatus = async (itemId: string, newStatus: string) => {
  try {
    // Update in database
    const { error } = await supabase
      .from("order_items")
      .update({
        item_status: newStatus,
      })
      .eq("id", itemId)

    if (error) throw error

    // Get order details for notification
    const updatedItem = orders.find((o) => o.id === itemId)
    const orderId = updatedItem?.orders?.id

    if (orderId) {
      // Update order status if all items have same status
      const allItemsStatus = orders
        .filter((o) => o.orders?.id === orderId)
        .map((o) => (o.id === itemId ? newStatus : o.item_status))

      if (allItemsStatus.every((s) => s === newStatus)) {
        await supabase
          .from("orders")
          .update({
            status:
              newStatus === "dispatched"
                ? "dispatched"
                : newStatus === "delivered"
                ? "completed"
                : newStatus === "packed"
                ? "finalized"
                : newStatus,
          })
          .eq("id", orderId)
      }
    }

    // Refresh orders
    setOrders((prev) =>
      prev.map((o) =>
        o.id === itemId ? { ...o, item_status: newStatus } : o
      )
    )

    // Show success toast
    addToast(`Order status updated to ${newStatus}`, "success")
  } catch (error) {
    addToast(`Failed to update order: ${error.message}`, "error")
  }
}
```

---

### 4. Orders Page (Buyer Side)

**File**: `src/pages/Orders.tsx` (Already exists, just update)

```typescript
// Add payment status display
const getPaymentStatusBadge = (paymentStatus: string) => {
  switch (paymentStatus) {
    case "paid":
      return (
        <Badge variant="success" className="font-bold">
          ✅ Paid
        </Badge>
      )
    case "unpaid":
      return (
        <Badge variant="outline" className="font-bold">
          ⏳ Awaiting Payment
        </Badge>
      )
    case "failed":
      return (
        <Badge variant="danger" className="font-bold">
          ❌ Payment Failed
        </Badge>
      )
    default:
      return null
  }
}

// In order card, add payment info
<div className="flex items-center justify-between">
  <div>
    <h3 className="font-bold text-slate-900">Order #{order.id.slice(0, 8)}</h3>
    <p className="text-sm text-stone-600">{new Date(order.created_at).toLocaleDateString()}</p>
  </div>
  <div className="text-right">
    {getPaymentStatusBadge(order.payment_status)}
    <p className="text-2xl font-black mt-2">R{order.total_amount.toFixed(2)}</p>
  </div>
</div>

// If unpaid, show retry payment button
{order.payment_status === "unpaid" && (
  <button
    onClick={() => retryPayment(order.id)}
    className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
  >
    💳 Complete Payment
  </button>
)}

// Helper function to retry payment
const retryPayment = async (orderId: string) => {
  // Fetch payment link from payments table
  const { data: payment } = await supabase
    .from("payments")
    .select("payment_url")
    .eq("order_id", orderId)
    .single()

  if (payment?.payment_url) {
    window.location.href = payment.payment_url
  }
}
```

---

## 📊 Database Query Examples

### Get All Orders for Seller (Last 7 Days)
```sql
SELECT 
  o.id,
  o.buyer_phone,
  o.total_amount,
  o.payment_status,
  o.status,
  o.created_at,
  oi.item_status,
  p.title as product_title
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN products p ON oi.product_id = p.id
WHERE oi.seller_id = $1
  AND o.created_at > NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC;
```

### Calculate Seller Payout
```sql
SELECT 
  sp.store_name,
  COUNT(oi.id) as order_count,
  SUM(oi.seller_payout) as total_payout,
  SUM(oi.commission_amount) as total_commission
FROM order_items oi
JOIN seller_profiles sp ON oi.seller_id = sp.id
WHERE oi.seller_id = $1
  AND oi.item_status = 'delivered'
  AND o.payment_status = 'paid'
GROUP BY sp.id;
```

### Payment Success Rate
```sql
SELECT 
  CONCAT(ROUND(COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*), 2), '%') as success_rate,
  COUNT(*) as total_payments,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM payments;
```

---

## 🧪 Test Cases (Copy-Paste Ready)

### Test Case 1: Create Order via Edge Function
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-create-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -d '{
    "type": "order_create",
    "from": "+27671234567",
    "product_id": "copy-actual-product-uuid-here",
    "seller_id": "copy-actual-seller-uuid-here"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "order_id": "uuid-of-new-order",
  "payment_link": "https://www.payfast.co.za/eng/process?...",
  "amount": 50.00
}
```

### Test Case 2: Simulate PayFast Webhook
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/payfast-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'pf_payment_id=123456789&m_payment_id=order-uuid&amount_gross=50.00&payment_status=COMPLETE&pf_signature=xxxxx'
```

### Test Case 3: Check Order Status
```sql
SELECT 
  id,
  buyer_phone,
  status,
  payment_status,
  created_at,
  paid_at
FROM orders
WHERE id = 'copy-order-uuid-here';
```

### Test Case 4: Verify Notification Sent
```sql
SELECT 
  id,
  user_id,
  type,
  title,
  message,
  created_at
FROM notifications
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 10;
```

---

## 🎯 Buyer Flow (Example Conversation)

```
BUYER: "Hi I want to buy something"

BOT: "Welcome to EmallPlace! 👋

Here are trending items:
🌶️ Mango Atchaar R45
🥨 Spicy Beans R30
🍪 Sugar Cookies R25"

BUYER: [Clicks "Mango Atchaar"]

BOT: "🛒 *Mango Atchaar* - R45

1️⃣ Buy Now
2️⃣ Ask Seller
3️⃣ View More"

BUYER: [Clicks "1️⃣ Buy Now"]

BOT: "🧾 *Order Created!*

Product: Mango Atchaar
Amount: R45.00
Order ID: ABC12345

💳 Pay Now:
https://payfast.co.za/eng/process?..."

BUYER: [Clicks link, pays R45 on PayFast]

BOT: "✅ *Payment Successful!*

Your order is confirmed! 🎉

Order ID: ABC12345
Product: Mango Atchaar
Amount Paid: R45.00

📦 Seller is packing your order. 
You'll get updates as it moves!"

[Simultaneously, seller gets notification:
"💰 PAYMENT RECEIVED!
Order: ABC12345
Amount: R45
Buyer: 0671234567
Next: Pack & ship from EmallPlace dashboard"]
```

---

## 🔑 Environment Variable Setup

**Supabase Dashboard > Settings > Environment Variables**

```
# Core Supabase
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=103xxxxxxxxxxxxxxxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxxxxxxxxxx

# PayFast
PAYFAST_MERCHANT_ID=10001234
PAYFAST_MERCHANT_KEY=mk_live_xxxxxxxxxxxxx
PAYFAST_PASSPHRASE=YourSecurePassphrase123!

# URLs
WEBHOOK_URL=https://abcdefgh.supabase.co/functions/v1/payfast-webhook
```

**How to find these values**:

1. **Supabase**:
   - Dashboard > Settings > API
   - Copy from there

2. **WhatsApp**:
   - Meta Business Manager > WhatsApp > Settings > API Setup
   - Get Access Token and Phone ID

3. **PayFast**:
   - Dashboard > Settings > Merchant Details
   - Scroll to API Integration
   - Copy Merchant ID and Key

---

## 📱 Mobile-Optimized Bot Messages

For WhatsApp display:

```
✅ Use emojis (quick visual scanning)
✅ Keep lines short (mobile width ~60 chars)
✅ Use numbered lists (1️⃣ 2️⃣ 3️⃣)
✅ Bold important info using *text*
✅ Separate sections with line breaks

❌ Avoid: Long paragraphs, too many emojis, HTML formatting
```

**Good example:**
```
🛒 Mango Atchaar - R45

1️⃣ Buy Now
2️⃣ Ask Seller
3️⃣ View More
```

**Bad example:**
```
Would you like to purchase the delicious homemade Mango Atchaar for the special price of R45.00 today? Please select an option from the buttons below to proceed with your purchase or ask the seller any questions you might have.
```

---

## 🚀 Deployment Checklist (Final)

Before going live:

```
✅ Database schema deployed and verified
✅ Edge functions deployed and tested
✅ PayFast merchant account configured
✅ Environment variables set in Supabase
✅ WhatsApp bot updated with order flow
✅ Seller dashboard displays orders
✅ Notifications working end-to-end
✅ Test order completed successfully
✅ Payment webhook verified
✅ Security validations in place
✅ Error messages working
✅ All links point to correct URLs
✅ Bot messages formatted for mobile
```

Done? 🎉 **You now have a revenue engine!**
