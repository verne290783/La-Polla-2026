import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('=== STARTING INDEPENDENT OVERRIDE SYNC TEST ===');
  
  // 1. Fetch current status of Match 104 (Final)
  const matchId = 104;
  console.log(`Step 1: Fetching current state of match ${matchId}...`);
  const { data: initialMatch, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single();
  
  if (fetchError || !initialMatch) {
    console.error('Failed to fetch initial match state:', fetchError?.message);
    process.exit(1);
  }
  
  console.log(`Initial Match ${matchId} state:`, {
    home_score: initialMatch.home_score,
    away_score: initialMatch.away_score,
    status: initialMatch.status,
    is_manual_override: initialMatch.is_manual_override
  });

  try {
    // 2. Simulate Admin manual score update: set is_manual_override = true, home_score = 9, away_score = 9
    console.log('\nStep 2: Simulating manual score update (setting score to 9-9 and is_manual_override = true)...');
    const { error: updateError } = await supabase
      .from('matches')
      .update({
        home_score: 9,
        away_score: 9,
        status: 'finished',
        is_manual_override: true
      })
      .eq('id', matchId);
    
    if (updateError) {
      throw new Error(`Failed to update match: ${updateError.message}`);
    }

    // Verify it was written to DB
    const { data: updatedMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    console.log('Updated Match state in DB:', {
      home_score: updatedMatch?.home_score,
      away_score: updatedMatch?.away_score,
      status: updatedMatch?.status,
      is_manual_override: updatedMatch?.is_manual_override
    });

    if (!updatedMatch || updatedMatch.home_score !== 9 || updatedMatch.away_score !== 9 || updatedMatch.is_manual_override !== true) {
      throw new Error('Verification of manual update failed: values not expected.');
    }
    console.log('✅ Manual update verified in DB.');

    // 3. Trigger score sync
    console.log('\nStep 3: Triggering API score synchronization...');
    const { syncRealScores } = await import('../src/lib/scoreSync');
    const syncRes = await syncRealScores();
    console.log('Sync Result:', JSON.stringify(syncRes, null, 2));

    // 4. Retrieve match 104 from DB and assert that its scores are still 9-9
    console.log(`\nStep 4: Fetching match ${matchId} post-sync to verify it was skipped...`);
    const { data: postSyncMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    console.log('Post-Sync Match state in DB:', {
      home_score: postSyncMatch?.home_score,
      away_score: postSyncMatch?.away_score,
      status: postSyncMatch?.status,
      is_manual_override: postSyncMatch?.is_manual_override
    });

    if (!postSyncMatch || postSyncMatch.home_score !== 9 || postSyncMatch.away_score !== 9) {
      throw new Error('❌ TEST FAILED: Manual override was bypassed/overwritten by the sync process!');
    }
    console.log('✅ TEST PASSED: Match score was NOT overwritten by API sync.');

    // 5. Simulate Admin clearing the manual override checkbox
    console.log('\nStep 5: Simulating admin clearing manual override (setting is_manual_override = false)...');
    const { error: clearError } = await supabase
      .from('matches')
      .update({
        is_manual_override: false
      })
      .eq('id', matchId);

    if (clearError) {
      throw new Error(`Failed to clear override flag: ${clearError.message}`);
    }

    // Verify in DB
    const { data: clearedMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();
    
    console.log('Cleared Match state in DB:', {
      home_score: clearedMatch?.home_score,
      away_score: clearedMatch?.away_score,
      status: clearedMatch?.status,
      is_manual_override: clearedMatch?.is_manual_override
    });

    if (!clearedMatch || clearedMatch.is_manual_override !== false) {
      throw new Error('Verification of clearing override flag failed.');
    }
    console.log('✅ Clearing override verified in DB.');

  } finally {
    // Restore match 104 to initial values
    console.log(`\nRestoring match ${matchId} to its initial state...`);
    const { error: restoreError } = await supabase
      .from('matches')
      .update({
        home_score: initialMatch.home_score,
        away_score: initialMatch.away_score,
        status: initialMatch.status,
        is_manual_override: initialMatch.is_manual_override
      })
      .eq('id', matchId);
    
    if (restoreError) {
      console.error('Failed to restore match to initial state:', restoreError.message);
    } else {
      console.log('✅ Match restored successfully.');
    }
    console.log('=== OVERRIDE SYNC TEST COMPLETE ===');
  }
}

run();
