# 🚀 QUICK REFERENCE CARD - Yoco & SnapScan Integration

## Deployment Timeline: ~15 minutes

---

## ⚡ 5-Step Deployment

### Step 1: Environment Setup (2 min)
```bash
cp .env.example .env
# Fill in your credentials from payment dashboards
```

**Variables to add:**
- `VITE_YOCO_PUBLIC_KEY` (Yoco Dashboard → Settings)
- `VITE_SNAPSCAN_MERCHANT_ID` (SnapScan Dashboard → API Settings)

### Step 2: Database (2 min)
Run the migration to add payment tables:
```bash
supabase db push
# OR manually run: supabase/migrations/05_payment_methods.sql
```

### Step 3: Deploy Functions (5 min)
```bash
supabase functions deploy yoco-initiate --no-verify-jwt
supabase functions deploy yoco-webhook --no-verify-jwt
supabase functions deploy snapscan-initiate --no-verify-jwt
supabase functions deploy snapscan-webhook --no-verify-jwt
```

### Step 4: Configure Webhooks (4 min)
**Yoco:** https://merchant.yoco.com → Settings → Webhooks
```
Endpoint: https://your-project.functions.supabase.co/yoco-webhook
Events: links.paid, links.failed, links.cancelled
```

**SnapScan:** https://merchant.snapscan.io → Webhooks
```
Endpoint: https://your-project.functions.supabase.co/snapscan-webhook
Events: completed, failed, cancelled
```

### Step 5: Test (2 min)
```bash
npm run dev
# Visit: http://localhost:5173/checkout
# Select payment method and test
```

---

## 📋 File Structure

```
NEW FILES:
├── supabase/migrations/05_payment_methods.sql ← Database
├── supabase/functions/
│   ├── yoco-initiate/ ← Creates payment link
│   ├── yoco-webhook/ ← Receives confirmation
│   ├── snapscan-initiate/ ← Generates QR
│   └── snapscan-webhook/ ← Receives confirmation
├── src/lib/
│   ├── yoco.ts ← Frontend client
│   └── snapscan.ts ← Frontend client
├── src/types/payments.ts ← TypeScript types
├── src/utils/verifyPaymentIntegration.ts ← Validation script
└── DOCUMENTATION (4 files)

MODIFIED FILES:
├── src/pages/Checkout.tsx ← Payment method selector
└── .env ← Add payment provider keys
```

---

## 🔑 Environment Variables

### For Testing (Sandbox Keys)
```env
VITE_YOCO_PUBLIC_KEY=pk_test_xxxxx
VITE_SNAPSCAN_MERCHANT_ID=test_id
```

### For Production (Live Keys) 
```env
VITE_YOCO_PUBLIC_KEY=pk_live_xxxxx
VITE_SNAPSCAN_MERCHANT_ID=live_id
```

⚠️ **NEVER commit `.env` to git!**

---

## 💾 Database Schema

**New columns added to `orders`:**
```sql
payment_method TEXT ('payfast' | 'yoco' | 'snapscan')
```

**New `payments` table:**
```sql
id, order_id, payment_method, provider_reference, 
status, amount, metadata, created_at, updated_at
```

---

## 🎯 Payment Flow

```
User Select Payment
      ↓
Order Created
      ↓
Edge Function → Payment Provider
      ↓
User Completes Payment
      ↓
Webhook Receipt
      ↓
Order Updated to PAID
      ↓
Redirect to Success
```

---

## 🧪 Quick Test Commands

```bash
# Check integration
npm run dev
# Visit http://localhost:5173/checkout

# View logs
supabase functions logs yoco-webhook
supabase functions logs snapscan-webhook

# Check database
# Go to Supabase Dashboard → SQL Editor
SELECT * FROM payments ORDER BY created_at DESC;
SELECT * FROM orders WHERE payment_method != 'payfast';
```

---

## ✅ Pre-Deployment Checklist

- [ ] `.env` file configured with all keys
- [ ] All 4 Edge Functions deployed
- [ ] Database migration executed
- [ ] Webhook URLs configured in payment dashboards
- [ ] Test payment created and verified
- [ ] Order appears in database
- [ ] Payment status shows as 'paid'

---

## 🐛 Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Functions not deployed" | Run `supabase functions deploy [name]` |
| "Webhook not received" | Check URL is public & webhook settings configured |
| "Database column missing" | Run migration: `supabase db push` |
| "Amount mismatch error" | Ensure order amount matches payment amount |
| "Order stuck pending" | Check webhook logs: `supabase functions logs` |

