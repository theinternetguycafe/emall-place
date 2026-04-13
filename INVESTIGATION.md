# 🔍 Dual-Marketplace Service Investigation Report

I have completed a thorough trace of the database schema, RLS policies, frontend queries, and state management flow. Here is the established truth regarding why "services" fail to appear on the map.

---

### 1. 🏗️ DATABASE TRUTH CHECK

**Schema Inspections (Based on SQL Migrations)**
*   **`seller_profiles`**: Contains core identity, `latitude`, `longitude`, `is_online` (boolean, defaults `false`), `kyc_status`, `seller_type` (`'product'`, `'service'`, or `'both'`), and `onboarding_completed`.
*   **`products`**: Contains `id`, `seller_id`, `title`, `price`, `stock`, `status`, `category_id`.
*   **`services`**: Contains `id`, `seller_id`, `title`, `description`, `base_rate`, `category_id`, `status`, `is_active`. **Crucially missing `latitude` and `longitude` natively** (which caused backend insert errors swallowed by the frontend). Location was historically intended to be tracked via `service_locations`.

### 2. 🗄️ DATA INTEGRITY CHECK (Queries to run in Supabase)

I strongly advise running this query in your Supabase SQL Editor to establish your actual corrupted rows:
```sql
SELECT
  id,
  user_id,
  seller_type,
  kyc_status,
  is_online,
  latitude,
  longitude
FROM seller_profiles
WHERE seller_type IN ('service', 'both');
```
**What to look for:**
*   How many have `is_online = false`? (These are completely invisible on the map).
*   How many have `latitude` or `longitude` as `NULL`? (These are physically impossible to map).
*   How many have `kyc_status != 'approved'`? (These are blocked by the query).

### 3. 🛡️ RLS POLICY AUDIT

*   **`products`**: Correctly validates `seller_id` via a subquery to `seller_profiles` using `auth.uid()`.
*   **`services`**: Previous policies had mismatched coverage (`FOR ALL USING(...)` vs `FOR INSERT WITH CHECK(...)`). This blocks standard inserts. *(Note: The script provided previously fixes this).*

### 4. 🔄 FRONTEND FLOW TRACE (`ProductForm.tsx`)

1.  User fills out the service form.
2.  App inserts the record into **`products`** (treating it as an inventoried product with 999 stock).
3.  App **mirrors** the insert to **`services`** (extracting lat/lng from the `seller_profile`).
4.  **Failure Point**: Because the `services` table lacked `latitude`/`longitude` columns natively, the insert throws an error. *However*, `ProductForm.tsx` explicitly wraps this in a `try/catch` and logs a warning: `console.warn('[ProductForm] ⚠️ services table insert failed (product was still saved)...')`.
5.  Result: The user sees "Published Successfully!", but no row lands in `services`.

### 5. 🗺️ MAP QUERY ANALYSIS (`useServiceStore.ts`)

This is the most critical finding. **The map does not fetch from the `services` or `products` table.**

It fetches directly from `seller_profiles`:
```ts
const { data, error } = await supabase
  .from('seller_profiles')
  .select('*, stores(...)')
  .not('latitude', 'is', null)
  .not('longitude', 'is', null)
  .in('seller_type', ['service', 'both'])
  .eq('is_online', true)
  .eq('onboarding_completed', true)
  .eq('kyc_status', 'approved')
```

### 6. 🚨 ROOT CAUSE SUMMARY

Your services are failing to appear on the map because of a **fundamental disconnect between how services are created and how the map queries them**.

1.  **Invisible by Default:** The map strictly filters for sellers where `is_online = true`. When a seller creates a service, it does not automatically turn them "online" in their profile. They must manually toggle this in their Seller Dashboard.
2.  **Schema Mismatch:** The frontend explicitly saves location data into `latitude`/`longitude` on the `services` table, but the DB schema lacked these columns, causing silent insert failures.
3.  **Entity Mismatch:** The map plots **Sellers** (profiles), not **Services**. So even if a service was inserted perfectly into the DB, if the seller's `seller_type` is listed as `'product'` or their `is_online` flag is `false`, the platform will completely ignore them on the map.

### 7. 🛠️ SAFE FIX PLAN

To align the database, RLS, and frontend flow perfectly:

1.  **Database Addition (Non-Destructive):** Append `latitude` and `longitude` to the `services` table (via `FIX_SERVICES_LOCATION.sql`) to stop frontend insert failures.
2.  **RLS Unification:** Apply the aforementioned SQL file to ensure sellers can safely write to `services`.
3.  **Frontend Workflow Fix:** When `ProductForm.tsx` publishes a service successfully, automatically update the user's `seller_profiles` record to `is_online = true` and `seller_type = 'both'` so their service immediately and magically appears on the map without them needing to hunt for an "online status" toggle!
