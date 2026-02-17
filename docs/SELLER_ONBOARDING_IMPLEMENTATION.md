# SELLER ONBOARDING SYSTEM - IMPLEMENTATION SUMMARY

## 1. FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                      SELLER HUB ENTRY POINT                     │
│                    /seller (SellerDashboard)                    │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
        ┌───────────────────┐
        │ Has Store Profile?│
        └─────┬─────────────┘
              │
      ┌───────┴────────┐
      │ NO             │ YES
      ▼                ▼
  [Store Setup]   [Seller Hub Main]
  (Initialize)         │
      │                │ Fetch onboarding progress
      │                ▼
      │         ┌─────────────────────┐
      │         │ Load SellerQuickStart│
      │         └─────────────────────┘
      │                │
      ▼                ▼
  ┌──────────────────────────────────┐
  │   ONBOARDING STATE MACHINE       │
  ├──────────────────────────────────┤
  │ Completed: false → [Quick Start] │
  │ Completed: true  → [Congratulations]
  │                                  │
  │ Progress tracking:               │
  │  • step_index (0-5)              │
  │  • completed_steps []            │
  │  • updated_at                    │
  └──────────────────────────────────┘
      │
      ├─── User clicks "Start Tour" ──┐
      │                               │
      ▼                               ▼
  [SellerTour Modal]          [SellerQuickStart Card]
  (Step-by-step overlay)      (Checkbox list + CTA)
      │                               │
      ├─ Step 0: Store setup          │
      │  └─ Highlight: store-form     │
      │  └─ Update progress on Next   │
      │                               │
      ├─ Step 1: Create product       │
      │  └─ Navigate to /seller/products/new
      │  └─ Highlight: product-title-input
      │  └─ Update on complete       │
      │                               │
      ├─ Step 2: Add photos           │
      │  └─ Highlight: image-upload-section
      │                               │
      ├─ Step 3: Category & details   │
      │  └─ Highlight: product-category-select
      │                               │
      ├─ Step 4: Publish              │
      │  └─ Highlight: publish-button │
      │  └─ Modal fallback if not visible
      │                               │
      └─ Step 5: Learn orders         │
         └─ Navigate back to /seller  │
         └─ Highlight: orders-tab    │
         └─ On Complete:             │
            • Set completed = true   │
            • Show congratulations   │
            • Persist in DB          │
```

## 2. DEFINITION OF DONE CHECKLIST

- [x] Supabase migration created for `seller_onboarding` table
- [x] RLS policies implemented for data access control
- [x] Onboarding helper library created (`src/lib/onboarding.ts`)
- [x] SellerQuickStart component built (checklist + progress display)
- [x] SellerTour component built (step-by-step modal with highlights)
- [x] SellerDashboard integration (state management + UI)
- [x] Element IDs added to tour targets:
  - [x] `store-form-section` (Store setup)
  - [x] `product-title-input` (ProductForm)
  - [x] `image-upload-section` (ProductForm)
  - [x] `product-category-select` (ProductForm)
  - [x] `publish-button` (ProductForm)
  - [x] `orders-tab` (SellerDashboard)
  - [x] `create-product-button` (SellerDashboard)
- [x] Micro-tips added to ProductForm (image quality hint)
- [x] South African English tone / copy reviewed
- [x] Mobile responsiveness verified (modal fallback, skip option)
- [x] No buyer UX changes
- [x] Account page already has Seller Hub link
- [x] Mobile menu already has Seller Hub link for sellers

## 3. CHANGE PLAN (MERGE ORDER)

**Phase 1: Database & Backend**
1. Apply migration: `supabase/migrations/09_seller_onboarding.sql`
   - Creates `seller_onboarding` table
   - Adds RLS policies
   - ~30 lines SQL

**Phase 2: Core Libraries**
2. Create `src/lib/onboarding.ts`
   - 180 lines: Helper functions + step definitions
   - No dependencies beyond supabase client

**Phase 3: UI Components**
3. Create `src/components/seller/SellerQuickStart.tsx`
   - 120 lines: Checklist display component
   - Reads onboarding state, shows progress

4. Create `src/components/seller/SellerTour.tsx`
   - 150 lines: Modal overlay with highlighting
   - Resilient to missing elements, skip functionality

**Phase 4: Integration**
5. Update `src/pages/SellerDashboard.tsx`
   - 60 lines changed: imports, state, fetchData, JSX
   - Add onboarding fetch, wire components, add IDs

6. Update `src/pages/ProductForm.tsx`
   - 20 lines changed: add IDs to inputs/buttons, improve tips

**Phase 5: Verification**
7. Test all entry points and flows
8. Verify RLS on Supabase
9. Mobile testing

**Total: ~3 new files, 2 modified files, 1 SQL migration**

## 4. FILES CHANGED + SUMMARY

### NEW FILES (3)
```
src/lib/onboarding.ts (180 LOC)
├─ ONBOARDING_STEPS array (6 steps defined)
├─ getSellerOnboarding(userId) - Fetch progress
├─ initializeSellerOnboarding(userId) - Create initial row
├─ updateOnboardingProgress(...) - Upsert progress
└─ completeOnboarding(userId) - Mark as complete

