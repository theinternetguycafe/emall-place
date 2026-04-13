# PHASE 3: ORDERS + PAYMENTS - Complete Implementation Guide

## 🎯 Overview

This guide implements the complete WhatsApp → Order → Payment → Notification flow, turning WhatsApp chats into a revenue-generating transaction engine.

**Timeline**: ~4-6 hours full implementation
**Revenue Impact**: Every customer can now pay directly in WhatsApp
**Complexity**: High (database + functions + integrations)

---

## 📋 COMPLETE CHECKLIST

### PART 1: Database Setup (30 mins)
- [ ] Run `PHASE3_DATABASE_SCHEMA.sql` in Supabase
- [ ] Verify 4 tables created: orders, payments, order_items, order_transactions
- [ ] Verify indexes created
- [ ] Verify RLS policies applied
- [ ] Verify helper functions created

### PART 2: Edge Functions Deployment (1 hour)
- [ ] Create `supabase/functions/whatsapp-create-order/index.ts`
- [ ] Create `supabase/functions/payfast-webhook/index.ts`
- [ ] Set environment variables (see below)
- [ ] Deploy both functions
- [ ] Test with dummy requests

### PART 3: PayFast Integration (30 mins)
- [ ] Create PayFast merchant account (payfast.co.za)
- [ ] Get Merchant ID and Merchant Key
- [ ] Set passphrase
- [ ] Add webhook endpoint to PayFast account
- [ ] Test payment link generation

### PART 4: WhatsApp Bot Updates (1 hour)
- [ ] Update bot flow to detect product selection
- [ ] Integrate `whatsapp-create-order` function call
- [ ] Update button responses to trigger order creation
- [ ] Test full flow: Product → Order → Payment Link

### PART 5: Seller Dashboard (1 hour)
- [ ] Add "Orders" tab to SellerDashboard
- [ ] Display pending, paid, and dispatched orders
- [ ] Add status update dropdown
- [ ] Integrate notifications on status change
- [ ] Show revenue metrics

### PART 6: Testing & Security (1 hour)
- [ ] Perform test orders with dummy data
- [ ] Verify payment webhook works
- [ ] Test notification flow
- [ ] Security audit (amount validation, signature verification, etc.)

---

## 🗂️ File Structure

```
supabase/
├── migrations/
│   └── PHASE3_DATABASE_SCHEMA.sql  ← Run this first!
├── functions/
│   ├── whatsapp-create-order/
│   │   └── index.ts  ← Order creation logic
│   └── payfast-webhook/
│       └── index.ts  ← Payment confirmation
```

```
src/
├── components/
│   └── seller/
│       ├── SellerOrdersTable.tsx  ← ALREADY EXISTS
│       └── SellerPayoutWidget.tsx  ← NEW (optional)
├── pages/
│   ├── SellerDashboard.tsx  ← UPDATE to add orders tab
│   └── Orders.tsx  ← Already exists (buyer side)
└── lib/
    ├── whatsapp.ts  ← Bot integration
    └── payfast.ts   ← Payment helpers (NEW)
```

---

## 🔑 Environment Variables

Set these in Supabase Dashboard > Settings > Environment Variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxx
WHATSAPP_PHONE_ID=103xxx
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxx

PAYFAST_MERCHANT_ID=10001234
PAYFAST_MERCHANT_KEY=mk_live_xxxx
PAYFAST_PASSPHRASE=your-secure-passphrase

# Webhook URLs
PAYFAST_WEBHOOK_URL=https://your-project.supabase.co/functions/v1/payfast-webhook
```

---

## 🗄️ PART 1: Database Setup (CRITICAL)

### Step 1.1: Run SQL Migration
```
1. Open Supabase Dashboard > SQL Editor
2. Create new query
3. Copy entire content of PHASE3_DATABASE_SCHEMA.sql
4. Paste into SQL Editor
5. Click [Execute]
6. Verify no errors in output
```

### Step 1.2: Verify Tables
```sql
-- Run in SQL Editor to verify:

SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'payments', 'order_items', 'order_transactions');

-- Should return 4 rows
```

### Step 1.3: Verify Indexes
```sql
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'orders';

-- Should see idx_orders_buyer_phone, idx_orders_seller_id, etc.
```

### Step 1.4: Test Insert
```sql
-- Quick test to verify everything works:
INSERT INTO public.orders (
  buyer_phone,
  status,
  payment_status,
  quantity,
  unit_price,
  subtotal,
  total_amount
) VALUES (
  '+27671234567',
  'pending',
  'unpaid',
  1,
  50.00,
  50.00,
  50.00
);

-- Should succeed, verify table has row
SELECT COUNT(*) FROM public.orders;
```

---

## ⚙️ PART 2: Edge Functions Deployment

### Step 2.1: Create Function Directories
```bash
cd supabase/functions

