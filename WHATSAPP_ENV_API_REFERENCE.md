# 📝 WhatsApp Commerce - Environment & API Reference

## Environment Variables Reference

### `.env.local` (Development)

```env
# ============================================================
# SUPABASE CONFIGURATION
# ============================================================
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================
# WHATSAPP BUSINESS / META CONFIGURATION
# ============================================================

# Access token from Meta App Dashboard
# Get from: https://developers.facebook.com/apps/
# Permissions needed: whatsapp_business_messaging
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Phone number ID for your WhatsApp Business number
# Get from: https://business.facebook.com/menu/whatsapp
META_PHONE_NUMBER_ID=102345678901234567

# Generate your own random string for webhook verification
# Must match what you set in Meta dashboard
WHATSAPP_VERIFY_TOKEN=your_super_secret_random_token_12345

# Your WhatsApp Business phone number (international format)
BOT_PHONE=+27811234567

# ============================================================
# PAYFAST CONFIGURATION
# ============================================================

# Merchant ID from PayFast Account Settings
PAYFAST_MERCHANT_ID=10000100

# Merchant Key from PayFast Account Settings
PAYFAST_MERCHANT_KEY=46f1cd6dfb60d9bbe94f3fa1433eb2b1

# Passphrase set in PayFast Account Settings
# Used for signature verification on ITN notifications
PAYFAST_PASSPHRASE=test_passphrase

# ============================================================
# APPLICATION URLS
# ============================================================

# Your frontend URL (no trailing slash)
APP_URL=http://localhost:5173

# Your API/backend URL
API_URL=http://localhost:3000

# ============================================================
# OPTIONAL: FEATURES
# ============================================================

# Enable delivery location tracking
ENABLE_DELIVERY_TRACKING=true

# Enable real-time notifications
ENABLE_REALTIME_NOTIFICATIONS=true

# Admin alert threshold (e.g. failed payment count)
ALERT_THRESHOLD=5

# Driver location update interval (seconds)
DRIVER_LOCATION_UPDATE_INTERVAL=60
```

### `.env.production` (Production)

```env
# ============================================================
# SUPABASE CONFIGURATION
# ============================================================
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=production_anon_key...
SUPABASE_SERVICE_ROLE_KEY=production_service_role_key...

# ============================================================
# WHATSAPP BUSINESS / META CONFIGURATION
# ============================================================
META_ACCESS_TOKEN=EAAxxxxx_production_token_xxxxx
META_PHONE_NUMBER_ID=production_phone_number_id
WHATSAPP_VERIFY_TOKEN=production_random_token
BOT_PHONE=+27XXXXXXXXX

# ============================================================
# PAYFAST CONFIGURATION
# ============================================================
PAYFAST_MERCHANT_ID=production_merchant_id
PAYFAST_MERCHANT_KEY=production_merchant_key
PAYFAST_PASSPHRASE=production_passphrase

# ============================================================
# APPLICATION URLS
# ============================================================
APP_URL=https://emallplace.com
API_URL=https://api.emallplace.com

# ============================================================
# FEATURES
# ============================================================
ENABLE_DELIVERY_TRACKING=true
ENABLE_REALTIME_NOTIFICATIONS=true
ALERT_THRESHOLD=10
DRIVER_LOCATION_UPDATE_INTERVAL=60
```

### Supabase Secrets Management

Store these in Supabase as project secrets:

```bash
# In Supabase Dashboard or via CLI:
supabase secrets set META_ACCESS_TOKEN "EAAxxxx..."
supabase secrets set PAYFAST_MERCHANT_KEY "xxxxx"
supabase secrets set WHATSAPP_VERIFY_TOKEN "your_token"

# List all secrets
supabase secrets list
```

---

## Edge Function Environment Variables

Each edge function automatically gets access to:

```typescript
// Automatically available in all edge functions
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// WhatsApp
const metaAccessToken = Deno.env.get("META_ACCESS_TOKEN");
const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");
const botPhone = Deno.env.get("BOT_PHONE");

// Payment
const payfastMerchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
const payfastMerchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
```

