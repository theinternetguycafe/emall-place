# 🚀 WhatsApp Commerce Deployment Checklist

## Pre-Deployment

- [ ] **Database Backup** - Backup production database before migration
- [ ] **Review RLS Policies** - Ensure all policies are correct
- [ ] **Verify External APIs** - PayFast, WhatsApp Business credentials
- [ ] **Test Edge Functions Locally** - Using Supabase local dev

## Phase 1: Database & Infrastructure

### 1.1 Run Database Migration
```bash
# This creates all necessary tables and RLS policies
supabase db push

# Verify tables exist
supabase db schema:pull --schema-only
```

- [ ] `whatsapp_conversations` created
- [ ] `whatsapp_messages` created
- [ ] `whatsapp_deliveries` created
- [ ] `whatsapp_dispatch_requests` created
- [ ] `whatsapp_system_logs` created
- [ ] Orders table enhanced with new columns
- [ ] All RLS policies applied

### 1.2 Environment Variables Setup

Update `.env.local`:
```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# WhatsApp/Meta
META_ACCESS_TOKEN=EAAxxxxxxxxxx
META_PHONE_NUMBER_ID=102345678901234
WHATSAPP_VERIFY_TOKEN=your_random_verify_token_here
BOT_PHONE=+27XXXXXXXXX

# Payment
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=46f1cd6dfb60d9bbe94f3fa1433eb2b1
PAYFAST_PASSPHRASE=test_passphrase

# URLs
APP_URL=https://emallplace.com
API_URL=https://your-api.com
```

- [ ] All environment variables set in Supabase secrets
- [ ] Verified in local `.env.local` for testing

## Phase 2: Edge Functions Deployment

### 2.1 Deploy WhatsApp Webhook Function
```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

- [ ] Function deployed
- [ ] Function accessible at `/functions/v1/whatsapp-webhook`
- [ ] Test with: `curl -X POST https://your-project.supabase.co/functions/v1/whatsapp-webhook`

### 2.2 Deploy Order Creation Function
```bash
supabase functions deploy whatsapp-create-order --no-verify-jwt
```

- [ ] Function deployed
- [ ] Accepts POST requests
- [ ] Returns order ID and payment URL

### 2.3 Deploy Dispatch Function
```bash
supabase functions deploy whatsapp-dispatch --no-verify-jwt
```

- [ ] Function deployed
- [ ] Handles driver acceptance
- [ ] Handles delivery updates

### 2.4 Deploy Payment Webhook
```bash
supabase functions deploy payfast-webhook --no-verify-jwt
```

- [ ] Function deployed
- [ ] Receives PayFast ITN notifications
- [ ] Creates dispatch requests on success

## Phase 3: WhatsApp Business Configuration

