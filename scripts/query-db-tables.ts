import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function query() {
  try {
    const { data: pools, error: e1 } = await supabase.from('pools').select('*');
    console.log('Pools:', pools, e1?.message);

    const { data: members, error: e2 } = await supabase.from('pool_members').select('*');
    console.log('Pool members count:', members?.length, e2?.message);

    const { data: profiles, error: e3 } = await supabase.from('profiles').select('*');
    console.log('Profiles count:', profiles?.length, e3?.message);
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

query();
