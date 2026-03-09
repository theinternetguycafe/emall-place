# 🚀 Payment Integration - Deployment Guide

## Quick Reference

This guide covers deploying Yoco and SnapScan payment methods to your eMall-Place marketplace.

### What's New?

✅ **Yoco Integration** - Card payments via secure payment links
✅ **SnapScan Integration** - QR code payments
✅ **Payment Tracking** - Database tables to log all transactions
✅ **Webhook Handlers** - Automatic order status updates on payment confirmation
✅ **Checkout UI** - Multi-payment method selector

---

## 🔧 Installation Steps

### Step 1: Update Your `.env` File

Add the new payment provider credentials:

```env
# Yoco (get from https://merchant.yoco.com/settings)
VITE_YOCO_PUBLIC_KEY=pk_test_xxxxx
VITE_YOCO_SECRET_KEY=sk_test_xxxxx

# SnapScan (get from https://merchant.snapscan.io/api-settings)
VITE_SNAPSCAN_MERCHANT_ID=your_merchant_id
VITE_SNAPSCAN_API_KEY=your_api_key

# Keep your existing Supabase credentials
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

See `.env.example` for all available options.

### Step 2: Run Database Migration

The migration adds:
- `payment_method` column to `orders` table
- New `payments` table for transaction tracking
- Row-level security policies

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Open `supabase/migrations/05_payment_methods.sql`
3. Copy and paste the SQL
4. Click "Run"

**Via CLI:**
```bash
supabase db push
```

### Step 3: Deploy Edge Functions

Your Edge Functions handle payment creation and webhook confirmation:

```bash
# Deploy Yoco functions
supabase functions deploy yoco-initiate --no-verify-jwt
supabase functions deploy yoco-webhook --no-verify-jwt

# Deploy SnapScan functions
supabase functions deploy snapscan-initiate --no-verify-jwt
supabase functions deploy snapscan-webhook --no-verify-jwt
```

Get your function URLs from Supabase Dashboard:
- `https://your-project.functions.supabase.co/yoco-initiate`
- `https://your-project.functions.supabase.co/yoco-webhook`
- `https://your-project.functions.supabase.co/snapscan-initiate`
- `https://your-project.functions.supabase.co/snapscan-webhook`

### Step 4: Configure Webhooks in Payment Dashboards

#### Yoco Webhooks
1. Go to https://merchant.yoco.com/ → Settings → Webhooks
2. Add webhook endpoint:
   ```
   https://your-project.functions.supabase.co/yoco-webhook
   ```
3. Subscribe to events:
   - ✅ links.paid
   - ✅ links.failed
   - ✅ links.cancelled

#### SnapScan Webhooks
1. Go to https://merchant.snapscan.io/ → Webhooks
2. Add webhook endpoint:
   ```
   https://your-project.functions.supabase.co/snapscan-webhook
   ```
3. Subscribe to events:
   - ✅ Payment completed
   - ✅ Payment failed
   - ✅ Payment cancelled

### Step 5: Test Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Visit http://localhost:5173 and test checkout flow
```

**Test Cards for Yoco:**
- Yoco dashboard provides test card numbers for sandbox mode

**Test QR for SnapScan:**
- SnapScan dashboard provides test QR codes for sandbox mode

---

## 📋 Files Overview

### New Files Created

```
supabase/
├── migrations/
│   └── 05_payment_methods.sql    ← Database schema
├── functions/
│   ├── yoco-initiate/index.ts    ← Create Yoco payment link
│   ├── yoco-webhook/index.ts     ← Handle Yoco payment confirmation
│   ├── snapscan-initiate/index.ts ← Generate SnapScan QR
│   └── snapscan-webhook/index.ts  ← Handle SnapScan payment confirmation

src/
├── lib/
│   ├── yoco.ts                   ← Yoco client
│   └── snapscan.ts               ← SnapScan client
├── types/
│   └── payments.ts               ← TypeScript types
└── pages/
    └── Checkout.tsx              ← Updated with payment methods
```

### Modified Files

- `src/pages/Checkout.tsx` - Added payment method selection UI
- `.env` - Add new payment provider keys

### Documentation

- `YOCO_SNAPSCAN_SETUP.md` - Comprehensive setup guide
- `.env.example` - Environment variables template

---

## 🧪 Testing Checklist

Before deploying to production:

- [ ] Database migration runs without errors
- [ ] All Edge Functions deployed successfully
- [ ] Environment variables are correctly set (test/sandbox mode)
- [ ] Checkout page loads with all payment options
- [ ] Can create test orders with each payment method
- [ ] Webhooks fire when simulating payment in sandbox
- [ ] Order status updates correctly when payment completes
- [ ] Error handling works (payment decline, cancellation, etc.)

### Testing Each Payment Method

```bash
# Start development server
npm run dev

# 1. Test Mock Payment
# - Select "Test Payment" → Click Pay
# - Should auto-complete and redirect to /account/orders

# 2. Test Yoco
# - Select "Yoco" → Click Pay
# - You'll be redirected to Yoco payment page
# - Use test card from Yoco dashboard
# - On return, should verify and redirect to /account/orders

