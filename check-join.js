import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  const { data: spData } = await supabase
    .from('seller_profiles')
    .select('*, stores(*)')
    .eq('store_slug', 'tester-s-store-8386c7')
    .maybeSingle()
    
  console.log("Joined Result Type:", Array.isArray(spData?.stores) ? 'Array' : typeof spData?.stores);
  console.log("Joined Result:", JSON.stringify(spData?.stores, null, 2));
}

run();
