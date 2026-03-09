# Debug Checklist: Risky Parts

### 1. Authentication & RBAC
- [ ] **Profile Creation**: Ensure the Postgres trigger `on_auth_user_created` correctly creates a record in `public.profiles` after signup.
- [ ] **Role Assignment**: Verify that the `role` metadata passed during signup (if any) is correctly handled or defaults to 'buyer'.
- [ ] **Role Protection**: Test that a 'buyer' cannot access `/seller` or `/admin` routes.

### 2. Row Level Security (RLS)
- [ ] **Data Isolation**: Verify sellers can ONLY see and update their own products and `order_items`.
- [ ] **Public Visibility**: Ensure products marked as `status = 'approved'` are visible to everyone, while `pending` ones are not.
- [ ] **Admin Overrides**: Confirm that users with the `admin` role in `profiles` can indeed read/write all records across all tables.

### 3. Checkout & Commission
- [ ] **Multi-Seller Orders**: Place an order with items from two different sellers. Verify `order_items` are correctly linked to respective `seller_store_id`.
- [ ] **Math Accuracy**: Check that `total_commission` on `orders` and `commission_amount` on `order_items` match the 8% logic.
- [ ] **Payment State**: Ensure the order status only updates to `processing` AFTER the `MockPaymentProvider` returns `success`.

### 4. Storage & Images
- [ ] **Bucket Public Access**: Verify that images uploaded to the `marketplace` bucket have public URLs accessible via the browser.
- [ ] **Upload Permissions**: Test that only users with the `seller` role can upload to the bucket.

### 5. Deployment
- [ ] **Environment Variables**: Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are properly set in the hosting provider's dashboard.
