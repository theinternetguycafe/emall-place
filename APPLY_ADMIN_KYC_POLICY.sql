-- This script explicitly fixes the Admin Dashboard access for KYC submissions.
-- Because the previous script aborted mid-way when a policy already existed, the admin policy was never created!

DROP POLICY IF EXISTS "Admins can manage all kyc" ON public.kyc_submissions;

CREATE POLICY "Admins can manage all kyc" ON public.kyc_submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Let's also ensure the storage bucket access for Admins is fully applied just in case it aborted there too:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'KYC Admin Read Access'
  ) THEN
    EXECUTE 'CREATE POLICY "KYC Admin Read Access" ON storage.objects FOR SELECT USING (bucket_id = ''kyc-documents'' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin'')))';
  END IF;
END $$;

SELECT 'Admin KYC Policy applied successfully! Admins can now view applications.' as result;
