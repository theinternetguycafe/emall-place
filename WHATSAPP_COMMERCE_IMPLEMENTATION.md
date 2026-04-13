# 🤖 WhatsApp Commerce + Dispatch System - Implementation Plan

**Status**: In Progress  
**Last Updated**: April 12, 2026  
**Complexity**: High (Full system integration)

---

## 📋 Overview

Building a WhatsApp-native marketplace operating system for EmallPlace that integrates:
- ✅ WhatsApp Bot (routing & state management)
- ✅ Orders & Payments (PayFast integration)
- ✅ Buyer ↔ Seller messaging
- ✅ Delivery dispatch (driver assignment)
- ✅ Admin logging & dashboards

---

## 🗄️ Database Schema (NEW TABLES)

### Phase 1: Core Schema Creation
- [ ] `conversations` - Buyer-Seller conversation tracking
- [ ] `messages` - All messages in conversations (buyer, seller, bot)
- [ ] `payments` - Payment records linked to orders
- [ ] `deliveries` - Delivery assignments with pickup/dropoff
- [ ] `dispatch_requests` - Driver request queue
- [ ] `system_logs` - Audit trail for all actions

**File**: `supabase/migrations/14_whatsapp_commerce_system.sql`

---

## 🔐 RLS Policies

- [ ] `conversations`: Buyers/Sellers see only their own
- [ ] `messages`: Visible to conversation participants
- [ ] `payments`: Order visibility permissions
- [ ] `deliveries`: Drivers see assigned, sellers/admins see all
- [ ] `dispatch_requests`: Drivers see open requests
- [ ] `system_logs`: Admins only

---

## 🤖 Edge Functions

### 1. WhatsApp Webhook (`whatsapp-webhook/index.ts`)
- [ ] Verify webhook signature
- [ ] Extract message & sender
- [ ] Route by sender role (buyer/seller/driver)
- [ ] State machine implementation
- [ ] Create conversations on first contact
- [ ] Handle numeric replies (1, 2, 3)
- [ ] Forward messages between buyers & sellers
- [ ] Log all interactions

### 2. Payment Webhook (`payfast-webhook/index.ts`) - EXTEND
- [ ] Verify PayFast signature
- [ ] Update order status → paid
- [ ] Create delivery record
- [ ] Send dispatch requests to drivers
- [ ] Notify buyer & seller
- [ ] Log payment event

### 3. Dispatch Assignment (NEW)
- [ ] Accept driver responses
- [ ] First-accept-wins logic (handle race conditions)
- [ ] Assign driver to delivery
- [ ] Notify all parties
- [ ] Update order state

---

## 🧩 Frontend Components

### 1. Product Pages
- [ ] Replace seller WhatsApp links with BOT number
- [ ] Link format: `wa.me/BOT_NUMBER?text=Hi%20(ID:product-id)`
- [ ] Add "Ask on WhatsApp" button

### 2. Seller Dashboard (NEW Tabs)
- [ ] **Leads**: Conversations where seller hasn't responded yet
- [ ] **Orders**: All orders from WhatsApp commerce
- [ ] **Messages**: Chat history with buyers

### 3. Admin Dashboard (NEW Tabs)
- [ ] **Orders**: All orders with status
- [ ] **Conversations**: All buyer-seller chats
- [ ] **Deliveries**: Active & completed deliveries
- [ ] **Payments**: Payment history & status
- [ ] **Dispatch**: Driver requests & assignments
- [ ] **System Logs**: Audit trail of all actions

---

## 🔄 State Machine

```
START
├─ VIEWING_PRODUCT
│  ├─→ CHOOSING_ACTION (user responds to prompt)
│  │   ├─→ "1" = ORDER_PENDING
│  │   └─→ "2" = WAITING_FOR_SELLER
│  │
│  └─ WAITING_FOR_BUYER (seller awaits buyer confirmation)
│
├─ ORDER_PENDING
│  ├─ (auto-create payment link)
│  └─→ AWAITING_PAYMENT
│
├─ AWAITING_PAYMENT
│  ├─ (payment webhook received)
│  └─→ DISPATCHING
│
├─ DISPATCHING
│  ├─ (request drivers)
│  └─→ DELIVERY_ASSIGNED (first driver accepts)
│
└─ DELIVERY_ASSIGNED
   └─→ COMPLETED (driver marks delivered)
```