---

## API Reference

### WhatsApp Webhook Endpoint

**POST** `/functions/v1/whatsapp-webhook`

Receives messages from WhatsApp Business API.

**Request (from Meta):**
```json
{
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "27811234567",
                "id": "wamid.xxxxx",
                "text": {
                  "body": "Hi (ID:product-uuid)"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "status": 200,
  "body": "OK"
}
```

---

### Order Creation Endpoint

**POST** `/functions/v1/whatsapp-create-order`

Creates an order when buyer confirms purchase.

**Request:**
```json
{
  "buyer_phone": "+27811234567",
  "product_id": "uuid-of-product",
  "conversation_id": "uuid-of-conversation",
  "quantity": 1,
  "delivery_mode": "delivery"
}
```

**Response Success (200):**
```json
{
  "success": true,
  "order_id": "uuid-of-order",
  "payment_url": "https://www.payfast.co.za/eng/process?...",
  "total_amount": 649.99
}
```

**Response Error (400/500):**
```json
{
  "error": "Product not found"
}
```

---

### Dispatch Management Endpoint

**POST** `/functions/v1/whatsapp-dispatch`

Manages driver acceptance and delivery updates.

**Request - Accept Delivery:**
```json
{
  "action": "accept",
  "driver_phone": "+27811234567",
  "dispatch_request_id": "uuid"
}
```

**Request - Mark Picked Up:**
```json
{
  "action": "pickup",
  "delivery_id": "uuid",
  "coordinates": {
    "lat": -33.9249,
    "lng": 18.4241
  }
}
```

**Request - Mark Delivered:**
```json
{
  "action": "deliver",
  "delivery_id": "uuid",
  "coordinates": {
    "lat": -33.9249,
    "lng": 18.4241
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dispatch accepted"
}
```

---

### Payment Webhook Endpoint

**POST** `/functions/v1/payfast-webhook`

Receives payment notifications from PayFast.

**Request (from PayFast):**
```
merchant_id=10000100&
merchant_key=46f1cd6dfb60d9bbe94f3fa1433eb2b1&
return_url=https://emallplace.com/payment-success&
m_payment_id=order-uuid&
amount=649.99&
payment_status=2&
pf_payment_id=1234567890&
signature=xxxxx
```

**Process:**
1. Verify signature
2. Update order payment_status
3. Create dispatch request if delivery
4. Notify buyer & seller
5. Broadcast to drivers

**Response:**
```json
{
  "success": true
}
```

---

## Database Query Examples

### Get Active Conversations
```sql
SELECT id, buyer_phone, state, created_at
FROM whatsapp_conversations
WHERE status = 'active' AND state != 'COMPLETED'
ORDER BY last_message_at DESC;
```

### Get Orders Awaiting Payment
```sql
SELECT id, buyer_phone, total_amount, created_at
FROM orders
WHERE buyer_phone IS NOT NULL 
AND payment_status = 'unpaid'
AND created_at > NOW() - INTERVAL '24 hours';
```

### Get Pending Deliveries
```sql
SELECT d.id, d.order_id, d.driver_phone, d.status
FROM whatsapp_deliveries d
WHERE d.status IN ('pending', 'assigned', 'picked_up')
ORDER BY d.created_at ASC;
```

### Get System Logs
```sql
SELECT * FROM whatsapp_system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

---

## Frontend Component Examples

### Using WhatsAppShare Component

```tsx
import { WhatsAppShare } from "@/components/WhatsAppShare";

export default function ProductCard({ product }) {
  return (
    <div className="product-card">
      <h3>{product.title}</h3>
      <p>R{product.price}</p>
      
      <WhatsAppShare
        productId={product.id}
        productTitle={product.title}
        botPhone={process.env.REACT_APP_BOT_PHONE}
      />
    </div>
  );
}
```

### Using WhatsAppShareCard Component

```tsx
import { WhatsAppShareCard } from "@/components/WhatsAppShare";

