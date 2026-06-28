import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function forceClean() {
  console.log('Force cleaning database...');

  // Restore virtual date to original setting
  await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: '2026-06-28T20:00:00.000Z' });
  console.log('Set virtual_date to 2026-06-28T20:00:00.000Z');

  // List and delete test users
  const { data: { users } } = await adminClient.auth.admin.listUsers();
  for (const u of users) {
    if (u.email === 'test-auto-unlock@example.com' || (u.email && u.email.startsWith('boundary-test-'))) {
      console.log(`Deleting dirty user: ${u.email} (${u.id})`);
      await adminClient.from('full_tournament_predictions').delete().eq('user_id', u.id);
      await adminClient.from('profiles').delete().eq('id', u.id);
      await adminClient.auth.admin.deleteUser(u.id);
    }
  }

  // Delete pools
  await adminClient.from('pools').delete().eq('name', 'Test Auto-Unlock Pool');
  console.log('Deleted Test Auto-Unlock Pools');
  console.log('Force cleanup complete.');
}

forceClean().catch(console.error);
