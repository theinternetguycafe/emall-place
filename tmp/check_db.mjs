import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: kyc, error: kError } = await supabase.from('kyc_submissions').select('*').limit(1);
  console.log('kyc_submissions anon check:', JSON.stringify({ kyc, kError }));
  
  // also check with service role if we have it to see if it's an RLS issue or table issue
  // Wait, I only have anon key in .env usually, but let's check what's there.
}
check();
