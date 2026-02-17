# Orders Table Constraint Analysis & Fix

## Error Details

**Error Code:** PostgreSQL 23514
**Message:** `violates check constraint "orders_status_check"`
**Root Cause:** Attempting to set `status='failed'` on a column that only allows `('pending', 'processing', 'completed', 'cancelled')`

---

## Current Constraint Analysis

### orders.status Column

**Current Allowed Values (BEFORE):**
```
('pending', 'processing', 'completed', 'cancelled')
```

**Constraint Name:** `orders_status_check`
**Type:** CHECK constraint (defined inline on column)

**Problem:** ❌ Missing `'failed'` value
- Cannot set `status='failed'` when payment fails
- Results in error 23514 on PATCH /orders

---

### orders.payment_status Column

**Current Allowed Values:**
```
('unpaid', 'paid', 'failed')
```

**Constraint Name:** `payment_status_check` (implicit)
**Type:** CHECK constraint (defined inline on column)

**Status:** ✅ Already supports `'failed'`
- Already allows the value needed
- No changes required

---

## Solution: Migration 07

**File:** `supabase/migrations/07_add_failed_status.sql`

### SQL Migration Script

```sql
-- Migration: Add 'failed' status to orders table

BEGIN;

-- 1. Drop OLD constraint that doesn't include 'failed'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Create NEW constraint that includes 'failed'
ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed'));

COMMIT;
```

### What This Does

| Step | Action | Effect |
|------|--------|--------|
| 1 | DROP CONSTRAINT | Removes old constraint allowing only 4 values |
| 2 | ADD CONSTRAINT | Creates new constraint allowing 5 values (includes `'failed'`) |

---

## Updated Schema State

| Column | Current Constraint | New Constraint | Status |
|--------|---|---|---|
| `orders.status` | `('pending', 'processing', 'completed', 'cancelled')` | `('pending', 'processing', 'completed', 'cancelled', 'failed')` | ✅ Fixed |
| `orders.payment_status` | `('unpaid', 'paid', 'failed')` | No change needed | ✅ OK |

---

## How to Apply

### Option 1: Using Supabase CLI (Recommended)

```bash
npx supabase migrate up
```

This automatically applies all pending migrations in order:
- `00_schema.sql`
- `01_rls_policies.sql`
- ... other migrations ...
- `07_add_failed_status.sql` ← Applies this one

### Option 2: Manual SQL Execution

If migrations have already been applied and database exists:

```sql
-- Connect to your Supabase database and run:

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed'));
```

Can execute via:
- Supabase Studio SQL Editor
- psql command line
- Any PostgreSQL client

### Option 3: Verify After Application

```sql
-- Verify the constraint was applied correctly:
SELECT constraint_name, constraint_type, check_clause
FROM information_schema.table_constraints
WHERE table_name = 'orders' AND constraint_type = 'CHECK';

-- Expected output:
-- constraint_name: orders_status_check
-- constraint_type: CHECK
-- check_clause: (status IN ('pending', 'processing', 'completed', 'cancelled', 'failed'))
```

---

## Testing the Fix

After applying the migration:

```sql
-- This should now SUCCEED (previously failed with error 23514)
UPDATE public.orders 
SET status = 'failed', payment_status = 'failed'
WHERE id = 'order-uuid-here';

-- Verify it worked:
SELECT id, status, payment_status FROM public.orders WHERE id = 'order-uuid-here';
```

---

## Related Code Changes

### yoco-initiate Function 
The function now calls:
```typescript
await admin.from('orders').update({
  status: 'failed',
  payment_status: 'failed'
}).eq('id', orderId)
```

This PATCH now succeeds because `status='failed'` is now allowed in the CHECK constraint. ✅

### Checkout.tsx
Server-side order failure handler:
```typescript
const { data: { session }, error: sessionError } = await supabase.auth.getSession()
if (sessionError || !session?.access_token) {
  await handleCheckoutFailure(currentOrderId, errorMessage)
}
```

The `handleCheckoutFailure` function sets `status='failed'` which now succeeds. ✅

---

## Summary

| Item | Status |
|------|--------|
| **Root Cause** | `orders.status` CHECK constraint missing `'failed'` |
| **Fix** | Drop & recreate constraint with 5 values instead of 4 |
| **Payment Status** | ✅ Already supports `'failed'`, no changes needed |
| **Migration File** | `supabase/migrations/07_add_failed_status.sql` |
| **Apply With** | `npx supabase migrate up` |
| **Error Will Resolve** | Error 23514 on PATCH /orders with `status='failed'` |
