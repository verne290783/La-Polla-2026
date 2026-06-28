import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Offsets in hours from UTC for each city in June/July (Daylight Saving Time applies)
// PDT (Los Angeles, San Francisco, Seattle, Vancouver) = UTC-7
// MDT (Denver, Phoenix, Salt Lake City) = UTC-6 (Monterrey is CST/UTC-6, Mexico City is CST/UTC-6)
// CDT (Houston, Dallas, Kansas City) = UTC-5
// EDT (Boston, New York/NJ, Atlanta, Toronto, Miami, Philadelphia) = UTC-4
const CITY_OFFSETS: Record<string, number> = {
  'Los Angeles': -7,
  'San Francisco': -7,
  'Seattle': -7,
  'Vancouver': -7,
  'Monterrey': -6,
  'Mexico City': -6,
  'Houston': -5,
  'Dallas': -5,
  'Kansas City': -5,
  'Boston': -4,
  'New York/NJ': -4,
  'Atlanta': -4,
  'Toronto': -4,
  'Miami': -4,
  'Philadelphia': -4
};

const knockoutVenues: Record<number, { city: string; venue: string }> = {
  73: { city: 'Los Angeles', venue: 'SoFi Stadium' },
  74: { city: 'Boston', venue: 'Gillette Stadium' },
  75: { city: 'Monterrey', venue: 'Estadio BBVA' },
  76: { city: 'Houston', venue: 'NRG Stadium' },
  77: { city: 'New York/NJ', venue: 'MetLife Stadium' },
  78: { city: 'Dallas', venue: 'AT&T Stadium' },
  79: { city: 'Mexico City', venue: 'Estadio Azteca' },
  80: { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  81: { city: 'San Francisco', venue: "Levi's Stadium" },
  82: { city: 'Seattle', venue: 'Lumen Field' },
  83: { city: 'Toronto', venue: 'BMO Field' },
  84: { city: 'Los Angeles', venue: 'SoFi Stadium' },
  85: { city: 'Vancouver', venue: 'BC Place' },
  86: { city: 'Miami', venue: 'Hard Rock Stadium' },
  87: { city: 'Kansas City', venue: 'Arrowhead Stadium' },
  88: { city: 'Dallas', venue: 'AT&T Stadium' },
  89: { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
  90: { city: 'Houston', venue: 'NRG Stadium' },
  91: { city: 'New York/NJ', venue: 'MetLife Stadium' },
  92: { city: 'Mexico City', venue: 'Estadio Azteca' },
  93: { city: 'Dallas', venue: 'AT&T Stadium' },
  94: { city: 'Seattle', venue: 'Lumen Field' },
  95: { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  96: { city: 'Vancouver', venue: 'BC Place' },
  97: { city: 'Boston', venue: 'Gillette Stadium' },
  98: { city: 'Los Angeles', venue: 'SoFi Stadium' },
  99: { city: 'Miami', venue: 'Hard Rock Stadium' },
  100: { city: 'Kansas City', venue: 'Arrowhead Stadium' },
  101: { city: 'Dallas', venue: 'AT&T Stadium' },
  102: { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  103: { city: 'Miami', venue: 'Hard Rock Stadium' },
  104: { city: 'New York/NJ', venue: 'MetLife Stadium' }
};

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
  const dataPrimary = await resPrimary.json();
  const primaryMatches = dataPrimary.matches || [];

  // 2. Fetch fallback API matches
  const resFallback = await fetch('https://worldcup26.ir/get/games');
  const dataFallback = await resFallback.json();
  const fallbackMatches = dataFallback.games || [];

  console.log('Matching Primary API matches to Fallback matches by date/time (with timezone correction)...');
  console.log('========================================================================================');

  const finalMapping: any[] = [];

  for (const fMatch of fallbackMatches) {
    const fId = parseInt(fMatch.id);
    if (fId < 73 || fId > 104) continue; // Only knockout matches

    const venueInfo = knockoutVenues[fId];
    if (!venueInfo) {
      console.warn(`No venue info for fallback ID ${fId}`);
      continue;
    }

    const offset = CITY_OFFSETS[venueInfo.city];
    if (offset === undefined) {
      console.error(`No timezone offset defined for city: ${venueInfo.city}`);
      continue;
    }

    // Parse fallback local_date: "MM/DD/YYYY HH:mm"
    // e.g. "07/01/2026 17:00"
    const parts = fMatch.local_date.split(' ');
    const dateParts = parts[0].split('/');
    const timeParts = parts[1].split(':');
    
    const month = parseInt(dateParts[0]) - 1;
    const day = parseInt(dateParts[1]);
    const year = parseInt(dateParts[2]);
    const hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);

    // Create Date object in UTC, then subtract the offset hours to get back to UTC
    const localMs = Date.UTC(year, month, day, hours, minutes);
    const utcMs = localMs - (offset * 60 * 60 * 1000);
    const expectedUtcDate = new Date(utcMs);

    // Find the closest primary match (within 30 minutes)
    const matchedPrimary = primaryMatches.find((pm: any) => {
      const pmDate = new Date(pm.utcDate);
      const diffMs = Math.abs(pmDate.getTime() - expectedUtcDate.getTime());
      return diffMs <= 30 * 60 * 1000; // 30 minutes tolerance
    });

    if (matchedPrimary) {
      finalMapping.push({
        localId: fId,
        primaryId: matchedPrimary.id,
        stage: matchedPrimary.stage,
        utcDate: matchedPrimary.utcDate,
        city: venueInfo.city,
        venue: venueInfo.venue,
        homeTeam: matchedPrimary.homeTeam?.tla || 'TBD',
        awayTeam: matchedPrimary.awayTeam?.tla || 'TBD',
        label: `${fMatch.home_team_label} vs ${fMatch.away_team_label}`
      });
    } else {
      console.warn(`Could not find primary match for Fallback Match ${fId} at local time ${fMatch.local_date} (${expectedUtcDate.toISOString()})`);
    }
  }

  // Sort by localId
  finalMapping.sort((a, b) => a.localId - b.localId);

  console.log(JSON.stringify(finalMapping, null, 2));
}

run();
