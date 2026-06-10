import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  try {
    console.log('Calling RPC get_app_time...');
    const { data, error } = await supabase.rpc('get_app_time');
    if (error) {
      console.log('Error get_app_time RPC:', error.message);
    } else {
      console.log('get_app_time RPC result:', data);
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

check();
