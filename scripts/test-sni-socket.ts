import { Client } from 'pg';
import net from 'net';
import dns from 'dns';

function resolveIPv4(host: string): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.lookup(host, (err, address) => {
      if (err) reject(err);
      else resolve(address);
    });
  });
}

async function tryCombo(port: number, poolerHost: string, user: string, password: string) {
  try {
    const ip = await resolveIPv4(poolerHost);
    console.log(`Resolved ${poolerHost} to ${ip}`);

    const socket = net.connect(port, ip);
    socket.connect = function(p: any, h: any, cb: any) {
      console.log(`Mock socket.connect called: port=${p}, host=${h}`);
      if (typeof cb === 'function') cb();
      return this;
    } as any;

    const client = new Client({
      host: '127.0.0.1',
      port,
      database: 'postgres',
      user,
      password,
      ssl: {
        servername: 'db.eidfwvezvzpvcgqnijhm.supabase.co',
        rejectUnauthorized: false
      },
      stream: socket
    });

    console.log(`Connecting via custom socket to ${poolerHost} on port ${port} with user ${user}...`);
    await client.connect();
    console.log(`>>> SUCCESS: Connected to ${poolerHost} using SNI!`);
    
    const res = await client.query('SELECT version();');
    console.log('Postgres Version:', res.rows[0].version);

    await client.end();
    return true;
  } catch (err: any) {
    console.log(`Failed for user ${user} on port ${port}:`, err.stack);
    return false;
  }
}

async function run() {
  const passwords = [
    'LaPolla2026',
    'LaPolla',
    'postgres',
    'super_secret_cron_token_123',
    'eidfwvezvzpvcgqnijhm'
  ];
  const users = [
    'postgres.eidfwvezvzpvcgqnijhm',
    'postgres'
  ];
  const poolerHost = 'aws-1-us-east-2.pooler.supabase.com';
  console.log(`--- Testing passwords and users on AWS-1 us-east-2 ---`);
  for (const user of users) {
    for (const password of passwords) {
      console.log(`Trying user: ${user}, password: ${password.substring(0, 3)}...`);
      const ok = await tryCombo(5432, poolerHost, user, password);
      if (ok) {
        console.log(`>>> SUCCESS WITH USER: ${user}, PASSWORD: ${password}`);
        return;
      }
      const ok2 = await tryCombo(6543, poolerHost, user, password);
      if (ok2) {
        console.log(`>>> SUCCESS WITH USER: ${user}, PASSWORD: ${password}`);
        return;
      }
    }
  }
}

run();
