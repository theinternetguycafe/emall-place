import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkProductsSchema() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Error fetching products:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in products:', Object.keys(data[0]));
  } else {
    console.log('No rows in products table.');
  }
}

checkProductsSchema();
