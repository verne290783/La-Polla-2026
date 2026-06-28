import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { calculateUserStats, calculateUserPart1Stats, calculateConsolidatedStats, Match } from '../src/lib/stats-helpers';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runTests() {
  console.log('=== STARTING STATISTICS MATHEMATICS VERIFICATION TESTS ===');

  let failed = false;

  // 1. Math Verification Unit Tests
  console.log('\n--- 1. Testing Part 2 calculateUserStats Mathematics ---');
  
  const mockMatchesP2: Match[] = [
    {
      id: 1,
      phase: 'group',
      home_team_id: 'ARG',
      away_team_id: 'FRA',
      home_score: 2,
      away_score: 1,
      home_score_90: null,
      away_score_90: null,
      winner_team_id: null,
      status: 'finished',
      match_date: '2026-06-15T18:00:00Z',
      lock_time_part2: '2026-06-15T18:00:00Z'
    },
    {
      id: 2,
      phase: 'group',
      home_team_id: 'BRA',
      away_team_id: 'GER',
      home_score: 1,
      away_score: 1,
      home_score_90: null,
      away_score_90: null,
      winner_team_id: null,
      status: 'finished',
      match_date: '2026-06-16T18:00:00Z',
      lock_time_part2: '2026-06-16T18:00:00Z'
    },
    {
      id: 3,
      phase: 'final',
      home_team_id: 'ARG',
      away_team_id: 'BRA',
      home_score: 3, // definitive score (e.g. 120m)
      away_score: 2,
      home_score_90: 2, // drew 2-2 at 90m
      away_score_90: 2,
      winner_team_id: 'ARG',
      status: 'finished',
      match_date: '2026-07-15T18:00:00Z',
      lock_time_part2: '2026-07-15T18:00:00Z'
    }
  ];

  const mockPredictionsP2 = [
    {
      match_id: 1,
      predicted_home_score: 2,
      predicted_away_score: 1,
      predicted_winner_team_id: null,
      points_earned: 3,
      user_id: 'u1',
      pool_id: 'p1'
    },
    {
      match_id: 2,
      predicted_home_score: 0,
      predicted_away_score: 0,
      predicted_winner_team_id: null,
      points_earned: 1,
      user_id: 'u1',
      pool_id: 'p1'
    },
    {
      match_id: 3,
      predicted_home_score: 2,
      predicted_away_score: 2,
      predicted_winner_team_id: 'ARG',
      points_earned: 6,
      user_id: 'u1',
      pool_id: 'p1'
    }
  ];

  const p2Stats = calculateUserStats(mockPredictionsP2, mockMatchesP2);

  // Assertions for P2
  // Match 1: real 2-1, pred 2-1 (exact match, winner goals matched: 2, loser goals matched: 1)
  // Match 2: real 1-1, pred 0-0 (draw match, winner goals matched: 1 === 1 (pred 0 !== real 1), loser goals matched: 1 === 1 (pred 0 !== real 1). Since realHome === realAway:
  //          WinnerGoalsMatched: realHome >= realAway && predHome === realHome -> 1 >= 1 && 0 === 1 -> false
  //          LoserGoalsMatched: realHome >= realAway && predAway === realAway -> 1 >= 1 && 0 === 1 -> false
  // Match 3: real 3-2 (after extra time because 90m was 2-2). Prediction was 2-2. realHome (3) >= realAway (2), winner ARG, pred winner ARG. Correct winner/draw!
  //          Winner goals matched: 3 >= 2 && predHome === realHome -> 2 === 3 -> false
  //          Loser goals matched: 3 >= 2 && predAway === realAway -> 2 === 2 -> true!
  // Exact = 1, Winner = 2 (Match 2 is winner/draw, Match 3 is winner/draw), Failed = 0
  // totalRealized = 3, effectiveness = (1+2)/3 = 100%
  // winnerGoalsMatched = 1 (Match 1) + 0 (Match 2) + 0 (Match 3) = 1
  // loserGoalsMatched = 1 (Match 1) + 0 (Match 2) + 1 (Match 3) = 2

  console.log(`- totalRealized: expected 3, got ${p2Stats.totalRealized}`);
  console.log(`- exactCount: expected 1, got ${p2Stats.exactCount}`);
  console.log(`- winnerCount: expected 2, got ${p2Stats.winnerCount}`);
  console.log(`- failedCount: expected 0, got ${p2Stats.failedCount}`);
  console.log(`- winnerGoalsMatched: expected 1, got ${p2Stats.winnerGoalsMatched}`);
  console.log(`- loserGoalsMatched: expected 2, got ${p2Stats.loserGoalsMatched}`);
  console.log(`- effectiveness: expected 100, got ${p2Stats.effectiveness}`);

  if (
    p2Stats.totalRealized !== 3 ||
    p2Stats.exactCount !== 1 ||
    p2Stats.winnerCount !== 2 ||
    p2Stats.failedCount !== 0 ||
    p2Stats.winnerGoalsMatched !== 1 ||
    p2Stats.loserGoalsMatched !== 2 ||
    p2Stats.effectiveness !== 100
  ) {
    console.error('❌ Part 2 Stats math assertion failed!');
    failed = true;
  } else {
    console.log('✅ Part 2 Stats math checks passed.');
  }


  console.log('\n--- 2. Testing Part 1 calculateUserPart1Stats Mathematics ---');

  // Match 73 is R32, should map to P1_R32_M73
  // Match 1 is group, should map to G_1
  // Match 98 is QF, should map to P1_QF_M98
  const mockMatchesP1: Match[] = [
    {
      id: 1,
      phase: 'group',
      home_team_id: 'ARG',
      away_team_id: 'FRA',
      home_score: 2,
      away_score: 1,
      home_score_90: null,
      away_score_90: null,
      winner_team_id: null,
      status: 'finished',
      match_date: '2026-06-15T18:00:00Z',
      lock_time_part2: '2026-06-15T18:00:00Z'
    },
    {
      id: 73,
      phase: 'r32',
      home_team_id: 'BRA',
      away_team_id: 'GER',
      home_score: 2,
      away_score: 0,
      home_score_90: null,
      away_score_90: null,
      winner_team_id: 'BRA',
      status: 'finished',
      match_date: '2026-06-30T18:00:00Z',
      lock_time_part2: '2026-06-30T18:00:00Z'
    },
    {
      id: 97,
      phase: 'qf',
      home_team_id: 'USA',
      away_team_id: 'ENG',
      home_score: 1,
      away_score: 1,
      home_score_90: 1,
      away_score_90: 1,
      winner_team_id: 'USA',
      status: 'finished',
      match_date: '2026-07-05T18:00:00Z',
      lock_time_part2: '2026-07-05T18:00:00Z'
    }
  ];

  const mockPredictionsP1 = [
    // Match 1: Exact match, unswapped teams.
    {
      prediction_key: 'G_1',
      predicted_home_team_id: 'ARG',
      predicted_away_team_id: 'FRA',
      predicted_home_score: 2,
      predicted_away_score: 1,
      predicted_winner_team_id: null,
      points_earned: 3,
      user_id: 'u1',
      pool_id: 'p1'
    },
    // Match 73: Swapped teams prediction (predicted GER 0 vs BRA 2).
    // Swapped means: predHome corresponds to actual away (GER), predAway corresponds to actual home (BRA).
    // So user predicted: GER (home in prediction) vs BRA (away in prediction) => score 0 - 2.
    // Aligned predicted score: actual home (BRA) gets predAway (2). actual away (GER) gets predHome (0).
    // Aligned predicted score: BRA 2 - GER 0. Actual score is BRA 2 - GER 0.
    // Result: Exact match!
    {
      prediction_key: 'P1_R32_M73',
      predicted_home_team_id: 'GER',
      predicted_away_team_id: 'BRA',
      predicted_home_score: 0,
      predicted_away_score: 2,
      predicted_winner_team_id: 'BRA',
      points_earned: 3,
      user_id: 'u1',
      pool_id: 'p1'
    },
    // Match 97: Mismatched teams prediction (predicted ITA vs ESP, but actual was USA vs ENG).
    // Result: Failed.
    {
      prediction_key: 'P1_QF_M97',
      predicted_home_team_id: 'ITA',
      predicted_away_team_id: 'ESP',
      predicted_home_score: 3,
      predicted_away_score: 1,
      predicted_winner_team_id: 'ITA',
      points_earned: 0,
      user_id: 'u1',
      pool_id: 'p1'
    }
  ];

  const p1Stats = calculateUserPart1Stats(mockPredictionsP1, mockMatchesP1);

  // Assertions for P1
  // Match 1: Exact = true. Winner goals matched: 2. Loser goals matched: 1.
  // Match 73: Exact = true. Winner goals matched: 2 (BRA). Loser goals matched: 0 (GER).
  // Match 97: Failed = true. Winner goals matched: 0. Loser goals matched: 0.
  // totalRealized = 3. exactCount = 2. winnerCount = 0. failedCount = 1.
  // winnerGoalsMatched = 1 (Match 1) + 1 (Match 73) = 2
  // loserGoalsMatched = 1 (Match 1) + 1 (Match 73) = 2
  // effectiveness = (2+0)/3 = 67%

  console.log(`- totalRealized: expected 3, got ${p1Stats.totalRealized}`);
  console.log(`- exactCount: expected 2, got ${p1Stats.exactCount}`);
  console.log(`- winnerCount: expected 0, got ${p1Stats.winnerCount}`);
  console.log(`- failedCount: expected 1, got ${p1Stats.failedCount}`);
  console.log(`- winnerGoalsMatched: expected 2, got ${p1Stats.winnerGoalsMatched}`);
  console.log(`- loserGoalsMatched: expected 2, got ${p1Stats.loserGoalsMatched}`);
  console.log(`- effectiveness: expected 67, got ${p1Stats.effectiveness}`);

  if (
    p1Stats.totalRealized !== 3 ||
    p1Stats.exactCount !== 2 ||
    p1Stats.winnerCount !== 0 ||
    p1Stats.failedCount !== 1 ||
    p1Stats.winnerGoalsMatched !== 2 ||
    p1Stats.loserGoalsMatched !== 2 ||
    p1Stats.effectiveness !== 67
  ) {
    console.error('❌ Part 1 Stats math assertion failed!');
    failed = true;
  } else {
    console.log('✅ Part 1 Stats math checks passed.');
  }

  // 3. Consolidated Stats checks
  console.log('\n--- 3. Testing calculateConsolidatedStats ---');
  const consolidated = calculateConsolidatedStats(p1Stats, p2Stats);
  
  console.log(`- totalRealized: expected 6, got ${consolidated.totalRealized}`);
  console.log(`- exactCount: expected 3, got ${consolidated.exactCount}`);
  console.log(`- winnerCount: expected 2, got ${consolidated.winnerCount}`);
  console.log(`- failedCount: expected 1, got ${consolidated.failedCount}`);
  console.log(`- winnerGoalsMatched: expected 3, got ${consolidated.winnerGoalsMatched}`);
  console.log(`- loserGoalsMatched: expected 4, got ${consolidated.loserGoalsMatched}`);
  console.log(`- effectiveness: expected 83, got ${consolidated.effectiveness}`);

  if (
    consolidated.totalRealized !== 6 ||
    consolidated.exactCount !== 3 ||
    consolidated.winnerCount !== 2 ||
    consolidated.failedCount !== 1 ||
    consolidated.winnerGoalsMatched !== 3 ||
    consolidated.loserGoalsMatched !== 4 ||
    consolidated.effectiveness !== 83
  ) {
    console.error('❌ Consolidated Stats math assertion failed!');
    failed = true;
  } else {
    console.log('✅ Consolidated Stats math checks passed.');
  }


  // 4. Supabase Integration & Cleanup
  console.log('\n--- 4. Testing Supabase Database Integration & Cleanup ---');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const testPoolId = '00000000-0000-0000-0000-000000000088';

  try {
    // Find an existing profile
    const { data: firstProfile, error: profQueryError } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
    if (profQueryError || !firstProfile) {
      throw new Error('Could not find any existing user profile to use for integration test');
    }
    const resolvedUserId = firstProfile.id;
    console.log(`Using existing user profile ID: ${resolvedUserId}`);

    // Insert pool
    const { error: poolError } = await supabase.from('pools').insert({
      id: testPoolId,
      name: 'Test Stats Math Pool',
      invite_code: 'TESTMATHPOOL'
    });
    if (poolError) throw poolError;
    console.log('Inserted test pool.');

    // Insert pool member
    const { error: memError } = await supabase.from('pool_members').insert({
      pool_id: testPoolId,
      user_id: resolvedUserId,
      part1_points: 0,
      part2_points: 0,
      total_points: 0
    });
    if (memError) throw memError;
    console.log('Inserted test pool member.');

    // Let's insert a mock Part 1 prediction
    const { error: p1Error } = await supabase.from('full_tournament_predictions').insert({
      user_id: resolvedUserId,
      pool_id: testPoolId,
      prediction_key: 'G_1',
      predicted_home_team_id: 'ARG',
      predicted_away_team_id: 'FRA',
      predicted_home_score: 2,
      predicted_away_score: 1,
      predicted_winner_team_id: null,
      phase: 'group',
      points_earned: 3
    });
    if (p1Error) throw p1Error;
    console.log('Inserted test Part 1 prediction.');

    // Query and verify it exists
    const { data: dbP1Preds, error: queryError } = await supabase
      .from('full_tournament_predictions')
      .select('*')
      .eq('user_id', resolvedUserId)
      .eq('pool_id', testPoolId);
    
    if (queryError) throw queryError;
    if (!dbP1Preds || dbP1Preds.length !== 1) {
      throw new Error(`Expected 1 Part 1 prediction in DB, got ${dbP1Preds?.length}`);
    }
    console.log('Successfully queried test prediction from DB.');

  } catch (err: any) {
    console.error('❌ Supabase Integration Test error:', err.message || err);
    failed = true;
  } finally {
    console.log('Cleaning up database...');
    // Cleanup pool_members
    await supabase.from('pool_members').delete().eq('pool_id', testPoolId);
    // Cleanup predictions
    await supabase.from('full_tournament_predictions').delete().eq('pool_id', testPoolId);
    // Cleanup pool
    await supabase.from('pools').delete().eq('id', testPoolId);
    console.log('Database cleanup completed.');
  }

  if (failed) {
    console.log('\n❌ Verification Failed!');
    process.exit(1);
  } else {
    console.log('\n🎉 All Statistics Mathematics Verification Tests Passed Successfully!');
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal Test Run Error:', err);
  process.exit(1);
});