export default function ProductDetail({ product }) {
  return (
    <div>
      <h1>{product.title}</h1>
      <img src={product.image} />
      
      <WhatsAppShareCard
        productId={product.id}
        productTitle={product.title}
        productPrice={product.price}
        productImage={product.image}
        botPhone={process.env.REACT_APP_BOT_PHONE}
      />
    </div>
  );
}
```

---

## Testing

### Manual cURL Tests

**Test Webhook Setup:**
```bash
curl -X GET "http://localhost:54321/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=test_token&hub.challenge=test_challenge"
```

**Test Order Creation:**
```bash
curl -X POST http://localhost:54321/functions/v1/whatsapp-create-order \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_phone": "+27811234567",
    "product_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 1,
    "delivery_mode": "delivery"
  }'
```

**Test Dispatch:**
```bash
curl -X POST http://localhost:54321/functions/v1/whatsapp-dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accept",
    "driver_phone": "+27811234567",
    "dispatch_request_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Debugging Tips

### View Edge Function Logs
```bash
# Real-time log streaming
supabase functions list
supabase functions logs whatsapp-webhook --limit=50

# Or in Supabase dashboard:
# Project Settings → Edge Functions → Click function → Logs
```

### View Database Logs
```sql
-- Recent order creation
SELECT * FROM whatsapp_system_logs
WHERE log_type = 'order_created'
ORDER BY created_at DESC LIMIT 10;

-- Recent errors
SELECT * FROM whatsapp_system_logs
WHERE log_type = 'error'
ORDER BY created_at DESC LIMIT 10;
```

### Check WhatsApp Message Status
```sql
-- Messages sent/received
SELECT * FROM whatsapp_messages
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

---

## Performance Optimization

### Indexes for Speed
```sql
-- Already created in migration, but verify:
CREATE INDEX idx_conversations_state ON whatsapp_conversations(state);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_deliveries_driver_id ON whatsapp_deliveries(driver_id);
CREATE INDEX idx_dispatch_status ON whatsapp_dispatch_requests(status);
```

### Query Optimization
```sql
-- Use LIMIT to prevent large result sets
-- Use date filters to query time ranges
-- Always use indexes for common WHERE clauses

-- Good: Efficient
SELECT * FROM whatsapp_conversations 
WHERE state = 'WAITING_FOR_SELLER' 
AND created_at > NOW() - INTERVAL '7 days'
LIMIT 100;

-- Bad: Full table scan
SELECT * FROM whatsapp_conversations;
```

---

## Rate Limiting

WhatsApp API limits:
- 80 messages per second
- 1000 messages per hour
- Implement exponential backoff on 429 errors

Edge Functions limits:
- 100 concurrent requests per function
- 60-second timeout per request
- Use queuing for long-running tasks

PayFast limits:
- No daily limits
- Rate limiting per IP may apply
- Implement retry logic with backoff

---

## Troubleshooting Common Issues

### "Webhook verification failed"
- [ ] Check `WHATSAPP_VERIFY_TOKEN` matches Meta dashboard
- [ ] Verify webhook URL is correct
- [ ] Check function permissions

### "Order creation fails"
- [ ] Verify product exists
- [ ] Check `PAYFAST_MERCHANT_ID` is set
- [ ] Review function logs

### "No dispatch notifications"
- [ ] Verify driver profiles exist
- [ ] Check driver phone numbers format
- [ ] Verify `META_ACCESS_TOKEN` is valid

### "Payment webhook not firing"
- [ ] Verify `PAYFAST_PASSPHRASE` matches
- [ ] Check webhook URL in PayFast settings
- [ ] Review PayFast transaction history

---

## Support Resources

- [Meta WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- [PayFast Documentation](https://www.payfast.co.za/features/#api)
- [Supabase Documentation](https://supabase.com/docs)
- [Deno Documentation](https://deno.land)
