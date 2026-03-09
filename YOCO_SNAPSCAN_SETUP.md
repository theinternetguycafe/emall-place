# 🔥 Yoco & SnapScan Payment Integration Guide

**eMall-Place - Multi-Vendor Marketplace with Alternative Payment Methods**

This guide walks you through implementing Yoco and SnapScan as payment methods for your marketplace, without requiring company registration.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Yoco Setup](#yoco-setup)
4. [SnapScan Setup](#snapscan-setup)
5. [Environment Variables](#environment-variables)
6. [Testing in Sandbox](#testing-in-sandbox)
7. [Deployment Checklist](#deployment-checklist)
8. [Security Best Practices](#security-best-practices)
9. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Start

### 1. Update Environment Variables

Copy `.env.example` to `.env` and fill in your payment provider credentials:

```bash
# .env file
VITE_YOCO_PUBLIC_KEY=pk_test_... or pk_live_...
VITE_YOCO_SECRET_KEY=sk_test_... or sk_live_...
VITE_SNAPSCAN_MERCHANT_ID=your_merchant_id
VITE_SNAPSCAN_API_KEY=your_api_key
```

### 2. Deploy Database Migration

Run the new database migration to add payment tracking:

```bash
# This creates:
# - payment_method column on orders table
# - payments table for transaction tracking
# - RLS policies for security
```

See: `supabase/migrations/05_payment_methods.sql`

### 3. Deploy Supabase Edge Functions

Push all Edge Functions to Supabase:

```bash
supabase functions deploy yoco-initiate
supabase functions deploy yoco-webhook
supabase functions deploy snapscan-initiate
supabase functions deploy snapscan-webhook
```

### 4. Test the Integration

Visit `/checkout` and select your payment method:

- **Test Payment**: Mock provider (for development)
- **PayFast**: Existing integration
- **Yoco**: Card payments via payment link
- **SnapScan**: QR code scanning for payments

---

## 🏗️ Architecture Overview

### Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                   │
│                                                              │
│  User selects payment method at Checkout                     │
│         ↓                    ↓                    ↓          │
│      PayFast             Yoco                SnapScan         │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│          Backend (Supabase Edge Functions)                   │
│                                                              │
│  1. Validate order & amount                                 │
│  2. Create payment with provider                            │
│  3. Store transaction record                                │
└─────────────────────────────────────────────────────────────┘
         ↓                    ↓                    ↓
    PayFast API         Yoco API            SnapScan API
    (redirect)          (payment link)       (QR code)
         ↓                    ↓                    ↓
    Customer            Customer              Customer
    completes           completes              scans &
    payment             payment                completes
         ↓                    ↓                    ↓
    Webhook             Webhook              Webhook
    confirms            confirms              confirms
         ↓                    ↓                    ↓
    Update Order       Update Order          Update Order
    payment_status     payment_status        payment_status
    ✓ PAID             ✓ PAID                ✓ PAID
```

### Database Schema

**orders table** (with new columns):
```sql
- id (uuid)
- buyer_id (uuid)
- payment_method (text) -- 'payfast' | 'yoco' | 'snapscan'
- payment_status (text) -- 'pending' | 'paid' | 'failed'
- total_amount (decimal)
- created_at (timestamp)
```

**payments table** (NEW - for tracking):
```sql
- id (uuid)
- order_id (uuid) -- references orders
- payment_method (text)
- provider_reference (text) -- unique ID from payment provider
- status (text) -- 'pending' | 'processing' | 'completed' | 'failed'
- amount (decimal)
- metadata (jsonb) -- stores provider-specific data
- created_at (timestamp)
```

---

## 💳 Yoco Setup

### Step 1: Create a Yoco Account

1. Go to https://yoco.com/
2. Click "Get Started" or "Merchant Dashboard"
3. Sign up with your email and bank account (individual account OK)
4. Complete identity verification (take photo of ID)
5. Add your bank account for payouts

### Step 2: Get Yoco API Keys

1. Log in to Merchant Dashboard: https://merchant.yoco.com/
2. Go to Settings → API Keys
3. You'll see:
   - **Public Key** (starts with `pk_`)
   - **Secret Key** (starts with `sk_`)

**For Testing:**
- Public Key: `pk_test_...`
- Secret Key: `sk_test_...`

**For Production:**
- Public Key: `pk_live_...`
- Secret Key: `sk_live_...`

### Step 3: Configure Environment

```env
VITE_YOCO_PUBLIC_KEY=pk_test_xxxxxxxxxxxx
VITE_YOCO_SECRET_KEY=sk_test_xxxxxxxxxxxx
```

### Step 4: Enable Webhook

In Merchant Dashboard:

1. Go to Settings → Webhooks
2. Add Webhook URL:
   ```
   https://your-project.functions.supabase.co/yoco-webhook
   ```
3. Select events:
   - `links.paid` (payment successful)
   - `links.failed` (payment failed)
   - `links.cancelled` (user cancelled)

### How Yoco Payment Flow Works

1. **Initiate**: Our Edge Function calls Yoco API with order details
2. **Payment Link**: Yoco returns a secure checkout link
3. **Redirect**: User is redirected to Yoco's hosted checkout page
4. **Payment**: Customer enters card details securely on Yoco's page
5. **Webhook**: Yoco sends webhook confirming payment
6. **Order Update**: Our webhook handler updates order status to `paid`

**Advantages:**
- Hosted checkout (you never see card details)
- PCI compliant by default
- Supports both card & tap payments
- Individual merchants welcome

---

## 📱 SnapScan Setup

### Step 1: Create a SnapScan Account

1. Go to https://www.snapscan.io/
2. Sign up as a merchant (individual OK)
3. Complete business profile
4. Add your bank account for payouts

### Step 2: Get SnapScan API Keys

1. Log in to Merchant Portal: https://merchant.snapscan.io/
2. Go to API Settings / Integration
3. You'll see:
   - **Merchant ID** (unique identifier)
   - **API Key** (authentication token)

### Step 3: Configure Environment

```env
VITE_SNAPSCAN_MERCHANT_ID=your_merchant_id
VITE_SNAPSCAN_API_KEY=your_api_key
```

### Step 4: Enable Webhook

In Merchant Portal:

1. Go to Webhooks / Integration Settings
2. Add Webhook URL:
   ```
   https://your-project.functions.supabase.co/snapscan-webhook
   ```
3. Select events:
   - Payment completed
   - Payment failed
   - Payment cancelled

### How SnapScan Payment Flow Works

1. **Generate QR**: Our Edge Function creates a unique QR code
2. **Display QR**: Customer sees QR code on checkout page
3. **Scan**: Customer opens SnapScan app and scans QR
4. **Payment**: Payment happens in customer's SnapScan app
5. **Webhook**: SnapScan sends webhook confirming payment
6. **Auto-Redirect**: Order updates automatically, customer redirected to success page

**Advantages:**
- No sensitive card data needed
- Customer uses their trusted SnapScan app
- Works with any bank account (no company registration)
- Instant payment confirmation

---

## 🔐 Environment Variables

### For Development (Sandbox Testing)

```env
# Frontend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Yoco Test Keys
VITE_YOCO_PUBLIC_KEY=pk_test_placeholder
VITE_YOCO_SECRET_KEY=sk_test_xxxxxxxx

# SnapScan Test Keys
VITE_SNAPSCAN_MERCHANT_ID=test_merchant_id
VITE_SNAPSCAN_API_KEY=test_api_key

# Site URL for redirects
VITE_SITE_URL=http://localhost:5173

# Supabase (for Edge Functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### For Production (LIVE KEYS)

```env
# Frontend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Yoco Live Keys
VITE_YOCO_PUBLIC_KEY=pk_live_xxxxxxxx
VITE_YOCO_SECRET_KEY=sk_live_xxxxxxxx

# SnapScan Live Keys
VITE_SNAPSCAN_MERCHANT_ID=your_live_merchant_id
VITE_SNAPSCAN_API_KEY=your_live_api_key

# Site URL for redirects
VITE_SITE_URL=https://yourdomain.com

# Supabase (for Edge Functions)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### ⚠️ Security Notes

1. **Never commit `.env`** - Add to `.gitignore`
2. **Never share secret keys** - Only use `SERVICE_ROLE_KEY` in backend
3. **Public keys only in frontend** - `pk_test_*` and anon keys are safe
4. **Use different keys per environment** - Test keys for develop, live keys for production
5. **Rotate keys regularly** - If a key is exposed, regenerate it immediately

---

## 🧪 Testing in Sandbox

### Using Test Providers

Each provider offers sandbox/test environments:

**Yoco Test Payment:**
- Use test keys: `sk_test_*` and `pk_test_*`
- Yoco provides test card numbers in dashboard
- Webhooks work in sandbox

**SnapScan Test Payment:**
- Use test keys and merchant ID
- SnapScan provides test QR codes
- Webhooks work in sandbox

### Testing Locally

Run the application locally:

```bash
npm install
npm run dev
```

Then in your browser:
1. Navigate to http://localhost:5173
2. Add products to cart
3. Go to `/checkout`
4. Select payment method
5. Check browser console for logs
6. Verify database updates in Supabase

### Checking Order Status

```sql
-- Check orders table
SELECT id, payment_method, payment_status, total_amount, created_at
FROM orders
ORDER BY created_at DESC;

-- Check payments table
SELECT order_id, payment_method, provider_reference, status
FROM payments
ORDER BY created_at DESC;
```

---

## 🚀 Deployment Checklist

Before going to production:

- [ ] **Database**: Run migration `05_payment_methods.sql`
- [ ] **Edge Functions**: Deploy all functions to Supabase
- [ ] **Environment**: Set live keys (Yoco `pk_live_*`, SnapScan live)
- [ ] **Webhooks**: Configure webhook URLs in payment dashboards
- [ ] **Testing**: Test end-to-end payment flow with test amounts
- [ ] **Bank Account**: Verify payout bank account is correct
- [ ] **Legal**: Review payment provider terms of service
- [ ] **Monitoring**: Set up error alerts and logs
- [ ] **Documentation**: Document payment flow for team

### Deploy Edge Functions

```bash
# Authenticate with Supabase
supabase login

# Create/update functions
supabase functions deploy yoco-initiate --no-verify-jwt
supabase functions deploy yoco-webhook --no-verify-jwt
supabase functions deploy snapscan-initiate --no-verify-jwt
supabase functions deploy snapscan-webhook --no-verify-jwt
```

### Deploy Frontend

```bash
# Build
npm run build

# Deploy to your hosting (GitHub Pages, Vercel, Netlify, etc.)
```

---

## 🔒 Security Best Practices

### 1. Never Trust Frontend Alone

```typescript
// ❌ DON'T: Trust frontend success
if (paymentStatus === 'success') {
  updateOrder()
}

// ✅ DO: Verify with backend
const verified = await verifyWithBackend(transactionId)
if (verified.success && verified.webhookConfirmed) {
  updateOrder()
}
```

### 2. Validate Amounts Server-Side

```typescript
// ✅ Always validate order amount matches payment amount
const orderTotal = order.total_amount * 100 // in cents
const paymentAmount = request.amount

if (orderTotal !== paymentAmount) {
  throw new Error('Amount mismatch - fraud attempt?')
}
```

### 3. Use Webhooks for confirmation

- Don't rely on redirects alone
- Always verify with webhook before marking payment as successful
- Store webhook signatures if provider supports it

### 4. Implement CSRF Protection

- Validate hidden order IDs
- Check user session on payment endpoints
- Use secure cookies for sessions

### 5. Log All Transactions

```sql
-- Enable audit logs
CREATE TABLE payment_logs (
  id uuid PRIMARY KEY,
  transaction_id TEXT,
  status TEXT,
  amount DECIMAL,
  raw_webhook jsonb,
  created_at TIMESTAMP
);
```

### 6. Rate Limit Webhooks

- Prevent replay attacks by checking webhook IDs
- Implement idempotency on webhook handlers

---

## 🐛 Troubleshooting

### "Payment link not created"

**Check:**
1. Correct API keys in environment
2. Correct amount (must match order total)
3. Network request in browser dev tools
4. Edge Function logs in Supabase

```bash
supabase functions logs yoco-initiate
```

### "Webhook not received"

**Check:**
1. Webhook URL is publicly accessible
2. Domain allows POST requests
3. Payment provider shows endpoint in logs
4. Order ID is being passed correctly

### "Order stuck in pending"

**Check:**
1. Did webhook execute? Check logs
2. Is payment_status in database correct?
3. Did browser redirect happen?
4. Check for network errors

### Individual Account Can't Receive Payments

**Solution:**
- Yoco: Requires valid ID + bank account (both work for individuals)
- SnapScan: Works with personal bank accounts (no company registration)

If having issues:
1. Re-verify identity in merchant dashboard
2. Confirm bank account details are correct
3. Check if account is flagged for review (check email)

### Cross-Origin (CORS) Errors

**Solution:**
- Ensure Edge Functions have CORS headers
- Check `supabase/functions/*/index.ts` includes `corsHeaders`

### "Invalid payment_method" Error

**Check:**
- Is `payment_method` column in `orders` table?
- Did migration run successfully?
- Run: `SELECT * FROM orders LIMIT 1;` to verify column exists

---

## 📞 Support Resources

### Yoco
- **Dashboard**: https://merchant.yoco.com/
- **API Docs**: https://developer.yoco.com/
- **Support**: support@yoco.com

### SnapScan
- **Dashboard**: https://merchant.snapscan.io/
- **API Docs**: https://api.snapscan.io/docs
- **Support**: support@snapscan.io

### Supabase
- **Dashboard**: https://app.supabase.com/
- **Docs**: https://supabase.com/docs
- **Community**: https://discord.supabase.com

---

## 📝 Implementation Notes

### Files Modified/Created:

1. **Database Migration**
   - `supabase/migrations/05_payment_methods.sql` - Adds payment tables

2. **Frontend Libraries**
   - `src/lib/yoco.ts` - Yoco integration
   - `src/lib/snapscan.ts` - SnapScan integration

3. **Edge Functions**
   - `supabase/functions/yoco-initiate/index.ts`
   - `supabase/functions/yoco-webhook/index.ts`
   - `supabase/functions/snapscan-initiate/index.ts`
   - `supabase/functions/snapscan-webhook/index.ts`

4. **Frontend Pages**
   - `src/pages/Checkout.tsx` - Updated with payment method selection

### Key Features:

✅ Multi-vendor marketplace architecture
✅ No company registration required (individuals welcome)
✅ Three payment options (PayFast, Yoco, SnapScan)
✅ Webhook-based payment confirmation
✅ Secure server-side payment creation
✅ Comprehensive error handling
✅ Database logging for audit trail
✅ Production-ready code with comments

---

## 🎉 Next Steps

1. ✅ Add Yoco & SnapScan payment methods
2. 📊 Add payment analytics dashboard
3. 🔔 Add payment status notifications (SMS/Email)
4. 📦 Add seller payout functionality
5. 💰 Add commission management system

Good luck with your marketplace! 🚀
