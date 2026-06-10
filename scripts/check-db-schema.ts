import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  try {
    console.log('Checking full_tournament_predictions for pool_id...');
    const { data: d1, error: e1 } = await supabase.from('full_tournament_predictions').select('pool_id').limit(1);
    if (e1) {
      console.log('Error full_tournament_predictions:', e1.message);
    } else {
      console.log('full_tournament_predictions has pool_id!');
    }

    console.log('Checking champion_predictions for pool_id...');
    const { data: d2, error: e2 } = await supabase.from('champion_predictions').select('pool_id').limit(1);
    if (e2) {
      console.log('Error champion_predictions:', e2.message);
    } else {
      console.log('champion_predictions has pool_id!');
    }

    console.log('Checking pool_members for part1_points...');
    const { data: d3, error: e3 } = await supabase.from('pool_members').select('part1_points, part2_points, total_points').limit(1);
    if (e3) {
      console.log('Error pool_members:', e3.message);
    } else {
      console.log('pool_members has points columns!');
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

check();