# Create order function
mkdir -p whatsapp-create-order
touch whatsapp-create-order/index.ts

# Create webhook function
mkdir -p payfast-webhook
touch payfast-webhook/index.ts
```

### Step 2.2: Copy Function Code
```bash
# Copy supabase_functions_whatsapp_create_order.ts
#   → supabase/functions/whatsapp-create-order/index.ts

# Copy supabase_functions_payfast_webhook.ts
#   → supabase/functions/payfast-webhook/index.ts
```

### Step 2.3: Deploy Functions
```bash
# From project root
supabase functions deploy whatsapp-create-order --no-verify-jwt
supabase functions deploy payfast-webhook --no-verify-jwt

# Verify deployment
supabase functions list
```

### Step 2.4: Test Order Creation Function
```bash
# Test via curl (or Postman)
curl -X POST https://your-project.supabase.co/functions/v1/whatsapp-create-order \
  -H "Content-Type: application/json" \
  -d '{
    "type": "order_create",
    "from": "+27671234567",
    "product_id": "actual-product-uuid",
    "seller_id": "actual-seller-uuid"
  }'

# Should return:
# {
#   "success": true,
#   "order_id": "uuid",
#   "payment_link": "https://payfast.co.za/...",
#   "amount": 50.00
# }
```

---

## 💳 PART 3: PayFast Integration

### Step 3.1: Create PayFast Merchant Account
1. Go to https://www.payfast.co.za/
2. Sign up as "Merchant"
3. Complete KYC verification
4. Get Merchant ID and Merchant Key from dashboard

### Step 3.2: Configure Webhook
1. PayFast Dashboard > Settings > Instant Transaction Notifications (ITN)
2. Enable ITN
3. Add Webhook URL: `https://your-project.supabase.co/functions/v1/payfast-webhook`
4. Select "Secure" if available
5. Set passphrase (any strong string you choose)
6. Save

### Step 3.3: Set Environment Variables
```
In Supabase Dashboard > Settings > Environment Variables:

PAYFAST_MERCHANT_ID=10001234
PAYFAST_MERCHANT_KEY=mk_live_xxxx
PAYFAST_PASSPHRASE=YourSecurePassphrase123!
```

### Step 3.4: Test Payment Flow
```bash
# 1. Create test order
curl ... (as in Step 2.4)

# 2. You'll get a payment_link from response
# 3. Open in browser (or share to test phone)
# 4. Complete payment with test card:
#    Card: 4111 1111 1111 1111
#    Exp: 12/25
#    CVV: 123
#
# 5. Should get confirmation page
# 6. Check Supabase orders table → payment_status should change to "paid"
```

---

## 🤖 PART 4: WhatsApp Bot Updates

### Current Bot Flow
```
User: "Hi, I'm interested in products"
Bot: "Here are hot items 🔥"
     [Product 1: Mango Atchaar - R45]
     [Product 2: Beans - R30]

User: Clicks "Product 1"
Bot: ??? Currently just shows product info
```

### Updated Bot Flow
```
User: Clicks "Product 1"
Bot: 
  "🛒 Mango Atchaar - R45
   
   1️⃣ Buy Now
   2️⃣ Ask Seller
   3️⃣ View More"

User: Clicks "1️⃣ Buy Now"
Bot: Triggers whatsapp-create-order function ← NEW
     Sends order confirmation message with payment link ← NEW
     
User: Clicks payment link
     Completes payment on PayFast ← NEW
     
PayFast: Sends webhook to your function
         Function updates order status to "paid"
         Function notifies seller and buyer ← ALL AUTOMATIC
```

### Implementation (Update Wherever Your Bot Flows Are)

**File**: `src/lib/whatsapp.ts` or your bot integration file

```typescript
// New function: Handle product selection with Buy Now button
export async function handleBuyNowClick(
  phoneNumber: string,
  productId: string
) {
  try {
    // Call the Edge Function
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/whatsapp-create-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          type: "order_create",
          from: phoneNumber,
          product_id: productId,
        }),
      }
    )

    const data = await response.json()
    
    if (data.success) {
      console.log("Order created:", data.order_id)
      // Bot will automatically send message via whatsapp-create-order function
      return { success: true, orderId: data.order_id }
    } else {
      // Send error message to user
      await sendWhatsAppMessage(
        phoneNumber,
        `⚠️ Couldn't create order. Please try again.\n\nError: ${data.error}`
      )
      return { success: false, error: data.error }
    }
  } catch (error) {
    console.error("Buy Now error:", error)
    return { success: false, error: error.message }
  }
}
```

### Update Bot Button Responses

**In your webhook handler** (where you process button clicks):

```typescript
if (buttonText === "1️⃣ Buy Now" || buttonText === "Buy Now") {
  const productId = extract_product_id_from_context(messageContext)
  
  const result = await handleBuyNowClick(phoneNumber, productId)
  
  if (result.success) {
    // Order created, whatsapp-create-order function sends message
    console.log(`Order created: ${result.orderId}`)
  } else {
    // Error handled by function
    console.error(result.error)
  }
}
```

---

## 📊 PART 5: Seller Dashboard Orders Tab

### Current State
You already have `SellerOrdersTable.tsx` which displays orders. Now we need to integrate it into SellerDashboard.

### Update: `src/pages/SellerDashboard.tsx`

**Add state for orders**:
```typescript
const [orders, setOrders] = useState<any[]>([])  // Add this

