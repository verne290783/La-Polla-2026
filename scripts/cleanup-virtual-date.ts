import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clean() {
  try {
    console.log('Deleting virtual_date from system_settings...');
    const { data, error } = await supabase
      .from('system_settings')
      .delete()
      .eq('key', 'virtual_date');

    if (error) {
      console.log('Error deleting virtual_date:', error.message);
    } else {
      console.log('Deleted virtual_date successfully!');
    }

    console.log('Verifying get_app_time RPC...');
    const { data: time, error: timeError } = await supabase.rpc('get_app_time');
    if (timeError) {
      console.log('Error get_app_time RPC:', timeError.message);
    } else {
      console.log('get_app_time RPC result now:', time);
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

clean();
