-- PHASE 9 ADMIN POLICIES

-- 1. KYC Submissions Policies
CREATE POLICY "Admins can view all kyc_submissions" 
    ON public.kyc_submissions FOR SELECT 
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update kyc_submissions" 
    ON public.kyc_submissions FOR UPDATE
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Seller Stores Policies (Admin Overrides)
CREATE POLICY "Admins can update all seller_stores" 
    ON public.seller_stores FOR UPDATE
    TO authenticated 
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Storage Policies (Admin Overrides)
CREATE POLICY "Admins can read all kyc documents" 
    ON storage.objects FOR SELECT 
    TO authenticated 
    USING (
        bucket_id = 'kyc-documents' AND 
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
