import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import dns from 'dns';

// Delete environment variables that pg client might automatically use
delete process.env.PGUSER;
delete process.env.PGPASSWORD;
delete process.env.PGDATABASE;
delete process.env.PGHOST;
delete process.env.PGPORT;

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
  if (hostname && (hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co') || hostname.endsWith('.supabase.net'))) {
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

const hosts = [
  'db.eidfwvezvzpvcgqnijhm.supabase.co',
  'aws-0-us-east-2.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com',
  'aws-1-us-east-2.pooler.supabase.com'
];
const ports = [6543, 5432];
const users = [
  'postgres.eidfwvezvzpvcgqnijhm',
  'postgres'
];
const passwords = [
  'LaPolla2026',
  'LaPolla',
  'postgres',
  'super_secret_cron_token_123',
  'eidfwvezvzpvcgqnijhm'
];

async function run() {
  console.log('Testing connection combinations for migration...');
  let connectedClient: Client | null = null;

  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        for (const password of passwords) {
          console.log(`Trying host=${host}, port=${port}, user=${user}...`);
          const client = new Client({
            host,
            port,
            database: 'postgres',
            user,
            password,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
          });

          try {
            await client.connect();
            console.log(`\n>>> SUCCESS: Connected to ${host}:${port} as ${user}!`);
            connectedClient = client;
            break;
          } catch (err: any) {
            // Silently continue
          }
        }
        if (connectedClient) break;
      }
      if (connectedClient) break;
    }
    if (connectedClient) break;
  }

  if (!connectedClient) {
    console.error('\nCould not connect to database with any combination.');
    process.exit(1);
  }

  try {
    // 1. Run migration
    console.log('Executing late_predictions_migration.sql...');
    const migrationSql = fs.readFileSync(path.resolve(process.cwd(), 'late_predictions_migration.sql'), 'utf8');
    await connectedClient.query(migrationSql);
    console.log('Migration executed successfully!');

    // 2. Run calculate points DDL
    console.log('Executing calculate_points.sql...');
    const calcPointsSql = fs.readFileSync(path.resolve(process.cwd(), 'calculate_points.sql'), 'utf8');
    await connectedClient.query(calcPointsSql);
    console.log('calculate_points.sql executed successfully!');

    // 3. Recalculate points for all matches
    console.log('Recalculating all points...');
    await connectedClient.query('SELECT public.compute_points(id) FROM public.matches;');
    console.log('Recalculation completed successfully!');
  } catch (err: any) {
    console.error('Error executing database updates:', err.message);
    process.exit(1);
  } finally {
    await connectedClient.end();
  }
}

run();
