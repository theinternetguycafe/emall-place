import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkServicesSchema() {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching services:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in services:', Object.keys(data[0]));
  } else {
    console.log('No rows in services table.');
  }
}

checkServicesSchema();
