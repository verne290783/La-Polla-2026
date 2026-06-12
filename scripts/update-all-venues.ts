import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are not configured.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const groupVenues: { city: string; venue: string }[][] = [
  // Grupo A (gIdx = 0)
  [
    { city: 'Ciudad de México', venue: 'Estadio Azteca' },
    { city: 'Guadalajara', venue: 'Estadio Akron' },
    { city: 'Guadalajara', venue: 'Estadio Akron' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { city: 'Ciudad de México', venue: 'Estadio Azteca' },
    { city: 'Monterrey', venue: 'Estadio BBVA' }
  ],
  // Grupo B (gIdx = 1)
  [
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Seattle', venue: 'Lumen Field' },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'Toronto', venue: 'BMO Field' },
    { city: 'San Francisco', venue: "Levi's Stadium" }
  ],
  // Grupo C (gIdx = 2)
  [
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Miami', venue: 'Hard Rock Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' }
  ],
  // Grupo D (gIdx = 3)
  [
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Seattle', venue: 'Lumen Field' },
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'San Francisco', venue: "Levi's Stadium" }
  ],
  // Grupo E (gIdx = 4)
  [
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { city: 'Toronto', venue: 'BMO Field' },
    { city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' }
  ],
  // Grupo F (gIdx = 5)
  [
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Monterrey', venue: 'Estadio BBVA' },
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Monterrey', venue: 'Estadio BBVA' },
    { city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { city: 'Dallas', venue: 'AT&T Stadium' }
  ],
  // Grupo G (gIdx = 6)
  [
    { city: 'Seattle', venue: 'Lumen Field' },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Seattle', venue: 'Lumen Field' }
  ],
  // Grupo H (gIdx = 7)
  [
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { city: 'Miami', venue: 'Hard Rock Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { city: 'Miami', venue: 'Hard Rock Stadium' },
    { city: 'Guadalajara', venue: 'Estadio Akron' },
    { city: 'Houston', venue: 'NRG Stadium' }
  ],
  // Grupo I (gIdx = 8)
  [
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Toronto', venue: 'BMO Field' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' }
  ],
  // Grupo J (gIdx = 9)
  [
    { city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Kansas City', venue: 'Arrowhead Stadium' }
  ],
  // Grupo K (gIdx = 10)
  [
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Mexico City', venue: 'Estadio Azteca' },
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Guadalajara', venue: 'Estadio Akron' },
    { city: 'Miami', venue: 'Hard Rock Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' }
  ],
  // Grupo L (gIdx = 11)
  [
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Toronto', venue: 'BMO Field' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Toronto', venue: 'BMO Field' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' }
  ]
];

const knockoutVenues: Record<number, { city: string; venue: string }> = {
  // Round of 32 (73 to 88)
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
  // Round of 16 (89 to 96)
  89: { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
  90: { city: 'Houston', venue: 'NRG Stadium' },
  91: { city: 'New York/NJ', venue: 'MetLife Stadium' },
  92: { city: 'Mexico City', venue: 'Estadio Azteca' },
  93: { city: 'Dallas', venue: 'AT&T Stadium' },
  94: { city: 'Seattle', venue: 'Lumen Field' },
  95: { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  96: { city: 'Vancouver', venue: 'BC Place' },
  // Quarterfinals (97 to 100)
  97: { city: 'Boston', venue: 'Gillette Stadium' },
  98: { city: 'Los Angeles', venue: 'SoFi Stadium' },
  99: { city: 'Miami', venue: 'Hard Rock Stadium' },
  100: { city: 'Kansas City', venue: 'Arrowhead Stadium' },
  // Semifinals (101 to 102)
  101: { city: 'Dallas', venue: 'AT&T Stadium' },
  102: { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  // Third Place (103)
  103: { city: 'Miami', venue: 'Hard Rock Stadium' },
  // Final (104)
  104: { city: 'New York/NJ', venue: 'MetLife Stadium' }
};

function getCorrectVenueForMatch(id: number): { city: string; venue: string } | null {
  if (id >= 1 && id <= 72) {
    const gIdx = Math.floor((id - 1) / 6);
    const mIdx = (id - 1) % 6;
    if (gIdx >= 0 && gIdx < groupVenues.length) {
      return groupVenues[gIdx][mIdx];
    }
  } else if (id >= 73 && id <= 104) {
    return knockoutVenues[id] || null;
  }
  return null;
}

async function run() {
  console.log('Fetching matches from Supabase database...');
  const { data: dbMatches, error: fetchError } = await supabase
    .from('matches')
    .select('*')
    .order('id', { ascending: true });

  if (fetchError) {
    console.error('Error fetching matches:', fetchError.message);
    process.exit(1);
  }

  console.log(`Fetched ${dbMatches?.length || 0} matches from database.`);

  if (!dbMatches || dbMatches.length === 0) {
    console.warn('No matches found in database!');
    process.exit(0);
  }

  const updates: any[] = [];
  let discrepancyCount = 0;

  for (const match of dbMatches) {
    const correct = getCorrectVenueForMatch(match.id);
    if (!correct) {
      continue;
    }

    if (match.city !== correct.city || match.venue !== correct.venue) {
      console.log(`Discrepancy in Match #${match.id} (${match.home_team_id || 'TBD'} vs ${match.away_team_id || 'TBD'}):`);
      console.log(`  Current:  ${match.city}, ${match.venue}`);
      console.log(`  Expected: ${correct.city}, ${correct.venue}`);
      
      // Update local object
      const updatedMatch = {
        ...match,
        city: correct.city,
        venue: correct.venue
      };
      updates.push(updatedMatch);
      discrepancyCount++;
    }
  }

  console.log(`\nFound ${discrepancyCount} matches with discrepancies.`);

  if (updates.length > 0) {
    console.log(`Upserting ${updates.length} updated matches back to Supabase...`);
    const { error: upsertError } = await supabase
      .from('matches')
      .upsert(updates, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error during upsert:', upsertError.message);
      process.exit(1);
    }
    console.log('Successfully updated all match venues and cities in the database!');
  } else {
    console.log('No matches needed updates. Everything is already correct!');
  }

  console.log('Script execution finished.');
}

run();
