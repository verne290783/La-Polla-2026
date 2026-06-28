import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: profiles, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error(error);
    return;
  }
  console.log('Profiles:');
  for (const p of profiles || []) {
    console.log(`- ID: ${p.id} | Email: ${p.email} | Name: ${p.display_name} | Unlocked Until: ${p.p1_unlocked_until}`);
  }
}
run();
