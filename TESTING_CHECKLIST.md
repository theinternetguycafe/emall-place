# 🧪 WhatsApp Commerce System - Quick Testing Checklist

**After running `supabase db push`**, test each flow:

---

## ✅ Pre-Test Checklist

- [ ] Migration ran successfully (`supabase db push`)
- [ ] No errors in Supabase console
- [ ] Check tables exist:
  ```sql
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
  AND tablename IN ('conversations', 'messages', 'payments', 'deliveries', 'dispatch_requests', 'system_logs');
  ```

---

## 🧑‍💻 Test 1: Buyer Flow (Product → Order → Payment)

### Step 1: Send initial message
```
WhatsApp to BOT:
"Hi (ID:product-uuid)"
```

**Expected**:
- ✅ Bot responds with product name & menu
- ✅ Conversation created in `conversations` table
- ✅ Message stored in `messages` table

**Check DB**:
```sql
SELECT * FROM conversations WHERE buyer_phone = '27XXXXXXXXX' LIMIT 1;
SELECT * FROM messages WHERE conversation_id = '...' ORDER BY created_at;
```

---

### Step 2: Buyer chooses "Buy Now" (reply "1")
```
WhatsApp to BOT:
"1"
```

**Expected**:
- ✅ Bot sends: "Order created! 💳 Complete payment: [YOCO LINK]"
- ✅ Order created in `orders` table
- ✅ Payment record in `payments` table
- ✅ State updated to "AWAITING_PAYMENT"

**Check DB**:
```sql
SELECT * FROM orders WHERE buyer_phone = '27XXXXXXXXX' ORDER BY created_at DESC LIMIT 1;
SELECT * FROM payments WHERE order_id = '...' ORDER BY created_at DESC LIMIT 1;
```

---

### Step 3: Complete Yoco payment
1. Click the Yoco link from bot
2. Complete payment (use test card if sandbox: `4242424242424242`)
3. Return to app

**Expected**:
- ✅ Yoco webhook fires
- ✅ `orders` table: `payment_status = 'paid'`, `status = 'processing'`
- ✅ `payments` table: `status = 'paid'`
- ✅ `dispatch_requests` created

**Check logs**:
```sql
SELECT * FROM system_logs 
WHERE event_type IN ('order_created', 'payment_received', 'dispatch_request_created')
ORDER BY created_at DESC LIMIT 10;
```

**Check dispatch**:
```sql
SELECT * FROM dispatch_requests 
WHERE order_id = '...' AND status = 'waiting';
```

---

## 🚗 Test 2: Driver Flow (Accept Dispatch)

### Step 1: Driver receives dispatch request
**Expected**: Driver receives WhatsApp message:
```
🚨 NEW DELIVERY REQUEST!
📦 Order: ABC12345
💰 Amount: R299

1️⃣ Accept
2️⃣ Skip
```

### Step 2: Driver accepts (reply "1")
```
WhatsApp to BOT:
"1"
```

**Expected**:
- ✅ `dispatch_requests` status updated to "accepted"
- ✅ `deliveries` record created
- ✅ Driver receives confirmation
- ✅ Buyer receives driver assignment notification

**Check DB**:
```sql
SELECT * FROM dispatch_requests WHERE order_id = '...';
SELECT * FROM deliveries ORDER BY created_at DESC LIMIT 1;
```

---

## 🛍️ Test 3: Seller Flow (Respond to Inquiry)

### Step 1: Buyer asks question (reply "2")
```
WhatsApp to BOT:
"2"

[Then buyer sends question]
"Do you have this in XL?"
```

**Expected**:
- ✅ Bot: "✍️ Go ahead - ask your question!"
- ✅ Seller receives notification on WhatsApp
- ✅ Message stored, state = "WAITING_FOR_SELLER"

### Step 2: Seller responds
```
WhatsApp to BOT:
"Yes! We have XL in stock"
```

**Expected**:
- ✅ Bot: "✅ Response sent to buyer!"
- ✅ Buyer receives: "📨 Seller replied: Yes! We have XL in stock"
- ✅ Buyer sees options: 1️⃣ Buy Now, 2️⃣ Ask More, 3️⃣ Browse

**Check DB**:
```sql
SELECT * FROM conversations WHERE state IN ('WAITING_FOR_SELLER', 'WAITING_FOR_BUYER');
SELECT * FROM messages WHERE conversation_id = '...' ORDER BY created_at;
```

---

## 📊 Test 4: Admin Visibility

### Check system logs
```sql
SELECT 
  event_type, 
  reference_id, 
  message, 
  actor_type, 
  created_at
FROM system_logs
ORDER BY created_at DESC
LIMIT 50;
```

**Expected events**:
- `conversation_created`
- `order_created`
- `payment_received`
- `dispatch_request_created`
- `driver_assigned`

---

## 🔐 Test 5: RLS Security

### Test buyer cannot see other buyer's conversations
```sql
-- As buyer_phone: +27111111111
SELECT * FROM conversations WHERE buyer_phone = '+27222222222';
-- Should return: 0 rows (permission denied)
```

### Test seller can see their orders
```sql
-- As seller with user_id: seller-uuid-1
SELECT * FROM conversations WHERE seller_id IN (
  SELECT id FROM seller_profiles WHERE user_id = 'seller-uuid-1'
);
-- Should return: Conversations for this seller only
```

---

## 🐛 Troubleshooting

### Bot not responding
- [ ] Check webhook is receiving messages: `SELECT * FROM whatsapp_messages ORDER BY created_at DESC;`
- [ ] Check edge function logs in Supabase
- [ ] Verify `META_ACCESS_TOKEN` and `META_PHONE_NUMBER_ID` are set
- [ ] Check bot webhook URL is registered with Meta

### Payment not triggering dispatch
- [ ] Check Yoco webhook secret is correct
- [ ] Verify webhook is being called: `SELECT * FROM system_logs WHERE event_type = 'payment_received';`
- [ ] Check `order.delivery_mode = 'delivery'` (dispatch only created for deliveries)

### Driver not receiving broadcast
- [ ] Check drivers exist with `role = 'driver'`: `SELECT * FROM profiles WHERE role = 'driver';`
- [ ] Check drivers have phone numbers set
- [ ] Verify WhatsApp token & phone ID are correct
- [ ] Check edge function logs

### Messages not stored
- [ ] Check RLS policies: `SELECT * FROM messages;` (admin view)
- [ ] Verify `conversation_id` matches existing conversation
- [ ] Check database error logs

---

## 📱 Test Data Setup

Create test users:
```sql
-- Test buyer
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at) 
VALUES ('buyer@test.com', 'password', now()) RETURNING id;

INSERT INTO profiles (id, role, phone, full_name) 
VALUES ('buyer-uuid', 'buyer', '27123456789', 'Test Buyer');

-- Test seller
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at) 
VALUES ('seller@test.com', 'password', now()) RETURNING id;

INSERT INTO profiles (id, role, phone, full_name) 
VALUES ('seller-uuid', 'seller', '27123456790', 'Test Seller');

INSERT INTO seller_profiles (user_id, phone, whatsapp_number) 
VALUES ('seller-uuid', '27123456790', '27123456790');

-- Test driver
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at) 
VALUES ('driver@test.com', 'password', now()) RETURNING id;

INSERT INTO profiles (id, role, phone, full_name) 
VALUES ('driver-uuid', 'driver', '27123456791', 'Test Driver');
```

---

## ✅ Sign-Off

When tests pass:
- [ ] All 5 test flows completed
- [ ] No RLS leaks
- [ ] All events logged
- [ ] Ready for production

