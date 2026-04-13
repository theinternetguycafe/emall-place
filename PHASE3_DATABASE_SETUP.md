# PHASE 3: Database Setup Instructions

## 📋 How to Deploy

Run these SQL sections **in order** in your Supabase SQL Editor. Run each section separately (don't paste all at once).

---

## ✅ Section 1: ORDERS TABLE

Copy and paste this section into Supabase SQL Editor, then click **RUN**:

```sql
-- SECTION 1: ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
    buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Buyer contact info
    buyer_phone TEXT NOT NULL,
    buyer_email TEXT,
    buyer_address TEXT,
    buyer_lat NUMERIC(10, 8),
    buyer_lng NUMERIC(11, 8),
    
    -- Order metadata
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10, 2),
    subtotal NUMERIC(10, 2),
    delivery_fee NUMERIC(10, 2) DEFAULT 0,
    total_amount NUMERIC(10, 2),
    
    -- Status tracking
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'unpaid',
    delivery_mode TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Notes
    notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_buyer_phone ON public.orders(buyer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 2: RLS Policies for ORDERS

```sql
-- SECTION 2: RLS POLICIES FOR ORDERS
CREATE POLICY "ord_buyers_view_own"
ON public.orders FOR SELECT
USING (auth.uid() = buyer_id);

CREATE POLICY "ord_sellers_view_own"
ON public.orders FOR SELECT
USING (
  seller_id = (
    SELECT id FROM public.seller_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "ord_admins_view_all"
ON public.orders FOR SELECT
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "ord_service_insert"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "ord_service_update"
ON public.orders FOR UPDATE
USING (true);
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 3: PAYMENTS TABLE

```sql
-- SECTION 3: PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    
    provider TEXT NOT NULL,
    provider_reference TEXT,
    
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    
    status TEXT DEFAULT 'pending',
    
    payment_method TEXT,
    payment_url TEXT,
    
    webhook_received BOOLEAN DEFAULT FALSE,
    webhook_signature TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    paid_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    error_message TEXT,
    retry_count INT DEFAULT 0,
    
    metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON public.payments(provider_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 4: RLS Policies for PAYMENTS

```sql
-- SECTION 4: RLS POLICIES FOR PAYMENTS
CREATE POLICY "pay_buyers_view"
ON public.payments FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders WHERE buyer_id = auth.uid()
  )
);

CREATE POLICY "pay_sellers_view"
ON public.payments FOR SELECT
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE seller_id = (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "pay_service_insert"
ON public.payments FOR INSERT
WITH CHECK (true);

CREATE POLICY "pay_service_update"
ON public.payments FOR UPDATE
USING (true);
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 5: ORDER ITEMS TABLE

```sql
-- SECTION 5: ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE SET NULL,
    seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL,
    
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    item_total NUMERIC(10, 2) NOT NULL,
    
    commission_percentage NUMERIC(5, 2) DEFAULT 10.0,
    commission_amount NUMERIC(10, 2),
    seller_payout NUMERIC(10, 2),
    
    item_status TEXT DEFAULT 'pending',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON public.order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_item_status ON public.order_items(item_status);

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oi_system_manage"
ON public.order_items
USING (true);
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 6: TRANSACTIONS TABLE

```sql
-- SECTION 6: ORDER TRANSACTIONS TABLE (Audit Log)
CREATE TABLE IF NOT EXISTS public.order_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    event_description TEXT,
    
    actor_type TEXT,
    actor_id UUID,
    
    metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_transactions_order_id ON public.order_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_transactions_event_type ON public.order_transactions(event_type);
CREATE INDEX IF NOT EXISTS idx_order_transactions_created_at ON public.order_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.order_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ot_system_manage"
ON public.order_transactions
USING (true);
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 7: Helper Functions

```sql
-- SECTION 7: HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION calculate_commission(
  item_total NUMERIC,
  commission_pct NUMERIC DEFAULT 10.0
)
RETURNS NUMERIC AS $$
BEGIN
  RETURN ROUND(item_total * (commission_pct / 100.0), 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION log_order_transaction(
  p_order_id UUID,
  p_event_type TEXT,
  p_description TEXT,
  p_actor_type TEXT DEFAULT 'system',
  p_actor_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  INSERT INTO public.order_transactions (
    order_id,
    event_type,
    event_description,
    actor_type,
    actor_id,
    metadata
  )
  VALUES (
    p_order_id,
    p_event_type,
    p_description,
    p_actor_type,
    p_actor_id,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_order_status(
  p_order_id UUID,
  p_new_status TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.orders
  SET status = p_new_status, updated_at = NOW()
  WHERE id = p_order_id;
  
  PERFORM log_order_transaction(
    p_order_id,
    p_new_status,
    p_description,
    'system'
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 8: Triggers

```sql
-- SECTION 8: TRIGGERS
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_order_timestamp ON public.orders;
CREATE TRIGGER trg_update_order_timestamp
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION update_order_timestamp();

CREATE OR REPLACE FUNCTION calculate_order_item_payout()
RETURNS TRIGGER AS $$
BEGIN
  NEW.commission_amount = calculate_commission(NEW.item_total, NEW.commission_percentage);
  NEW.seller_payout = NEW.item_total - COALESCE(NEW.commission_amount, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_order_item_payout ON public.order_items;
CREATE TRIGGER trg_calculate_order_item_payout
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_order_item_payout();
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 9: Grants

```sql
-- SECTION 9: GRANTS FOR SERVICE ROLE
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.orders TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.payments TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.order_items TO service_role;
GRANT SELECT, INSERT ON public.order_transactions TO service_role;
GRANT EXECUTE ON FUNCTION log_order_transaction TO service_role;
GRANT EXECUTE ON FUNCTION update_order_status TO service_role;
GRANT EXECUTE ON FUNCTION calculate_commission TO service_role;
```

**✓ Expected result**: "Success. No rows returned"

---

## ✅ Section 10: Verification Queries

Run these to verify everything was created:

```sql
-- SECTION 10: VERIFICATION
-- Check tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'payments', 'order_items', 'order_transactions')
ORDER BY tablename;

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'payments', 'order_items', 'order_transactions');

-- Check indexes exist (should be 17 total)
SELECT count(*) as index_count FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%';

-- Test insert (this will succeed but the record won't persist if no proper data)
-- SELECT COUNT(*) FROM public.orders;
```

---

## 🐛 If You Get Errors

**If a section fails:**
1. Read the error message carefully
2. Run the verification queries above to see which tables exist
3. Go back to the first failing section and run it again
4. Continue from there

**Common issues:**
- "Already exists" - That section was already run. Skip it.
- "Foreign key constraint fails" - A referenced table/column doesn't exist. Check the table name spelling.
- "Column does not exist" - The table structure differs. Check your database schema.

---

## ✨ You're Done!

Once all 10 sections run successfully, you have:

✅ **4 tables** (orders, payments, order_items, order_transactions)
✅ **12 indexes** for fast queries
✅ **RLS policies** for security
✅ **3 helper functions** for business logic
✅ **2 triggers** for auto-calculations

Next step: Deploy the Edge Functions (see `PHASE3_IMPLEMENTATION_GUIDE.md` Part 2)
