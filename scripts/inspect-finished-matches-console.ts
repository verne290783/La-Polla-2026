import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Querying matches...');
  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, phase, home_team_id, away_team_id, status, external_match_id, match_date')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  const finished = matches.filter(m => m.status === 'finished');
  console.log(`Total finished matches: ${finished.length}`);
  console.log('Finished matches list (sample of last 10):');
  console.log(JSON.stringify(finished.slice(-10), null, 2));

  const r32 = matches.filter(m => m.phase === 'r32');
  console.log('\nRound of 32 Matches in DB:');
  console.log(JSON.stringify(r32, null, 2));
}

run();
