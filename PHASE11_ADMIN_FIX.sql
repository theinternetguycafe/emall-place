-- Fix Admin Policies to see seller_profiles instead of old seller_stores

-- Admin can SELECT all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- Admin can SELECT all seller_profiles
DROP POLICY IF EXISTS "Admins can view all seller_profiles" ON seller_profiles;
CREATE POLICY "Admins can view all seller_profiles"
  ON seller_profiles FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Admin can UPDATE all seller_profiles
DROP POLICY IF EXISTS "Admins can update all seller_profiles" ON seller_profiles;
CREATE POLICY "Admins can update all seller_profiles"
  ON seller_profiles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Admin can SELECT all kyc_submissions (if not already applied)
DROP POLICY IF EXISTS "Admins can view all kyc_submissions" ON kyc_submissions;
CREATE POLICY "Admins can view all kyc_submissions"
  ON kyc_submissions FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Admin can UPDATE all kyc_submissions
DROP POLICY IF EXISTS "Admins can update kyc_submissions" ON kyc_submissions;
CREATE POLICY "Admins can update kyc_submissions"
  ON kyc_submissions FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Allow admins to see ALL products (even pending/hidden)
DROP POLICY IF EXISTS "Admins can view all products" ON products;
CREATE POLICY "Admins can view all products"
  ON products FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Allow admins to update ALL products
DROP POLICY IF EXISTS "Admins can update all products" ON products;
CREATE POLICY "Admins can update all products"
  ON products FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
