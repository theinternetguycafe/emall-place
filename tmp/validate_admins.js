import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
  console.log("== Admin Role Validation ==");
  
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'admin');

  if (error) {
    console.error("Error fetching admins:", error);
    return;
  }

  console.log(`Found ${admins?.length || 0} admins in profiles table.`);
  admins.forEach(a => console.log(` - ID: ${a.id} | Name: ${a.full_name}`));
}

run();
