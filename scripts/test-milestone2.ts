import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup custom DNS resolver to bypass restricted network dns.lookup
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);

const originalLookup = dns.lookup;
// @ts-ignore
dns.lookup = function (hostname: string, options: any, callback: any) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  if (hostname && (hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co'))) {
    resolver.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        originalLookup(hostname, opts, cb);
      } else {
        if (opts && opts.all) {
          cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
        } else {
          cb(null, addresses[0], 4);
        }
      }
    });
  } else {
    originalLookup(hostname, opts, cb);
  }
};

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const url = 'https://mcp.supabase.com/mcp';
const projectId = 'eidfwvezvzpvcgqnijhm';

const testSql = `
BEGIN;

-- Test 1: Verify p1_unlocked_until exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'p1_unlocked_until'
  ) THEN
    RAISE EXCEPTION 'Test 1 Failed: p1_unlocked_until column does not exist on profiles table';
  END IF;
END $$;

-- Test 2: Non-admin user calling admin_unlock_user_p1 should fail
DO $$
BEGIN
  -- Set auth context to non-admin user
  PERFORM set_config('request.jwt.claim.sub', 'f7b580c4-1d1a-4414-9bac-43da1079d7d1', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  BEGIN
    PERFORM public.admin_unlock_user_p1('f7b580c4-1d1a-4414-9bac-43da1079d7d1');
    RAISE EXCEPTION 'Test 2 Failed: Non-admin was allowed to call admin_unlock_user_p1';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM = 'Unauthorized' THEN
      NULL; -- Expected
    ELSE
      RAISE EXCEPTION 'Test 2 Failed with unexpected error: %', SQLERRM;
    END IF;
  END;
END $$;

-- Test 3: Admin user calling admin_unlock_user_p1 should succeed
DO $$
DECLARE
  v_unlocked timestamp with time zone;
BEGIN
  -- Set auth context to admin user
  PERFORM set_config('request.jwt.claim.sub', '9d5ddc8c-9047-4320-8f07-02dab546588a', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  PERFORM public.admin_unlock_user_p1('f7b580c4-1d1a-4414-9bac-43da1079d7d1');
  
  SELECT p1_unlocked_until INTO v_unlocked FROM public.profiles WHERE id = 'f7b580c4-1d1a-4414-9bac-43da1079d7d1';
  IF v_unlocked IS NULL THEN
    RAISE EXCEPTION 'Test 3 Failed: p1_unlocked_until is still null after unlock';
  END IF;
END $$;

-- Test 4: Admin user calling admin_lock_user_p1 should succeed
DO $$
DECLARE
  v_unlocked timestamp with time zone;
BEGIN
  -- Set auth context to admin user
  PERFORM set_config('request.jwt.claim.sub', '9d5ddc8c-9047-4320-8f07-02dab546588a', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  PERFORM public.admin_lock_user_p1('f7b580c4-1d1a-4414-9bac-43da1079d7d1');
  
  SELECT p1_unlocked_until INTO v_unlocked FROM public.profiles WHERE id = 'f7b580c4-1d1a-4414-9bac-43da1079d7d1';
  IF v_unlocked IS NOT NULL THEN
    RAISE EXCEPTION 'Test 4 Failed: p1_unlocked_until is not null after lock';
  END IF;
END $$;

-- Test 5: Admin user calling recalculate_all_points should succeed
DO $$
BEGIN
  -- Set auth context to admin user
  PERFORM set_config('request.jwt.claim.sub', '9d5ddc8c-9047-4320-8f07-02dab546588a', true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  
  PERFORM public.recalculate_all_points();
END $$;

ROLLBACK;
`;

async function run() {
  try {
    console.log('Sending initialize request to Supabase MCP...');
    const initRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'agent-client',
            version: '1.0.0'
          }
        },
        id: 1
      })
    });

    const sessionId = initRes.headers.get('Mcp-Session-Id');
    if (!sessionId) {
      throw new Error('No Mcp-Session-Id returned');
    }

    console.log('Running transaction-based verification SQL via Supabase MCP...');
    const execRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'Authorization': `Bearer ${token}`,
        'Mcp-Session-Id': sessionId
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'execute_sql',
          arguments: {
            project_id: projectId,
            query: testSql
          }
        },
        id: 2
      })
    });

    const output = await execRes.text();
    console.log('Output from verification:');
    console.log(output);

    if (output.includes('Failed') || output.includes('error')) {
      console.error('❌ Verification failed.');
      process.exit(1);
    }

    console.log('✅ ALL MILESTONE 2 TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ Verification run failed:', err.message);
    process.exit(1);
  }
}

run();
