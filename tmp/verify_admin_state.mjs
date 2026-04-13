import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log('== Post-Restoration Verification ==\n');

  // 1. Admin profiles
  const { data: admins, error: adminErr } = await supabase
    .from('profiles')
    .select('id, role, email, full_name')
    .eq('role', 'admin')
    .limit(10);
  console.log('Admin profiles:', JSON.stringify(admins, null, 2));
  if (adminErr) console.error(' Admin error:', adminErr.message);

  // 2. Counts: null vs non-null store_name in seller_profiles
  const { count: nullCount } = await supabase.from('seller_profiles').select('*', { count: 'exact', head: true }).is('store_name', null);
  const { count: nonNullCount } = await supabase.from('seller_profiles').select('*', { count: 'exact', head: true }).not('store_name', 'is', null);
  console.log(`\nseller_profiles -> null store_name: ${nullCount}`);
  console.log(`seller_profiles -> non-null store_name: ${nonNullCount}`);

  // 3. Sample of seller profiles WITH data
  const { data: withData } = await supabase
    .from('seller_profiles')
    .select('id, user_id, store_name, store_slug, kyc_status')
    .not('store_name', 'is', null)
    .limit(10);
  console.log('\nSeller profiles with store_name:', JSON.stringify(withData, null, 2));

  // 4. KYC submissions
  const { data: kycs, error: kycErr } = await supabase
    .from('kyc_submissions')
    .select('id, user_id, status, created_at')
    .limit(10);
  console.log('\nKYC submissions:', JSON.stringify(kycs, null, 2));
  if (kycErr) console.error(' KYC error:', kycErr.message);

  // 5. Join test: seller_profiles -> profiles
  const { data: joinData, error: joinErr } = await supabase
    .from('seller_profiles')
    .select('id, store_name, profiles(id, email, role)')
    .not('store_name', 'is', null)
    .limit(5);
  console.log('\nJoin seller_profiles -> profiles:', JSON.stringify(joinData, null, 2));
  if (joinErr) console.error(' Join error:', joinErr.message);
}

run().catch(console.error);
