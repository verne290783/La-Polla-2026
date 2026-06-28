import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const userId = 'ffdedc37-7f89-4e36-8bee-45db93e17a1a';
  
  // 1. Fetch matches
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('id', { ascending: true });

  // 2. Fetch Guillermo's full tournament predictions
  const { data: preds, error } = await supabase
    .from('full_tournament_predictions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error(error);
    return;
  }

  console.log('--- Guillermo Full Tournament Predictions ---');
  for (const pred of preds || []) {
    const isGroup = pred.prediction_key.startsWith('G_');
    if (isGroup) {
      const matchId = parseInt(pred.prediction_key.replace('G_', ''));
      const m = matches?.find(x => x.id === matchId);
      console.log(`Match #${matchId} | Phase: ${m?.phase} | Teams: ${m?.home_team_id} vs ${m?.away_team_id} | Status: ${m?.status} | Scores: ${m?.home_score}-${m?.away_score} | Pred: ${pred.predicted_home_team_id} (${pred.predicted_home_score}) vs ${pred.predicted_away_team_id} (${pred.predicted_away_score}) | Points: ${pred.points_earned}`);
    } else {
      console.log(`Key: ${pred.prediction_key} | Pred: ${pred.predicted_home_team_id} (${pred.predicted_home_score}) vs ${pred.predicted_away_team_id} (${pred.predicted_away_score}) | Points: ${pred.points_earned}`);
    }
  }
}
run();
