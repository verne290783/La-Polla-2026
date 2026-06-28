import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: keys, error } = await supabase.from('full_tournament_predictions').select('prediction_key');
  if (error) {
    console.error(error);
    return;
  }
  const uniqueKeys = new Set(keys.map(k => k.prediction_key));
  console.log('Unique prediction keys in full_tournament_predictions:', Array.from(uniqueKeys).sort());
  console.log('Total predictions:', keys.length);

  const { data: champKeys } = await supabase.from('champion_predictions').select('*');
  console.log('Champion predictions count:', champKeys?.length);
}
run();
