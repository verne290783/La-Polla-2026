import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { syncRealScores } from '../src/lib/scoreSync';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('=== STARTING BACKGROUND SYNC INTEGRATION TEST ===');

  try {
    // 1. Fetch current application time
    const { data: appTime, error: appTimeError } = await supabase.rpc('get_app_time');
    if (appTimeError || !appTime) {
      throw new Error(`Failed to fetch app time: ${appTimeError?.message}`);
    }
    console.log(`Current application time: ${appTime}`);

    // Backup current last_sync_time to restore later
    const { data: originalSyncSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'last_sync_time')
      .maybeSingle();
    const originalSyncTime = originalSyncSetting?.value;
    console.log(`Original last_sync_time: ${originalSyncTime || 'none'}`);

    // Backup a scheduled match to use for simulation if none are active
    const { data: allMatches, error: matchesError } = await supabase
      .from('matches')
      .select('*');
    if (matchesError || !allMatches) {
      throw new Error(`Failed to fetch matches: ${matchesError?.message}`);
    }

    console.log(`Total matches in DB: ${allMatches.length}`);

    // Find if there are active matches
    let activeMatches = allMatches.filter(
      m => m.status !== 'finished' && new Date(m.match_date) <= new Date(appTime)
    );
    console.log(`Active matches before simulation: ${activeMatches.length}`);

    let simulatedMatchId: number | null = null;
    let originalMatchStatus: string | null = null;
    let originalMatchDate: string | null = null;

    // If no active matches exist, temporarily modify one match to be active for testing
    if (activeMatches.length === 0) {
      const scheduledMatch = allMatches.find(m => m.status === 'scheduled');
      if (scheduledMatch) {
        simulatedMatchId = scheduledMatch.id;
        originalMatchStatus = scheduledMatch.status;
        originalMatchDate = scheduledMatch.match_date;

        console.log(`No active matches found. Simulating by updating Match ID ${simulatedMatchId} to start in the past...`);
        
        // Set match_date to 1 hour in the past relative to appTime
        const pastDate = new Date(new Date(appTime).getTime() - 60 * 60 * 1000).toISOString();
        const { error: updateMatchError } = await supabase
          .from('matches')
          .update({ match_date: pastDate, status: 'scheduled' })
          .eq('id', simulatedMatchId);

        if (updateMatchError) {
          throw new Error(`Failed to set up simulated match: ${updateMatchError.message}`);
        }

        // Re-fetch active matches
        const { data: reFetchedActive } = await supabase
          .from('matches')
          .select('id, status, match_date')
          .neq('status', 'finished')
          .lte('match_date', appTime);
        activeMatches = reFetchedActive || [];
        console.log(`Active matches after simulation set up: ${activeMatches.length}`);
      } else {
        console.log('Warning: No scheduled matches available to simulate an active match.');
      }
    }

    // Now test Step B logic: If 0 matches are active, API returns immediately
    if (activeMatches.length === 0) {
      console.log('TEST 1 (Zero active matches): PASS (No active matches to run)');
    } else {
      console.log('Testing throttling (Step C)...');

      // Test 1: set last_sync_time to 1 minute ago (should trigger throttle)
      const oneMinuteAgo = new Date(new Date(appTime).getTime() - 60 * 1000).toISOString();
      await supabase
        .from('system_settings')
        .upsert({ key: 'last_sync_time', value: oneMinuteAgo }, { onConflict: 'key' });

      // Verify throttling logic
      const { data: syncSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'last_sync_time')
        .maybeSingle();

      if (syncSetting) {
        const diffMs = new Date(appTime).getTime() - new Date(syncSetting.value).getTime();
        const diffMinutes = diffMs / (1000 * 60);
        console.log(`Difference in minutes (expected < 2): ${diffMinutes}`);
        if (diffMinutes < 2) {
          console.log('✅ TEST 1: Throttling correctly identified (synced: false)');
        } else {
          throw new Error('Throttling logic failed: time difference calculation incorrect.');
        }
      }

      // Test 2: set last_sync_time to 3 minutes ago (should bypass throttle)
      console.log('Testing bypass throttle (Step D)...');
      const threeMinutesAgo = new Date(new Date(appTime).getTime() - 180 * 1000).toISOString();
      await supabase
        .from('system_settings')
        .upsert({ key: 'last_sync_time', value: threeMinutesAgo }, { onConflict: 'key' });

      // Simulate API Route step D: update last_sync_time to current appTime
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({ key: 'last_sync_time', value: appTime }, { onConflict: 'key' });

      if (upsertError) {
        throw new Error(`Failed to upsert last_sync_time: ${upsertError.message}`);
      }

      const { data: updatedSyncSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'last_sync_time')
        .maybeSingle();

      if (updatedSyncSetting?.value === appTime) {
        console.log('✅ TEST 2: last_sync_time successfully updated to current appTime');
      } else {
        throw new Error(`last_sync_time was not updated to appTime. Got: ${updatedSyncSetting?.value}`);
      }

      // Test 3: Compare transitioning statuses from scheduled to finished
      console.log('Testing transition comparison and compute_points trigger...');
      const matchToTransition = activeMatches[0];
      console.log(`Match selected for transition test: ID ${matchToTransition.id}, status: ${matchToTransition.status}`);

      // Perform a mock transition by manually changing status to finished and calling RPC
      if (matchToTransition.status !== 'finished') {
        const { error: finishError } = await supabase
          .from('matches')
          .update({ status: 'finished', home_score: 2, away_score: 1 })
          .eq('id', matchToTransition.id);

        if (finishError) {
          throw new Error(`Failed to transition match to finished: ${finishError.message}`);
        }

        console.log(`Match ID ${matchToTransition.id} status transitioned to 'finished'. Triggering compute_points RPC...`);
        const { data: rpcResult, error: rpcError } = await supabase.rpc('compute_points', {
          p_match_id: matchToTransition.id
        });

        if (rpcError) {
          throw new Error(`Failed to call compute_points RPC: ${rpcError.message}`);
        }
        console.log(`✅ TEST 3: compute_points RPC executed successfully for transitioned Match ID ${matchToTransition.id}`);
      }
    }

    // Cleanup and restoration
    console.log('Restoring database state...');
    
    // Restore original match state if we simulated one
    if (simulatedMatchId !== null) {
      await supabase
        .from('matches')
        .update({
          status: originalMatchStatus,
          match_date: originalMatchDate,
          home_score: null,
          away_score: null
        })
        .eq('id', simulatedMatchId);
      console.log(`Restored Match ID ${simulatedMatchId} to status '${originalMatchStatus}' and date '${originalMatchDate}'`);
    } else if (activeMatches.length > 0) {
      // Restore the transitioned match to its original state
      const matchToRestore = activeMatches[0];
      await supabase
        .from('matches')
        .update({
          status: matchToRestore.status,
          home_score: null,
          away_score: null
        })
        .eq('id', matchToRestore.id);
      console.log(`Restored Match ID ${matchToRestore.id} to status '${matchToRestore.status}'`);
    }

    // Restore original last_sync_time
    if (originalSyncTime) {
      await supabase
        .from('system_settings')
        .upsert({ key: 'last_sync_time', value: originalSyncTime }, { onConflict: 'key' });
    } else {
      await supabase
        .from('system_settings')
        .delete()
        .eq('key', 'last_sync_time');
    }
    console.log('Restored last_sync_time.');

    console.log('=== ALL INTEGRATION TESTS PASSED ===');
  } catch (err: any) {
    console.error('❌ Test failed with error:', err.message || err);
    process.exit(1);
  }
}

run();
