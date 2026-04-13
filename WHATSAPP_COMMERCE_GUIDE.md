# 🧠 WhatsApp Commerce Integration - Complete Guide

## Overview

This document provides complete instructions for deploying and using the WhatsApp Commerce system integrated with EmallPlace.

---

## 📋 What's Included

### Backend (Edge Functions)
- ✅ `whatsapp-webhook` - Main router & state machine
- ✅ `whatsapp-create-order` - Order creation from WhatsApp
- ✅ `whatsapp-dispatch` - Driver dispatch management
- ✅ `payfast-webhook` - Enhanced with dispatch triggering

### Database
- ✅ `whatsapp_conversations` - Buyer/seller interaction tracking
- ✅ `whatsapp_messages` - All messages
- ✅ `whatsapp_deliveries` - Delivery logistics
- ✅ `whatsapp_dispatch_requests` - Driver coordination
- ✅ `whatsapp_system_logs` - Comprehensive audit trail

### Frontend Components
- ✅ `WhatsAppShare` - Sharing components for products
- ✅ `WhatsAppDashboard` - Seller dashboard (Leads/Orders/Messages)
- ✅ `AdminWhatsAppDashboard` - Admin visibility (all systems)

---

## 🚀 Deployment Checklist

### 1. Database Migration
```bash
# Run this migration to create all WhatsApp tables
# File: supabase/migrations/20_whatsapp_commerce_complete.sql

supabase db push
```

### 2. Environment Setup

Create/update `.env.local`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# WhatsApp/Meta Configuration
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
META_ACCESS_TOKEN=your_whatsapp_business_token
META_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token
BOT_PHONE=+27XXXXXXXXX  # Central bot number

# Payment Gateway
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase

# Application URLs
APP_URL=https://emallplace.com
API_URL=https://api.emallplace.com
```

### 3. Deploy Edge Functions

```bash
# Deploy all WhatsApp edge functions
supabase functions deploy whatsapp-webhook
supabase functions deploy whatsapp-create-order
supabase functions deploy whatsapp-dispatch
supabase functions deploy payfast-webhook
```

### 4. WhatsApp Business Setup

1. Go to [Meta Business Platform](https://business.facebook.com)
2. Create WhatsApp Business App
3. Get:
   - `META_ACCESS_TOKEN`
   - `META_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN` (generate your own)
4. Set webhook URL:
   ```
   https://your-project.supabase.co/functions/v1/whatsapp-webhook
   ```
5. Subscribe to messages webhook

### 5. Verify Webhook

The webhook verification happens automatically via GET request from WhatsApp.

Test locally:
```bash
curl "http://localhost:3000/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test_challenge"
```

---

## 🧠 State Machine Reference

### Buyer Journey
```
START
  ↓
VIEWING_PRODUCT (receives product info)
  ↓ (user selects "1" - Buy Now)
AWAITING_PAYMENT (payment link sent)
  ↓ (payment received)
ORDER_PENDING → DISPATCHING → DELIVERY_ASSIGNED → COMPLETED
  ↓ (user selects "2" - Ask Question)
WAITING_FOR_SELLER (seller replied)
  ↓
CHOOSING_ACTION (back to options)
```

### States
- `START` - Initial contact
- `VIEWING_PRODUCT` - Product details shown
- `CHOOSING_ACTION` - Menu presented
- `WAITING_FOR_BUYER` - Seller waiting for buyer action
- `WAITING_FOR_SELLER` - Buyer waiting for seller response
- `ORDER_PENDING` - Order created, payment pending
- `AWAITING_PAYMENT` - Payment link sent
- `DISPATCHING` - Looking for driver
- `DELIVERY_ASSIGNED` - Driver accepted
- `COMPLETED` - Order delivered

---

## 💬 Message Flow Examples

### Example 1: Buyer Initiates via Shared Link

```
User clicks: wa.me/+27XXXXX?text=Hi%20(ID:product-uuid)

