import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("== Admin Investigation: Database Truth Check ==");

  // 1. Counts
  const { count: spCount } = await supabase.from('seller_profiles').select('*', { count: 'exact', head: true });
  const { count: sCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
  const { count: kycCount } = await supabase.from('kyc_submissions').select('*', { count: 'exact', head: true });

  console.log(`seller_profiles count: ${spCount}`);
  console.log(`stores count: ${sCount}`);
  console.log(`kyc_submissions count: ${kycCount}`);

  // 2. Data Samples
  const { data: sps } = await supabase.from('seller_profiles').select('id, store_name').limit(10);
  console.log("\nseller_profiles sample:", sps);

  const { data: ss } = await supabase.from('stores').select('id').limit(10);
  console.log("\nstores sample:", ss);

  const { data: kycs } = await supabase.from('kyc_submissions').select('id, status').limit(10);
  console.log("\nkyc_submissions sample:", kycs);

  // 3. Check for 'pending' KYC
  const { count: pendingKyc } = await supabase.from('kyc_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  console.log(`\nPending KYC submissions: ${pendingKyc}`);
}

run();
