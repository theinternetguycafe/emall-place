import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("== Database Truth Check ==");
  
  // 1. Fetch seller_profiles
  const { data: profiles, error } = await supabase
    .from('seller_profiles')
    .select('id, user_id, seller_type, is_online, kyc_status, onboarding_completed, store_name');

  if (error) {
    console.error("Error fetching seller_profiles:", error);
    if (error.code === '42P01') {
        console.error("CRITICAL: seller_profiles table does not exist!");
    }
    return;
  }

  console.log(`\nTotal seller_profiles found: ${profiles?.length || 0}`);
  
  if (!profiles) return;

  const nullSellerType = profiles.filter(p => !p.seller_type);
  console.log(`Profiles with NULL seller_type: ${nullSellerType.length}`);

  const userIds = profiles.map(p => p.user_id);
  const duplicates = userIds.filter((item, index) => userIds.indexOf(item) !== index);
  console.log(`Duplicate user_id entries in seller_profiles: ${duplicates.length}`);

  // 2. Fetch public profiles to compare
  const { data: publicProfiles, error: pError } = await supabase.from('profiles').select('id, role, full_name');
  if (pError) {
    console.error("Error fetching profiles:", pError);
  } else {
    const sellerRoles = publicProfiles.filter(p => p.role === 'seller');
    const sellerRolesWithoutSp = sellerRoles.filter(p => !userIds.includes(p.id));
    
    console.log(`\nUsers with role='seller' in 'profiles' table: ${sellerRoles.length}`);
    console.log(`Users with role='seller' but NO seller_profiles record: ${sellerRolesWithoutSp.length}`);
    
    sellerRolesWithoutSp.forEach(p => {
        console.log(` - ID: ${p.id} | Name: ${p.full_name}`);
    });
  }

  console.log("\nDetailed Profiles:");
  profiles.forEach(p => {
    console.log(`ID: ${p.id.substring(0,8)}... | User: ${p.user_id.substring(0,8)}... | Type: ${p.seller_type} | Online: ${p.is_online} | KYC: ${p.kyc_status} | Onboarded: ${p.onboarding_completed} | Store: ${p.store_name}`);
  });
}

run();