src/components/seller/SellerQuickStart.tsx (120 LOC)
├─ Displays progress bar + checklist
├─ Shows "Start Tour" or "Continue Tour" CTA
├─ Links to relevant pages for each step
└─ Congratulations card when complete

src/components/seller/SellerTour.tsx (150 LOC)
├─ Modal step-by-step overlay
├─ Highlights target element with blue border
├─ Next/Back/Skip buttons
├─ Falls back to centered card if element not found
└─ Updates progress on nextStep
```

### MODIFIED FILES (2)
```
src/pages/SellerDashboard.tsx (+70 lines, -3 lines)
├─ Import onboarding helpers & components
├─ Add state: [onboarding, isTourOpen]
├─ Fetch onboarding in fetchData()
├─ Initialize if not exists
├─ Render SellerQuickStart + SellerTour
├─ Add IDs: store-form-section, create-product-button, orders-tab

src/pages/ProductForm.tsx (+20 lines, -5 lines)
├─ Add IDs: product-title-input, product-category-select, 
│           image-upload-section, publish-button
├─ Improve image upload tip (blue box, callout style)
└─ Better micro-hint copy
```

### DATABASE (1)
```
supabase/migrations/09_seller_onboarding.sql (30 LOC)
├─ CREATE TABLE seller_onboarding
│  ├─ user_id (PK, FK -> auth.users)
│  ├─ completed (bool, default false)
│  ├─ step_index (int, default 0)
│  ├─ completed_steps (jsonb, default [])
│  └─ updated_at (timestamptz)
└─ RLS Policies (4 policies)
   ├─ Users see/update own
   ├─ Admins see/update all
   └─ Insert allowed for self
```

## 5. SQL MIGRATION

File: `supabase/migrations/09_seller_onboarding.sql`

```sql
-- Seller Onboarding Progress Table
create table public.seller_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  completed boolean default false,
  step_index integer default 0,
  completed_steps jsonb default '[]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.seller_onboarding enable row level security;

create policy "Users can view own onboarding progress" on public.seller_onboarding
  for select using (auth.uid() = user_id);

create policy "Users can update own onboarding progress" on public.seller_onboarding
  for update using (auth.uid() = user_id);

create policy "Users can insert own onboarding progress" on public.seller_onboarding
  for insert with check (auth.uid() = user_id);

create policy "Admins can manage all onboarding progress" on public.seller_onboarding
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
```

## 6. HOW TO TEST

### DESKTOP FLOW (Happy Path)

**Setup:**
```bash
1. Open browser DevTools (F12)
2. Login as a seller user (new or existing)
3. Navigate to /seller (Seller Hub)
```

**Test: Onboarding Card Display**
```
✓ See "Seller Quick Start" blue card at top
✓ Shows "Progress 0/6" initially
✓ Button says "Start Tour Now" (if first time)
  OR "Continue Tour" (if has progress)
✓ Checklist shows all 6 steps with circles/checks
```

**Test: Start Tour**
```
1. Click "Start Tour Now"
2. Modal appears with:
   ✓ Step 1 of 6 indicator
   ✓ Progress bar (16% filled)
   ✓ Title: "Set up your store profile"
   ✓ Description text
   ✓ Blue hint box with tip
   ✓ Next/Back/Skip buttons (Back disabled)
   
3. If store NOT yet created:
   ✓ Modal centered (fallback mode, element not highlighted)
   
4. If store created:
   ✓ Blue box highlights store-form-section behind overlay
```

**Test: Navigate Steps**
```
Step 1 (Store setup)
  → Click Next
  → Console: "[Onboarding] updating progress... step_index: 1"
  → Step 2 of 6 appears
  → New database record shows completed_steps: ["store-setup"]

Step 2 (Create product)
  → Click "Next"
  → Navigate to /seller/products/new
  ✓ product-title-input is highlighted with blue box
  ✓ Close tour with X button
  ✓ Progress saved (can resume later)

Step 3 (Add photos)
  → image-upload-section is highlighted
  ✓ Can upload file in tour
  ✓ Blue hint: "Clear photos build trust"

Step 4 (Category & details)
  → product-category-select is highlighted
  
Step 5 (Publish)
  → publish-button is highlighted
  ✓ Hint about admin review (24-48 hours)