Bot: 🛒 *Product Name*
     R599.99
     
     1️⃣ Buy Now
     2️⃣ Ask Seller
     3️⃣ Browse More

User: 1

Bot: 🧾 *Order Created!*
     💰 R599.99
     
     💳 Pay here: [PayFast link]

[User pays via PayFast]

Bot: ✅ *Payment Successful!*
     📦 Seller preparing order

[Driver accepts]

Bot: ✅ *Driver Assigned!*
     🚗 Your driver is on the way
```

### Example 2: Seller Responds to Inquiry

```
User: 2

Bot: ✍️ Ask your question

User: Does this come in blue?

Bot → Seller: 📬 New Inquiry!
              Does this come in blue?
              Buyer: +27XXXXXXX

Seller: 1️⃣ Yes
        2️⃣ No
        3️⃣ Custom reply

Seller: 3

Seller: Yes! We have blue in stock

Bot → Buyer: 📨 Seller replied:
             "Yes! We have blue in stock"
             
             1️⃣ Buy Now
             2️⃣ Ask More
             3️⃣ Browse
```

---

## 🚚 Driver Flow

### Driver Receives Dispatch Request
```
Bot → All Drivers: 🚨 *NEW DELIVERY REQUEST!*
                   📦 Order: ABC12345
                   💰 R599.99
                   
                   1️⃣ Accept
                   2️⃣ Skip

Driver 1: 1  ← First to accept gets it

Bot → Driver 1: ✅ *Dispatch Accepted!*
                📍 Pickup: Seller Store
                ⏰ ASAP

Bot → Buyer: ✅ *Driver Assigned!*
             🚗 On the way
             
Bot → Seller: 📦 Driver assigned, please prepare
```

### Driver Completes Delivery
```
Driver: 1       (picked up)
Driver: 2       (delivered)

Bot → Buyer: ✅ *Delivered!*
             Order complete
             ⭐ Rate delivery

Bot → Seller: ✅ Delivery complete
```

---

## 👥 Role-Based Access

### Buyers
- Can create conversations via WhatsApp product share
- Can initiate orders and payment
- Can view delivery status
- Can message sellers

### Sellers
- Can manage product inquiries
- Can respond to buyer questions
- Can view all their orders
- Can track deliveries
- Dashboard: Leads, Orders, Messages

### Drivers
- Can accept/reject dispatch requests
- Can track assigned deliveries
- Can update location
- Can mark picked up/delivered

### Admins
- Full visibility of all systems
- Dashboard tabs: Orders, Conversations, Deliveries, Payments, Dispatch, System Logs
- Can monitor all transactions

---

## 📊 Admin Dashboard Reference

### Orders Tab
- All WhatsApp orders
- Filter by payment status (paid/unpaid)
- Filter by order status (pending/completed)
- Export options for reporting

### Conversations Tab
- Active buyer-seller conversations
- Filter by state
- Search by phone number
- View message history

### Deliveries Tab
- All active & completed deliveries
- Driver assignments
- Real-time location updates (when available)
- Delivery status tracking

### Payments Tab
- All payment transactions
- PayFast integration status
- Success/failure rates
- Amount tracking

### Dispatch Tab
- Waiting dispatch requests
- Driver acceptance tracking
- Broadcast counts
- Queue management

### System Logs Tab
- Complete audit trail
- Searchable by event type
- Filter by actor (buyer/seller/driver/bot)
- Troubleshooting reference

---

## 🔧 Frontend Integration

### Adding WhatsApp Share to Product Page

```tsx
import { WhatsAppShare, WhatsAppShareCard } from "@/components/WhatsAppShare";

export function ProductPage({ product }) {
  return (
    <div>
      <h1>{product.title}</h1>
      <p>R{product.price}</p>
      
      {/* Inline button */}
      <WhatsAppShare
        productId={product.id}
        productTitle={product.title}
        botPhone={process.env.REACT_APP_BOT_PHONE}
      />
      
      {/* Or use card */}
      <WhatsAppShareCard
        productId={product.id}
        productTitle={product.title}
        productPrice={product.price}
        botPhone={process.env.REACT_APP_BOT_PHONE}
      />
    </div>
  );
}
```

### Seller Dashboard Integration

```tsx
import { WhatsAppDashboard } from "@/components/WhatsAppDashboard";