---

## 💳 Payment Flow

1. Order created → Generate PayFast link
2. Store in: `payments` table
3. User clicks link → PayFast checkout
4. Payment webhook received → Update `orders.payment_status='paid'`
5. Auto-trigger dispatch requests

---

## 🚚 Dispatch Flow

1. After payment → Create `dispatch_request` (status='waiting')
2. Send to drivers: "🚨 Delivery Available? 1️⃣ Yes 2️⃣ No"
3. First driver to reply "1" → `deliveries` created + assigned
4. Update order state → DELIVERY_ASSIGNED
5. Notify buyer, seller, driver with full details

---

## 📊 Logging Strategy

Every action logged in `system_logs`:
- Order created
- Payment received
- Conversation started
- Message sent
- Driver assigned
- Delivery completed
- Disputes/errors

**Format**:
```json
{
  "type": "order_created|payment_received|driver_assigned|...",
  "reference_id": "order-id or conversation-id",
  "message": "Human readable",
  "created_at": "timestamp"
}
```

---

## 📞 WhatsApp Bot Behavior

### Buyer Flow
```
Buyer: Hi (ID:abc123)
Bot: 🛒 Product: Widget - R99
     1️⃣ Buy Now  2️⃣ Ask Seller  3️⃣ View More

[If 1]
Bot: 💳 Pay here: [PayFast Link]

[If 2]
Bot: ✍️ Ask your question:
[Message forwarded to seller]
Seller receives in dashboard

Seller: Yes, we have stock
Bot translates to buyer
```

### Seller Flow
```
Seller: [Receives question from buyer]
Dashboard alert: "Buyer asking about stock..."
Seller replies: "Yes"
Bot: Response sent to buyer ✓

[After payment]
Bot: 🚗 Order paid! Prepare for pickup
Driver: [Accepts delivery]
Bot: Driver assigned - Pickup at [address]
```

### Driver Flow
```
Bot: 🚨 Delivery Available?
     Pickup: [address]
     1️⃣ Accept  2️⃣ Pass

[If 1]
Bot: Assignment confirmed!
     Dropoff: [buyer address]
     Payment: [payment link]

Driver: [Marks delivered]
Bot: Order complete! ✓
```

---

## ⚙️ Configuration

### Environment Variables
```
WHATSAPP_VERIFY_TOKEN=your-token
META_ACCESS_TOKEN=your-token
META_PHONE_NUMBER_ID=your-id
PAYFAST_MERCHANT_ID=
PAYFAST_MERCHANT_KEY=
PAYFAST_PASSPHRASE=
BOT_WHATSAPP_NUMBER=27XXXXXXXXX
```

---

## 🧪 Testing Checklist

- [ ] Webhook signature verification
- [ ] Message parsing (product ID extraction)
- [ ] State machine transitions
- [ ] Conversation creation
- [ ] Message forwarding
- [ ] Product lookup
- [ ] Payment initiation
- [ ] Payment webhook handling
- [ ] Driver dispatch requests
- [ ] RLS policy enforcement
- [ ] Logging accuracy
- [ ] Error handling & recovery
- [ ] Concurrency (race conditions)

---

## 📈 Deployment Steps

1. **Database migrations** → New tables & RLS
2. **Edge functions** → Deploy updated webhooks
3. **Frontend** → Update components & dashboards
4. **Environment** → Configure secrets
5. **Testing** → Run smoke tests
6. **Monitoring** → Setup logging queries
7. **Go live** → Enable bot on production

---

## ✅ Success Criteria

- [ ] Buyer WhatsApp message (with product ID) triggers bot response
- [ ] Buyer can order & pay through bot
- [ ] Seller receives notification in dashboard
- [ ] Seller can respond via bot
- [ ] Payment webhook updates order status
- [ ] Drivers receive dispatch requests
- [ ] First driver to accept gets assigned
- [ ] All actions logged in system_logs
- [ ] Admin can see all activity in dashboards
- [ ] No existing functionality broken

---

## 🚀 Next Steps

1. ✅ **Create migration** for core schema
2. ✅ **Implement WhatsApp webhook** with state machine
3. ✅ **Extend payment webhook**
4. ✅ **Build dispatch logic**
5. ✅ **Create admin dashboards**
6. ✅ **Update frontend components**
7. ✅ **Deploy & test**

