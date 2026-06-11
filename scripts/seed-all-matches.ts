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
  74: { city: 'New York/NJ', venue: 'MetLife Stadium' },
  75: { city: 'Dallas', venue: 'AT&T Stadium' },
  76: { city: 'Miami', venue: 'Hard Rock Stadium' },
  77: { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  78: { city: 'Seattle', venue: 'Lumen Field' },
  79: { city: 'Vancouver', venue: 'BC Place' },
  80: { city: 'Mexico City', venue: 'Estadio Azteca' },
  81: { city: 'Houston', venue: 'NRG Stadium' },
  82: { city: 'Boston', venue: 'Gillette Stadium' },
  83: { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
  84: { city: 'Toronto', venue: 'BMO Field' },
  85: { city: 'San Francisco', venue: "Levi's Stadium" },
  86: { city: 'Kansas City', venue: 'Arrowhead Stadium' },
  87: { city: 'Monterrey', venue: 'Estadio BBVA' },
  88: { city: 'Guadalajara', venue: 'Estadio Akron' },
  // Round of 16 (89 to 96)
  89: { city: 'Vancouver', venue: 'BC Place' },
  90: { city: 'Seattle', venue: 'Lumen Field' },
  91: { city: 'Mexico City', venue: 'Estadio Azteca' },
  92: { city: 'Houston', venue: 'NRG Stadium' },
  93: { city: 'Dallas', venue: 'AT&T Stadium' },
  94: { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
  95: { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
  96: { city: 'New York/NJ', venue: 'MetLife Stadium' },
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

  const updatesKo: any[] = [];
  for (const stageInfo of stages) {
    // Filtrar y ordenar cronológicamente
    const stageApiMatches = apiMatches
      .filter((m: any) => m.stage === stageInfo.key)
      .sort((a: any, b: any) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());

    if (stageApiMatches.length !== stageInfo.count) {
      console.error(`Error: Se esperaban ${stageInfo.count} partidos para ${stageInfo.key}, pero se obtuvieron ${stageApiMatches.length}`);
      process.exit(1);
    }

    stageApiMatches.forEach((apiMatch: any, idx: number) => {
      const matchId = stageInfo.startId + idx;
      const venueInfo = knockoutVenues[matchId] || { city: 'TBD', venue: 'TBD' };
      const lockTime = new Date(new Date(apiMatch.utcDate).getTime() - 60 * 60 * 1000);

      // Si la API ya tiene definidos los equipos, los usamos, sino los dejamos en null
      const homeTla = mapApiTlaToDbTla(apiMatch.homeTeam?.tla);
      const awayTla = mapApiTlaToDbTla(apiMatch.awayTeam?.tla);

      updatesKo.push({
        id: matchId,
        phase: stageInfo.phase,
        home_team_id: homeTla,
        away_team_id: awayTla,
        match_date: apiMatch.utcDate,
        lock_time_part2: lockTime.toISOString(),
        external_match_id: apiMatch.id.toString(),
        venue: venueInfo.venue,
        city: venueInfo.city,
        status: apiMatch.status === 'FINISHED' ? 'finished' : (apiMatch.status === 'LIVE' || apiMatch.status === 'IN_PLAY' || apiMatch.status === 'PAUSED') ? 'live' : 'scheduled'
      });
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
