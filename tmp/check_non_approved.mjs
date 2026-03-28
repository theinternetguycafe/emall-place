import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data: products } = await supabase
    .from('products')
    .select('id, title, status, created_at')
    .neq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('UNAPPROVED PRODUCTS:', JSON.stringify(products, null, 2));
}

test();
