# QUICK DEPLOYMENT & TESTING GUIDE

## PRE-DEPLOYMENT CHECKLIST

### Database
- [ ] Run migration: `supabase migration up` (or manually execute 09_seller_onboarding.sql)
- [ ] Verify table exists: Check Supabase dashboard > seller_onboarding
- [ ] Test RLS with both seller and admin accounts

### Frontend Build
- [ ] Run `npm install` (no new dependencies, just in case)
- [ ] Run `npm run build` (should succeed, no build errors)
- [ ] Check compiled JavaScript for onboarding bundle

### Code Review
- [ ] Spot-check SellerDashboard.tsx changes (imports, state, integration)
- [ ] Spot-check SellerTour.tsx for accessibility (keyboard navigation OK? tested?)
- [ ] Verify no console errors in local dev

---

## LOCAL TESTING (5 MIN SMOKE TEST)

### Setup
```bash
npm run dev
# Open http://localhost:5173
```

### Step 1: Create Seller Account
```
1. Click "Get Started"
2. Sign up as new user with email (test@seller.local)
3. Set role = 'seller' (via Supabase dashboard, update profiles table)
4. Login
```

### Step 2: Navigate to Seller Hub
```
1. Click Account → Click "Seller Hub" button (or /seller directly)
2. See "Initialize Workshop" card
3. Click "Complete Setup"
4. Enter store name: "Test Shop"
5. Submit
6. ✓ Page refreshes, shows "Seller Quick Start" blue card
```

### Step 3: Quick Start Card Validation
```
Expected view:
  ┌───────────────────────────────────┐
  │ Seller Quick Start                 │
  │ Progress: 0/6                      │
  │ [Start Tour Now] [0 of 6 done]    │
  │                                    │
  │ ☐ Set up your store profile       │
  │ ☐ Create your first product       │
  │ ☐ Add clear photos                │
  │ ☐ Choose category and...          │
  │ ☐ Publish for review              │
  │ ☐ Understand how orders work      │
  └───────────────────────────────────┘

Click "Start Tour Now"
```

### Step 4: Tour Modal Validation
```
Expected:
1. Modal appears (centered, not off-screen)
2. "Step 1 of 6" indicator visible
3. Title: "Set up your store profile"
4. Blue box around "store-form-section" (it's already created, so no form shown)
   OR centered modal (fallback, if element is off-screen)
5. [Back] (disabled/grayed) [Next] [Skip for now]

Click [Next]
→ Console: "[Onboarding] updating progress..."
→ Modal shows "Step 2 of 6"
→ "Create your first product"
→ Link in checklist points to /seller/products/new
```

### Step 5: Product Form Integration
```
Click [Next] in Step 2
→ Navigate to /seller/products/new
→ Modal might be hidden (off-page, reopens when in view)
→ See blue box highlight on "Product Title" input
  (or modal fallback if off-screen)

Input:
- Title: "Test Handmade Mug"
- Price: 150
- Stock: 5
- Category: (select any)
- Description: "Beautiful hand-thrown ceramic mug"

[Next] button guides to Step 3 (add images)
```

### Step 6: Tour Completion
```
Continue clicking [Next] through all 6 steps:
  1. Store setup (completed above)
  2. Create product (filled above)
  3. Add photos (see image-upload-section highlighted)
  4. Category (see product-category-select highlighted)
  5. Publish (see publish-button highlighted)
  6. Learn orders (back at /seller, orders-tab highlighted)

On Step 6, click [Complete]
→ Modal closes
→ Page shows CONGRATULATIONS card (blue, emerald icons)
→ "You've completed the quick-start tour"
→ Progress shows "6/6 Complete" ✓

Refresh page
→ Congratulations card still shows (not reset)
→ Verify in Supabase: seller_onboarding row has completed=true
```

### Step 7: Resume from Incomplete
```
1. Go back to Seller Hub
2. Refresh page
3. Change URL to /seller
4. SellerQuickStart shows "Continue Tour" (if incomplete)
5. Or "🎉 Congratulations" (if completed)
```

---

## MOBILE TESTING (ANDROID)

### Device Setup
```
1. Open DevTools: F12
2. Toggle Device Mode: Ctrl+Shift+M
3. Select "Android" or "iPhone 12"
```

### Test Cases
```
✓ SellerQuickStart card render (no horizontal scroll)
✓ Blue card is readable at ~375px width
✓ Checklist items clickable (44px+ height per touch targets)
✓ Tour modal centered, not overflow
✓ Modal buttons tappable, readable
✓ Image upload section accessible
✓ Publish button reachable without scroll
```

### Specific Scenarios
```
Scenario: Product form on mobile
→ Navigate to /seller/products/new
→ Image upload section visible
→ Can add images with file picker
→ Publish button in footer (sticky or scroll to)

Scenario: Tour on mobile, element off-screen
→ Step 2 modal shown (element not in view)
→ Shows centered card (fallback)
→ Can skip or next without issue
```

