import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_EMAIL = 'test-late-predictions@example.com';
const CONTROL_EMAIL = 'control-late-predictions@example.com';
const TEST_PASSWORD = 'Password123!';

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
const userClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

let testUserId: string | null = null;
let controlUserId: string | null = null;
let createdPoolId: string | null = null;
let originalSettingsFetched = false;
let originalVirtualDate: string | null = null;
let virtualDateModified = false;

// Store original match states to restore at cleanup
let originalMatch4: any = null;
let originalMatch103: any = null;
let originalMatch104: any = null;
let match103Created = false;
let match104Created = false;

let cleanupInProgress = false;
let cleanupDone = false;

async function doCleanup() {
  if (cleanupInProgress || cleanupDone) return;
  cleanupInProgress = true;
  console.log('\n[Cleanup] Restoring database state...');

  // 1. Restore virtual_date
  try {
    if (virtualDateModified && originalSettingsFetched) {
      if (originalVirtualDate !== null) {
        console.log(`[Cleanup] Restoring virtual_date to: ${originalVirtualDate}`);
        await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: originalVirtualDate });
      } else {
        console.log('[Cleanup] Removing virtual_date setting...');
        await adminClient.from('system_settings').delete().eq('key', 'virtual_date');
      }
    }
  } catch (err: any) {
    console.error('[Cleanup] Error restoring virtual_date:', err.message);
  }

  // 2. Restore matches
  try {
    if (originalMatch4) {
      console.log('[Cleanup] Restoring match 4...');
      await adminClient.from('matches').update(originalMatch4).eq('id', 4);
    }
    if (match103Created) {
      console.log('[Cleanup] Deleting temp match 103...');
      await adminClient.from('matches').delete().eq('id', 103);
    } else if (originalMatch103) {
      console.log('[Cleanup] Restoring match 103...');
      await adminClient.from('matches').update(originalMatch103).eq('id', 103);
    }

    if (match104Created) {
      console.log('[Cleanup] Deleting temp match 104...');
      await adminClient.from('matches').delete().eq('id', 104);
    } else if (originalMatch104) {
      console.log('[Cleanup] Restoring match 104...');
      await adminClient.from('matches').update(originalMatch104).eq('id', 104);
    }
  } catch (err: any) {
    console.error('[Cleanup] Error restoring matches:', err.message);
  }

  // 3. Delete predictions, profile, user
  try {
    let idToDelete = testUserId;
    if (!idToDelete) {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existing = users.find(u => u.email === TEST_EMAIL);
      if (existing) {
        idToDelete = existing.id;
      }
    }
    if (idToDelete) {
      console.log(`[Cleanup] Deleting predictions for user: ${idToDelete}`);
      await adminClient.from('full_tournament_predictions').delete().eq('user_id', idToDelete);
      await adminClient.from('phase_predictions').delete().eq('user_id', idToDelete);
      await adminClient.from('champion_predictions').delete().eq('user_id', idToDelete);
      console.log(`[Cleanup] Deleting profile for user: ${idToDelete}`);
      await adminClient.from('profiles').delete().eq('id', idToDelete);
      console.log(`[Cleanup] Deleting user from auth: ${idToDelete}`);
      await adminClient.auth.admin.deleteUser(idToDelete);
    }

    // Delete control user
    let controlIdToDelete = controlUserId;
    if (!controlIdToDelete) {
      const { data: { users } } = await adminClient.auth.admin.listUsers();
      const existingControl = users.find(u => u.email === CONTROL_EMAIL);
      if (existingControl) {
        controlIdToDelete = existingControl.id;
      }
    }
    if (controlIdToDelete) {
      console.log(`[Cleanup] Deleting predictions for control user: ${controlIdToDelete}`);
      await adminClient.from('full_tournament_predictions').delete().eq('user_id', controlIdToDelete);
      await adminClient.from('phase_predictions').delete().eq('user_id', controlIdToDelete);
      await adminClient.from('champion_predictions').delete().eq('user_id', controlIdToDelete);
      console.log(`[Cleanup] Deleting profile for control user: ${controlIdToDelete}`);
      await adminClient.from('profiles').delete().eq('id', controlIdToDelete);
      console.log(`[Cleanup] Deleting control user from auth: ${controlIdToDelete}`);
      await adminClient.auth.admin.deleteUser(controlIdToDelete);
    }
  } catch (err: any) {
    console.error('[Cleanup] Error deleting user:', err.message);
  }

  // 4. Delete pool
  try {
    if (createdPoolId) {
      console.log(`[Cleanup] Deleting temporary pool: ${createdPoolId}`);
      await adminClient.from('pools').delete().eq('id', createdPoolId);
    }
  } catch (err: any) {
    console.error('[Cleanup] Error deleting pool:', err.message);
  }

  console.log('[Cleanup] Cleanup finished successfully.');
  cleanupInProgress = false;
  cleanupDone = true;
}

