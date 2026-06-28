import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    console.error('No API Key');
    return;
  }

  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey }
  });

  if (!res.ok) {
    console.error('Error fetching:', res.status, await res.text());
    return;
  }

  const data: any = await res.json();
  const matches = data.matches || [];
  const targetIds = ['537421', '537422'];
  const targets = matches.filter((m: any) => targetIds.includes(m.id.toString()));

  console.log(JSON.stringify(targets, null, 2));
}

run();
