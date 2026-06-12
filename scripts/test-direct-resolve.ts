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

async function run() {
  const host = 'db.eidfwvezvzpvcgqnijhm.supabase.co';
  const client = new Client({
    host,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'LaPolla2026',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log(`Connecting directly to ${host} on port 5432...`);
    await client.connect();
    console.log('CONNECTED SUCCESSFULLY DIRECTLY!');
    const res = await client.query('SELECT version();');
    console.log('Postgres Version:', res.rows[0].version);
    await client.end();
  } catch (err: any) {
    console.error('Direct connection failed:', err.message);
  }
}

run();
