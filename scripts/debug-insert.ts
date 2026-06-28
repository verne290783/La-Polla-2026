import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function run() {
  const email = `test-debug-${Date.now()}@example.com`;
  console.log(`Creating user: ${email}`);
  const { data: userData, error: userErr } = await adminClient.auth.admin.createUser({
    email,
    password: 'Password123!',
    email_confirm: true
  });
  if (userErr) throw userErr;
  const userId = userData.user.id;
  console.log(`User created. ID: ${userId}`);

  // Ensure profile
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (!profile) {
    await adminClient.from('profiles').insert({ id: userId, email, display_name: 'Debug User' });
  }

  // Get first pool
  const { data: pools } = await adminClient.from('pools').select('id').limit(1);
  const poolId = pools[0].id;

  // Set virtual date to 2026-06-08T12:00:00Z
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-08T12:00:00Z' });

  // Update match 4 lock_time_part2
  const { data: matchBefore } = await adminClient.from('matches').select('*').eq('id', 4).single();
  console.log('Match 4 before update:', matchBefore);
  await adminClient.from('matches').update({
    lock_time_part2: '2026-06-11T21:00:00Z',
    home_team_id: 'CZE',
    away_team_id: 'RSA',
    phase: 'group'
  }).eq('id', 4);

  // Insert prediction
  console.log('Inserting full_tournament_prediction...');
  const { data: insData, error: insErr } = await adminClient.from('full_tournament_predictions').insert({
    user_id: userId,
    pool_id: poolId,
    prediction_key: 'G_4',
    predicted_home_score: 2,
    predicted_away_score: 1,
    phase: 'group',
    predicted_home_team_id: 'CZE',
    predicted_away_team_id: 'RSA'
  }).select('*');
  console.log('Inserted prediction:', insData, 'Error:', insErr);

  // Set virtual date to 2026-06-15T12:00:00Z
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-15T12:00:00Z' });

  // Finish match 4
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 2,
    away_score: 1,
    home_score_90: 2,
    away_score_90: 1
  }).eq('id', 4);

  // Compute points
  console.log('Computing points...');
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  // Fetch prediction points
  const { data: predAfter } = await adminClient.from('full_tournament_predictions').select('*').eq('user_id', userId).eq('prediction_key', 'G_4').single();
  console.log('Prediction after compute_points:', predAfter);

  // Cleanup
  console.log('Cleaning up...');
  await adminClient.from('full_tournament_predictions').delete().eq('user_id', userId);
  await adminClient.from('profiles').delete().eq('id', userId);
  await adminClient.auth.admin.deleteUser(userId);
  if (matchBefore) {
    await adminClient.from('matches').update({
      lock_time_part2: matchBefore.lock_time_part2,
      home_team_id: matchBefore.home_team_id,
      away_team_id: matchBefore.away_team_id,
      phase: matchBefore.phase,
      status: matchBefore.status,
      home_score: matchBefore.home_score,
      away_score: matchBefore.away_score,
      home_score_90: matchBefore.home_score_90,
      away_score_90: matchBefore.away_score_90
    }).eq('id', 4);
  }
}

run().catch(async err => {
  console.error(err);
});
