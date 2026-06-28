import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function verify() {
  console.log('--- VERIFYING DATABASE CLEANLINESS ---');
  let clean = true;

  // 1. Check virtual_date key in system_settings
  const { data: settings, error: settingsErr } = await adminClient
    .from('system_settings')
    .select('*')
    .eq('key', 'virtual_date')
    .maybeSingle();

  if (settingsErr) {
    console.error('Error fetching system_settings:', settingsErr.message);
    clean = false;
  } else {
    const val = settings ? settings.value : null;
    console.log(`virtual_date value is: "${val}"`);
    // The original value is '2026-06-28T20:00:00.000Z' or '2026-06-28T20:00:00+00:00'
    // Let's accept both format forms or check if it matches the general target.
    if (val !== '2026-06-28T20:00:00.000Z' && val !== '2026-06-28T20:00:00+00:00') {
      console.error(`❌ virtual_date was NOT restored to 2026-06-28T20:00:00.000Z! Found: ${val}`);
      clean = false;
    } else {
      console.log('✅ virtual_date is clean.');
    }
  }

  // 2. Check test user test-auto-unlock@example.com
  const { data: { users }, error: usersErr } = await adminClient.auth.admin.listUsers();
  if (usersErr) {
    console.error('Error listing users:', usersErr.message);
    clean = false;
  } else {
    const testUser = users.find(u => u.email === 'test-auto-unlock@example.com');
    if (testUser) {
      console.error(`❌ Test user test-auto-unlock@example.com still exists! ID: ${testUser.id}`);
      clean = false;
    } else {
      console.log('✅ Test user test-auto-unlock@example.com does not exist.');
    }

    const boundaryUsers = users.filter(u => u.email && u.email.startsWith('boundary-test-'));
    if (boundaryUsers.length > 0) {
      console.error(`❌ Boundary test users still exist:`, boundaryUsers.map(u => u.email));
      clean = false;
    } else {
      console.log('✅ No boundary-test- users exist.');
    }
  }

  // 3. Check for profiles matching the deleted users
  const { data: profiles, error: profilesErr } = await adminClient
    .from('profiles')
    .select('id, email');
  if (profilesErr) {
    console.error('Error fetching profiles:', profilesErr.message);
    clean = false;
  } else {
    const dirtyProfiles = profiles.filter(p => p.email === 'test-auto-unlock@example.com' || (p.email && p.email.startsWith('boundary-test-')));
    if (dirtyProfiles.length > 0) {
      console.error('❌ Dirty profiles still exist in profiles table:', dirtyProfiles);
      clean = false;
    } else {
      console.log('✅ Profiles table is clean.');
    }
  }

  // 4. Check for pools
  const { data: pools, error: poolsErr } = await adminClient
    .from('pools')
    .select('id, name')
    .eq('name', 'Test Auto-Unlock Pool');
  if (poolsErr) {
    console.error('Error fetching pools:', poolsErr.message);
    clean = false;
  } else {
    if (pools.length > 0) {
      console.error('❌ Temporary pool still exists:', pools);
      clean = false;
    } else {
      console.log('✅ Pools table is clean.');
    }
  }

  if (clean) {
    console.log('🎉 Verification PASSED: Database is completely clean!');
    process.exit(0);
  } else {
    console.log('❌ Verification FAILED: Database has leftover artifacts.');
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
