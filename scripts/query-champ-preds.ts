import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: champPreds, error } = await supabase
    .from('champion_predictions')
    .select('user_id, pool_id, points_earned');

  if (error) {
    console.error('Error fetching champion predictions:', error);
    return;
  }

  console.log('--- CHAMPION PREDICTIONS ---');
  console.log(`Count: ${champPreds?.length}`);
  for (const pred of champPreds || []) {
    console.log(`User ID: ${pred.user_id} | Pool ID: ${pred.pool_id} | Points: ${pred.points_earned}`);
  }
}

run();
