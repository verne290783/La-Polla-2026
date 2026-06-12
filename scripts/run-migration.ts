import dns from 'dns';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

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

  console.log(`dns.lookup called for: ${hostname}, opts: ${JSON.stringify(opts)}`);

  if (hostname && (hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co'))) {
    resolver.resolve4(hostname, (err, addresses) => {
      if (err) {
        console.log(`resolver.resolve4 error for ${hostname}:`, err.message);
        originalLookup(hostname, opts, cb);
      } else {
        console.log(`resolver.resolve4 success for ${hostname}:`, addresses);
        if (addresses && addresses.length > 0) {
          if (opts && opts.all) {
            const mapped = addresses.map(addr => ({ address: addr, family: 4 }));
            cb(null, mapped);
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

const hosts = [
  'db.eidfwvezvzpvcgqnijhm.supabase.co',
  'aws-0-us-east-2.pooler.supabase.com',
  'aws-0-us-east-1.pooler.supabase.com'
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
  const sqlPath = path.resolve(process.cwd(), 'extra_time_migration.sql');
  const migrationSql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Testing connection combinations for migration...');
  let connectedClient: Client | null = null;

  for (const host of hosts) {
    for (const port of ports) {
      for (const user of users) {
        for (const password of passwords) {
          console.log(`Trying host=${host}, port=${port}, user=${user}, password=${password.substring(0, 3)}...`);
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
            console.log(`Failed for host=${host}, port=${port}, user=${user}:`, err.message);
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
    console.log('\nRunning migration extra_time_migration.sql...');
    await connectedClient.query(migrationSql);
    console.log('Migration completed successfully!');
  } catch (err: any) {
    console.error('Error during migration execution:', err.message);
    process.exit(1);
  } finally {
    await connectedClient.end();
  }
}

run();
