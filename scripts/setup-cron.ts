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
  // Load env vars
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

  // Clean PG env vars that might interfere with manual configuration
  delete process.env.PGUSER;
  delete process.env.PGPASSWORD;
  delete process.env.PGDATABASE;
  delete process.env.PGHOST;
  delete process.env.PGPORT;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET not found in .env.local');
    process.exit(1);
  }

  // Determine domain
  const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL;
  let domain = 'https://la-polla-2026.vercel.app';
  if (vercelUrl && vercelUrl.startsWith('http')) {
    domain = vercelUrl;
  } else if (vercelUrl) {
    domain = `https://${vercelUrl}`;
  }
  // Replace localhost with default production domain because Supabase cannot call localhost
  if (domain.includes('localhost') || domain.includes('127.0.0.1')) {
    console.log(`Localhost URL detected (${domain}). Defaulting to production domain for Supabase cron.`);
    domain = 'https://la-polla-2026.vercel.app';
  }

  const endpointUrl = `${domain}/api/cron/sync-scores`;
  console.log(`Cron target URL: ${endpointUrl}`);

  // Database Connection
  const host = 'aws-1-us-east-2.pooler.supabase.com';
  const port = 5432;
  const database = 'postgres';
  const user = 'postgres.eidfwvezvzpvcgqnijhm';
  const password = process.env.SUPABASE_DB_PASSWORD || 'LaPolla2026';

  console.log(`Connecting to database at ${host}:${port} as ${user}...`);
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
    console.log('Connected to database successfully!');

    // 1. Enable pg_cron and pg_net extension if not enabled (Supabase usually pre-installs them)
    // We can check if they exist or just try to enable them.
    console.log('Enabling pg_cron and pg_net extensions...');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA pg_catalog;');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA public;');

    // 2. Schedule the cron job using pg_cron
    // cron.schedule(job_name, schedule, sql)
    // net.http_get(url, headers, params, timeout)
    console.log('Scheduling cron job sync-scores-cron...');
    
    // We unschedule first if it exists to avoid duplicate/error
    try {
      await client.query("SELECT cron.unschedule('sync-scores-cron');");
      console.log('Unscheduled existing cron job first.');
    } catch (e: any) {
      console.log('No existing cron job to unschedule.');
    }

    const sqlQuery = `
      SELECT cron.schedule(
        'sync-scores-cron',
        '*/10 * * * *',
        $$
        SELECT net.http_get(
          url := '${endpointUrl}',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ${cronSecret}'
          )
        );
        $$
      );
    `;

    const res = await client.query(sqlQuery);
    console.log('Cron job scheduled successfully!', res.rows[0]);

    // Verify scheduled cron jobs
    const verifyRes = await client.query("SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'sync-scores-cron';");
    console.log('Verified cron job in database:', verifyRes.rows);

  } catch (err: any) {
    console.error('Error setting up pg_cron / pg_net:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
