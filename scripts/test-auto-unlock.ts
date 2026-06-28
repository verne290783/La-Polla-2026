import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TEST_EMAIL = 'test-auto-unlock@example.com';
const TEST_PASSWORD = 'Password123!';

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
const userClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });

let testUserId: string | null = null;
let createdPoolId: string | null = null;
let originalSettingsFetched = false;
let originalVirtualDate: string | null = null;
let virtualDateModified = false;

let cleanupInProgress = false;
let cleanupDone = false;

async function doCleanup() {
  if (cleanupInProgress || cleanupDone) return;
  cleanupInProgress = true;
  console.log('\n[Cleanup] Cleaning up test resources...');

  try {
    // 1. Restore virtual_date if it was modified
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

    // 2. Clean up test predictions, profile, and user
    try {
      let idToDelete = testUserId;
      if (!idToDelete) {
        // Look up test user by email to ensure it's deleted even if setup was interrupted
        try {
          const { data: { users } } = await adminClient.auth.admin.listUsers();
          const existing = users.find(u => u.email === TEST_EMAIL);
          if (existing) {
            idToDelete = existing.id;
          }
        } catch (e) {
          // ignore
        }
      }

      if (idToDelete) {
        console.log(`[Cleanup] Deleting predictions for user: ${idToDelete}`);
        await adminClient.from('full_tournament_predictions').delete().eq('user_id', idToDelete);
        console.log(`[Cleanup] Deleting profile for user: ${idToDelete}`);
        await adminClient.from('profiles').delete().eq('id', idToDelete);
        console.log(`[Cleanup] Deleting user from auth: ${idToDelete}`);
        await adminClient.auth.admin.deleteUser(idToDelete);
      }
    } catch (err: any) {
      console.error('[Cleanup] Error deleting user predictions/profile/auth:', err.message);
    }

    // 3. Clean up pool
    try {
      if (createdPoolId) {
        console.log(`[Cleanup] Deleting temporary pool: ${createdPoolId}`);
        await adminClient.from('pools').delete().eq('id', createdPoolId);
      } else {
        try {
          await adminClient.from('pools').delete().eq('name', 'Test Auto-Unlock Pool');
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      console.error('[Cleanup] Error deleting temporary pool:', err.message);
    }

    console.log('[Cleanup] Cleanup finished successfully.');
  } catch (err: any) {
    console.error('[Cleanup] Unexpected error during cleanup:', err.message);
  } finally {
    cleanupInProgress = false;
    cleanupDone = true;
  }
}

function setupProcessHandlers() {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  signals.forEach(sig => {
    process.on(sig, async () => {
      console.log(`\n[Process] Received signal ${sig}. Cleaning up and exiting...`);
      await doCleanup();
      process.exit(128 + (sig === 'SIGINT' ? 2 : sig === 'SIGTERM' ? 15 : 1));
    });
  });

  process.on('uncaughtException', async (err) => {
    console.error('\n[Process] Uncaught Exception:', err);
    await doCleanup();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('\n[Process] Unhandled Rejection at:', promise, 'reason:', reason);
    await doCleanup();
    process.exit(1);
  });
}

setupProcessHandlers();

async function run() {
  console.log('--- STARTING AUTO-UNLOCK INTEGRATION TESTS ---');

  // Fetch original settings as the very first step
  console.log('Fetching original virtual_date setting...');
  const { data: originalSettings, error: fetchSettingsErr } = await adminClient
    .from('system_settings')
    .select('*')
    .eq('key', 'virtual_date')
    .maybeSingle();
  if (fetchSettingsErr) {
    console.error('Failed to fetch original virtual_date:', fetchSettingsErr.message);
  } else {
    originalSettingsFetched = true;
    originalVirtualDate = originalSettings ? originalSettings.value : null;
    console.log('Original virtual_date setting:', originalVirtualDate ? originalVirtualDate : 'None');
  }

  // 2. Setup Test User
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

  // Ensure user has a profile record
  const { data: profile } = await adminClient.from('profiles').select('*').eq('id', testUserId).maybeSingle();
  if (!profile) {
    await adminClient.from('profiles').insert({ id: testUserId, email: TEST_EMAIL, display_name: 'Test Auto-Unlock User', is_admin: false });
  }

  // 3. Login as User to get User Session (enforces RLS)
  const { data: sessionData, error: loginErr } = await userClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  if (loginErr) throw loginErr;
  console.log('Logged in as test user.');

  // 4. Setup Test Pool
  const { data: poolData } = await adminClient.from('pools').select('id').limit(1);
  let testPoolId = poolData && poolData.length > 0 ? poolData[0].id : null;
  if (!testPoolId) {
    console.log('No pool found. Creating a temporary pool for testing...');
    const { data: newPool, error: poolErr } = await adminClient.from('pools').insert({
      name: 'Test Auto-Unlock Pool',
      created_by: testUserId,
      invite_code: 'test-pool-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
    }).select('id').single();
    if (poolErr) throw poolErr;
    testPoolId = newPool.id;
    createdPoolId = newPool.id;
  }

  try {
    // --- SCENARIO 1: Pre-Tournament Phase (No Unlock needed, should succeed) ---
    console.log('\n[Scenario 1] Pre-Tournament (Time < 2026-06-11)...');
    await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-08T12:00:00Z' });
    virtualDateModified = true;


    await adminClient.from('profiles').update({ p1_unlocked_until: null }).eq('id', testUserId);

    // Delete any old predictions
    await adminClient.from('full_tournament_predictions').delete().eq('user_id', testUserId);

    const { error: insertErr1 } = await userClient.from('full_tournament_predictions').insert({
      user_id: testUserId,
      pool_id: testPoolId,
      prediction_key: 'M1',
      predicted_home_score: 2,
      predicted_away_score: 1,
      phase: 'group'
    });
    if (insertErr1) throw new Error(`Scenario 1 failed: Expected success but got error: ${insertErr1.message}`);
    console.log('✅ Scenario 1 Passed (Write allowed before tournament start)');

    // --- SCENARIO 2: Post-Tournament Phase (Locked, should fail) ---
    console.log('\n[Scenario 2] Post-Tournament Locked (Time > 2026-06-11, p1_unlocked_until = null)...');
    await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-12T12:00:00Z' });
    virtualDateModified = true;

    const { error: updateErr2 } = await userClient
      .from('full_tournament_predictions')
      .update({ predicted_home_score: 3 })
      .eq('user_id', testUserId)
      .eq('prediction_key', 'M1');
    
    // Check database to verify it was NOT updated
    const { data: checkData2 } = await adminClient.from('full_tournament_predictions').select('predicted_home_score').eq('user_id', testUserId).eq('prediction_key', 'M1').single();
    if (checkData2 && checkData2.predicted_home_score === 3) {
      throw new Error('Scenario 2 failed: User was able to write predictions past tournament start when locked.');
    }
    console.log('✅ Scenario 2 Passed (Write blocked past tournament start when locked)');

    // --- SCENARIO 3: Post-Tournament Phase (Unlocked, should succeed) ---
    console.log('\n[Scenario 3] Post-Tournament Unlocked (Time = 2026-06-12, unlocked_until = 2026-06-13)...');
    await adminClient.from('profiles').update({ p1_unlocked_until: '2026-06-13T12:00:00Z' }).eq('id', testUserId);

    const { error: updateErr3 } = await userClient
      .from('full_tournament_predictions')
      .update({ predicted_home_score: 4 })
      .eq('user_id', testUserId)
      .eq('prediction_key', 'M1');
    if (updateErr3) throw updateErr3;

    const { data: checkData3 } = await adminClient.from('full_tournament_predictions').select('predicted_home_score').eq('user_id', testUserId).eq('prediction_key', 'M1').single();
    if (!checkData3 || checkData3.predicted_home_score !== 4) {
      throw new Error('Scenario 3 failed: User was NOT able to write predictions past tournament start when unlocked.');
    }
    console.log('✅ Scenario 3 Passed (Write allowed when unlocked)');

    // --- SCENARIO 4: Post-Tournament Phase (Unlock Expired, should fail) ---
    console.log('\n[Scenario 4] Post-Tournament Expired (Time = 2026-06-14, unlocked_until = 2026-06-13)...');
    await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-14T12:00:00Z' });
    virtualDateModified = true;

    const { error: updateErr4 } = await userClient
      .from('full_tournament_predictions')
      .update({ predicted_home_score: 5 })
      .eq('user_id', testUserId)
      .eq('prediction_key', 'M1');

    const { data: checkData4 } = await adminClient.from('full_tournament_predictions').select('predicted_home_score').eq('user_id', testUserId).eq('prediction_key', 'M1').single();
    if (checkData4 && checkData4.predicted_home_score === 5) {
      throw new Error('Scenario 4 failed: User was able to write predictions after unlock expired.');
    }
    console.log('✅ Scenario 4 Passed (Write blocked when unlock expired)');

    console.log('\n🎉 ALL AUTO-UNLOCK TESTS PASSED SUCCESSFULLY! 🎉');
  } finally {
    await doCleanup();
  }
}

run().catch(async err => {
  console.error('❌ Test failed with error:', err.message);
  await doCleanup();
  process.exit(1);
});
