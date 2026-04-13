# 💳 Yoco Payment Integration - WhatsApp Commerce

**Status**: ✅ Complete  
**Provider**: Yoco (all payments)  
**Updated**: April 12, 2026

---

## 🔄 Payment Flow

```
Buyer: 🛒 Initiates order via WhatsApp
    ↓
Bot: Creates order + generates Yoco checkout link
    ↓
Buyer: Clicks link → Yoco checkout
    ↓
Yoco: Processes payment
    ↓
Yoco Webhook: Notifies system (yoco-webhook)
    ↓
System: 
  ✅ Updates order status → "processing"
  ✅ Updates payment status → "paid"
  ✅ Creates dispatch_request (waits for driver)
  ✅ Broadcasts to all available drivers
    ↓
Drivers: Receive WhatsApp dispatch request
    ↓
First Driver: Accepts → Gets assigned
    ↓
Buyer/Seller: Notified of driver assignment
```

---

## 📝 Configuration

Add these environment variables to `.env`:

```bash
# Yoco
YOCO_SECRET_KEY=sk_xxxxxxxxxxxx
YOCO_WEBHOOK_SECRET=whsk_xxxxxxxxxxxx
YOCO_MODE=sandbox  # or 'live'

# WhatsApp
META_ACCESS_TOKEN=your_whatsapp_token
META_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
BOT_PHONE=27XXXXXXXXX

# App URLs
APP_URL=https://emallplace.com
API_URL=https://api.emallplace.com
```

---

## 🔌 Edge Functions

### 1. **WhatsApp Webhook** (main router)
**File**: `supabase/functions/whatsapp-webhook/index.ts`

**Flow**:
- ✅ Receives WhatsApp message
- ✅ Extracts product ID
- ✅ Routes by sender role (buyer/seller/driver)
- ✅ Creates conversations & orders
- ✅ Generates **Yoco payment link**
- ✅ Stores messages to database
- ✅ Implements state machine in memory

**Key Functions**:
```typescript
determineSenderRole(phone)       // → "buyer" | "seller" | "driver"
handleBuyerMessage()              // Product inquiry → order → payment
handleSellerMessage()             // Respond to inquiries
handleDriverMessage()             // Accept/reject dispatch
generateYocoLink(order)           // Returns Yoco checkout URL
```

---

### 2. **Yoco Webhook** (payment processor)
**File**: `supabase/functions/yoco-webhook/index.ts`

**Triggered**: When Yoco payment completes (via Meta API or webhook)

**Actions on SUCCESS**:
1. ✅ Verify webhook signature (HMAC-SHA256)
2. ✅ Update `payments` table → status "paid"
3. ✅ Update `orders` table → status "processing"
4. ✅ Create `dispatch_request` entry
5. ✅ Broadcast to all drivers: "New delivery available! 🚚"
6. ✅ Log event to `system_logs`

**Actions on FAILED/CANCELLED**:
1. ✅ Update `payments` table → status "failed" | "cancelled"
2. ✅ Update `orders` table → status "cancelled"
3. ✅ Log event

---

### 3. **Yoco Initiate** (creates checkout)
**File**: `supabase/functions/yoco-initiate/index.ts`

**Purpose**: Generate Yoco payment checkout URL

**Called by**: Frontend checkout page (when user clicks "Pay Now")

**Returns**: `{ checkoutUrl: "https://payments.yoco.com/..." }`

---

## 📊 Database Schema

### Orders (Enhanced)
```sql
id, conversation_id, product_id, seller_id, buyer_phone,
status, payment_status, total_amount, delivery_mode, paid_at, ...
```

### Payments (NEW)
```sql
id, order_id, provider='yoco', status, payment_url, 
amount, currency='ZAR', payment_reference, created_at
```

### Dispatch Requests (NEW)
```sql
id, order_id, status='waiting'|'accepted', 
pickup_address, dropoff_address, expires_at, created_at
```