// In useEffect that fetches data:
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
        created_at,
        paid_at
      ),
      products(title)
    `)
    .eq("seller_id", store?.id)
    .order("id", { ascending: false })
  
  setOrders(data || [])
}

// Call in useEffect
useEffect(() => {
  if (store?.id) fetchOrders()
}, [store?.id])
```

**Add tab button**:
```tsx
<TabBtn 
  active={tab === 'orders'} 
  onClick={() => setTab('orders')} 
  label="Orders" 
  count={orders.filter(o => o.orders?.payment_status === 'paid').length}
/>
```

**Add orders tab content**:
```tsx
{tab === 'orders' && (
  <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
    <SellerOrdersTable
      filteredOrders={orders.filter(o => o.orders?.payment_status === 'paid')}
      searchQuery={searchQuery}
      updateItemStatus={updateItemStatus}
      sellerType={store?.seller_type}
    />
  </div>
)}
```

### Key Order States (Sync with Database)

```
Seller Dashboard Status → Database Status → Notification
───────────────────────────────────────────────────────
Pending          → pending         → "Order received"
Ready to Ship    → finalized       → "Order packed, ready to ship"
Shipped          → dispatched      → Buyer: "Order on the way"
In Transit       → in_transit      → (Automated by courier)
Delivered        → delivered       → Buyer: "Order arrived, rate now"
Completed       → completed       → Final, moved to history
```

---

## 🔐 PART 6: Security & Testing

### Security Checklist
- [ ] **Signature Verification**: PayFast webhooks signed with passphrase
- [ ] **Amount Validation**: Order amount matches payment amount (prevent tampering)
- [ ] **User Authentication**: Only authenticated users can access orders
- [ ] **RLS Policies**: Buyers see only their orders, sellers see only their sales
- [ ] **Rate Limiting**: Prevent order spam (implement later with Supabase auth)
- [ ] **Webhook Idempotency**: Don't process same payment twice

### Security Implementation

**In PayFast webhook handler**:
```typescript
// 1. Verify signature
const isValidSignature = verifyPayFastSignature(payfastData, PAYFAST_PASSPHRASE)
if (!isValidSignature) {
  return new Response({ error: "Invalid signature" }, { status: 401 })
}

// 2. Verify amount (CRITICAL)
const expectedAmount = order.total_amount.toFixed(2)
const actualAmount = payfastData.amount_gross.toFixed(2)
if (expectedAmount !== actualAmount) {
  return new Response({ error: "Amount mismatch" }, { status: 400 })
}

// 3. Check if already processed (idempotency)
const { data: existingPayment } = await supabase
  .from("payments")
  .select("id")
  .eq("order_id", orderId)
  .eq("status", "success")
  .single()

if (existingPayment) {
  console.log("Payment already processed, skipping")
  return new Response({ success: true }, { status: 200 })
}
```

### Test Scenarios

**Test 1: Successful Order → Payment**
```
1. Create order via WhatsApp (or test function)
2. Verify order appears in Supabase with payment_status = 'unpaid'
3. Complete test payment on PayFast
4. Verify webhook received (check Supabase logs)
5. Verify order.payment_status changed to 'paid'
6. Verify notifications sent to buyer + seller
```

**Test 2: Failed Payment**
```
1. Create order
2. Enter invalid payment details on PayFast
3. Verify payment fails
4. Verify order.payment_status = 'failed'
5. Verify error message sent to buyer
6. Verify seller NOT notified
```

**Test 3: Amount Tampering**
```
1. Create order for R50
2. In PayFast webhook, manually change amount_gross to R10
3. Verify webhook rejects with "Amount mismatch" error
4. Verify order.payment_status stays 'unpaid'
```

---

## 🎯 INTEGRATION WITH EXISTING SYSTEM

### How This Fits With Notifications

**Order Created** (WhatsApp bot):
```
whatsapp-create-order function
  → Creates order in DB
  → Creates payment record
  → Sends WhatsApp message to buyer
  → Sends WhatsApp message to seller
```