### 3.1 Create WhatsApp Business Account
- [ ] Go to [Meta Business Platform](https://business.facebook.com)
- [ ] Create Business Account
- [ ] Create WhatsApp Business App
- [ ] Generate access token
- [ ] Record `META_PHONE_NUMBER_ID`
- [ ] Record `META_ACCESS_TOKEN`

### 3.2 Configure Webhook
- [ ] Set webhook URL: `https://your-project.supabase.co/functions/v1/whatsapp-webhook`
- [ ] Set verify token to match `WHATSAPP_VERIFY_TOKEN`
- [ ] Subscribe to `messages` webhook
- [ ] Test webhook connection from Meta dashboard

### 3.3 Verify Webhook Integration
```bash
# Meta will send this GET request for verification
curl "https://your-project.supabase.co/functions/v1/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test_challenge"

# Should return the challenge in response
```

- [ ] Webhook verification successful
- [ ] Messages being received in logs

### 3.4 Configure Webhook Fields
Subscribe to:
- [ ] `messages` - For incoming messages
- [ ] `message_status` - For delivery receipts (optional)
- [ ] `message_template_status_update` - For template status (optional)

## Phase 4: Frontend Integration

### 4.1 Add WhatsApp Components
- [ ] Import `WhatsAppShare` in product pages
- [ ] Replace seller WhatsApp links with bot link
- [ ] Add WhatsApp dashboard to seller pages
- [ ] Add admin dashboard to admin pages

### 4.2 Update Environment
```env
REACT_APP_BOT_PHONE=+27XXXXXXXXX
```

- [ ] Added to `.env` files
- [ ] Accessible in React components

### 4.3 Test Frontend Integration
- [ ] Product page shows WhatsApp button
- [ ] Button generates correct wa.me link
- [ ] Dashboard components load
- [ ] No console errors

## Phase 5: PayFast Integration

### 5.1 Configure PayFast Settings
- [ ] Log into PayFast dashboard
- [ ] Set ITN URL: `https://your-project.supabase.co/functions/v1/payfast-webhook`
- [ ] Enable ITN verification
- [ ] Set passphrase in settings
- [ ] Test mode enabled initially

- [ ] Merchant ID recorded
- [ ] Merchant key recorded
- [ ] Passphrase set and matching

### 5.2 Test Payment Flow (Sandbox)
```
1. Create test order via API
2. Get payment URL
3. Open in browser
4. Complete test payment in PayFast sandbox
5. Check if order marked as paid
6. Check if dispatch request created
```

- [ ] Payment link generates correctly
- [ ] Payment webhook receives notification
- [ ] Order status updates to "paid"
- [ ] Dispatch request created

## Phase 6: Testing

### 6.1 End-to-End Flow Test

**Buyer Journey:**
```
1. Share product link: wa.me/BOT_PHONE?text=Hi%20(ID:product-uuid)
2. Receive product menu (Buy/Ask/Browse)
3. Select "Buy Now"
4. Receive payment link
5. Complete payment in PayFast
6. Receive order confirmation
7. Wait for driver assignment
```

- [ ] All steps manual tested
- [ ] Messages receive correctly
- [ ] Payment processes
- [ ] Order created

**Seller Dashboard:**
```
1. Log in as seller
2. View Leads tab
3. View Orders tab
4. View Messages tab
5. Respond to inquiry
```

- [ ] Seller sees leads
- [ ] Seller sees orders
- [ ] Messages sync correctly

**Admin Dashboard:**
```
1. Log in as admin
2. View all tabs
3. Check stats
4. Monitor logs
```

- [ ] All tabs display
- [ ] Stats calculate correctly
- [ ] Logs show all events

**Driver Flow:**
```
1. Driver receives dispatch request
2. Accepts delivery
3. Marks picked up
4. Marks delivered
```

- [ ] Driver receives WhatsApp message
- [ ] Can accept/reject
- [ ] Delivery status updates
- [ ] Buyer notified

### 6.2 Error Scenarios

Test these scenarios:
- [ ] Product not found
- [ ] Stock unavailable
- [ ] Payment failed/cancelled
- [ ] Driver rejects delivery
- [ ] Network timeout during webhook

### 6.3 Load Testing

- [ ] Test 10 concurrent conversations
- [ ] Test 10 concurrent orders
- [ ] Monitor function performance
- [ ] Check database connection pool

## Phase 7: Monitoring & Observability

### 7.1 Set Up Logging
```sql
-- Check all system logs
SELECT * FROM whatsapp_system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Monitor errors
SELECT * FROM whatsapp_system_logs
WHERE log_type = 'error'
ORDER BY created_at DESC;
```

- [ ] Logs viewable in Supabase dashboard
- [ ] Set up alerts for errors
- [ ] Regular log review schedule

### 7.2 Monitor Key Metrics
```sql
-- Conversations created today
SELECT DATE(created_at), COUNT(*) 
FROM whatsapp_conversations 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);

-- Orders created
SELECT DATE(created_at), COUNT(*) 
FROM orders 
WHERE buyer_phone IS NOT NULL AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);

-- Payment success rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  100.0 * SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) / COUNT(*) as success_rate
FROM payments
WHERE created_at > NOW() - INTERVAL '24 hours';
```

- [ ] Dashboard set up for KPI tracking
- [ ] Daily review process defined

## Phase 8: Go Live

### 8.1 Pre-Launch Checklist
- [ ] Test with real drivers
- [ ] Train sellers on dashboard
- [ ] Brief admins on monitoring
- [ ] Have support team ready
- [ ] Document troubleshooting steps

### 8.2 Initial Launch
- [ ] Enable for select sellers first
- [ ] Monitor first 24 hours closely
- [ ] Test with real buyers
- [ ] Address any issues immediately

### 8.3 Gradual Rollout
- [ ] Week 1: 10% of sellers
- [ ] Week 2: 25% of sellers
- [ ] Week 3: 50% of sellers
- [ ] Week 4+: 100% of sellers

- [ ] Launch communication sent
- [ ] Product announcements made
- [ ] Help articles published
- [ ] Support team briefed

## Phase 9: Post-Launch

### 9.1 Monitor First Week
- [ ] Daily check of metrics
- [ ] Daily check of error logs
- [ ] Daily seller feedback
- [ ] Daily buyer feedback

### 9.2 Optimize
- [ ] Collect feedback from users
- [ ] Identify bottlenecks
- [ ] Optimize message templates
- [ ] Improve driver response time

### 9.3 Scale
- [ ] Add more drivers
- [ ] Expand to more regions
- [ ] Add more sellers
- [ ] Increase feature set

## Rollback Plan

If critical issues occur:

1. **Disable Webhook** - Stop processing messages
   ```bash
   supabase functions delete whatsapp-webhook
   ```

2. **Revert to Previous** - Use git to revert code
   ```bash
   git revert <commit-hash>
   ```

3. **Notify Users** - Send status update to WhatsApp

4. **Analyze** - Debug issue (check logs)

5. **Redeploy** - Once fixed, redeploy functions

- [ ] Rollback plan documented
- [ ] Team trained on rollback
- [ ] Tested rollback procedure

## Handoff Checklist

For ops/support team:
- [ ] Documentation shared
- [ ] Dashboard access granted
- [ ] Troubleshooting guide provided
- [ ] Emergency contact list
- [ ] Alert escalation path defined
- [ ] Regular report schedule set
- [ ] Backup procedures documented
- [ ] Scale-up procedures documented

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Approved By**: _____________

**Notes**: 
_____________________________________________________________________________
_____________________________________________________________________________
