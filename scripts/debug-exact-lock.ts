import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function run() {
  console.log('--- DEBUGGING EXACT LOCK ---');
  
  // Get match 4 details
  const { data: match } = await adminClient.from('matches').select('*').eq('id', 4).single();
  console.log('Match 4:', {
    id: match.id,
    lock_time_part2: match.lock_time_part2,
    status: match.status
  });

  // Set match status to scheduled
  await adminClient.from('matches').update({ status: 'scheduled', lock_time_part2: '2026-06-11T21:00:00Z' }).eq('id', 4);
  
  // Set virtual date to exactly 2026-06-11T21:00:00Z
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-11T21:00:00Z' });

  // Let's get the list of users to find our test user or just query phase_predictions
  const { data: preds } = await adminClient.from('phase_predictions').select('*').eq('match_id', 4).limit(5);
  console.log('Existing predictions for match 4 (sample):', preds.map(p => ({
    user_id: p.user_id,
    updated_at: p.updated_at,
    predicted_home_score: p.predicted_home_score,
    predicted_away_score: p.predicted_away_score,
    points_earned: p.points_earned
  })));

  if (preds.length > 0) {
    const p = preds[0];
    
    // Perform update on this prediction
    const newHome = p.predicted_home_score === 1 ? 2 : 1;
    const newAway = 0;
    console.log(`Updating user ${p.user_id} prediction to ${newHome}-${newAway}...`);
    
    const { data: updateRes, error: updateErr } = await adminClient.from('phase_predictions').update({
      predicted_home_score: newHome,
      predicted_away_score: newAway
    }).eq('user_id', p.user_id).eq('match_id', 4).select();
    
    console.log('Update result:', updateRes, 'Error:', updateErr);
    
    // Now let's query the prediction's updated_at from the database directly
    const { data: predAfterUpdate } = await adminClient.from('phase_predictions').select('*').eq('user_id', p.user_id).eq('match_id', 4).single();
    console.log('Prediction after update:', {
      user_id: predAfterUpdate.user_id,
      updated_at: predAfterUpdate.updated_at,
      predicted_home_score: predAfterUpdate.predicted_home_score,
      predicted_away_score: predAfterUpdate.predicted_away_score
    });

    // Let's see what get_app_time() returns in the DB
    const { data: appTimeRes } = await adminClient.rpc('get_app_time');
    console.log('get_app_time() returns:', appTimeRes);

    // Let's test the comparison in Postgres
    // Select if updated_at >= lock_time_part2
    const { data: compRes } = await adminClient.rpc('execute_sql', {
      query: `SELECT '${predAfterUpdate.updated_at}'::timestamptz >= '2026-06-11T21:00:00Z'::timestamptz AS result;`
    });
    console.log('Compare updated_at >= lock_time_part2 in DB:', compRes);
  }
}

run().catch(console.error);