**Payment Received** (PayFast webhook):
```
payfast-webhook function
  → Updates order.payment_status = 'paid'
  → Triggers notification: 'order' type
  → Sends WhatsApp confirmation
  → Seller sees notification bell + SMS alert
```

**Order Status Change** (Seller Dashboard):
```
Seller updates status dropdown
  → Updates order_items.item_status
  → Database trigger fires (from ADD_ORDER_LIFECYCLE_NOTIFICATIONS.sql)
  → Creates notification record
  → Buyer gets notification
  → Admin sees activity feed
```

---

## 📊 Metrics to Track

After deployment, monitor:
```
1. Order Creation Rate
   SELECT COUNT(*) FROM orders 
   WHERE created_at > NOW() - INTERVAL '24 hours'

2. Payment Success Rate
   SELECT COUNT(*) FROM payments 
   WHERE status = 'success' / COUNT(*) FROM payments

3. Average Order Value
   SELECT AVG(total_amount) FROM orders 
   WHERE payment_status = 'paid'

4. Seller Response Time
   SELECT AVG(EXTRACT(EPOCH FROM (paid_at - created_at))) / 3600
   FROM orders

5. Delivery Rate
   SELECT COUNT(*) FROM orders 
   WHERE status = 'completed' / COUNT(*) FROM orders
```

---

## 🐛 Common Issues & Fixes

### Issue: Payment webhook not received
```
✓ Verify webhook URL in PayFast dashboard
✓ Check Supabase logs for function errors
✓ Verify PAYFAST_PASSPHRASE matches in PayFast settings
✓ Test with PayFast's "Test ITN" feature
```

### Issue: Order shows 'paid' but seller doesn't get notified
```
✓ Check WHATSAPP_ACCESS_TOKEN is valid
✓ Verify seller phone number is correct
✓ Check phone number format (should be 27671234567)
✓ Check WhatsApp business account is in production
```

### Issue: "Amount mismatch" error
```
✓ Verify no delivery fee calculation issues
✓ Check decimal precision (use toFixed(2))
✓ Ensure product price in DB matches order.unit_price
```

### Issue: RLS Policy blocking order creation
```
✓ Verify service role has INSERT permission on orders table
✓ Check INSERT policy: WITH CHECK (true)
✓ Verify GRANTS at end of SQL script were executed
```

---

## 🚀 Next Steps After Implementation

### Phase 3a: Delivery Tracking (Future)
```
- Integrate courier API (Pick n Pay Delivery, PostNet, etc.)
- Auto-update order status based on courier scans
- Show tracking link to customer in notification
```

### Phase 3b: Refunds & Disputes (Future)
```
- Add refund request button in Orders page
- Admin approval workflow
- Auto-refund processing via PayFast
```

### Phase 3c: Analytics & Payouts (Future)
```
- Seller payout dashboard (weekly/monthly)
- Revenue graphs and trends
- Automatic bank transfer to sellers
```

### Phase 3d: Mobile App (Future)
```
- iOS/Android app for sellers (get orders, update status)
- Push notifications instead of WhatsApp
- Live location tracking for couriers
```

---

## 📞 Support & Debugging

### Enable Detailed Logging
```typescript
// Add to all functions:
console.log("[Phase3] Event:", eventName, eventData)

// Check logs in:
// Supabase Dashboard > Functions > Logs tab
```

### Test Payment Link Generation
```typescript
// Quick test of createPayFastLink function
const testOrder = {
  id: "test-uuid",
  total_amount: 50.00,
}
const testProduct = {
  title: "Test Product"
}
const link = createPayFastLink(testOrder, testProduct)
console.log("Payment link:", link)
// Should output full PayFast redirect URL
```

### WhatsApp Message Testing
```
Send dummy message to yourself:
await sendWhatsAppMessage("+27671234567", "Test message 🧪")

Check if you receive it on WhatsApp
If not, verify:
- WHATSAPP_ACCESS_TOKEN is valid
- WHATSAPP_PHONE_ID matches your connected phone
- Your account is in production (not test)
```

---

## 🎉 Success Criteria

After full implementation, you should be able to:

✅ Customer browses marketplace on WhatsApp
✅ Customer clicks "Buy Now" for a product
✅ Order automatically created in database
✅ Payment link sent to customer
✅ Customer pays via PayFast
✅ Webhook confirms payment
✅ Order status changes to "paid"
✅ Seller receives WhatsApp notification
✅ Buyer receives WhatsApp confirmation
✅ Admin sees order in activity feed
✅ Seller updates order status in dashboard
✅ Buyer receives delivery tracking notification
✅ Revenue recorded in system
✅ Seller payout calculated

**If all 13 points work: PHASE 3 = COMPLETE ✅**

