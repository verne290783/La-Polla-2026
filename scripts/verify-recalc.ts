import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecalc() {
  try {
    console.log('Calling RPC recalculate_all_points...');
    // We call RPC recalculate_all_points using the service role client.
    // Note: recalculate_all_points checks if executing user is admin.
    // Since service_role client bypasses RLS, let's see if it executes directly,
    // or if we need to call compute_points directly or test-milestone2 ran it.
    // Actually, in scripts/test-milestone2.ts, they set auth context to admin user.
    // Let's call the RPC using the RPC method.
    const { data, error } = await supabase.rpc('recalculate_all_points');
    if (error) {
      console.error('RPC recalculate_all_points error:', error.message);
      // Wait, if it fails due to "Unauthorized", it means the RPC checks auth.uid()
      // which is null for service_role by default unless we set it.
      // But let's check if there is any safe update error in the logs or returned.
      if (error.message.includes('safe update')) {
        console.error('❌ Safe update error detected!');
        process.exit(1);
      }
    } else {
      console.log('✅ RPC recalculate_all_points completed successfully!');
    }
  } catch (err: any) {
    console.error('Fatal error calling RPC:', err.message);
    process.exit(1);
  }
}

checkRecalc();
