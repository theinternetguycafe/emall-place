# Notification System: Implementation Roadmap

## Quick Start (Total Time: ~2 hours)

### ✅ PHASE 1: MOBILE FIX (15 mins)
**Files**: `src/components/notifications/NotificationBell.tsx`
**Status**: Move to production immediately

```tsx
// Line ~135: Bell button className
OLD: className="relative p-3 text-slate-400 hover:text-slate-900 transition-all group"
NEW: className="relative p-2 md:p-3 text-slate-400 hover:text-slate-900 transition-all group"

// Line ~158: Panel modal className  
OLD: 'w-[min(26rem,calc(100vw-1rem))]',
     'sm:right-0 -right-2',

NEW: 'w-[min(26rem,calc(100vw-0.5rem))]',
     'sm:right-0 -right-1',  // tighter on mobile

// Line ~166: Scroll container
OLD: className="max-h-[28rem] overflow-y-auto divide-y divide-stone-50"
NEW: className="max-h-[min(28rem,calc(100vh-10rem))] overflow-y-auto divide-y divide-stone-50"
     // Ensures modal doesn't overflow even with mobile keyboard
```

**Testing**:
```
✓ Mobile (iPhone 5: 320px): Bell centered, modal full-width with padding
✓ Mobile (iPhone 12: 390px): Bell aligned, modal responsive
✓ Tablet (iPad: 768px): Bell positioned, modal centered
✓ Desktop (1920px): All original behavior preserved
✓ Keyboard: Modal visible when keyboard appears (Android/iOS)
```

**Deploy**: Commit to main, run `npm run build && npm run deploy`

---

### ✅ PHASE 2: DATABASE TRIGGERS (30 mins)
**Files**: `ADD_ORDER_LIFECYCLE_NOTIFICATIONS.sql`
**Status**: TEST in staging DB first

**Step 1: Backup your database**
```sql
-- Supabase Dashboard > SQL Editor > Run snapshot
-- or export via Supabase dashboard
```

**Step 2: Run SQL script**
```
1. Copy content of ADD_ORDER_LIFECYCLE_NOTIFICATIONS.sql
2. Open Supabase > SQL Editor (top nav)
3. Paste entire script
4. Click [Execute] (dangerous, but it's just functions/triggers)
5. Check for errors in the results panel
```

**Step 3: Verify triggers were created**
```sql
-- Run this in SQL Editor to verify:
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
ORDER BY trigger_name;

-- Should see:
-- trg_notify_order_finalized
-- trg_notify_order_dispatched
-- trg_notify_order_in_transit
-- trg_notify_order_delivered
-- trg_notify_service_accepted
-- trg_notify_service_in_progress
```

**Testing Triggers** (offline, no customer data):
```
1. Create test order manually in DB:
   INSERT INTO orders (buyer_id, status, payment_status)
   VALUES (your-user-id, 'pending', 'paid');
   
2. Create test order_item:
   INSERT INTO order_items (order_id, seller_id, product_id, item_status, qty, unit_price)
   VALUES (order-id, seller-id, product-id, 'pending', 1, 100);
   
3. Update status to trigger notifications:
   UPDATE order_items 
   SET item_status = 'finalized' 
   WHERE id = item-id;
   
4. Check notifications table filled:
   SELECT * FROM notifications 
   WHERE created_at > NOW() - INTERVAL '1 minute'
   ORDER BY created_at DESC;
```

---

### ✅ PHASE 3: NOTIFICATION TYPE ICONS (10 mins)
**Files**: `src/components/notifications/NotificationBell.tsx`
**Status**: Add visual distinction for new notification types

```tsx
// Line ~8: Import new icons
import { 
  Bell, BellOff, Package, Heart, ShieldCheck, Zap, Radio, ArrowRight, CheckCheck,
  CheckCircle,  // ADD THIS
  Truck,        // ADD THIS
  MapPin,       // ADD THIS
  Home          // ADD THIS
} from 'lucide-react'

// Line ~38-49: Add to TYPE_META
const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  kyc:        { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-blue-600',    bg: 'bg-blue-100' },
  like:       { icon: <Heart className="w-4 h-4" />,       color: 'text-rose-600',    bg: 'bg-rose-100' },
  order:      { icon: <Package className="w-4 h-4" />,     color: 'text-emerald-600', bg: 'bg-emerald-100' },
  booking:    { icon: <Zap className="w-4 h-4" />,         color: 'text-violet-600',  bg: 'bg-violet-100' },
  broadcast:  { icon: <Radio className="w-4 h-4" />,       color: 'text-amber-600',   bg: 'bg-amber-100' },
  finalized:  { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-600',   bg: 'bg-green-100' },  // NEW
  dispatch:   { icon: <Truck className="w-4 h-4" />,       color: 'text-blue-600',    bg: 'bg-blue-100' },   // NEW
  in_transit: { icon: <MapPin className="w-4 h-4" />,      color: 'text-amber-600',   bg: 'bg-amber-100' },  // NEW
  delivery:   { icon: <Home className="w-4 h-4" />,        color: 'text-emerald-600', bg: 'bg-emerald-100' }, // NEW
  info:       { icon: <Bell className="w-4 h-4" />,        color: 'text-slate-600',   bg: 'bg-slate-100' },
}
```

