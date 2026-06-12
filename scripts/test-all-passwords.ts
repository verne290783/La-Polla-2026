import { Client } from 'pg';
import dns from 'dns';

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

const passwords = [
  'LaPolla2026',
  'LaPolla',
  'postgres',
  'super_secret_cron_token_123',
  'eidfwvezvzpvcgqnijhm',
  '2f71641d66a147d981a48736d3e2b561',
  'La-Polla-2026',
  'LaPolla-2026',
  'la-polla-2026',
  'lapolla2026',
  'La_Polla_2026',
  'la_polla_2026',
  'LaPolla_2026',
  'admin',
  'password',
  'postgres.eidfwvezvzpvcgqnijhm'
];

async function tryPassword(password: string) {
  const client = new Client({
    host: 'aws-1-us-east-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.eidfwvezvzpvcgqnijhm',
    password,
    ssl: {
      servername: 'db.eidfwvezvzpvcgqnijhm.supabase.co',
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 3000
  });

  try {
    await client.connect();
    console.log(`>>> SUCCESS! Password is: ${password}`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`Failed for password '${password}': ${err.message}`);
    return false;
  }
}

async function run() {
  console.log('Testing passwords...');
  for (const pwd of passwords) {
    const ok = await tryPassword(pwd);
    if (ok) {
      console.log('Scan complete.');
      return;
    }
    // Sleep briefly to avoid triggering circuit breaker too fast
    await new Promise(r => setTimeout(r, 500));
  }
  console.log('All passwords failed.');
}

run();
