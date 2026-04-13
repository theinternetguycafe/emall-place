
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Checking profiles table...");
  const { data: cols, error: e1 } = await supabase.rpc('get_table_info', { t_name: 'profiles' });
  if (e1) {
    console.log("RPC get_table_info failed, trying SQL...");
    const { data: cols2, error: e2 } = await supabase.from('profiles').select('*').limit(1);
    if (e2) {
       console.error("Error fetching profiles:", e2);
    } else {
       console.log("Profiles columns:", Object.keys(cols2[0] || {}));
    }
  } else {
    console.log("Profiles columns:", cols);
  }

  console.log("\nChecking seller_stores table...");
  const { data: ss, error: e3 } = await supabase.from('seller_stores').select('*').limit(1);
  if (ss) console.log("Seller Stores columns:", Object.keys(ss[0] || {}));

  console.log("\nChecking seller_profiles table...");
  const { data: sp, error: e4 } = await supabase.from('seller_profiles').select('*').limit(1);
  if (sp) console.log("Seller Profiles columns:", Object.keys(sp[0] || {}));
}

check();
