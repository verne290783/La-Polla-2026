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

  console.log(`dns.lookup called for: ${hostname}, opts: ${JSON.stringify(opts)}`);

  if (hostname === 'db.eidfwvezvzpvcgqnijhm.supabase.co') {
    resolver.resolve6(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        console.log('IPv6 resolve failed:', err ? err.message : 'empty');
        originalLookup(hostname, opts, cb);
      } else {
        console.log('IPv6 resolve success:', addresses);
        if (opts && opts.all) {
          cb(null, addresses.map(addr => ({ address: addr, family: 6 })));
        } else {
          cb(null, addresses[0], 6);
        }
      }
    });
  } else if (hostname && (hostname.endsWith('.supabase.com') || hostname.endsWith('.supabase.co'))) {
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
  const passwords = ['LaPolla2026', 'LaPolla', 'postgres', 'super_secret_cron_token_123', 'eidfwvezvzpvcgqnijhm'];
  for (const password of passwords) {
    console.log(`Trying direct connect to db.eidfwvezvzpvcgqnijhm.supabase.co with password: ${password.substring(0, 3)}...`);
    const client = new Client({
      host: 'db.eidfwvezvzpvcgqnijhm.supabase.co',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 5000
    });

    try {
      await client.connect();
      console.log('>>> SUCCESS: Connected directly!');
      const res = await client.query('SELECT version();');
      console.log('Version:', res.rows[0].version);
      await client.end();
      return;
    } catch (err: any) {
      console.log('Failed:', err.message);
    }
  }
}

test();
