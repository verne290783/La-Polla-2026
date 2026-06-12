import dns from 'dns';
import { Client } from 'pg';

// Setup custom DNS resolver
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

async function test() {
  const host = 'aws-1-us-east-2.pooler.supabase.com';
  const ports = [6543, 5432];
  const users = ['postgres.eidfwvezvzpvcgqnijhm', 'postgres'];
  const passwords = [
    'LaPolla2026',
    'LaPolla',
    'postgres',
    'super_secret_cron_token_123',
    'eidfwvezvzpvcgqnijhm'
  ];

  for (const port of ports) {
    for (const user of users) {
      for (const password of passwords) {
        console.log(`Testing port=${port}, user=${user}, password=${password.substring(0, 3)}...`);
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
          console.log(`>>> SUCCESS: Connected on port ${port} with user ${user} and password ${password}!`);
          await client.end();
          return;
        } catch (err: any) {
          console.log(`Failed: ${err.message}`);
        }
      }
    }
  }
}

test();
