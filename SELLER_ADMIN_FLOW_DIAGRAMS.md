# Seller Hub & Admin Dashboard Flow Diagrams

## 1. SELLER HUB: PRODUCT ORDER LIFECYCLE

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SELLER HUB: PRODUCT DELIVERY FLOW (Merchant Perspective)                     │
└──────────────────────────────────────────────────────────────────────────────┘

                                   CUSTOMER PLACES ORDER
                                           │
                            ┌──────────────┴──────────────┐
                            │                             │
                            ▼                             ▼
                    ┌─────────────────┐         ┌─────────────────┐
                    │ PAYMENT PENDING │         │   PAYMENT PAID  │
                    │   (wait)        │         │   ✅ Proceed    │
                    └─────────────────┘         └────────┬────────┘
                            │                            │
                    [Order not shown                     │
                     in Seller Hub]                      ▼
                                               ┌──────────────────────┐
                                               │ ORDER RECEIVED       │
                                               │ 🔔 Notification Bell │
                                               │ Status: PENDING      │
                                               │                      │
                                               │ [Seller Hub View]    │
                                               │ • Order ID highlighted
                                               │ • Customer name      │
                                               │ • Items (qty/price)  │
                                               │ • Total amount       │
                                               │ • Action dropdown ↓  │
                                               └──────────────┬───────┘
                                                              │
                                               ┌──────────────▼──────────────┐
                                               │ SELLER DECISION             │
                                               │ Accept order in dashboard   │
                                               │ 🎯 Responsibility point     │
                                               └──────────────┬──────────────┘
                                                              │
                                               ┌──────────────▼───────────────┐
                                               │ 1️⃣ PACK ITEMS               │
                                               │ Status: PACKED              │
                                               │                             │
                                               │ [In Warehouse/Shop]         │
                                               │ • Pick items from shelf     │
                                               │ • Verify quantities         │
                                               │ • Quality check             │
                                               │ • Update status to "PACKED" │
                                               └──────────────┬──────────────┘
                                                              │
                                               ┌──────────────▼───────────────┐
                                               │ 2️⃣ DISPATCH WITH COURIER    │
                                               │ Status: DISPATCHED          │
                                               │ 🔔 Notification to Buyer    │
                                               │                             │
                                               │ [Drop at Courier/Hub]       │
                                               │ • Hand package to courier   │
                                               │ • Record tracking number    │
                                               │ • Update status to "SHIPPED"│
                                               │ ⏰ buyer gets notified      │
                                               └──────────────┬──────────────┘
                                                              │
                                               ┌──────────────▼────────────────┐
                                               │ 3️⃣ MONITOR IN-TRANSIT        │
                                               │ Status: IN_TRANSIT           │
                                               │ 🔔 Notification to Buyer     │
                                               │                              │
                                               │ [Courier Movement]           │
                                               │ • Package leaves warehouse   │
                                               │ • Updates from courier       │
                                               │ • Automated notifications    │
                                               │ • Seller visibility: PENDING │
                                               │   (seller can't do much)     │
                                               └──────────────┬───────────────┘
                                                              │
                                               ┌──────────────▼────────────────┐
                                               │ 4️⃣ DELIVERY/PICKUP          │
                                               │ Status: DELIVERED            │
                                               │ 🔔 Notifications             │
                                               │                              │
                                               │ [Customer Location]          │
                                               │ • Package at destination     │
                                               │ • Customer receives          │
                                               │ • Buyer notified: Delivered  │
                                               │ • Seller notified: Success   │
                                               │ • Update status to "DELIVERED"
                                               └──────────────┬───────────────┘
                                                              │
                                               ┌──────────────▼──────────────┐
                                               │ 5️⃣ CLOSED & RATE-ELIGIBLE  │
                                               │ Status: COMPLETED           │
                                               │ 🌟 Review opportunity       │
                                               │                             │
                                               │ [SellerHub: Completed Tab]  │
                                               │ • Order moved to history    │
                                               │ • Rating badge if reviewed  │
                                               │ • Revenue counted           │
                                               │ • Contribution to seller    │
                                               │   rating/metrics            │
                                               └──────────────┬──────────────┘
                                                              │
                                              [REPEAT on next order]


KEY SELLER HUB INTERACTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ PENDING tab:    New orders waiting acceptance (notification bell alerts)
✓ ACTION dropdown: "Packed" → status changes to packed
✓ PACKED visibility: Order visible in "My Orders" but status = packed
✓ SHIPPED click:  Seller marks as shipped, buyer gets notification
✓ DELIVERED tab: Shows delivered items, can't modify
✓ COMPLETED tab: Final orders, shows revenue contribution
✓ Real-time updates in dashboard reflect on next page load or instant if WebSocket
```

---

## 2. SELLER HUB: SERVICE REQUEST LIFECYCLE

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SELLER HUB: SERVICE DELIVERY FLOW (Service Provider Perspective)             │
└──────────────────────────────────────────────────────────────────────────────┘

                              CUSTOMER REQUESTS SERVICE
                                       │
                    ┌──────────────────┴──────────────────┐
                    │                                     │
                    ▼                                     ▼
         ┌──────────────────┐                  ┌──────────────────┐
         │ SERVICE BROADCAST│                  │ SERVICE BOOKING  │
         │ (Found you!)     │                  │ (Direct booking) │
         │ 🔔 Notification  │                  │ 🔔 Notification  │
         └────────┬─────────┘                  └────────┬─────────┘
                  │                                     │
                  │     ┌───────────────────────────────┘
                  │     │
                  ▼     ▼
         ┌─────────────────────────────┐
         │ SERVICE JOB #SVC-001        │
         │ Status: PENDING (ACCEPT?)   │
         │ 🔔 Notification Bell        │
         │                             │
         │ [Seller Hub: Jobs Tab]      │
         │ • Service description      │
         │ • Customer location        │
         │ • Requested time/date      │
         │ • Price quoted             │
         │ • Accept/Decline button    │
         └──────────────┬──────────────┘
                        │
         ┌──────────────┴────────────┐
         │                           │
         ▼                           ▼
    [DECLINE]              [ACCEPT BUTTON]
         │                           │
         │                    🔔 Notification sent to customer
         │                    "Your service provider accepted!"
         │                           │
         │                    ┌──────▼──────────────┐
         │                    │ Job: ACCEPTED       │
         │                    │ Next: EN-ROUTE      │
         │                    │ 📍 Use location API │
         │                    │ for tracking        │
         │                    └──────┬──────────────┘
         │                           │
         │                    ┌──────▼─────────────────┐
         │                    │ 1️⃣ EN-ROUTE           │
         │                    │ Status: EN_ROUTE      │
         │                    │ 🔔 Buyer notification │
         │                    │                       │
         │                    │ [Seller Action]       │
         │                    │ • Start navigation    │
         │                    │ • Share live location │
         │                    │ • Message customer    │
         │                    │ • Press "Arriving"    │
         │                    │   when 5min away      │
         │                    └──────┬────────────────┘
         │                           │
         │                    ┌──────▼───────────────────┐
         │                    │ 2️⃣ AT CUSTOMER LOCATION │
         │                    │ Status: AT_LOCATION    │
         │                    │ 🔔 Buyer notification  │
         │                    │ "Provider is here!"    │
         │                    │                        │
         │                    │ [Service Delivery]     │
         │                    │ • Perform service      │
         │                    │ • Time spent: ⏱️       │
         │                    │ • Materials used       │
         │                    │ • Customer present ✓   │
         │                    │ • When done:           │
         │                    │   Press "Complete"    │
         │                    └──────┬────────────────┘
         │                           │
         │                    ┌──────▼──────────────────┐
         │                    │ 3️⃣ RETURNING HOME      │
         │                    │ Status: RETURNING      │
         │                    │ (Optional for mobile)  │
         │                    │                        │
         │                    │ [If service = travel]  │
         │                    │ • Back to base/office  │
         │                    │ • Update location live │
         │                    └──────┬─────────────────┘
         │                           │
         │                    ┌──────▼──────────────────┐
         │                    │ 4️⃣ JOB COMPLETED      │
         │                    │ Status: COMPLETED      │
         │                    │ 🔔 Notifications       │
         │                    │                        │
         │                    │ [Final Actions]        │
         │                    │ • Invoice generated    │
         │                    │ • Payment collected    │
         │                    │ • Rating request sent  │
         │                    │ • Job closed           │
         │                    │ • Revenue counted      │
         │                    └──────┬─────────────────┘
         │                           │
    [Job Cancelled]          [Next job or rest]


KEY SELLER HUB SERVICE INTERACTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ PENDING/NEW JOBS tab: Service requests awaiting acceptance (notification alerts)
✓ ACCEPT button: Changes status to accepted, notifies customer
✓ EN-ROUTE: Seller shares live location with customer
✓ AT_LOCATION: Time tracking starts, customer contacted
✓ COMPLETED: Job closes, payment processed, rating eligible
✓ Real-time notifications at each state change
✓ Location sharing (Maps integration) for transparency
✓ Safety: Customer knows exactly where provider is
```

---

## 3. ADMIN DASHBOARD: SYSTEM-WIDE ORDER MONITORING

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ADMIN DASHBOARD: ORDER LIFECYCLE OVERSIGHT (System Admin View)               │
└──────────────────────────────────────────────────────────────────────────────┘

                        ┌─────────────────────────────────┐
                        │ ADMIN DASHBOARD HOME            │
                        │ Real-time Metrics               │
                        │ • Total Orders Today: 47        │
                        │ • Completed: 32 (68%)           │
                        │ • Pending Seller Action: 8      │
                        │ • Stuck/Delayed: 2 ⚠️           │
                        │ • Payment Failed: 1 🔴          │
                        └──────────────┬──────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                │                      │                      │
                ▼                      ▼                      ▼
          [ORDERS TAB]          [ACTIVITY FEED]        [ALERTS TAB]
          (Ordered list)        (Real-time stream)     (Exceptions)
                │                      │                      │
                │                      │                      ▼
                │                      │          ┌────────────────────┐
                │                      │          │ ALERTS MONITORING  │
                │                      │          │                    │
                │                      │          │ • Payment Failed   │
                │                      │          │ • Seller Unrespond│
                │                      │          │ • Customer Dispute │
                │                      │          │ • Stuck Orders    │
                │                      │          │                    │
                │                      │          │ Admin can:         │
                │                      │          │ ✓ Escalate        │
                │                      │          │ ✓ Assign to team  │
                │                      │          │ ✓ Refund          │
                │                      │          │ ✓ Force complete  │
                │                      │          └────────────────────┘
                │                      │
                ▼                      ▼
         ┌──────────────────┐   ┌────────────────────────────┐
         │ ORDERS LIST VIEW │   │ ACTIVITY STREAM            │
         ├──────────────────┤   ├────────────────────────────┤
         │ Order #001       │   │ [13:45] Order#001 FINALIZED│
         │ ├─ Status: PENDING   │ [13:46] Payment received   │
         │ ├─ Seller: Shop123   │ [13:48] Seller accepted   │
         │ ├─ Amount: R450      │ [14:02] Order#001 PACKED   │
         │ ├─ Payment: ✅ Paid  │ [14:15] Dispatch request   │
         │ └─ Actions: ⚡       │ [14:20] Order#001 SHIPPED  │
         │    ? Flag | Refund  │ [14:25] Order#002 FINALIZED│
         │                      │ [14:26] Order#003 CANCEL?  │
         │ Order #002          │ [14:27] Admin intervention │
         │ ├─ Status: NO ACTION │              for #003      │
         │ ├─ Seller: Shop456  │ [14:30] Order#001 IN_TRANS │
         │ ├─ Amount: R890     │ [14:45] Order#001 DELIVERED│
         │ ├─ Payment: ⏳ Unpaid │ ...                       │
         │ └─ Actions: ⚠️       │                            │
         │    ⏰ Remind | Refund │ [ADMIN QUICK-ACTIONS]     │
         │                      │ ───────────────────────────│
         │ Order #003          │ 🔍 Filter:                │
         │ ├─ Status: DISPUTE ❌│   • Type: All Orders       │
         │ ├─ Seller: Shop789  │   • Status: Stuck (2)      │
         │ ├─ Amount: R650     │   • Date: Last 7 days      │
         │ ├─ Payment: ✅ Paid │   • Seller: [search]       │
         │ └─ Actions: 🚨      │                            │
         │    📞 Escalate      │ 📢 Broadcast to Sellers    │
         │ ...                 │    "New commission policy" │
         │                      │                            │
         │ [Pagination: 1-10]  │ [Export: CSV | JSON]       │
         └──────────────────────┘ └────────────────────────────┘


DETAILED ORDER STATE TRACKING (Admin sees everything):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Order #ABC-001 Timeline (Expandable):
────────────────────────────────────
13:30 ✅ Order Created (payment_status: unpaid)
      → Seller: Shop123
      → Items: 2x Headphones @ R450
      → Delivery: 12km away, ~R80 fee

13:32 ✅ Payment Confirmed (payment_status: paid)
      → Via Yoco
      → Amount received: R530 (incl. fee)

13:35 🔔 Order Finalized
      → Status change: pending → finalized
      → Notification: Seller "New Order Received"
      → Seller ack time: 3s (fast!)

13:40 ✅ Seller Accepted
      → Seller confirmed receipt
      → Can pack items

14:02 ✅ Order Packed
      → Status: packed
      → Location: Shop123 store
      → Ready for pickup by courier

14:15 ⏳ Awaiting Dispatch
      → Seller not yet updated to "dispatched"
      → [ADMIN CAN]: Remind seller / Force status

14:20 ✅ Dispatched
      → Status: dispatched
      → Notification: Buyer "Order on the way!"
      → Tracking: [courier tracking #XYZ]

14:25 🔄 In-Transit
      → Status: in_transit
      → Last ping: 14:25 (5 mins ago) at [GPS coords]
      → ETA: 14:55 to customer location

14:55 ✅ Delivered
      → Status: delivered
      → Signature: Required for >R500 orders
      → Proof: Photo + timestamp
      → Notification: Buyer "Package arrived!"

15:00 ⭐ Rating Request
      → Notification: Buyer "Rate your experience"
      → Deadline: 7 days
      → If no rating: Auto-5star after 7d

15:02 🌟 Order Complete
      → Status: completed
      → Rating received: 4.5 ⭐ (excellent)
      → Revenue impact: +R450 seller, -R45 commission
      → Seller rating updated: 4.8 → 4.83


ADMIN INTERVENTIONS (When needed):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scenario: Seller not responding (2+ hours since finalization)
├─ Admin sees: ⚠️ Alert "Slow seller response"
├─ Admin can:
│  ├─ 📞 Notify seller (auto-SMS/push)
│  ├─ ⏰ Set escalation timer (1hr)
│  ├─ 🚀 Force status to packed (manual override)
│  ├─ 📋 Leave note (internal audit trail)
│  └─ 🔴 Suspend seller if repeated

Scenario: Delivery stuck (should arrive 2hrs ago)
├─ Admin sees: 🔴 Alert "Delivery delayed"
├─ Admin can:
│  ├─ 📍 Check live location of courier
│  ├─ 📞 Contact courier
│  ├─ 💰 Pre-authorize refund
│  ├─ 📧 Proactive message to customer
│  ├─ 📋 Adjust delivery fee (refund portion)
│  └─ 🎁 Issue credit/compensation

Scenario: Customer disputes quality
├─ Admin sees: 🚨 Dispute flag on order
├─ Admin can:
│  ├─ 👀 Review photos/evidence
│  ├─ 💬 Facilitate resolution chat
│  ├─ 🔄 Arrange return/refund
│  ├─ 💰 Refund fully or partially
│  ├─ 📊 Update seller/buyer ratings
│  └─ 📋 Archive for analytics
```

---

## 4. NOTIFICATION TRIGGER MATRIX

```
ORDER STATE CHANGES → NOTIFICATIONS TRIGGERED
═══════════════════════════════════════════════════════════════════════════════

                  PEN   FIN   PACK  SHIP  IN-TRANS  DELI  COMP  CANCEL
                  DING  INAL  ED    PED   IT        VER   ETED  ELLED
────────────────────────────────────────────────────────────────────────────
🏪 Seller         NOTE  NOTE1 -     NOTE2 -        NOTE3 NOTE4 NOTE5
(Notification)    ✅    ✅    ✅    ✅    -        ✅    ✅    ✅
                       "Accept" "Pack" "Ship" -  "Done" "Rate" "Refund"

🛍️ Buyer          -     -     -     NOTE2 NOTE3  NOTE4 NOTE4 NOTE5
(Notification)         -     -     ✅    ✅     ✅    ✅    ✅
                             "Order  "On   "Arriv "Rate "Refund"
                              Ready" Way"   ed"    It"   ?"

👮 Admin          NOTE1 NOTE1 -     -     -      -     -     NOTE5
(Notification)    ✅    ✅    ✅    ✅    ✅     ✅    -     ✅
                    "Order" "Order" "Shipped" "In-Transit" "Completed" "Cancelled"
                       
LEGEND:
────
NOTE1: "New [Product] Order Received from [Buyer Name]. Accept now?"
NOTE2: "[Product Order] Dispatched. Customer waiting for delivery."
NOTE3: "Your [Product] Order is In-Transit. Arriving [ETA]."
NOTE4: "Order Delivered! ⭐ Rate your experience."
NOTE5: "Order Cancelled. Refund initiated. [Amount] will arrive in 3-5 days."

KEY RULES:
──────────
✅ Notification sent = database record created + real-time push
✅ Link in notification = direct to relevant Seller Hub tab/order
✅ Admin gets ALL = can monitor system health
✅ Seller gets 2 = action-required (accept, mark shipped)
✅ Buyer gets 3 = status updates (dispatched, in-transit, delivered)
✅ Service orders follow similar pattern (accept → en-route → complete)
```

---

## 5. INTEGRATION CHECKLIST

### Seller Hub Order Status Codes
```
Displayed in Seller Hub dropdown selector:

Products:
  1. pending   → "Awaiting Pack" (Seller must accept first)
  2. packed    → "Ready for Courier" (Internal, seller can't see)
  3. dispatched → "Shipped" (visible in history)
  4. in_transit → "In Transit" (read-only, shown in history)
  5. delivered → "Delivered" (read-only, final)
  6. completed → "Completed" (after rating deadline, final)

Services:
  1. pending    → "Awaiting Acceptance"
  2. accepted   → "Accepted - Going to Customer"
  3. in_progress → "Service In Progress"
  4. completed  → "Completed"
  5. cancelled  → "Cancelled"
```

### Notification Type-to-Icon Mapping
```
Type          Icon              Color      Use Case
────────────────────────────────────────────────────────
kyc         🪪 ShieldCheck      Blue       KYC submissions
like        ❤️ Heart            Rose       Product likes
order       📦 Package          Emerald    Product orders
booking     ⚡ Zap              Violet     Service bookings
broadcast   📡 Radio            Amber      Service requests
finalized   ✅ CheckCircle      Green      Order accepted
dispatch    🚚 Truck            Blue       Order shipped
in_transit  📍 MapPin           Amber      In-transit updates
delivery    🏠 Home             Emerald    Order delivered
info        🔔 Bell             Slate      General info
```

---

## 6. MOBILE NOTIFICATION UX OPTIMIZATION

```
Desktop (Wide):
┌──────────────────────────────────────────────────────────┐
│ Logo | Nav | Search | Cart | NotifBell | User | Settings │
│                                    ▼                       │
│              ┌─────────────────────────────┐              │
│              │ Notifications (26rem width) │              │
│              │ ✅ Styled perfectly         │              │
│              └─────────────────────────────┘              │
└──────────────────────────────────────────────────────────┘

Mobile (Narrow):
┌─────────────────────────┐
│ Logo | Menu | NotifBell │ ← Bell at TOP-RIGHT (thumb reach)
│                  ▼      │
│    ┌──────────────────┐ │
│    │ Notifications    │ │ ← 100% viewport width minus 1rem
│    │ [scrollable]     │ │
│    │                  │ │
│    │ max-h: calc(100 │ │ ← Keyboard-safe height
│    │ vh - 6rem)      │ │
│    │                  │ │
│    │ ✅ Scrolls safely│ │
│    │ ✅ Tap-friendly  │ │
│    └──────────────────┘ │
└─────────────────────────┘

Tablet (Medium):
┌──────────────────────────────────────┐
│ Logo | Nav | Cart | NotifBell | User │
│                        ▼              │
│        ┌──────────────────────┐      │
│        │ Notifications (custom│      │
│        │ breakpoint width)    │      │
│        │ ✅ Centered          │      │
│        │ ✅ Safe modal area   │      │
│        └──────────────────────┘      │
└──────────────────────────────────────┘
```

---

## 7. FIRST ORDER EVENT SEQUENCE

When **first customer places an order**, here's the complete flow:

```
T=0s:   Customer clicks "Buy Now" → Payment page
T=3s:   Payment processed (Yoco/SnapScan)
        └─ order.payment_status: unpaid → paid

T=4s:   Order created in system
        └─ order.status: pending
        └─ order_items inserted

T=5s:   🔔 TRIGGER: notify_order_placed() fires
        ├─ Seller gets notification: "New Order from [Customer]"
        ├─ Admin gets notification: "[Seller] received order"
        └─ Database: 2x notifications inserted

T=6s:   Seller receives bell notification (real-time)
        ├─ Bell icon badge: 1 unread
        ├─ Audio ping: 🔊
        └─ Refreshes Seller Hub → sees order in PENDING tab

T=10s:  Seller clicks "Accept" in Seller Hub
        ├─ Updates order_items.item_status: pending → finalized
        ├─ 🔔 TRIGGER: notify_order_finalized() fires
        │   ├─ Seller: "Order accepted, pack now"
        │   ├─ Buyer: "Seller is packing your order"
        │   └─ Admin: "Order #XYZ finalized"
        └─ Status badge changes color in Seller Hub

T=45min: Seller packs items, updates status to "packed"
        ├─ 🔔 Seller: "Ready for courier pickup"
        ├─ Buyer: Waiting notification
        └─ Seller Hub: Order in PACKED section

T=1h:   Courier arrives, picks up package
        ├─ Seller updates to "dispatched" in dropdown
        ├─ 🔔 TRIGGER: notify_order_dispatched() fires
        │   ├─ Seller: "Order on its way! 🚚"
        │   ├─ Buyer: "Order dispatched! ETA: [time]" 
        │   └─ Admin: Sees order in IN_TRANSIT queue
        └─ Seller Hub: Order moves to HISTORY (shipped)

T=2h30min: Package in transit
        ├─ Courier scans at hub
        ├─ 🔔 Buyer gets automatic update (if REAL SMS/EMAIL enabled)
        │   └─ "Package in transit, 30min away"
        └─ Seller Hub: Seller can see tracking

T=3h:   Package arrives at customer location
        ├─ Courier scans delivered
        ├─ 🔔 TRIGGER: notify_order_delivered() fires
        │   ├─ Buyer: "🎉 Order Delivered! Rate now."
        │   ├─ Seller: "✅ Order Complete! Check feedback."
        │   └─ Admin: Sees order in COMPLETED queue
        └─ Seller Hub: Order marked DELIVERED (green badge)

T=3h5min: Customer rates order (4.5⭐️)
        ├─ 🔔 Seller: "You got a 4.5⭐️ review!"
        ├─ Admin: Order metrics updated
        └─ Seller Hub: Rating visible, affects seller score

T=3h10min: Order finalized
        ├─ Revenue calculated: R450 - R45 (commission) = R405 to seller
        ├─ Seller Hub: Shows earnings +R405
        └─ Admin: Sees successful transaction, updates KPIs

════════════════════════════════════════════════════════════════════════════════

NOTIFICATIONS SENT IN THIS SEQUENCE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ T=5s   Seller: "New Order" (ACTION REQUIRED)
✅ T=5s   Admin: "Order Received" (INFO)
✅ T=10s  Buyer: "Seller accepted" (INFO)
✅ T=1h   Buyer: "Order dispatched" (TRACKING)
✅ T=3h   Buyer: "Order delivered" (ACTION REQUIRED - rate)
✅ T=3h   Seller: "Order complete" (INFO)
✅ T=3h5m Seller: "Got a review" (ENGAGEMENT)

Total: 7 notifications for FIRST order (optimal frequency)
```

---

## Summary

| Aspect | Current | Recommended | Priority |
|--------|---------|-------------|----------|
| **Mobile Bell** | Fixed, may cut off | Responsive + safer area | URGENT |
| **Modal** | Fixed height | Viewport-aware | URGENT |
| **Order Lifecycle** | Partial (2/4 states) | Complete (4/4 states) | CRITICAL |
| **Service Lifecycle** | Partial (booking only) | Complete (all states) | CRITICAL |
| **Admin Feed** | Notification tabs only | Real-time activity log | HIGH |
| **Data Consistency** | Notifications ≠ Orders tab | 1:1 mapping | HIGH |
| **Production Ready** | ~70% | 100% after Phase 1-3 | TODAY |

