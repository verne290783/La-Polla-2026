import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function run() {
  const { data: users } = await adminClient.auth.admin.listUsers();
  const testUser = users.users.find(u => u.email === 'test-late-predictions@example.com');
  console.log('Test User:', testUser);
  if (testUser) {
    const { data: preds, error: err1 } = await adminClient.from('full_tournament_predictions').select('*').eq('user_id', testUser.id);
    console.log('Full Tournament Predictions:', preds, 'Error:', err1);

    const { data: phasePreds, error: err2 } = await adminClient.from('phase_predictions').select('*').eq('user_id', testUser.id);
    console.log('Phase Predictions:', phasePreds, 'Error:', err2);
  }
}

run().catch(console.error);
