import dns from 'dns';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

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
      if (err) {
        originalLookup(hostname, opts, cb);
      } else {
        if (addresses && addresses.length > 0) {
          if (opts && opts.all) {
            cb(null, addresses.map(addr => ({ address: addr, family: 4 })));
          } else {
            cb(null, addresses[0], 4);
          }
        } else {
          originalLookup(hostname, opts, cb);
        }
      }
    });
  } else {
    originalLookup(hostname, opts, cb);
  }
};

async function run() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  delete process.env.PGUSER;
  delete process.env.PGPASSWORD;
  delete process.env.PGDATABASE;
  delete process.env.PGHOST;
  delete process.env.PGPORT;

  const host = 'aws-1-us-east-2.pooler.supabase.com';
  const port = 5432;
  const database = 'postgres';
  const user = 'postgres.eidfwvezvzpvcgqnijhm';
  const password = process.env.SUPABASE_DB_PASSWORD || 'LaPolla2026';

  console.log(`Connecting to database to check cron logs...`);
  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    ssl: {
      servername: 'db.eidfwvezvzpvcgqnijhm.supabase.co',
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected!');

    // Check pg_cron jobs
    const jobs = await client.query('SELECT jobid, jobname, schedule, active FROM cron.job;');
    console.log('\n=== pg_cron Jobs ===');
    console.table(jobs.rows);

    // Check last 10 execution logs
    const logs = await client.query(`
      SELECT runid, jobid, username, status, return_message, 
             start_time, end_time - start_time as duration
      FROM cron.job_run_details
      ORDER BY start_time DESC
      LIMIT 10;
    `);
    console.log('\n=== pg_cron Job Run Details (Last 10) ===');
    console.table(logs.rows.map(r => ({
      ...r,
      start_time: r.start_time.toISOString(),
      duration: r.duration ? `${r.duration.milliseconds || 0}ms` : 'N/A'
    })));

    // Check if there are any HTTP request details in public/pg_net or similar, if applicable
    // pg_net calls are async. Let's see if we can check the status of http requests.
    // In pg_net, requests are stored in net.http_request_queue or net.http_response
    try {
      const netResponses = await client.query(`
        SELECT id, status, error_msg, created_at
        FROM net.http_response_queue
        ORDER BY created_at DESC
        LIMIT 10;
      `);
      console.log('\n=== pg_net HTTP Responses (Last 10) ===');
      console.table(netResponses.rows);
    } catch (e: any) {
      console.log('Could not read net.http_response_queue:', e.message);
    }

  } catch (err: any) {
    console.error('Error:', err.message || err);
  } finally {
    await client.end();
  }
}

run();
