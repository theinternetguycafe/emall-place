import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
  const { data: profiles } = await supabase.from('seller_profiles').select('id, user_id');
  const { data: legacyStores } = await supabase.from('seller_stores').select('id, owner_id, logo_url, banner_url, tagline, theme_color, announcement_text, store_policies, description, featured_product_ids');
  
  console.log("Found legacy stores:", legacyStores?.length);
  
  if (legacyStores && legacyStores.length > 0) {
    for (const ls of legacyStores) {
      const profile = profiles.find(p => p.user_id === ls.owner_id);
      if (profile) {
        console.log(`Migrating data for profile ${profile.id} (user ${ls.owner_id})`);
        // Update stores table where seller_id = profile.id
        const updateData = {};
        if (ls.logo_url) updateData.logo_url = ls.logo_url;
        if (ls.banner_url) updateData.banner_url = ls.banner_url;
        if (ls.tagline) updateData.tagline = ls.tagline;
        if (ls.theme_color) updateData.theme_color = ls.theme_color;
        if (ls.announcement_text) updateData.announcement_text = ls.announcement_text;
        if (ls.store_policies) updateData.store_policies = ls.store_policies;
        if (ls.description) updateData.description = ls.description;
        if (ls.featured_product_ids) updateData.featured_product_ids = ls.featured_product_ids;
        
        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase.from('stores').update(updateData).eq('seller_id', profile.id);
          if (error) console.error("Error updating store for", profile.id, error.message);
          else console.log("Restored store settings for", profile.id);
        }
      }
    }
  }
}

run().catch(console.error);
