import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // 1. Find a store that is 'service' or 'both'
  const { data: stores } = await supabase
    .from('seller_stores')
    .select('id')
    .or('seller_type.eq.service,seller_type.eq.both')
    .limit(1);

  if (!stores || stores.length === 0) {
    console.log('No service stores found. Creating one...');
    // Create a dummy store for testing if needed? 
    // Actually, I'll just look for ANY store and force it to be 'both'
    const { data: allStores } = await supabase.from('seller_stores').select('id').limit(1);
    if (allStores && allStores.length > 0) {
       await supabase.from('seller_stores').update({ seller_type: 'both' }).eq('id', allStores[0].id);
       stores[0] = allStores[0];
    } else {
       console.error('No stores at all in DB!');
       return;
    }
  }

  const storeId = stores[0].id;

  // 2. Insert an approved service
  const { data: cat } = await supabase.from('categories').select('id').limit(1);
  const catId = cat?.[0]?.id;

  const { data: product, error: pError } = await supabase
    .from('products')
    .insert({
      seller_store_id: storeId,
      category_id: catId,
      title: 'Expert Home Repair',
      description: 'Reliable repair services for all your household needs. Plumping, Electrical, and more.',
      price: 350,
      stock: 99,
      status: 'approved'
    })
    .select();

  if (pError) {
    console.error('INSERT ERROR:', pError);
  } else {
    console.log('INSERTED PRODUCT:', product);
  }
}

test();
