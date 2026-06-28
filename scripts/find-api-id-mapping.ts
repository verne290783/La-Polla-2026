import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    console.error('No API Key');
    return;
  }

  // 1. Fetch primary API matches
  const resPrimary = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey }
  });
  if (!resPrimary.ok) {
    console.error('Failed to fetch primary API');
    return;
  }
  const dataPrimary = await resPrimary.json();
  const primaryMatches = dataPrimary.matches || [];

  // 2. Fetch fallback API matches
  const resFallback = await fetch('https://worldcup26.ir/get/games');
  if (!resFallback.ok) {
    console.error('Failed to fetch fallback API');
    return;
  }
  const dataFallback = await resFallback.json();
  const fallbackMatches = dataFallback.games || [];

  // 3. For each fallback match in the knockout stage (73 to 104), find the matching primary match by date/time
  console.log('Mapping results (Fallback ID -> Primary API ID):');
  console.log('------------------------------------------------');

  const mapping: Record<number, number> = {};

  for (const fMatch of fallbackMatches) {
    const fId = parseInt(fMatch.id);
    if (fId < 73 || fId > 104) continue; // Only knockout matches

    // Parse fallback date. Fallback local_date is in format: "MM/DD/YYYY HH:mm" or "DD/MM/YYYY HH:mm".
    // Wait, let's see. Let's parse it.
    // In our previous output: "local_date": "07/01/2026 17:00" for match 81, and "07/01/2026 13:00" for match 82.
    // Wait! Let's check what the corresponding primary matches are:
    // Match 81: July 2, 2026. Wait! "07/01/2026" is July 1st, or January 7th?
    // World Cup is in June/July 2026. So "07/01/2026" is July 1st.
    // Format is MM/DD/YYYY or DD/MM/YYYY.
    // Let's compare fallback dates directly with primary dates by finding matches close in time (within a few hours).
    
    // Let's write a robust date comparison by converting both to approximate times.
    // Fallback date is usually local time in the stadium or UTC?
    // Let's print the fallback dates first to see.
    console.log(`Fallback ID: ${fId} | label: ${fMatch.home_team_label} vs ${fMatch.away_team_label} | Date: ${fMatch.local_date}`);
  }
}

run();