**Testing**: All 10 notification types now display with correct icons and colors.

---

### ✅ PHASE 4: ADMIN ACTIVITY FEED (45 mins)
**Files**: `src/pages/AdminDashboard.tsx`
**Status**: Add real-time notifications tab

**Step 1: Add state for notifications**
```tsx
// After line imports, in AdminDashboard component:
const [notifications, setNotifications] = useState<any[]>([])
const [unreadNotifCount, setUnreadNotifCount] = useState(0)

useEffect(() => {
  if (!user) return
  
  // Fetch all notifications
  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    
    if (data) {
      setNotifications(data)
      setUnreadNotifCount(data.filter(n => !n.read).length)
    }
  }
  load()
  
  // Real-time subscription
  const channel = supabase
    .channel('admin-notifications')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications' },
      (payload) => {
        setNotifications(prev => [payload.new as any, ...prev].slice(0, 100))
        setUnreadNotifCount(prev => prev + 1)
      }
    )
    .subscribe()
  
  return () => { supabase.removeChannel(channel) }
}, [user])
```

**Step 2: Add "Activity" tab button**
```tsx
// In TabBtn row section, add:
<TabBtn 
  active={tab === 'activity'} 
  onClick={() => setTab('activity')} 
  label="Activity Feed" 
  count={unreadNotifCount} 
/>
```

**Step 3: Add Activity Feed render section**
```tsx
{tab === 'activity' && (
  <div className="space-y-4">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-lg font-black text-slate-900">Real-time Activity</h3>
      <select 
        className="text-[10px] font-bold px-3 py-1.5 border border-stone-100 rounded-lg"
        value={notificationFilter || 'all'}
        onChange={(e) => setNotificationFilter(e.target.value)}
      >
        <option value="all">All Types</option>
        <option value="order">Orders</option>
        <option value="booking">Bookings</option>
        <option value="finalized">Finalized</option>
        <option value="dispatch">Dispatch</option>
        <option value="kyc">KYC</option>
      </select>
    </div>
    
    <div className="space-y-2 max-h-[70vh] overflow-y-auto">
      {notifications
        .filter(n => notificationFilter === 'all' || n.type === notificationFilter)
        .map(n => (
          <div 
            key={n.id} 
            className={`p-4 rounded-lg border ${n.read ? 'bg-stone-50 border-stone-100' : 'bg-blue-50 border-blue-200'}`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <p className={`font-black text-sm ${n.read ? 'text-stone-600' : 'text-slate-900'}`}>
                  {n.title}
                </p>
                <p className="text-[12px] text-stone-500 mt-1">
                  {n.message}
                </p>
                <p className="text-[10px] text-stone-400 mt-2">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-2"></span>
              )}
            </div>
          </div>
        ))}
    </div>
  </div>
)}
```

---

### ✅ PHASE 5: TESTING & VERIFICATION (30 mins)

**Test Scenario 1: Full Product Order Lifecycle**
```
1. As CUSTOMER:
   ✓ Browse marketplace
   ✓ Add item to cart
   ✓ Checkout
   ✓ Pay via Yoco/SnapScan
   ✓ Confirm order created

2. As SELLER:
   ✓ Receive notification bell alert (Order Received)
   ✓ See new order in Seller Hub > Orders tab
   ✓ Click dropdown > select "Pack"
   ✓ Status updates to "Packed"
   ✓ Click dropdown > select "Shipped"
   ✓ Notification badge on bell (Order Shipped)
   ✓ See "Order Dispatched" notification

3. As ADMIN:
   ✓ See notification in Admin Dashboard
   ✓ Activity Feed shows all state transitions
   ✓ Can filter by order type

4. As CUSTOMER (return):
   ✓ Check /orders page
   ✓ See order with "In Transit" status
   ✓ See "Delivered" notification when status updates
   ✓ Rate order button appears
```

