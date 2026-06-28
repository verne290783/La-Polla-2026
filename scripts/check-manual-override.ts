import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  try {
    console.log('Querying public.matches columns...');
    const { data, error } = await supabase.from('matches').select('*').limit(1);
    if (error) {
      console.error('Error querying matches:', error.message);
      process.exit(1);
    }
    
    if (data && data.length > 0) {
      const match = data[0];
      console.log('Columns in matches table:', Object.keys(match));
      if ('is_manual_override' in match) {
        console.log('✅ is_manual_override column EXISTS in public.matches');
        console.log('Sample value:', match.is_manual_override);
      } else {
        console.error('❌ is_manual_override column DOES NOT EXIST in public.matches');
      }
    } else {
      console.log('No matches found in the matches table to inspect columns.');
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

check();