---

## DATABASE VERIFICATION

### Supabase SQL Console
```sql
-- Check table exists
SELECT * FROM seller_onboarding LIMIT 1;

-- Check RLS is enabled
SELECT tablename FROM pg_tables WHERE tablename = 'seller_onboarding';

-- Check policies applied
SELECT policyname FROM pg_policies 
WHERE tablename = 'seller_onboarding';

-- Expected output:
-- policyname: "Users can view own onboarding progress"
-- policyname: "Users can update own onboarding progress"
-- policyname: "Users can insert own onboarding progress"
-- policyname: "Admins can manage all onboarding progress"
```

### RLS Validation (Seller View)
```sql
-- As seller user (auth.uid() = seller_user_id)
SELECT * FROM seller_onboarding WHERE user_id = auth.uid();
-- Expected: 1 row (their own)

SELECT * FROM seller_onboarding WHERE user_id != auth.uid();
-- Expected: 0 rows (RLS blocks access)
```

---

## REGRESSION CHECKS

### Buyer User (unchanged)
```
✓ Home: No onboarding shown
✓ Shop: Works as before
✓ Product Details: Works as before
✓ Cart: Works as before
✓ Checkout: Works as before
✓ Account: Orders tab works, no "Seller Hub" link shown
```

### Admin User (if applicable)
```
✓ Can access /admin
✓ Onboarding doesn't break admin UI
```

### Seller Completed Tutorial
```
✓ Visit /seller multiple times → Congratulations card persistent
✓ Click "Review tour" → Restart tutorial without reset
✓ completed=true never toggles back to false
```

---

## TROUBLESHOOTING

### Issue: "SellerQuickStart is not defined"
- **Cause**: Import missing in SellerDashboard.tsx
- **Fix**: Check line 12-14 in SellerDashboard.tsx has:
  ```tsx
  import SellerQuickStart from '../components/seller/SellerQuickStart'
  import SellerTour from '../components/seller/SellerTour'
  ```

### Issue: Tour modal doesn't highlight anything
- **Cause**: Element IDs not found in DOM
- **Fix**: Verify HTML elements have correct IDs:
  - `store-form-section` on store form
  - `product-title-input` on ProductForm
  - `image-upload-section` on image div
  - `product-category-select` on select
  - `publish-button` on submit button
  - `orders-tab` on orders button
  - `create-product-button` on "Add New Craft" button

### Issue: Tour completes but congratulations doesn't show
- **Cause**: completed=true not updated in DB
- **Fix**: Check browser console for "[Onboarding] complete" log
- **Check**: Supabase > seller_onboarding > verify row updating

### Issue: Seller can't see Seller Hub link
- **Cause**: role is not 'seller' in profiles table
- **Fix**: Update profiles.role to 'seller' for test user
  ```sql
  UPDATE profiles SET role = 'seller' WHERE email = 'test@example.com';
  ```

### Issue: RLS blocks access to own row
- **Cause**: auth.uid() mismatch
- **Fix**: Ensure user logged in as the user_id in seller_onboarding row
- **Debug**: Check `SELECT auth.uid()` in SQL console matches user_id

---

## PERFORMANCE NOTES

- **Bundle Impact**: ~8KB gzipped (3 components + 1 lib)
- **Database**: Single additional table, minimal schema
- **Network**: 1 additional query on SellerDashboard load (getSellerOnboarding)
- **Rendering**: Modal is portal-based, doesn't block main thread

---

## ROLLBACK PLAN

If issues arise:

### Minor Bugs (UI/UX)
```
Update SellerQuickStart.tsx or SellerTour.tsx, redeploy
No database migration needed
```

### Database Issue
```
1. Keep initial migration (backward compatible, additive only)
2. If needed, add follow-up migration to alter table
3. RLS blocks impact to existing apps (sellers just see no onboarding)
```

### Complete Removal
```
1. Remove imports from SellerDashboard.tsx
2. Delete src/components/seller/ directory
3. Delete src/lib/onboarding.ts
4. Keep migration (data table remains, harmless)
```

---

## SIGN-OFF CHECKLIST

Before going to production:

- [ ] All 6 tour steps verified to highlight correct elements
- [ ] Mobile layout tested on 2+ real devices or emulators
- [ ] RLS tested: seller sees only own row, can't see others
- [ ] Congratulations card persists after refresh
- [ ] Product form submission works end-to-end with images
- [ ] No console errors in DEV or PROD
- [ ] Buyer flow unaffected (Account, Shop, Checkout)
- [ ] Seller Hub link visible in Account page
- [ ] Seller Hub link visible in mobile menu
- [ ] Database connection stable (no timeout errors)
- [ ] Deployment documented & backed up
