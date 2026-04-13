import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function autoApprove() {
  console.log("== Auto-approving all pending seller profiles for testing ==");
  
  const { data, error } = await supabase
    .from('seller_profiles')
    .update({
      kyc_status: 'approved',
      onboarding_completed: true,
      is_online: true,
      // Setting some default coordinates if missing (Hebron Mall area)
      latitude: -25.5585,
      longitude: 28.0183
    })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all

  if (error) {
    console.error("Error updating seller_profiles:", error);
  } else {
    console.log("Successfully approved seller profiles.");
  }
}

autoApprove();
