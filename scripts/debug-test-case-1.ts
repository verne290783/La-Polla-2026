import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function run() {
  console.log('Fetching system_settings virtual_date...');
  const { data: s } = await adminClient.from('system_settings').select('*');
  console.log('System settings:', s);

  console.log('Fetching match 4...');
  const { data: match } = await adminClient.from('matches').select('*').eq('id', 4).single();
  console.log('Match 4:', match);

  const testUserId = 'test-debug-user-' + Date.now();
  console.log('Creating temp test user:', testUserId);
  const { error: userErr } = await adminClient.from('profiles').insert({
    id: '00000000-0000-0000-0000-000000000004', // use a valid UUID
    email: 'debug-test@example.com',
    display_name: 'Debug User'
  });
  if (userErr) console.error('User Err:', userErr);

  console.log('Setting virtual date to 2026-06-08T12:00:00Z...');
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-08T12:00:00Z' });

  // Let's get app time from DB
  const { data: appTime } = await adminClient.rpc('get_app_time');
  console.log('DB get_app_time() returns:', appTime);

  const { data: pools } = await adminClient.from('pools').select('id').limit(1);
  const testPoolId = pools && pools.length > 0 ? pools[0].id : null;
  console.log('Using pool ID:', testPoolId);

  console.log('Inserting full_tournament_prediction...');
  const { data: insData, error: insErr } = await adminClient.from('full_tournament_predictions').insert({
    user_id: '00000000-0000-0000-0000-000000000004',
    pool_id: testPoolId,
    prediction_key: 'G_4',
    predicted_home_score: 2,
    predicted_away_score: 1,
    phase: 'group',
    predicted_home_team_id: 'CZE',
    predicted_away_team_id: 'RSA'
  }).select('*');
  console.log('Inserted prediction:', insData, 'Error:', insErr);

  // Clean up
  await adminClient.from('full_tournament_predictions').delete().eq('user_id', '00000000-0000-0000-0000-000000000004');
  await adminClient.from('profiles').delete().eq('id', '00000000-0000-0000-0000-000000000004');
}

run().catch(console.error);
