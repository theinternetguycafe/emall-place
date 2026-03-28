import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const checks = [
    { table: 'service_requests', label: 'Phase 7 (Dispatch)' },
    { table: 'kyc_submissions', label: 'Phase 8 (KYC)' },
  ];

  const colChecks = [
    { table: 'seller_stores', column: 'seller_type', label: 'Phase 8 (Seller Type)' },
    { table: 'seller_stores', column: 'last_seen_at', label: 'Phase 6.5/11 (Heartbeat)' },
    { table: 'seller_stores', column: 'tagline', label: 'Phase 10 (Branding)' },
  ];

  const results = [];

  for (const check of checks) {
    const { error } = await supabase.from(check.table).select('count').limit(1);
    if (error && error.code === '42P01') {
      results.push(`${check.label}: ❌ MISSING (Table ${check.table})`);
    } else {
      results.push(`${check.label}: ✅ EXISTS`);
    }
  }

  // Column checks are harder via anon key if RLS allows selecting but not viewing schema.
  // We'll try selecting them.
  for (const check of colChecks) {
    const { error } = await supabase.from(check.table).select(check.column).limit(1);
    if (error && (error.code === '42703' || error.message?.includes('column'))) {
       results.push(`${check.label}: ❌ MISSING (Column ${check.column})`);
    } else {
       results.push(`${check.label}: ✅ EXISTS`);
    }
  }

  console.log('--- SCHEMA VERIFICATION ---');
  results.forEach(r => console.log(r));
  console.log('---------------------------');
}

test();
