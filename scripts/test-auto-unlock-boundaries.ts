import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function run() {
  console.log('--- STARTING AUTO-UNLOCK BOUNDARY & REGISTRATION TESTS ---');

  // 1. Get first knockout match date or fallback
  const { data: knockoutMatches, error: knockoutErr } = await adminClient
    .from('matches')
    .select('match_date')
    .neq('phase', 'group')
    .order('match_date', { ascending: true })
    .limit(1);

  if (knockoutErr) {
    console.error('Error fetching knockout matches:', knockoutErr.message);
    process.exit(1);
  }

  let knockoutKickoffStr = '2026-06-28T19:00:00.000Z';
  if (knockoutMatches && knockoutMatches.length > 0) {
    knockoutKickoffStr = new Date(knockoutMatches[0].match_date).toISOString();
  }
  const knockoutKickoff = new Date(knockoutKickoffStr);
  console.log(`Knockout Kickoff determined as: ${knockoutKickoff.toISOString()}`);

  // Store original settings for cleanup
  const { data: originalSettings } = await adminClient
    .from('system_settings')
    .select('*')
    .eq('key', 'virtual_date')
    .maybeSingle();
  console.log('Original virtual_date setting:', originalSettings ? originalSettings.value : 'None');

  const createdUserIds: string[] = [];

  const testCases = [
    {
      name: 'Registration before tournament start',
      virtualDate: '2026-06-11T19:59:59.000Z',
      expectedUnlock: null,
    },
    {
      name: 'Registration exactly at tournament start',
      virtualDate: '2026-06-11T20:00:00.000Z',
      expectedUnlock: '2026-06-12T20:00:00.000Z',
    },
    {
      name: 'Registration during group stage',
      virtualDate: '2026-06-18T12:00:00.000Z',
      expectedUnlock: '2026-06-19T12:00:00.000Z',
    },
    {
      name: 'Registration 1 hour before knockout kickoff',
      virtualDate: new Date(knockoutKickoff.getTime() - 60 * 60 * 1000).toISOString(),
      expectedUnlock: knockoutKickoff.toISOString(),
    },
    {
      name: 'Registration exactly at knockout kickoff',
      virtualDate: knockoutKickoff.toISOString(),
      expectedUnlock: null,
    },
    {
      name: 'Registration after knockout kickoff',
      virtualDate: new Date(knockoutKickoff.getTime() + 60 * 60 * 1000).toISOString(),
      expectedUnlock: null,
    },
  ];

  try {
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      console.log(`\n--- Running Test Case ${i + 1}: ${tc.name} ---`);
      console.log(`Setting virtual_date to: ${tc.virtualDate}`);

      // Set virtual date
      await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: tc.virtualDate });

      // Check app time matches
      const { data: appTime, error: appTimeErr } = await adminClient.rpc('get_app_time');
      if (appTimeErr) throw appTimeErr;
      console.log(`get_app_time RPC returned: ${new Date(appTime).toISOString()}`);

      // Generate unique user email
      const email = `boundary-test-${Date.now()}-${i}@example.com`;
      const password = 'Password123!';

      console.log(`Registering user: ${email}...`);
      const { data: createData, error: createErr } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      if (createErr) throw createErr;

      const userId = createData.user!.id;
      createdUserIds.push(userId);
      console.log(`User created with ID: ${userId}`);

      // Query the profile to see what handle_new_user trigger populated
      const { data: profile, error: profileErr } = await adminClient
        .from('profiles')
        .select('p1_unlocked_until')
        .eq('id', userId)
        .single();

      if (profileErr) throw profileErr;
      console.log(`Profile p1_unlocked_until: ${profile.p1_unlocked_until}`);

      // Compare
      const actualUnlockStr = profile.p1_unlocked_until ? new Date(profile.p1_unlocked_until).toISOString() : null;
      const expectedUnlockStr = tc.expectedUnlock ? new Date(tc.expectedUnlock).toISOString() : null;

      if (actualUnlockStr !== expectedUnlockStr) {
        throw new Error(
          `Test case "${tc.name}" failed!\n` +
          `Expected p1_unlocked_until: ${expectedUnlockStr}\n` +
          `Actual p1_unlocked_until  : ${actualUnlockStr}`
        );
      }
      console.log(`✅ Test Case ${i + 1} PASSED!`);
    }

    console.log('\n🎉 ALL BOUNDARY REGISTRATION TESTS PASSED! 🎉');
  } catch (err: any) {
    console.error('\n❌ Boundary test failed with error:', err.message);
    process.exitCode = 1;
  } finally {
    console.log('\nCleaning up boundary test users and settings...');
    
    // Delete test users and profiles
    for (const userId of createdUserIds) {
      console.log(`Deleting user: ${userId}`);
      // Profiles has Cascade/Foreign key? Let's check, if not, delete profile first
      await adminClient.from('profiles').delete().eq('id', userId);
      await adminClient.auth.admin.deleteUser(userId);
    }

    // Restore virtual date
    if (originalSettings) {
      await adminClient.from('system_settings').upsert({ key: 'virtual_date', value: originalSettings.value });
      console.log(`Restored virtual_date to: ${originalSettings.value}`);
    } else {
      await adminClient.from('system_settings').delete().eq('key', 'virtual_date');
      console.log('Removed virtual_date setting.');
    }
    console.log('Cleanup complete.');
  }
}

run().catch(err => {
  console.error('Fatal error running boundary tests:', err);
  process.exit(1);
});
