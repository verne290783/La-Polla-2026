import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const keys = ['P1_QF_M98', 'P1_QF_M99', 'P1_SF_M101', 'P1_SF_M102'];
  const { data, error } = await supabase
    .from('full_tournament_predictions')
    .select('user_id, pool_id, prediction_key, created_at, updated_at, predicted_home_team_id, predicted_away_team_id, predicted_home_score, predicted_away_score, predicted_winner_team_id')
    .in('prediction_key', keys)
    .order('user_id', { ascending: true })
    .order('prediction_key', { ascending: true });

  if (error) {
    console.error('Error fetching predictions:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
