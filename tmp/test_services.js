const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      title,
      seller_store:seller_stores!inner(
        id,
        store_name,
        seller_type
      )
    `)
    .eq('status', 'approved')
    .or('seller_type.eq.service,seller_type.eq.both', { foreignTable: 'seller_stores' })
    .limit(5);

  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log('DATA:', JSON.stringify(data, null, 2));
  }
}

test();
