🧪 SERVICE REQUESTS: RLS + REALTIME VERIFICATION CHECKLIST
========================================

🎯 OBJECTIVE
Verify that the RLS + Realtime hardened fix restores service request functionality end-to-end.

⏱️ TIME ESTIMATE: 15-20 minutes

========================================
PHASE 1: DATABASE VALIDATION
========================================

✓ STEP 1: Run the migration
- Location: supabase/migrations/15_service_requests_rls_hardened.sql
- Method: Copy entire file → Supabase SQL Editor → Execute
- Expected: Success (no errors)
- If error: Check for table ownership or existing policies


✓ STEP 2: Verify RLS is enabled
SQL Query:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'service_requests';
```

Expected Result:
┌──────────────────┬──────────────┐
│    tablename     │ rowsecurity  │
├──────────────────┼──────────────┤
│ service_requests │ true         │
└──────────────────┴──────────────┘

❌ If rowsecurity = false: RLS not enabled (migration failed)


✓ STEP 3: Count RLS policies created
SQL Query:
```sql
SELECT COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'service_requests';
```

Expected Result: 6 policies

Detailed view:
```sql
SELECT policyname, permissive, qual 
FROM pg_policies
WHERE tablename = 'service_requests'
ORDER BY policyname;
```

Expected Policies (these specific names):
- admins_can_view_all_requests
- buyers_can_insert_requests
- buyers_can_view_own_requests
- providers_can_accept_requests
- providers_can_view_pending_requests
- system_role_can_manage_requests

❌ If count ≠ 6: Some policies didn't create


✓ STEP 4: Verify realtime publication
SQL Query:
```sql
SELECT pubname, tablename
FROM pg_publication_tables
WHERE tablename = 'service_requests';
```

Expected Result:
┌───────────────────────┬──────────────────┐
│      pubname          │    tablename     │
├───────────────────────┼──────────────────┤
│ supabase_realtime     │ service_requests │
└───────────────────────┴──────────────────┘

❌ If no row returned: Table not in realtime publication (will block events)


========================================
PHASE 2: BUYER FLOW TEST
========================================

✓ STEP 5: Login as a BUYER account
- Use your test buyer account
- Verify: Dashboard shows your user ID
- Copy this ID for later verification


✓ STEP 6: Submit a test service request
- Location: Browse to /services or requests page
- Action: Click "Broadcast Request" button
- Fill in:
  * Title: "Test Plumbing - RLS Validation"
  * Description: "Testing RLS fix for service requests"
  * Budget: 100 (or any amount)
  * Location: Drop pin on map (or use current)
- Click: "Broadcast Locally" button
- Expected: Modal shows "Broadcasting Live" status


✓ STEP 7: Verify INSERT worked
SQL Query (run in Supabase SQL Editor):
```sql
SELECT id, buyer_id, title, status, created_at
FROM service_requests
WHERE buyer_id = '<PASTE_YOUR_BUYER_ID>'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: One row returned with:
- status = 'broadcasting'
- created_at = just now
- title = "Test Plumbing - RLS Validation"

❌ If no row: INSERT policy blocked
- Check: Is auth.uid() in your JWT?
- Check: Did you login properly?
- Check: Is buyer_id matching your user.id?


✓ STEP 8: Verify buyer can see their request
- Location: Supabase SQL Editor
- Query:
```sql
SELECT * FROM service_requests
WHERE id = '<REQUEST_ID_FROM_STEP_7>';
```

Expected: Row visible (verifies SELECT policy for buyers)

❌ If error "new row violates row-level security policy": SELECT policy broken


========================================
PHASE 3: PROVIDER FLOW TEST
========================================

✓ STEP 9: Login as a PROVIDER account
- Use a test provider/seller account
- Ensure: is_online = true in seller_profiles
- Verify: seller_type = 'service' or 'both'
- Copy provider ID for verification


✓ STEP 10: Provider queries service requests
- Location: Browser console (F12 → Console tab)
- Paste:
```javascript
const { data, error } = await supabase
  .from('service_requests')
  .select('*')
  .eq('status', 'broadcasting')
  .gt('expires_at', new Date().toISOString())

console.log('Requests visible:', data)
if (error) console.error('Error:', error)
```