**Test Scenario 2: Mobile Responsiveness**
```
✓ Desktop: Bell icon top-right, modal right-aligned, full width = 26rem
✓ Tablet (768px): Bell same, modal responsive
✓ Mobile (390px): Bell left padding reduced, modal full-width minus 8px
✓ Mobile (320px): Bell smallest, modal squeezed but readable
✓ Mobile + keyboard: Modal doesn't disappear, scrollable
```

**Test Scenario 3: Notification Types**
```
✓ Like notification: ❤️ icon, rose color
✓ Order notification: 📦 icon, emerald color
✓ Finalized notification: ✅ icon, green color
✓ Dispatch notification: 🚚 icon, blue color
✓ In-Transit notification: 📍 icon, amber color
✓ Delivery notification: 🏠 icon, emerald color
✓ KYC notification: 🪪 icon, blue color
```

---

## Deployment Checklist

### Before Going Live
- [ ] Phase 1 (Mobile): Build successful, tested on 3+ devices
- [ ] Phase 2 (Triggers): SQL script runs without errors, triggers exist in DB
- [ ] Phase 3 (Icons): All 10 notification types display correctly
- [ ] Phase 4 (Admin): Activity feed visible, real-time updates work
- [ ] Phase 5 (Testing): All 3 test scenarios pass

### Command Summary
```bash
# 1. Commit changes
git add .
git commit -m "feat: notification system revamp - mobile fix, order lifecycle triggers, admin feed"

# 2. Build
npm run build
# ✓ No TypeScript errors
# ✓ No warnings (except expected)

# 3. Deploy
npm run deploy
# ✓ Build uploaded to Vercel/hosting
# ✓ All routes working

# 4. Verify in production
# Open prod URL > test bell icon, notifications
```

### SQL Deployment
```
1. Go to Supabase Dashboard > SQL Editor
2. Paste ADD_ORDER_LIFECYCLE_NOTIFICATIONS.sql
3. Execute
4. Verify triggers exist (see Phase 2 Step 3)
```

---

## Fallback / Rollback Plan

### If Mobile Fix Breaks Things
```
1. Revert to old className values
2. Redeploy: npm run deploy
3. No database impact, safe to retry
```

### If Triggers Cause Issues
```
1. Drop triggers in SQL Editor:
   DROP TRIGGER IF EXISTS trg_notify_order_finalized ON order_items;
   DROP TRIGGER IF EXISTS trg_notify_order_dispatched ON order_items;
   DROP TRIGGER IF EXISTS trg_notify_order_in_transit ON order_items;
   DROP TRIGGER IF EXISTS trg_notify_order_delivered ON order_items;
   
2. Notifications table data remains (won't be deleted)
3. Rerun SQL script after fixing issues
```

---

## Production Readiness

**Before First Real Order:**
- [ ] Notification system fully tested with test orders
- [ ] All seller hub order status matches notification types
- [ ] Admin can monitor all order states in real-time
- [ ] Mobile notification bell tested on customer devices
- [ ] Email support has runbook for common notification issues
- [ ] Logging in place to catch missed notifications

**After First Real Order:**
- [ ] Monitor notification logs for errors
- [ ] Check seller hub order status transitions
- [ ] Verify customer receives status emails (if enabled)
- [ ] Admin reviews activity feed for anomalies
- [ ] Collect feedback on notification UX/timing

---

## Timeline Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Mobile bell fix | 15m | Ready |
| 2 | Database triggers | 30m | Ready |
| 3 | Notification icons | 10m | Ready |
| 4 | Admin activity feed | 45m | Ready |
| 5 | Full testing | 30m | Ready |
| **TOTAL** | **Full System** | **~2h** | **Ready to ship** |

**Target Completion**: TODAY ✅

---

## Support Resources

### If You Get Stuck
1. **Mobile styling**: Check Tailwind breakpoints in the component
2. **SQL errors**: Usually missing semicolons or typos - re-check uppercase keywords
3. **Notifications not showing**: Check notification type matches TYPE_META keys
4. **Real-time not working**: Refresh page, check Supabase connection

### Next Steps (After This Phase)
- Email notification delivery (optional, future)
- SMS alerts for critical orders (optional, future)
- Push notifications for mobile app (future)
- Notification archive cleanup (>90 days, auto-delete)
- Analytics dashboard (notification engagement metrics)

