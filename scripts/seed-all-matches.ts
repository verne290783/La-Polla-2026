import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apiKey = process.env.FOOTBALL_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !apiKey) {
  console.error('Error: Faltan variables de entorno (Supabase URL, Service Role Key o Football API Key) en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

const mapApiTlaToDbTla = (tla: string | null | undefined): string | null => {
  if (!tla) return null;
  if (tla === 'URY') return 'URU';
  return tla;
};

async function seed() {
  console.log('Consultando partidos de football-data.org...');
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': apiKey! }
  });

  if (!res.ok) {
    console.error('Error consultando la API:', res.status, await res.text());
    process.exit(1);
  }

  const data: any = await res.json();
  const apiMatches = data.matches || [];
  console.log(`Partidos obtenidos de la API: ${apiMatches.length}`);

  // 1. Obtener los partidos de la fase de grupos en la BD local
  console.log('Consultando partidos locales de fase de grupos...');
  const { data: dbGroupMatches, error: dbError } = await supabase
    .from('matches')
    .select('*')
    .eq('phase', 'group');

  if (dbError) {
    console.error('Error al obtener partidos locales:', dbError.message);
    process.exit(1);
  }

  console.log(`Partidos de grupos locales: ${dbGroupMatches.length}`);

  // 2. Mapear partidos de grupos locales con los partidos de la API
  console.log('Mapeando partidos de grupos...');
  const apiGroupMatches = apiMatches.filter((m: any) => m.stage === 'GROUP_STAGE');

  const updatesGroup: any[] = [];
  for (const apiMatch of apiGroupMatches) {
    const homeTla = mapApiTlaToDbTla(apiMatch.homeTeam?.tla);
    const awayTla = mapApiTlaToDbTla(apiMatch.awayTeam?.tla);

    if (!homeTla || !awayTla) continue;

    // Buscar el partido local correspondiente
    const localMatch = dbGroupMatches.find(
      (m: any) =>
        (m.home_team_id === homeTla && m.away_team_id === awayTla) ||
        (m.home_team_id === awayTla && m.away_team_id === homeTla)
    );

    if (localMatch) {
      const lockTime = new Date(new Date(apiMatch.utcDate).getTime() - 60 * 60 * 1000);
      updatesGroup.push({
        id: localMatch.id,
        phase: 'group',
        home_team_id: localMatch.home_team_id,
        away_team_id: localMatch.away_team_id,
        match_date: apiMatch.utcDate,
        lock_time_part2: lockTime.toISOString(),
        external_match_id: apiMatch.id.toString(),
        venue: localMatch.venue,
        city: localMatch.city,
        status: localMatch.status === 'finished' ? 'finished' : localMatch.status === 'live' ? 'live' : 'scheduled'
      });
    } else {
      console.warn(`No se encontró partido local para ${homeTla} vs ${awayTla}`);
    }
  }

  console.log(`Actualizando ${updatesGroup.length} partidos de grupos con external_match_id y fechas oficiales...`);
  const { error: upsertGroupsError } = await supabase.from('matches').upsert(updatesGroup, { onConflict: 'id' });
  if (upsertGroupsError) {
    console.error('Error al actualizar grupos:', upsertGroupsError.message);
    process.exit(1);
  }
  console.log('Partidos de grupos actualizados con éxito.');

  // 3. Procesar partidos de eliminatorias (knockouts)
  console.log('Mapeando y sembrando partidos de eliminatorias...');
  const stages = [
    { key: 'LAST_32', phase: 'r32', startId: 73, count: 16 },
    { key: 'LAST_16', phase: 'r16', startId: 89, count: 8 },
    { key: 'QUARTER_FINALS', phase: 'qf', startId: 97, count: 4 },
    { key: 'SEMI_FINALS', phase: 'sf', startId: 101, count: 2 },
    { key: 'THIRD_PLACE', phase: '3rd', startId: 103, count: 1 },
    { key: 'FINAL', phase: 'final', startId: 104, count: 1 }
  ];

  const API_TO_LOCAL_MATCH_ID: Record<string, number> = {
    '537417': 73,
    '537415': 74,
    '537418': 75,
    '537423': 76,
    '537416': 77,
    '537424': 78,
    '537425': 79,
    '537426': 80,
    '537421': 81,
    '537422': 82,
    '537419': 83,
    '537420': 84,
    '537429': 85,
    '537427': 86,
    '537430': 87,
    '537428': 88,
    '537375': 89,
    '537376': 90,
    '537377': 91,
    '537378': 92,
    '537379': 93,
    '537380': 94,
    '537381': 95,
    '537382': 96,
    '537383': 97,
    '537384': 98,
    '537385': 99,
    '537386': 100,
    '537387': 101,
    '537388': 102,
    '537389': 103,
    '537390': 104
  };

  const updatesKo: any[] = [];
  const apiKoMatches = apiMatches.filter((m: any) => m.stage !== 'GROUP_STAGE');

  for (const apiMatch of apiKoMatches) {
    const apiIdStr = apiMatch.id.toString();
    const matchId = API_TO_LOCAL_MATCH_ID[apiIdStr];
    if (!matchId) {
      console.warn(`No se encontró mapeo para el partido de la API ID ${apiIdStr}`);
      continue;
    }

    const stageInfo = stages.find(s => matchId >= s.startId && matchId < s.startId + s.count);
    if (!stageInfo) {
      console.warn(`No se encontró información de fase para el ID local ${matchId}`);
      continue;
    }

    const venueInfo = knockoutVenues[matchId] || { city: 'TBD', venue: 'TBD' };
    const lockTime = new Date(new Date(apiMatch.utcDate).getTime() - 60 * 60 * 1000);

    const homeTla = mapApiTlaToDbTla(apiMatch.homeTeam?.tla);
    const awayTla = mapApiTlaToDbTla(apiMatch.awayTeam?.tla);

    updatesKo.push({
      id: matchId,
      phase: stageInfo.phase,
      home_team_id: homeTla,
      away_team_id: awayTla,
      match_date: apiMatch.utcDate,
      lock_time_part2: lockTime.toISOString(),
      external_match_id: apiIdStr,
      venue: venueInfo.venue,
      city: venueInfo.city,
      status: apiMatch.status === 'FINISHED' ? 'finished' : (apiMatch.status === 'LIVE' || apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED') ? 'live' : 'scheduled'
    });
  }

  console.log(`Upserteando ${updatesKo.length} partidos de eliminatorias (IDs 73 al 104)...`);
  const { error: upsertKoError } = await supabase.from('matches').upsert(updatesKo, { onConflict: 'id' });
  if (upsertKoError) {
    console.error('Error al insertar eliminatorias:', upsertKoError.message);
    process.exit(1);
  }

  console.log('¡Se sembraron y mapearon con éxito todos los 104 partidos del torneo!');
}

seed();
