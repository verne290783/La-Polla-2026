import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  try {
    console.log('Querying pg_proc for get_app_time...');
    const { data: d1, error: e1 } = await supabase
      .from('pg_proc')
      .select('proname, prosrc')
      .eq('proname', 'get_app_time')
      .limit(1);

    if (e1) {
      console.log('Error get_app_time:', e1.message);
    } else {
      console.log('get_app_time definitions:', d1);
    }

    console.log('Querying pg_proc for compute_points...');
    const { data: d2, error: e2 } = await supabase
      .from('pg_proc')
      .select('proname, prosrc')
      .eq('proname', 'compute_points')
      .limit(1);

    if (e2) {
      console.log('Error compute_points:', e2.message);
    } else {
      console.log('compute_points definitions:', d2);
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

check();