Expected: Array with 1+ requests (including the one from Step 6)

❌ If error "new row violates row-level security policy": SELECT policy broken
❌ If empty array: Either:
   - Provider not marked online
   - seller_type not set to 'service'/'both'
   - Verify with SQL:
   ```sql
   SELECT user_id, seller_type, is_online FROM seller_profiles 
   WHERE user_id = '<YOUR_PROVIDER_ID>';
   ```


========================================
PHASE 4: REALTIME SUBSCRIPTION TEST
========================================

✓ STEP 11: Enable realtime debugging
- Open browser DevTools (F12)
- Go to Network tab
- Filter by "WS" (WebSocket)
- Expected: You should see realtime.dev or similar WebSocket connection
- If missing: Realtime not connected


✓ STEP 12: Subscribe to requests channel
- Paste in console:
```javascript
const channel = supabase.channel('requests_live')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'service_requests' },
    (payload) => {
      console.log('📡 REALTIME EVENT:', payload)
    }
  )
  .subscribe((status) => {
    console.log('🔌 Channel status:', status)
  })
```

Expected: Console shows: "🔌 Channel status: SUBSCRIBED"

❌ If "Channel status: CLOSED" after 5 seconds:
   - Realtime connection failed
   - Check: Is supabase.js library loaded?
   - Check: Are env variables set correctly?


✓ STEP 13: Test realtime event delivery
- Open TWO browser tabs:
  * Tab A: Provider (subscribed, console open)
  * Tab B: Buyer login
- In Tab B: Submit a NEW service request
- In Tab A: Watch console

Expected: Within 2-3 seconds, Tab A console shows:
```
📡 REALTIME EVENT: {
  eventType: 'INSERT',
  new: { id: '...', title: 'Test...', status: 'broadcasting', ...},
  schema: 'public',
  table: 'service_requests'
}
```

❌ If no event appears after 10 seconds:
   - RLS is blocking realtime (even though SELECT policy should allow)
   - Run SQL to verify provider can SELECT:
   ```sql
   SELECT * FROM service_requests 
   WHERE status = 'broadcasting' 
   LIMIT 1;
   ```
   - If error: RLS policies not active
   - If success but no realtime: Check WebSocket connection


========================================
PHASE 5: RACE CONDITION TEST (CRITICAL)
========================================

✓ STEP 14: Setup acceptance test
- Use the test request from Step 6
- Copy the request ID
- Prepare TWO provider accounts (ProvidA & ProvidB)
- Login to ProvidA browser tab first


✓ STEP 15: ProvidA accepts request
- In ProvidA console:
```javascript
const requestId = '<REQUEST_ID_FROM_STEP_6>'
const { data, error } = await supabase
  .from('service_requests')
  .update({
    status: 'accepted',
    assigned_seller_id: '<PROVA_SELLER_ID>'
  })
  .eq('id', requestId)
  .eq('status', 'broadcasting')  // ← CRITICAL: atomic check
  .select()
  .single()

console.log('ProvidA result:', data ? 'SUCCESS' : 'FAILED')
if(error) console.error('Error:', error)
```

Expected: SUCCESS (request updated)


✓ STEP 16: ProvidB tries to accept same request
- Switch to ProvidB tab
- Paste:
```javascript
const requestId = '<REQUEST_ID_FROM_STEP_6>'
const { data, error } = await supabase
  .from('service_requests')
  .update({
    status: 'accepted',
    assigned_seller_id: '<PROVB_SELLER_ID>'
  })
  .eq('id', requestId)
  .eq('status', 'broadcasting')  // ← Same atomic check
  .select()
  .single()

console.log('ProvidB result:', data ? 'SUCCESS' : 'FAILED')
if(error) console.error('Status:', error.code)
```

Expected: FAILED
- data = null (no row matched)
- error.code = "PGRST116" (no rows in result)
- ✓ This is CORRECT behavior - prevents double-booking

❌ If ProvidB also shows SUCCESS:
   - Race condition NOT protected
   - Check: .eq('status', 'broadcasting') in update clause
   - Check: Status was actually updated by ProvidA


========================================
PHASE 6: END-TO-END STATUS TRACKING
========================================

