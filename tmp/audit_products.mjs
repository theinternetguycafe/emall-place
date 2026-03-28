import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: products } = await supabase
    .from('products')
    .select('id, title, status, seller_store:seller_stores(id, store_name, seller_type)')
    .limit(20);

  console.log('PRODUCTS:', JSON.stringify(products, null, 2));
}

test();
