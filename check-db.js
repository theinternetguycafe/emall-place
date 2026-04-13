import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("== Diagnosing Database State ==");
  
  // 1. Fetch seller_profiles
  const { data: sps, error: e1 } = await supabase.from('seller_profiles').select('id, user_id, store_name, store_slug');
  if (e1) { console.error("Error reading seller_profiles", e1); return; }
  
  console.log(`Found ${sps?.length || 0} seller_profiles.`);
  if (!sps || sps.length === 0) return;
  
  // 2. Fetch stores
  for (const sp of sps) {
    console.log(`\nProfile: ${sp.store_name} (Slug: ${sp.store_slug}) [User ID: ${sp.user_id}]`);
    
    const { data: storeRow, error: e2 } = await supabase.from('stores').select('*').eq('seller_id', sp.id).maybeSingle();
    if (storeRow) {
      console.log(`  -> stores link found!`);
      console.log(`  -> Banner: ${storeRow.banner_url || 'NULL'}`);
      console.log(`  -> Logo: ${storeRow.logo_url || 'NULL'}`);
      console.log(`  -> Description: ${storeRow.description || 'NULL'}`);
    } else {
      console.log(`  -> NO stores ROW FOUND!`);
    }
    
    const { data: ssRow, error: e3 } = await supabase.from('seller_stores').select('*').eq('owner_id', sp.user_id).maybeSingle();
    if (ssRow) {
      console.log(`  -> Legacy seller_stores link found!`);
      console.log(`  -> Legacy Banner: ${ssRow.banner_url || 'NULL'}`);
      console.log(`  -> Legacy Logo: ${ssRow.logo_url || 'NULL'}`);
      console.log(`  -> Legacy Description: ${ssRow.description || 'NULL'}`);
    } else {
      console.log(`  -> NO Legacy seller_stores ROW FOUND!`);
    }
  }
}

run();
