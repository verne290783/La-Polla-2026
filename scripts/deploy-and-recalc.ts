import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
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

    console.log('Deploying calculate_points.sql DDL via Supabase MCP...');
    const sqlPath = path.resolve(process.cwd(), 'calculate_points.sql');
    const computePointsSql = fs.readFileSync(sqlPath, 'utf8');

    const execRes1 = await fetch(url, {
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
            query: computePointsSql
          }
        },
        id: 2
      })
    });

    const body1 = await execRes1.text();
    if (body1.includes('error')) {
      console.error('Error deploying calculate_points.sql:', body1);
      process.exit(1);
    }
    console.log('DDL deployed successfully!');

    console.log('\nRunning match score recalculation via Supabase MCP...');
    const execRes2 = await fetch(url, {
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
            query: 'SELECT public.compute_points(id) FROM public.matches;'
          }
        },
        id: 3
      })
    });

    const body2 = await execRes2.text();
    if (body2.includes('error')) {
      console.error('Error executing recalculation:', body2);
      process.exit(1);
    }
    console.log('Recalculation complete!');
  } catch (err: any) {
    console.error('Error during execution:', err.message);
    process.exit(1);
  }
}

run();
