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
  const email = 'ehdiazs@gmail.com';
  console.log('Finding user by email:', email);
  const { data: profile, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (pError || !profile) {
    console.error('User not found:', pError);
    process.exit(1);
  }

  const userId = profile.id;
  console.log('User profile:', profile);

  // Find their pools
  const { data: members, error: mError } = await supabase
    .from('pool_members')
    .select('*')
    .eq('user_id', userId);

  console.log('Pool memberships:', members);

  // Get all pools
  if (members && members.length > 0) {
    const { data: pools } = await supabase
      .from('pools')
      .select('*')
      .in('id', members.map(m => m.pool_id));
    console.log('Pools:', pools);
  }

  // Find champion predictions
  const { data: champPreds } = await supabase
    .from('champion_predictions')
    .select('*')
    .eq('user_id', userId);
  console.log('Champion Predictions:', champPreds);

  // Find phase predictions
  const { data: phasePreds } = await supabase
    .from('phase_predictions')
    .select('*')
    .eq('user_id', userId);
  console.log('Phase Predictions count:', phasePreds?.length);
  if (phasePreds && phasePreds.length > 0) {
    console.log('Sample phase prediction:', phasePreds[0]);
  }
}

run();