# 3. Test SnapScan
# - Select "SnapScan" → Click Pay
# - QR code should appear on page
# - Click "Scan with SnapScan" or use phone camera
# - After payment, page should auto-redirect
```

### Verify in Database

```sql
-- Check orders were created
SELECT id, payment_method, payment_status FROM orders ORDER BY created_at DESC LIMIT 5;

-- Check payment records
SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;

-- Check order items
SELECT * FROM order_items WHERE order_id = 'your-test-order-id';
```

---

## 🔒 Security Reminders

### DO's:
✅ Use test/sandbox keys during development
✅ Use production keys only on live domain
✅ Validate amounts on server-side always
✅ Wait for webhook confirmation before marking payment as paid
✅ Store sensitive keys in environment variables only
✅ Use HTTPS in production always

### DON'Ts:
❌ Never commit `.env` file to git
❌ Never expose secret keys in frontend code
❌ Never trust frontend "success" messages alone
❌ Never skip webhook verification
❌ Never reuse test keys in production

---

## 🐛 Troubleshooting

### "Functions deployed but not working"

Check logs:
```bash
supabase functions logs yoco-initiate
supabase functions logs snapscan-initiate
```

Common issues:
- Missing environment variables
- Incorrect Supabase service role key
- Network connectivity to payment APIs

### "Webhook not being called"

Verify:
1. Webhook URL is correct in payment dashboard
2. Domain is publicly accessible (not localhost)
3. Payment provider shows successful delivery in logs
4. Check function logs for errors

### "Order stuck in pending payment"

Check:
1. Did payment complete in payment provider dashboard?
2. Did webhook fire? Check Supabase function logs
3. Is order ID present in webhook data?
4. Check database for orphaned payments

### "Amount validation failed"

Ensure:
1. Order total in database matches payment amount
2. Amount conversion (ZAR to cents) is correct
3. No decimal rounding issues

---

## 📊 Monitoring

### View Payment Logs

```sql
-- Recent payments
SELECT 
  p.id,
  p.order_id,
  p.payment_method,
  p.status,
  p.amount,
  p.created_at,
  o.buyer_id
FROM payments p
JOIN orders o ON p.order_id = o.id
ORDER BY p.created_at DESC
LIMIT 20;

-- Failed payments
SELECT * FROM payments WHERE status = 'failed' ORDER BY created_at DESC;

-- Pending payments (over 1 hour)
SELECT * FROM payments 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Set Up Alerts

In Supabase dashboard:
1. Go to Integrations → Webhooks (project-level)
2. Set up alerts for Function errors
3. Monitor error rate of payment functions

---

## 🚀 Deployment to Production

### Pre-Deployment

1. **Switch to Live Keys**
   ```env
   # .env for production
   VITE_YOCO_PUBLIC_KEY=pk_live_xxxxx     # NOT pk_test_
   VITE_YOCO_SECRET_KEY=sk_live_xxxxx     # NOT sk_test_
   VITE_SNAPSCAN_MERCHANT_ID=prod_id
   VITE_SNAPSCAN_API_KEY=prod_key
   VITE_SITE_URL=https://yourdomain.com   # NOT localhost
   ```

2. **Verify Webhooks**
   - Update webhook URLs to live domain
   - Test webhook by making payment
   - Confirm order updates in live database

3. **Enable Production Logging**
   - Set up error tracking (Sentry, LogRocket, etc.)
   - Configure Supabase function error alerts
   - Set up database backup schedule

### Deployment Checklist

- [ ] Database migration deployed to production database
- [ ] Edge Functions deployed to production project
- [ ] Environment variables updated with live keys
- [ ] Webhooks configured for live domains
- [ ] Test payment made and verified complete
- [ ] Team notified of new payment methods
- [ ] Customer documentation updated
- [ ] Support team trained on new payment flow
- [ ] Monitoring/alerts configured
- [ ] Backup and disaster recovery plan updated

---

## 💬 Support

### For Issues:

1. **Check logs first**
   ```bash
   supabase functions logs yoco-initiate --limit 50
   supabase functions logs yoco-webhook --limit 50
   ```

2. **Check database**
   ```sql
   SELECT * FROM payments WHERE status = 'failed' LIMIT 1;
   SELECT * FROM orders WHERE payment_status = 'failed' LIMIT 1;
   ```

3. **Review documentation**
   - See `YOCO_SNAPSCAN_SETUP.md` for detailed setup
   - See payment provider docs for API reference

4. **Contact support**
   - Yoco: support@yoco.com
   - SnapScan: support@snapscan.io
   - Supabase: support@supabase.com

---

## 📚 Additional Resources

- **Yoco Developer Docs**: https://developer.yoco.com/
- **SnapScan API Docs**: https://api.snapscan.io/docs
- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase Webhooks**: https://supabase.com/docs/guides/webhooks

---

## ✨ What's Next?

After payment integration:

1. **Analytics Dashboard** - Track payment success rates and revenue
2. **Seller Payouts** - Automate monthly commission payments to sellers
3. **Payment Notifications** - Send SMS/Email confirmations to customers
4. **Invoice Generation** - Auto-generate invoices for paid orders
5. **Chargeback Protection** - Implement fraud detection and chargeback handling

---

**Questions?** Review `YOCO_SNAPSCAN_SETUP.md` for the complete guide.

**Ready to launch?** Follow the steps above and you'll be accepting payments in 15 minutes! 🎉
