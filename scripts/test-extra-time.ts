import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Starting extra time scoring integration test...');

  // 1. Fetch a pool and two members
  const { data: pools, error: poolsError } = await supabase
    .from('pools')
    .select('id');
  
  if (poolsError || !pools || pools.length === 0) {
    throw new Error('No pools found in the database.');
  }

  let poolId = '';
  let userIdA = '';
  let userIdB = '';

  for (const pool of pools) {
    const { data: members } = await supabase
      .from('pool_members')
      .select('user_id')
      .eq('pool_id', pool.id)
      .limit(2);
    
    if (members && members.length >= 2) {
      poolId = pool.id;
      userIdA = members[0].user_id;
      userIdB = members[1].user_id;
      break;
    }
  }

  if (!poolId) {
    throw new Error('Could not find a pool with at least 2 members. Please seed or create a pool first.');
  }

  console.log(`Found Pool ID: ${poolId}`);
  console.log(`User A ID: ${userIdA}`);
  console.log(`User B ID: ${userIdB}`);

  // 2. Fetch two valid team IDs
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('id')
    .limit(2);
  
  if (teamsError || !teams || teams.length < 2) {
    throw new Error('Need at least 2 teams in the DB.');
  }

  const teamHome = teams[0].id;
  const teamAway = teams[1].id;
  console.log(`Using Team Home: ${teamHome}, Team Away: ${teamAway}`);

  const mockMatchId = 999;

  try {
    // 3. Insert mock knockout match
    const mockMatch = {
      id: mockMatchId,
      phase: 'r32', // Knockout phase
      home_team_id: teamHome,
      away_team_id: teamAway,
      home_score_90: 1,
      away_score_90: 1,
      home_score: 2,
      away_score: 1,
      winner_team_id: teamHome,
      status: 'finished',
      match_date: new Date().toISOString(),
      lock_time_part2: new Date().toISOString()
    };

    console.log('Inserting mock match...');
    const { error: matchInsertError } = await supabase.from('matches').insert(mockMatch);
    if (matchInsertError) throw matchInsertError;

    // 4. Insert mock predictions
    const predA = {
      user_id: userIdA,
      pool_id: poolId,
      match_id: mockMatchId,
      predicted_home_score: 2,
      predicted_away_score: 1,
      predicted_winner_team_id: teamHome
    };

    const predB = {
      user_id: userIdB,
      pool_id: poolId,
      match_id: mockMatchId,
      predicted_home_score: 1,
      predicted_away_score: 1,
      predicted_winner_team_id: teamHome
    };

    console.log('Inserting mock predictions...');
    const { error: predInsertError } = await supabase.from('phase_predictions').insert([predA, predB]);
    if (predInsertError) throw predInsertError;

    // 5. Call compute_points function
    console.log('Calling compute_points RPC...');
    const { error: rpcError } = await supabase.rpc('compute_points', { p_match_id: mockMatchId });
    if (rpcError) throw rpcError;

    // 6. Retrieve predictions and verify results
    console.log('Verifying points...');
    const { data: results, error: resError } = await supabase
      .from('phase_predictions')
      .select('user_id, points_earned')
      .eq('match_id', mockMatchId);
    
    if (resError || !results) throw resError || new Error('No results returned');

    const resultA = results.find(r => r.user_id === userIdA);
    const resultB = results.find(r => r.user_id === userIdB);

    console.log(`User A points earned: ${resultA?.points_earned} (Expected: 6)`);
    console.log(`User B points earned: ${resultB?.points_earned} (Expected: 3)`);

    if (resultA?.points_earned !== 6) {
      throw new Error(`User A should get 6 points, got: ${resultA?.points_earned}`);
    }
    if (resultB?.points_earned !== 3) {
      throw new Error(`User B should get 3 points, got: ${resultB?.points_earned}`);
    }

    console.log('✅ INTEGRATION TEST PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ Test failed:', err.message || err);
    process.exit(1);
  } finally {
    console.log('Cleaning up mock data...');
    try {
      await supabase.from('phase_predictions').delete().eq('match_id', mockMatchId);
      await supabase.from('matches').delete().eq('id', mockMatchId);
      console.log('Cleanup complete.');
    } catch (cleanupErr: any) {
      console.error('Failed to cleanup:', cleanupErr.message);
    }
  }
}

run();
