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
  const koStages = ['LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL'];
  const koMatches = matches.filter((m: any) => koStages.includes(m.stage));

  console.log('API ID | Stage | Home Team | Away Team | Status');
  console.log('------------------------------------------------');
  koMatches.forEach((m: any) => {
    const home = m.homeTeam?.tla || 'null';
    const away = m.awayTeam?.tla || 'null';
    console.log(`${m.id} | ${m.stage} | ${home} | ${away} | ${m.status}`);
  });
}

run();