export function SellerPage() {
  return (
    <div>
      <WhatsAppDashboard />
    </div>
  );
}
```

### Admin Dashboard Integration

```tsx
import { AdminWhatsAppDashboard } from "@/components/AdminWhatsAppDashboard";

export function AdminPage() {
  return (
    <div>
      <AdminWhatsAppDashboard />
    </div>
  );
}
```

---

## 🐛 Troubleshooting

### Webhook Not Receiving Messages
- ✅ Verify `WHATSAPP_VERIFY_TOKEN` matches in Meta dashboard
- ✅ Check webhook URL is publicly accessible
- ✅ Verify `META_PHONE_NUMBER_ID` is correct
- ✅ Check Supabase function logs

### Orders Not Creating
- ✅ Verify product exists in database
- ✅ Check buyer profile creation (check profiles table)
- ✅ Verify `PAYFAST_MERCHANT_ID` is set
- ✅ Check Supabase function logs for errors

### Dispatch Not Broadcasting
- ✅ Verify drivers exist with role='driver'
- ✅ Check delivery_mode is set to 'delivery'
- ✅ Verify driver phone numbers are correct
- ✅ Check WhatsApp message sending permissions

### Payment Not Triggering
- ✅ Verify `PAYFAST_PASSPHRASE` is set
- ✅ Check payment webhook endpoint is accessible
- ✅ Verify PayFast credentials in settings
- ✅ Check system_logs for payment_received events

---

## 📈 Monitoring & Metrics

### Key Metrics to Track
1. **Conversation Rate** - New conversations per day
2. **Conversion Rate** - Conversations → Orders
3. **Payment Success Rate** - Orders → Paid
4. **Delivery Completion Rate** - Dispatched → Delivered
5. **Response Time** - Seller response to inquiry

### Monitoring Queries

```sql
-- Total conversations last 7 days
SELECT COUNT(*) as conversations
FROM whatsapp_conversations
WHERE created_at > NOW() - INTERVAL '7 days'

-- Paid orders
SELECT COUNT(*) as paid
FROM orders
WHERE payment_status = 'paid' AND buyer_phone IS NOT NULL

-- Pending deliveries
SELECT COUNT(*) as pending
FROM whatsapp_deliveries
WHERE status = 'pending'

-- System events
SELECT log_type, COUNT(*) as count
FROM whatsapp_system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY log_type
```

---

## 🔐 Security Considerations

1. **RLS Policies** - All tables have row-level security
2. **Service Role** - Edge functions use service role (full access)
3. **Phone Verification** - Phone numbers used as unique identifiers
4. **Payment Security** - PayFast handles PCI compliance
5. **Data Encryption** - All data at rest encrypted
6. **Audit Trail** - All actions logged in system_logs

---

## 💡 Best Practices

1. **Message Templates** - Keep WhatsApp messages concise
2. **Numeric Replies** - Users prefer simple "1", "2", "3" interactions
3. **Emojis** - Use sparingly for readability
4. **Response Time** - Sellers should respond within 1 hour
5. **Payment Links** - Generated fresh for each order
6. **Driver Pool** - Maintain min 5-10 active drivers
7. **Error Handling** - Always provide fallback options

---

## 📞 Support

For issues or questions:
1. Check system_logs for error details
2. Review Supabase function logs
3. Verify environment variables
4. Check WhatsApp Meta webhook settings
5. Test edge function endpoints manually

---

## 🎯 Next Steps

1. ✅ Deploy database migration
2. ✅ Set up environment variables
3. ✅ Deploy all edge functions
4. ✅ Configure WhatsApp Business
5. ✅ Test end-to-end flow
6. ✅ Train sellers on dashboard
7. ✅ Recruit driver pool
8. ✅ Launch to users