---

## 🔒 Security Checklist

- ✅ Secret keys in `.env` only (not in code)
- ✅ Frontend uses public keys only
- ✅ All payment creation server-side
- ✅ Webhook verification implemented
- ✅ Amount validation on server
- ✅ Error messages don't leak details
- ✅ Database RLS policies enabled

---

## 📞 Support Links

| Service | Link |
|---------|------|
| Yoco Dashboard | https://merchant.yoco.com |
| Yoco Docs | https://developer.yoco.com |
| SnapScan Dashboard | https://merchant.snapscan.io |
| SnapScan Docs | https://api.snapscan.io/docs |
| Supabase Dashboard | https://app.supabase.com |
| Supabase Docs | https://supabase.com/docs |

---

## 📊 Monitoring

**View Recent Payments:**
```sql
SELECT order_id, payment_method, status, amount, created_at 
FROM payments 
ORDER BY created_at DESC LIMIT 10;
```

**View Failed Payments:**
```sql
SELECT * FROM payments WHERE status = 'failed';
```

**View Function Logs:**
```bash
supabase functions logs yoco-webhook --limit 50 --follow
```

---

## 🎁 Included Documentation

1. **IMPLEMENTATION_COMPLETE.md** ← You are here! Summary of implementation
2. **YOCO_SNAPSCAN_SETUP.md** ← Full technical guide (350+ lines)
3. **PAYMENT_DEPLOYMENT.md** ← Step-by-step deployment
4. **.env.example** ← Configuration template
5. **setup-payments.sh** ← Automated setup script

---

## 🚀 Going Live

### Step 1: Switch to Live Keys
Update `.env` with production credentials (sk_live_, pk_live_)

### Step 2: Redeploy Functions
```bash
# Re-deploy with live credentials
supabase functions deploy yoco-webhook --no-verify-jwt
supabase functions deploy snapscan-webhook --no-verify-jwt
```

### Step 3: Update Webhook URLs
Webhook URLs must use live domain, not localhost

### Step 4: Test End-to-End
Make a real payment with test amount

### Step 5: Enable in Production
Deploy frontend with payment methods enabled

---

## ✨ What You Get

✅ Complete payment system for 3 methods
✅ Production-ready code with error handling
✅ Webhook verification and retries
✅ Transaction audit trail
✅ Type-safe TypeScript interfaces
✅ Comprehensive documentation
✅ Testing & verification tools
✅ Security best practices built-in

---

## ⏱️ Deployment Timeline

| Step | Time | Task |
|------|------|------|
| 1 | 2 min | Update `.env` |
| 2 | 2 min | Run migration |
| 3 | 5 min | Deploy functions |
| 4 | 4 min | Configure webhooks |
| 5 | 2 min | Test locally |
| **TOTAL** | **15 min** | **Live!** |

---

## 💡 Pro Tips

1. **Use test keys first** - Test everything before going live
2. **Monitor logs** - Check function logs when troubleshooting
3. **Verify amounts** - Always validate on server-side
4. **Never commit secrets** - Add `.env` to `.gitignore`
5. **Document your IDs** - Save merchant IDs somewhere safe
6. **Test both success & failure** - Test payment decline too
7. **Check database** - Verify order status updates correctly
8. **Set up alerts** - Monitor function errors in production

---

## 🎯 Next Steps After Launch

1. Celebrate 🎉
2. Add payment notifications (email/SMS)
3. Implement payment refunds
4. Add seller payout system
5. Set up payment analytics dashboard
6. Monitor chargeback rates

---

## ❓ Quick Q&A

**Q: How long does setup take?**
A: 15 minutes if you have credentials ready

**Q: Can I test without production keys?**
A: Yes! Use test/sandbox keys from payment dashboards

**Q: Do I need company registration?**
A: No, both providers support individual merchants

**Q: What if I only want one payment method?**
A: You can disable any method in checkout UI

**Q: How do customers see the QR for SnapScan?**
A: It displays on checkout page, they scan with their phone

**Q: Are credit card details safe?**
A: Yes! Hosted checkout means you never see card details

---

**Ready to deploy?** Start with Step 1! 💪

For more info, see **YOCO_SNAPSCAN_SETUP.md**