### System Logs (NEW)
```sql
id, event_type, reference_id, reference_type, message, 
actor_type, actor_id, metadata, created_at
```

---

## 🎯 Key Features

✅ **Single Bot Number**: All communication through ONE WhatsApp number  
✅ **State Machine**: Tracks conversation state (VIEWING_PRODUCT → AWAITING_PAYMENT → DISPATCHING → COMPLETED)  
✅ **Yoco Payments**: Secure payment processing  
✅ **Driver Dispatch**: Automatic broadcast to drivers after payment  
✅ **First-Come-First-Serve**: First driver to accept gets assignment  
✅ **Message Forwarding**: Bot relays buyer↔seller messages  
✅ **Audit Trail**: All actions logged to `system_logs`  
✅ **Concurrency Safe**: Race conditions handled (e.g., driver acceptance)

---

## 🧪 Test Scenario

### 1. Buyer initiates
```
User: Hi (ID:product-uuid)
Bot: 🛒 Product: Laptop
     1️⃣ Buy Now  2️⃣ Ask Seller  3️⃣ Browse More
```

### 2. Buyer chooses action
```
User: 1
Bot: 🛒 Order created!
     💳 Complete payment: [YOCO LINK]
     ⏳ We'll confirm delivery details once payment clears.
```

### 3. Buyer pays on Yoco
- Opens Yoco checkout
- Completes payment with card/Snapscan/ETC

### 4. Webhook fires
- Yoco sends `POST /webhooks/yoco-webhook`
- System updates order → "processing"
- Dispatch request created
- All drivers notified

### 5. Driver accepts
```
Driver: 1 (Accept)
Bot: ✅ Delivery assigned!
     📍 Pickup: [Address]
     🏠 Dropoff: [Address]
```

### 6. Buyer notified
```
Buyer receives: 🚗 Driver assigned!
               📍 Pickup address: ...
               🏠 Dropoff address: ...
```

---

## 🚨 Error Handling

All edge functions return `200 OK` to prevent webhook retry loops:
- ❌ Order not found → Log error, return 200
- ❌ Invalid signature → Log error, return 200
- ❌ Database error → Log error, return 200

Errors logged to `system_logs` with `event_type: 'error'`

---

## 📱 WhatsApp Message Format

### Buyer initiates product inquiry
```
Input: "Hi (ID:abc123)"
  → Product ID extracted
  → Conversation created
  → Bot shows menu
```

### Numeric replies
```
"1" → Buy now
"2" → Ask question
"3" → Browse more
```

### Format: Seller name + Product name
**Required** in product links:
```
wa.me/BOT_NUMBER?text=Hi%20(ID:uuid)
```

---

## 🔐 Security

✅ **RLS Policies**: Users see only their data  
✅ **Webhook Verification**: HMAC-SHA256 signature validation  
✅ **Constant-time Comparison**: Prevents timing attacks  
✅ **Service Role**: Edge functions use service key (not user auth)  
✅ **Phone Verification**: Drivers identified by phone number  

---

## 📊 Monitoring

Check system logs:
```sql
SELECT * FROM system_logs 
WHERE event_type IN ('payment_received', 'dispatch_request_created', 'driver_assigned')
ORDER BY created_at DESC LIMIT 50;
```

Check payment status:
```sql
SELECT o.id, o.status, p.provider, p.status 
FROM orders o 
LEFT JOIN payments p ON o.id = p.order_id 
WHERE o.created_at > now() - interval '24 hours';
```

---

## 🚀 Next Steps

- [ ] Build admin dashboards (Orders, Payments, Dispatch)
- [ ] Update frontend components (WhatsApp button)
- [ ] Add seller dashboard tabs
- [ ] Implement delivery completion workflow
- [ ] Add payment failure handling (retry logic)
- [ ] Setup monitoring & alerts
- [ ] Load testing

---

