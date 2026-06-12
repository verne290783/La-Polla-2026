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

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'sa-east-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'eu-central-2',
  'eu-south-1',
  'eu-south-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-southeast-3',
  'ap-southeast-4',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'ap-south-2',
  'me-central-1',
  'me-south-1',
  'af-south-1'
];

async function tryRegion(region: string) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new Client({
    host,
    port: 6543,
    database: 'postgres',
    user: 'postgres.eidfwvezvzpvcgqnijhm',
    password: 'LaPolla2026',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3500
  });

  try {
    await client.connect();
    console.log(`\n>>> SUCCESS! Connected on region: ${region}!`);
    await client.end();
    return region;
  } catch (err: any) {
    if (err.message.includes('tenant/user') && err.message.includes('not found')) {
      // Incorrect region
      return null;
    } else {
      console.log(`\n>>> INTERESTING: Region ${region} returned error: ${err.message}`);
      await client.end().catch(() => {});
      return region;
    }
  }
}

async function run() {
  console.log('Scanning 27 regions in parallel...');
  const promises = regions.map(r => tryRegion(r));
  const results = await Promise.all(promises);
  const foundRegions = results.filter(Boolean);
  console.log('\nScan done. Found matching regions:', foundRegions);
}

run();
