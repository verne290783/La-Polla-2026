import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Querying pool_members schema...');
  // We can query information_schema or just select * from pool_members limit 1
  const { data, error } = await supabase
    .from('pool_members')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching pool_members:', error);
  } else {
    console.log('Sample row of pool_members:', data);
  }

  // Let's run a query to get the columns from information_schema via a postgres query or similar.
  // Wait, RPC or raw SQL? Since we can't run raw SQL directly without RPC, we can check if there are columns like total_points in data.
  // Let's also check if we can query some profiles or pools.
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  } else {
    console.log('Sample row of profiles:', profilesData);
  }
}

run();
