import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const P1 = process.env.VITE_SUPABASE_URL_P1;
const P2 = process.env.VITE_SUPABASE_URL_P2;
const A1 = process.env.VITE_SUPABASE_ANON_KEY_P1;
const A2 = process.env.VITE_SUPABASE_ANON_KEY_P2;
const supabaseUrl = [P1, P2].filter(Boolean).join('');
const supabaseAnonKey = [A1, A2].filter(Boolean).join('');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('seller_stores')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log('Error fetching seller_stores:', error);
  } else {
    console.log('Columns in seller_stores:', Object.keys(data[0] || {}).join(', '));
    console.log('Sample Data:', data[0]);
  }
}

check();
