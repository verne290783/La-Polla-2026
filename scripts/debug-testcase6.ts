import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function run() {
  console.log('--- RUNNING DEBUG FOR TEST CASE 6 ---');
  
  // Ensure test user exists
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  let testUser = users.find(u => u.email === 'test-late-predictions@example.com');
  if (!testUser) {
    const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
      email: 'test-late-predictions@example.com',
      password: 'Password123!',
      email_confirm: true
    });
    if (createErr) throw createErr;
    testUser = createData.user!;
  }
  const testUserId = testUser.id;
  
  // Ensure profile exists
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', testUserId).maybeSingle();
  if (!profile) {
    await adminClient.from('profiles').insert({ id: testUserId, email: 'test-late-predictions@example.com', display_name: 'Test Late Preds User', is_admin: false });
  }

  // Ensure pool exists and user is in it
  const { data: pools } = await adminClient.from('pools').select('id').limit(1);
  let testPoolId = pools && pools.length > 0 ? pools[0].id : null;
  if (!testPoolId) {
    const { data: newPool } = await adminClient.from('pools').insert({ name: 'Test Pool', invite_code: 'debug-pool-123' }).select('id').single();
    testPoolId = newPool!.id;
  }

  // Ensure phase prediction row exists
  const { data: phasePred } = await adminClient.from('phase_predictions').select('*').eq('user_id', testUserId).eq('match_id', 4).maybeSingle();
  if (!phasePred) {
    await adminClient.from('phase_predictions').insert({
      user_id: testUserId,
      pool_id: testPoolId,
      match_id: 4,
      predicted_home_score: 0,
      predicted_away_score: 0
    });
  }
  console.log('Test User ID:', testUserId);

  // Setup match 4 status & lock_time
  await adminClient.from('matches').update({
    status: 'scheduled',
    lock_time_part2: '2026-06-11T21:00:00Z',
    home_team_id: 'CZE',
    away_team_id: 'RSA',
    phase: 'group'
  }).eq('id', 4);

  // Reset prediction points to null
  await adminClient.from('phase_predictions').update({ points_earned: null }).eq('user_id', testUserId).eq('match_id', 4);

  // --- Step 6a ---
  console.log('\n--- Step 6a: 1s before lock ---');
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T20:59:59Z' });
  
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 3,
    predicted_away_score: 2
  }).eq('user_id', testUserId).eq('match_id', 4);

  let pred = (await adminClient.from('phase_predictions').select('*').eq('user_id', testUserId).eq('match_id', 4).single()).data;
  console.log('Prediction after update 6a:', {
    predicted_home_score: pred.predicted_home_score,
    predicted_away_score: pred.predicted_away_score,
    updated_at: pred.updated_at
  });

  // Finish match and compute points
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 3,
    away_score: 2,
    home_score_90: 3,
    away_score_90: 2
  }).eq('id', 4);

  await adminClient.rpc('compute_points', { p_match_id: 4 });

  pred = (await adminClient.from('phase_predictions').select('*').eq('user_id', testUserId).eq('match_id', 4).single()).data;
  console.log('Prediction after compute_points 6a:', {
    points_earned: pred.points_earned,
    updated_at: pred.updated_at
  });

  // --- Step 6b ---
  console.log('\n--- Step 6b: Exactly at lock ---');
  await adminClient.from('matches').update({ status: 'scheduled' }).eq('id', 4);
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T21:00:00Z' });

  await adminClient.from('phase_predictions').update({
    predicted_home_score: 1,
    predicted_away_score: 0
  }).eq('user_id', testUserId).eq('match_id', 4);

  pred = (await adminClient.from('phase_predictions').select('*').eq('user_id', testUserId).eq('match_id', 4).single()).data;
  console.log('Prediction after update 6b:', {
    predicted_home_score: pred.predicted_home_score,
    predicted_away_score: pred.predicted_away_score,
    updated_at: pred.updated_at
  });

  // Finish match and compute points
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 1,
    away_score: 0,
    home_score_90: 1,
    away_score_90: 0
  }).eq('id', 4);

  await adminClient.rpc('compute_points', { p_match_id: 4 });

  pred = (await adminClient.from('phase_predictions').select('*').eq('user_id', testUserId).eq('match_id', 4).single()).data;
  console.log('Prediction after compute_points 6b:', {
    points_earned: pred.points_earned,
    updated_at: pred.updated_at
  });

  // Let's run a query to check match 4 values in the DB
  const matchObj = (await adminClient.from('matches').select('*').eq('id', 4).single()).data;
  console.log('Match 4 in DB:', {
    id: matchObj.id,
    lock_time_part2: matchObj.lock_time_part2,
    status: matchObj.status
  });
}

run().catch(console.error);
