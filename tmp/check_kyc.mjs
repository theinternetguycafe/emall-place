import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/User/Desktop/store/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('kyc_submissions').select('*');
  console.log('Result (Anon):', JSON.stringify({ data, error }));
  
  // also get service role key if possible from .env
  dotenv.config({ path: 'c:/Users/User/Desktop/store/.env' });
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && serviceKey !== 'your-service-role-key') {
     const adminSupabase = createClient(supabaseUrl, serviceKey);
     const { data: adminData } = await adminSupabase.from('kyc_submissions').select('*');
     console.log('Result (Admin):', adminData);
  }
}
check();