✓ STEP 17: Buyer verifies request accepted
- Login as the BUYER from Step 5
- Browse to their active requests
- Expected: Status changes from "Broadcasting" → "Accepted" (within 3-5 seconds)
- Expected: Shows ProvidA profile/contact info

❌ If status doesn't update:
   - Buyer SELECT policy may need update permission
   - Or UI isn't polling/subscribing for updates


✓ STEP 18: Verify in database
SQL Query:
```sql
SELECT id, buyer_id, status, assigned_seller_id, created_at
FROM service_requests
WHERE id = '<REQUEST_ID>'
LIMIT 1;
```

Expected:
```
id: <uuid>
buyer_id: <buyer_id>
status: accepted
assigned_seller_id: <prova_id>
```

If status = 'broadcasting': Update policy failed


========================================
FINAL VALIDATION MATRIX
========================================

| Feature | Test | Expected | Pass |
|---------|------|----------|------|
| RLS Enabled | Step 2 | rowsecurity=true | |
| 6 Policies | Step 3 | Count=6 | |
| Realtime Published | Step 4 | 1 row | |
| Buyer INSERT | Step 7 | Row exists | |
| Buyer SELECT | Step 8 | Row visible | |
| Provider SELECT | Step 10 | Array populated | |
| Realtime Subscribe | Step 12 | SUBSCRIBED | |
| Realtime Events | Step 13 | Event logged | |
| ProvidA Accept | Step 15 | SUCCESS | |
| ProvidB Blocked | Step 16 | FAILED | |
| Status Updated | Step 17 | accepted | |
| DB Confirmed | Step 18 | status=accepted | |

✅ ALL PASS = System fully operational
⚠️ ANY FAIL = See troubleshooting below


========================================
🆘 TROUBLESHOOTING MATRIX
========================================

Problem: "new row violates row-level security policy" on INSERT
↓ Check:
  - Is buyer_id set to auth.uid()?
  - Is status = 'broadcasting'?
  - Run: SELECT count(*) FROM pg_policies WHERE tablename='service_requests'
  - Expected: 6 policies present
  - Run: SELECT current_user; (should be 'postgres' or authenticated role)

Problem: Provider sees no requests
↓ Check:
  - Is provider account marked is_online = true?
  - Is seller_type = 'service' or 'both'?
  - Query: SELECT is_online, seller_type FROM seller_profiles WHERE user_id='<id>'
  - Are there any 'broadcasting' requests in DB?
  - Query: SELECT count(*) FROM service_requests WHERE status='broadcasting'

Problem: Realtime not firing
↓ Check:
  - Network tab: Is there a WebSocket connection (look for "realtime")?
  - If no WS: Supabase client not connected
  - If WS exists: Check if provider has visibility
  - Run: SELECT * FROM service_requests WHERE status='broadcasting'
  - If error: RLS blocking it
  - If empty: No requests to broadcast

Problem: ProvidB can still accept request
↓ Check:
  - Make sure using .eq('status', 'broadcasting') in UPDATE
  - Check that status was actually changed by ProvidA
  - Verify assignment is working:
    UPDATE service_requests SET status='accepted', assigned_seller_id='<id>'
      WHERE id='<request_id>' AND status='broadcasting';
  - If 0 rows updated: Status already changed (good!)
  - If 1 row updated: Atomic check working (ProvidB shouldn't be able to repeat)

========================================
DEPLOYMENT SIGN-OFF
========================================

☐ All verification steps passed
☐ Database migration completed
☐ RLS policies confirmed in pg_policies
☐ Realtime publication verified
☐ Buyer flow tested (INSERT + SELECT + viewing own requests)
☐ Provider flow tested (SELECT pending requests)
☐ Realtime events confirmed firing
☐ Race condition protected (only one provider can accept)
☐ End-to-end status tracking verified

✅ WHEN ALL CHECKED: System ready for production
⚠️ IF ANY UNCHECKED: Debug before deploying

Next Steps After Deployment:
1. Monitor Supabase logs for RLS violations
2. Have 5+ test providers go online
3. Have test buyers submit 10+ requests
4. Verify all appear in provider feeds
5. Test competitive acceptance (multiple providers)
6. Then: Plan Phase 2 (distance filtering + map optimization)
