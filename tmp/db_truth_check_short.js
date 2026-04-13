import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("== Database Truth Check (Short) ==");
  
  const { data: profiles, error } = await supabase
    .from('seller_profiles')
    .select('id, user_id, seller_type, is_online, kyc_status, onboarding_completed, store_name');

  if (error) {
    console.error("Error fetching seller_profiles:", error);
    return;
  }

  console.log(`Total seller_profiles: ${profiles?.length || 0}`);
  
  const nullSellerType = profiles.filter(p => !p.seller_type);
  console.log(`Profiles with NULL seller_type: ${nullSellerType.length}`);

  const userIds = profiles.map(p => p.user_id);
  const duplicates = userIds.filter((item, index) => userIds.indexOf(item) !== index);
  console.log(`Duplicate user_id: ${duplicates.length}`);

  const { data: publicProfiles, error: pError } = await supabase.from('profiles').select('id, role, full_name');
  if (!pError) {
    const sellerRoles = publicProfiles.filter(p => p.role === 'seller');
    const sellerRolesWithoutSp = sellerRoles.filter(p => !userIds.includes(p.id));
    console.log(`Users with role='seller' in 'profiles': ${sellerRoles.length}`);
    console.log(`Users with role='seller' but NO seller_profiles: ${sellerRolesWithoutSp.length}`);
  }
}

run();