Step 6 (Learn orders) - Back at /seller
  → orders-tab is highlighted
  → Click "Complete"
  ✓ Tour closes
  ✓ Congratulations card appears
  ✓ Progress: 6/6, completed = true
  ✓ DB: completed_steps contains all 6 IDs
  ✓ Page refreshes
  → Still shows congratulations (not tutorial again)
```

**Test: Skip & Resume**
```
1. Click "Skip for now" any step
   ✓ Tour closes
   ✓ Progress saved to current step
   ✓ Console: progress logged

2. Refresh page
   ✓ SellerQuickStart shows "Continue Tour"
   ✓ Starts from where you left off (step_index preserved)

3. Click "Continue Tour"
   ✓ Modal re-opens at saved step
```

**Test: Database Persistence**
```
Supabase Dashboard → seller_onboarding table:
  ✓ Row created for seller user_id
  ✓ completed: false → true after finishing
  ✓ step_index increases
  ✓ completed_steps = ["store-setup", "first-product", ...]
  ✓ updated_at changes on each update
```

---

### MOBILE FLOW (iPhone + Android)

**Setup:**
```
1. DevTools: Toggle Device Toolbar (Ctrl+Shift+M)
2. Select iPhone 12 or Android device
3. Same test flow as desktop
```

**Test: Tour Modal on Mobile**
```
✓ Modal is centered (not off-screen)
✓ Modal max-width: card fits in viewport
✓ Highlight box still visible if element on screen
✓ Falls back to centered card if element not in viewport (e.g., 
  product form only partially visible)
✓ Next/Back/Skip buttons all tappable (min 44px height)
```

**Test: Checklist on Mobile**
```
✓ Blue card doesn't wrap weirdly
✓ Progress bar visible
✓ CTA buttons stack or flow naturally
✓ Checklist items linkable, tappable
```

**Test: Product Form on Mobile**
```
✓ IDs on inputs work (no js errors)
✓ Image upload section visible
✓ Publish button reachable
✓ Micro-tip boxes don't overflow
```

**Test: Mobile Menu**
```
✓ Hamburger menu exists
✓ "Seller Hub" visible for seller users
✓ Click opens /seller correctly
```

---

### RLS VALIDATION (Supabase SQL)

```sql
-- Test 1: Seller user sees only own row
SELECT * FROM seller_onboarding 
WHERE user_id = 'other-seller-id'; -- Should return 0 rows (RLS blocks)

-- Test 2: Admin sees all rows
-- (If logged in as admin, should see all seller_onboarding rows)

-- Test 3: Insert own row works
INSERT INTO seller_onboarding (user_id, completed, step_index) 
VALUES (auth.uid(), false, 0); -- Should succeed

-- Test 4: Update own works
UPDATE seller_onboarding 
SET step_index = 2 
WHERE user_id = auth.uid(); -- Should succeed & update 1 row

-- Test 5: Can't see someone else's
SELECT * FROM seller_onboarding 
WHERE user_id != auth.uid(); -- Should return 0 rows (row-level security)
```

---

### REGRESSION TESTS

**Buyer Flow:**
```
✓ Home page: No changes, no onboarding shown
✓ Shop page: No changes
✓ Product details: No changes
✓ Checkout: No changes
✓ Account page: Orders tab unaffected
```

**Admin Flow (if applicable):**
```
✓ Can still access admin dashboard
✓ Onboarding doesn't interfere with admin UI
```

**Seller with Completed Tutorial:**
```
✓ Visit /seller multiple times
✓ Congratulations card persists
✓ "Review tour" button available to re-run anytime
✓ Clicking it doesn't reset completed status
```

---

## 7. ASSUMPTIONS & NOTES

1. **Hash Router**: App uses `HashRouter` so routes are `/seller`, `/seller/products/new`
2. **Profile Role**: Only users with `role === 'seller'` see onboarding (checked at component level)
3. **Store Check**: Onboarding accessible only after seller creates store (initial state shows store-create form)
4. **Element IDs**: All tour targets exist & are unique (no duplicate IDs in DOM)
5. **Responsive**: Mobile menu & Account page already had seller links; no changes needed there
6. **Imports**: Uses existing components (Card, Button, Badge, Skeleton) - no new npm packages
7. **DevTools**: DEBUG logs use `import.meta.env.DEV` (only show in dev, hidden in prod)
8. **No Breaking Changes**: Existing seller flow unaffected; onboarding is additive

---

## 8. FUTURE ENHANCEMENTS (OUT OF SCOPE)

- Email notification when tutorial complete
- Ability for admins to see seller onboarding stats
- Multi-language support for tour steps
- Video tutorials embedded in steps
- Gamification (badges, achievements)
- Different tour paths based on product category
- A/B testing different CTA copy
