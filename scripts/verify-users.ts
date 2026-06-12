import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('--- PROFILES ---');
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .or('display_name.ilike.%Claudia Romero%,display_name.ilike.%Addemar%');
  
  if (pError) {
    console.error('Error fetching profiles:', pError);
    return;
  }
  console.log(JSON.stringify(profiles, null, 2));

  if (profiles && profiles.length > 0) {
    const userIds = profiles.map(p => p.id);
    console.log('--- POOL MEMBERS ---');
    const { data: members, error: mError } = await supabase
      .from('pool_members')
      .select('*, pools(name)')
      .in('user_id', userIds);
      
    if (mError) {
      console.error('Error fetching pool members:', mError);
      return;
    }
    console.log(JSON.stringify(members, null, 2));
  }
}

run();
