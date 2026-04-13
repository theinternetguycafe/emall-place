import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: services, error: sError } = await supabase
    .from('services')
    .select(`
      id,
      title,
      description,
      base_rate,
      seller_store:seller_profiles!seller_id!inner(
        id,
        store_name,
        is_online,
        rating_avg,
        seller_type,
        onboarding_completed,
        kyc_status,
        stores ( logo_url )
      )
    `)
    .limit(6);

  console.log("Services:", JSON.stringify(services, null, 2));
  console.log("Error:", sError);
}

check();