function setupProcessHandlers() {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  signals.forEach(sig => {
    process.on(sig, async () => {
      console.log(`\n[Process] Received signal ${sig}. Cleaning up...`);
      await doCleanup();
      process.exit(1);
    });
  });

  process.on('uncaughtException', async (err) => {
    console.error('\n[Process] Uncaught Exception:', err);
    await doCleanup();
    process.exit(1);
  });
}

setupProcessHandlers();

async function run() {
  console.log('=== STARTING LATE PREDICTIONS SCORING INTEGRATION TESTS ===');

  // Fetch original settings
  const { data: originalSettings } = await adminClient
    .from('system_settings')
    .select('*')
    .eq('key', 'virtual_date')
    .maybeSingle();
  originalSettingsFetched = true;
  originalVirtualDate = originalSettings ? originalSettings.value : null;

  // Setup Test User
  console.log('Ensuring test user exists...');
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  let testUser = users.find(u => u.email === TEST_EMAIL);
  if (!testUser) {
    const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true
    });
    if (createErr) throw createErr;
    testUser = createData.user!;
  }
  testUserId = testUser.id;

  // Ensure profile exists
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', testUserId).maybeSingle();
  if (!profile) {
    await adminClient.from('profiles').insert({ id: testUserId, email: TEST_EMAIL, display_name: 'Test Late Preds User', is_admin: false });
  }

  // Setup Control User
  console.log('Ensuring control user exists...');
  let controlUser = users.find(u => u.email === CONTROL_EMAIL);
  if (!controlUser) {
    const { data: createDataControl, error: createErrControl } = await adminClient.auth.admin.createUser({
      email: CONTROL_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true
    });
    if (createErrControl) throw createErrControl;
    controlUser = createDataControl.user!;
  }
  controlUserId = controlUser.id;

  // Ensure control profile exists
  const { data: profileControl } = await adminClient.from('profiles').select('*').eq('id', controlUserId).maybeSingle();
  if (!profileControl) {
    await adminClient.from('profiles').insert({ id: controlUserId, email: CONTROL_EMAIL, display_name: 'Control Late Preds User', is_admin: false });
  }

  // Setup Test Pool
  const { data: poolData } = await adminClient.from('pools').select('id').limit(1);
  let testPoolId = poolData && poolData.length > 0 ? poolData[0].id : null;
  if (!testPoolId) {
    const { data: newPool, error: poolErr } = await adminClient.from('pools').insert({
      name: 'Test Late Preds Pool',
      created_by: testUserId,
      invite_code: 'test-pool-m3-' + Date.now()
    }).select('id').single();
    if (poolErr) throw poolErr;
    testPoolId = newPool.id;
    createdPoolId = newPool.id;
  }

  // Login as User
  const { error: loginErr } = await userClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  if (loginErr) throw loginErr;
  console.log('Logged in as test user.');

  // Store Match 4 state
  const { data: match4 } = await adminClient.from('matches').select('*').eq('id', 4).single();
  originalMatch4 = match4;

  // Ensure Match 103 and 104 exist
  const { data: match103 } = await adminClient.from('matches').select('*').eq('id', 103).maybeSingle();
  if (!match103) {
    await adminClient.from('matches').insert({
      id: 103,
      phase: 'third_place',
      home_team_id: 'CZE',
      away_team_id: 'CIV',
      match_date: '2026-07-18T20:00:00Z',
      lock_time_part2: '2026-07-18T19:00:00Z',
      status: 'scheduled'
    });
    match103Created = true;
  } else {
    originalMatch103 = match103;
  }

  const { data: match104 } = await adminClient.from('matches').select('*').eq('id', 104).maybeSingle();
  if (!match104) {
    await adminClient.from('matches').insert({
      id: 104,
      phase: 'final',
      home_team_id: 'BRA',
      away_team_id: 'GER',
      match_date: '2026-07-19T20:00:00Z',
      lock_time_part2: '2026-07-19T19:00:00Z',
      status: 'scheduled'
    });
    match104Created = true;
  } else {
    originalMatch104 = match104;
  }

  // Set match 4 lock_time_part2 to 2026-06-11 21:00:00
  await adminClient.from('matches').update({
    lock_time_part2: '2026-06-11T21:00:00Z',
    home_team_id: 'CZE',
    away_team_id: 'RSA',
    phase: 'group'
  }).eq('id', 4);

  // Clear previous predictions
  await adminClient.from('phase_predictions').delete().eq('user_id', testUserId);
  await adminClient.from('full_tournament_predictions').delete().eq('user_id', testUserId);
  await adminClient.from('champion_predictions').delete().eq('user_id', testUserId);
  await adminClient.from('phase_predictions').delete().eq('user_id', controlUserId);
  await adminClient.from('full_tournament_predictions').delete().eq('user_id', controlUserId);
  await adminClient.from('champion_predictions').delete().eq('user_id', controlUserId);

  // =====================================================================
  // TEST CASE 1: Early Predictions (On-Time) Calculate Normally
  // =====================================================================
  console.log('\n--- Running Test Case 1: Early Predictions (On-Time) ---');
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-08T12:00:00Z' });
  virtualDateModified = true;

  // Insert Phase prediction (Part 2)
  const { error: insErr1 } = await userClient.from('phase_predictions').insert({
    user_id: testUserId,
    pool_id: testPoolId,
    match_id: 4,
    predicted_home_score: 2,
    predicted_away_score: 1
  });
  if (insErr1) throw insErr1;

  // Insert Full Tournament prediction (Part 1)
  const { error: insErr2 } = await userClient.from('full_tournament_predictions').insert({
    user_id: testUserId,
    pool_id: testPoolId,
    prediction_key: 'G_4',
    predicted_home_score: 2,
    predicted_away_score: 1,
    phase: 'group',
    predicted_home_team_id: 'CZE',
    predicted_away_team_id: 'RSA'
  });
  if (insErr2) throw insErr2;

  // Advance time, finish match
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-15T12:00:00Z' });
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 2,
    away_score: 1,
    home_score_90: 2,
    away_score_90: 1
  }).eq('id', 4);

  // Recalculate
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  // Assert points phase_predictions
  const pred1Result = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`Phase Prediction points: ${pred1Result.data?.points_earned} (Expected: 6), error:`, pred1Result.error);
  const pred1 = pred1Result.data;
  if (!pred1 || pred1.points_earned !== 6) {
    throw new Error('Test Case 1 Failed: Phase Prediction did not receive normal points.');
  }

  // Assert points full_tournament_predictions
  const pred2Result = await adminClient.from('full_tournament_predictions').select('points_earned').eq('user_id', testUserId).eq('prediction_key', 'G_4').single();
  console.log(`Full Tournament Prediction points: ${pred2Result.data?.points_earned} (Expected: 6), error:`, pred2Result.error);
  const pred2 = pred2Result.data;
  if (!pred2 || pred2.points_earned !== 6) {
    throw new Error('Test Case 1 Failed: Full Tournament Prediction did not receive normal points.');
  }

  console.log('✅ Test Case 1 Passed!');

  // =====================================================================
  // TEST CASE 2: Unauthorized Late Prediction Scores 0 Points
  // =====================================================================
  console.log('\n--- Running Test Case 2: Unauthorized Late Predictions ---');
  // Set virtual date to after lock_time_part2 (lock is 2026-06-11T21:00:00Z)
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-12T12:00:00Z' });

  // Update prediction using adminClient to simulate service role bypass
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 1,
    predicted_away_score: 1
  }).eq('user_id', testUserId).eq('match_id', 4);

  // Set match score to match the new prediction (1-1)
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 1,
    away_score: 1,
    home_score_90: 1,
    away_score_90: 1
  }).eq('id', 4);

  // Recalculate
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  // Assert points is 0
  const { data: predLate1 } = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`Late Phase Prediction points: ${predLate1?.points_earned} (Expected: 0)`);
  if (!predLate1 || predLate1.points_earned !== 0) {
    throw new Error('Test Case 2 Failed: Late Phase Prediction did not score 0 points.');
  }

  console.log('✅ Test Case 2 Passed!');

  // =====================================================================
  // TEST CASE 3: Kickoff Predictions with Unlock Get Normal Points
  // =====================================================================
  console.log('\n--- Running Test Case 3: Kickoff Predictions with Unlock ---');
  // Set virtual date to 2026-06-12 (after kickoff, but user unlocked)
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-12T12:00:00Z' });
  await adminClient.from('profiles').update({ p1_unlocked_until: '2026-06-13T12:00:00Z' }).eq('id', testUserId);

  // Set match 4 lock_time_part2 to future date so it's not locked individually yet
  await adminClient.from('matches').update({ lock_time_part2: '2026-06-14T21:00:00Z' }).eq('id', 4);

  // Update wizard prediction (Full Tournament)
  await adminClient.from('full_tournament_predictions').update({
    predicted_home_score: 3,
    predicted_away_score: 0
  }).eq('user_id', testUserId).eq('prediction_key', 'G_4');

  // Set match score to 3-0
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 3,
    away_score: 0,
    home_score_90: 3,
    away_score_90: 0
  }).eq('id', 4);

  // Recalculate
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  // Assert points is normal (6 points)
  const { data: predUnlock, error: queryErr } = await adminClient.from('full_tournament_predictions').select('*').eq('user_id', testUserId).eq('prediction_key', 'G_4').single();
  console.log(`Unlocked Wizard Prediction query response:`, { predUnlock, queryErr });
  console.log(`Unlocked Wizard Prediction points: ${predUnlock?.points_earned} (Expected: 6)`);
  if (queryErr) {
    console.error('Query Error details:', queryErr);
  }
  if (!predUnlock || predUnlock.points_earned !== 6) {
    throw new Error('Test Case 3 Failed: Unlocked Wizard Prediction did not receive normal points.');
  }

  console.log('✅ Test Case 3 Passed!');

  // =====================================================================
  // TEST CASE 4: Unlocked User but Individual Match Lock Time Exceeded Scores 0
  // =====================================================================
  console.log('\n--- Running Test Case 4: Unlocked but Match Lock Time Exceeded ---');
  // User still unlocked until 2026-06-13T12:00:00Z.
  // Set match 4 lock_time_part2 to past date: 2026-06-11T21:00:00Z.
  await adminClient.from('matches').update({ lock_time_part2: '2026-06-11T21:00:00Z' }).eq('id', 4);

  // Update wizard prediction at 2026-06-12 (after lock_time_part2)
  await adminClient.from('full_tournament_predictions').update({
    predicted_home_score: 4,
    predicted_away_score: 0
  }).eq('user_id', testUserId).eq('prediction_key', 'G_4');

  // Set match score to 4-0
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 4,
    away_score: 0,
    home_score_90: 4,
    away_score_90: 0
  }).eq('id', 4);

  // Recalculate
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  // Assert points is 0
  const { data: predUnlockExceeded } = await adminClient.from('full_tournament_predictions').select('points_earned').eq('user_id', testUserId).eq('prediction_key', 'G_4').single();
  console.log(`Unlocked Wizard but Exceeded Match Lock points: ${predUnlockExceeded?.points_earned} (Expected: 0)`);
  if (!predUnlockExceeded || predUnlockExceeded.points_earned !== 0) {
    throw new Error('Test Case 4 Failed: Unlocked prediction that exceeded individual match lock should score 0.');
  }

  console.log('✅ Test Case 4 Passed!');

  // =====================================================================
  // TEST CASE 5: Champion Predictions Late scoring
  // =====================================================================
  console.log('\n--- Running Test Case 5: Champion Predictions Late Scoring ---');
  // 5a. On-time champion prediction
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-08T12:00:00Z' });
  const { error: insErrChamp } = await userClient.from('champion_predictions').insert({
    user_id: testUserId,
    pool_id: testPoolId,
    champion_team_id: 'BRA',
    runner_up_team_id: 'GER',
    third_place_team_id: 'CZE'
  });
  if (insErrChamp) throw insErrChamp;

  // Finish finals and third place
  await adminClient.from('matches').update({
    status: 'finished',
    winner_team_id: 'CZE',
    home_score: 1,
    away_score: 0,
    home_score_90: 1,
    away_score_90: 0
  }).eq('id', 103);

  await adminClient.from('matches').update({
    status: 'finished',
    home_team_id: 'BRA',
    away_team_id: 'GER',
    home_score: 2,
    away_score: 1,
    home_score_90: 2,
    away_score_90: 1
  }).eq('id', 104);

  // Recalculate champion points
  await adminClient.rpc('compute_points', { p_match_id: 104 });

  // Assert points (should be 5 + 3 + 2 = 10)
  const champ1Result = await adminClient.from('champion_predictions').select('*').eq('user_id', testUserId).single();
  console.log(`On-time Champion Prediction points: ${champ1Result.data?.points_earned} (Expected: 10), error:`, champ1Result.error, 'data:', champ1Result.data);
  const champ1 = champ1Result.data;
  if (!champ1 || champ1.points_earned !== 10) {
    throw new Error('Test Case 5 Failed: On-time Champion prediction did not receive normal points.');
  }

  // 5b. Unauthorized late update of champion prediction
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-12T12:00:00Z' });
  await adminClient.from('profiles').update({ p1_unlocked_until: null }).eq('id', testUserId);

  // Note: We change the values to ensure the trigger is fired
  await adminClient.from('champion_predictions').update({
    champion_team_id: 'GER',
    runner_up_team_id: 'BRA',
    third_place_team_id: 'CIV'
  }).eq('user_id', testUserId);

  // Log state of champion prediction before late calculation
  const { data: dbChampBeforeRecalc } = await adminClient.from('champion_predictions').select('*').eq('user_id', testUserId).single();
  console.log('Champion Pred before late recalc:', JSON.stringify(dbChampBeforeRecalc, null, 2));

  // Recalculate
  await adminClient.rpc('compute_points', { p_match_id: 104 });

  // Log state after
  const { data: dbChampAfterRecalc } = await adminClient.from('champion_predictions').select('*').eq('user_id', testUserId).single();
  console.log('Champion Pred after late recalc:', JSON.stringify(dbChampAfterRecalc, null, 2));

  // Assert points is 0
  const { data: champLate } = await adminClient.from('champion_predictions').select('points_earned').eq('user_id', testUserId).single();
  console.log(`Late Champion Prediction points: ${champLate?.points_earned} (Expected: 0)`);
  if (champLate === null || champLate.points_earned !== 0) {
    throw new Error('Test Case 5 Failed: Late Champion prediction did not score 0.');
  }

  console.log('✅ Test Case 5 Passed!');

  // =====================================================================
  // TEST CASE 6: Boundary Conditions for lock_time_part2
  // =====================================================================
  console.log('\n--- Running Test Case 6: Boundary Conditions for lock_time_part2 ---');
  // Match 4 lock_time_part2 is 2026-06-11T21:00:00Z.
  // Set match status to scheduled first so we can reset prediction points
  await adminClient.from('matches').update({ status: 'scheduled' }).eq('id', 4);

  // 6a. 1 second before lock (2026-06-11T20:59:59Z)
  console.log('6a. Updating prediction 1 second before lock...');
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T20:59:59Z' });
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 3,
    predicted_away_score: 2
  }).eq('user_id', testUserId).eq('match_id', 4);

  // Finish match and compute points
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 3,
    away_score: 2,
    home_score_90: 3,
    away_score_90: 2
  }).eq('id', 4);
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  const { data: boundaryOnTime } = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`Prediction updated 1s before lock points: ${boundaryOnTime?.points_earned} (Expected: 6)`);
  if (!boundaryOnTime || boundaryOnTime.points_earned !== 6) {
    throw new Error('Test Case 6a Failed: Prediction updated 1s before lock should have normal points.');
  }

  // 6b. Exactly at lock (2026-06-11T21:00:00Z)
  console.log('6b. Updating prediction exactly at lock...');
  await adminClient.from('matches').update({ status: 'scheduled' }).eq('id', 4);
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T21:00:00Z' });
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 1,
    predicted_away_score: 0
  }).eq('user_id', testUserId).eq('match_id', 4);

  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 1,
    away_score: 0,
    home_score_90: 1,
    away_score_90: 0
  }).eq('id', 4);
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  const { data: dbPred } = await adminClient.from('phase_predictions').select('*').eq('user_id', testUserId).eq('match_id', 4).single();
  const { data: dbMatch } = await adminClient.from('matches').select('*').eq('id', 4).single();
  console.log('DEBUG 6b - Prediction:', dbPred);
  console.log('DEBUG 6b - Match:', dbMatch);
  console.log('DEBUG 6b - JS Comparison:', new Date(dbPred.updated_at).getTime() >= new Date(dbMatch.lock_time_part2).getTime());

  const { data: boundaryExact } = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`Prediction updated exactly at lock points: ${boundaryExact?.points_earned} (Expected: 0)`);
  if (boundaryExact === null || boundaryExact.points_earned !== 0) {
    throw new Error('Test Case 6b Failed: Prediction updated exactly at lock should score 0.');
  }

  // 6c. 1 second after lock (2026-06-11T21:00:01Z)
  console.log('6c. Updating prediction 1 second after lock...');
  await adminClient.from('matches').update({ status: 'scheduled' }).eq('id', 4);
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T21:00:01Z' });
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 2,
    predicted_away_score: 2
  }).eq('user_id', testUserId).eq('match_id', 4);

  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 2,
    away_score: 2,
    home_score_90: 2,
    away_score_90: 2
  }).eq('id', 4);
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  const { data: boundaryLate } = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`Prediction updated 1s after lock points: ${boundaryLate?.points_earned} (Expected: 0)`);
  if (boundaryLate === null || boundaryLate.points_earned !== 0) {
    throw new Error('Test Case 6c Failed: Prediction updated 1s after lock should score 0.');
  }

  console.log('✅ Test Case 6 Passed!');

  // =====================================================================
  // TEST CASE 7: Timezone Bounds Verification
  // =====================================================================
  console.log('\n--- Running Test Case 7: Timezone Bounds Verification ---');
  // 7a. Offset GMT-5 (Colombia Time): 21:00:00Z is 16:00:00-05:00.
  // Let's set virtual date to 15:59:59-05:00 (1s before lock).
  console.log('7a. Testing timezone offset GMT-5 on-time...');
  await adminClient.from('matches').update({ status: 'scheduled' }).eq('id', 4);
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T15:59:59-05:00' });
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 2,
    predicted_away_score: 1
  }).eq('user_id', testUserId).eq('match_id', 4);

  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 2,
    away_score: 1,
    home_score_90: 2,
    away_score_90: 1
  }).eq('id', 4);
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  const { data: tzOnTime } = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`TZ GMT-5 (1s before) points: ${tzOnTime?.points_earned} (Expected: 6)`);
  if (!tzOnTime || tzOnTime.points_earned !== 6) {
    throw new Error('Test Case 7a Failed: Timezone offset on-time prediction should have normal points.');
  }

  // 7b. Exactly at lock GMT-5: 16:00:00-05:00
  console.log('7b. Testing timezone offset GMT-5 exactly at lock...');
  await adminClient.from('matches').update({ status: 'scheduled' }).eq('id', 4);
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T16:00:00-05:00' });
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 3,
    predicted_away_score: 0
  }).eq('user_id', testUserId).eq('match_id', 4);

  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 3,
    away_score: 0,
    home_score_90: 3,
    away_score_90: 0
  }).eq('id', 4);
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  const { data: tzExact } = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`TZ GMT-5 (exactly at lock) points: ${tzExact?.points_earned} (Expected: 0)`);
  if (tzExact === null || tzExact.points_earned !== 0) {
    throw new Error('Test Case 7b Failed: Timezone offset exact lock prediction should score 0.');
  }

  // 7c. Offset GMT+2 (CEST): 21:00:00Z is 23:00:00+02:00.
  // 1s after lock: 23:00:01+02:00
  console.log('7c. Testing timezone offset GMT+2 late...');
  await adminClient.from('matches').update({ status: 'scheduled' }).eq('id', 4);
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T23:00:01+02:00' });
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 1,
    predicted_away_score: 2
  }).eq('user_id', testUserId).eq('match_id', 4);

  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 1,
    away_score: 2,
    home_score_90: 1,
    away_score_90: 2
  }).eq('id', 4);
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  const { data: tzLate } = await adminClient.from('phase_predictions').select('points_earned').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`TZ GMT+2 (1s after) points: ${tzLate?.points_earned} (Expected: 0)`);
  if (tzLate === null || tzLate.points_earned !== 0) {
    throw new Error('Test Case 7c Failed: Timezone offset late prediction should score 0.');
  }

  console.log('✅ Test Case 7 Passed!');

  // =====================================================================
  // TEST CASE 8: Safety Verification (Other predictions not altered/destroyed)
  // =====================================================================
  console.log('\n--- Running Test Case 8: Safety Verification (No alterations) ---');
  // Set virtual date to early date
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-08T12:00:00Z' });

  // Insert a control prediction for controlUserId (on-time)
  const { error: ctrlInsErr } = await adminClient.from('phase_predictions').insert({
    user_id: controlUserId,
    pool_id: testPoolId,
    match_id: 4,
    predicted_home_score: 2,
    predicted_away_score: 1
  });
  if (ctrlInsErr) throw ctrlInsErr;

  // Set virtual date to late (after lock)
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-12T12:00:00Z' });

  // Now, testUserId updates their prediction LATE
  await adminClient.from('phase_predictions').update({
    predicted_home_score: 1,
    predicted_away_score: 1
  }).eq('user_id', testUserId).eq('match_id', 4);

  // Set match status to finished with score 2-1 (matching the on-time prediction!)
  await adminClient.from('matches').update({
    status: 'finished',
    home_score: 2,
    away_score: 1,
    home_score_90: 2,
    away_score_90: 1
  }).eq('id', 4);

  // Run recalculation
  await adminClient.rpc('compute_points', { p_match_id: 4 });

  // Check testUserId prediction (should be 0 points because they updated late)
  const { data: testPredScored } = await adminClient.from('phase_predictions').select('points_earned, predicted_home_score').eq('user_id', testUserId).eq('match_id', 4).single();
  console.log(`Late user points after update: ${testPredScored?.points_earned} (Expected: 0)`);
  if (testPredScored === null || testPredScored.points_earned !== 0) {
    throw new Error('Test Case 8 Failed: Main user prediction did not score 0 points after late update.');
  }

  // Check controlUserId prediction (should have 6 points because it was on-time and never updated late!)
  const { data: ctrlPredScored } = await adminClient.from('phase_predictions').select('points_earned, predicted_home_score').eq('user_id', controlUserId).eq('match_id', 4).single();
  console.log(`Control user points: ${ctrlPredScored?.points_earned} (Expected: 6)`);
  if (!ctrlPredScored || ctrlPredScored.points_earned !== 6) {
    throw new Error('Test Case 8 Failed: Control user prediction was modified or computed incorrectly.');
  }

  console.log('✅ Test Case 8 Passed!');

  console.log('\n🎉 ALL LATE PREDICTIONS INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  await doCleanup();
}

run().catch(async err => {
  console.error('\n❌ Test failed with error:', err.message);
  await doCleanup();
  process.exit(1);
});
