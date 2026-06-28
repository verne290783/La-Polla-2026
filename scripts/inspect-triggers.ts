import dns from 'dns';
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

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
  const client = new Client({
    host: 'aws-1-us-east-2.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.eidfwvezvzpvcgqnijhm',
    password: 'LaPolla2026',
    ssl: {
      servername: 'db.eidfwvezvzpvcgqnijhm.supabase.co',
      rejectUnauthorized: false
    }
  });

  await client.connect();

  const userStats = await client.query(`
    SELECT p.id, p.display_name, p.email,
           MIN(f.created_at) as min_created,
           MAX(f.created_at) as max_created,
           MIN(f.updated_at) as min_updated,
           MAX(f.updated_at) as max_updated,
           COUNT(*) as pred_count
    FROM public.profiles p
    LEFT JOIN public.full_tournament_predictions f ON p.id = f.user_id
    GROUP BY p.id, p.display_name, p.email;
  `);
  console.log('User stats in full_tournament_predictions:');
  console.log(userStats.rows);

  const matchStats = await client.query(`
    SELECT id, match_date, lock_time_part2 
    FROM public.matches 
    WHERE id IN (1, 2, 45)
    ORDER BY id;
  `);
  console.log('Match Dates:');
  console.log(matchStats.rows);

  await client.end();
}

run().catch(console.error);
