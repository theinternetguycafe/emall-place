import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseAnon = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAnonStore() {
  console.log("== Checking Anonymous Read on Stores ==");
  const { data, error } = await supabaseAnon.from('stores').select('*').limit(5);
  console.log("Anon Read Result:", { data, error });
}
checkAnonStore();
