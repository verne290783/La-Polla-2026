import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testJoin() {
  try {
    const poolId = 'df208c4f-43c6-4f3e-84f1-03c287a3ac6a'; // Familia Diaz pool
    console.log(`Running join query on poolId: ${poolId}...`);
    
    const { data, error } = await supabase
      .from('pool_members')
      .select('user_id, joined_at, part1_points, part2_points, total_points, profiles(display_name, avatar_url)')
      .eq('pool_id', poolId);

    if (error) {
      console.log('Error executing join:', error.message);
    } else {
      console.log('Join results:', JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error('Fatal error:', err.message);
  }
}

testJoin();
