import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TeamSeed {
  id: string;
  name: string;
  flag_emoji: string;
  fifa_ranking: number;
  confederation: string;
  group: string;
}

const teamsSeed: TeamSeed[] = [
  // Grupo A
  { id: 'MEX', name: 'México', flag_emoji: '🇲🇽', fifa_ranking: 15, confederation: 'CONCACAF', group: 'A' },
  { id: 'RSA', name: 'Sudáfrica', flag_emoji: '🇿🇦', fifa_ranking: 59, confederation: 'CAF', group: 'A' },
  { id: 'KOR', name: 'Corea del Sur', flag_emoji: '🇰🇷', fifa_ranking: 22, confederation: 'AFC', group: 'A' },
  { id: 'CZE', name: 'Chequia', flag_emoji: '🇨🇿', fifa_ranking: 36, confederation: 'UEFA', group: 'A' },
  // Grupo B
  { id: 'CAN', name: 'Canadá', flag_emoji: '🇨🇦', fifa_ranking: 49, confederation: 'CONCACAF', group: 'B' },
  { id: 'SUI', name: 'Suiza', flag_emoji: '🇨🇭', fifa_ranking: 19, confederation: 'UEFA', group: 'B' },
  { id: 'QAT', name: 'Qatar', flag_emoji: '🇶🇦', fifa_ranking: 34, confederation: 'AFC', group: 'B' },
  { id: 'BIH', name: 'Bosnia y Herzegovina', flag_emoji: '🇧🇦', fifa_ranking: 74, confederation: 'UEFA', group: 'B' },
  // Grupo C
  { id: 'BRA', name: 'Brasil', flag_emoji: '🇧🇷', fifa_ranking: 5, confederation: 'CONMEBOL', group: 'C' },
  { id: 'MAR', name: 'Marruecos', flag_emoji: '🇲🇦', fifa_ranking: 12, confederation: 'CAF', group: 'C' },
  { id: 'HAI', name: 'Haití', flag_emoji: '🇭🇹', fifa_ranking: 86, confederation: 'CONCACAF', group: 'C' },
  { id: 'SCO', name: 'Escocia', flag_emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', fifa_ranking: 39, confederation: 'UEFA', group: 'C' },
  // Grupo D
  { id: 'USA', name: 'USA', flag_emoji: '🇺🇸', fifa_ranking: 11, confederation: 'CONCACAF', group: 'D' },
  { id: 'PAR', name: 'Paraguay', flag_emoji: '🇵🇾', fifa_ranking: 56, confederation: 'CONMEBOL', group: 'D' },
  { id: 'AUS', name: 'Australia', flag_emoji: '🇦🇺', fifa_ranking: 23, confederation: 'AFC', group: 'D' },
  { id: 'TUR', name: 'Türkiye', flag_emoji: '🇹🇷', fifa_ranking: 40, confederation: 'UEFA', group: 'D' },
  // Grupo E
  { id: 'GER', name: 'Alemania', flag_emoji: '🇩🇪', fifa_ranking: 16, confederation: 'UEFA', group: 'E' },
  { id: 'CUW', name: 'Curazao', flag_emoji: '🇨🇼', fifa_ranking: 91, confederation: 'CONCACAF', group: 'E' },
  { id: 'CIV', name: 'Costa de Marfil', flag_emoji: '🇨🇮', fifa_ranking: 38, confederation: 'CAF', group: 'E' },
  { id: 'ECU', name: 'Ecuador', flag_emoji: '🇪🇨', fifa_ranking: 31, confederation: 'CONMEBOL', group: 'E' },
  // Grupo F
  { id: 'NED', name: 'Países Bajos', flag_emoji: '🇳🇱', fifa_ranking: 7, confederation: 'UEFA', group: 'F' },
  { id: 'JPN', name: 'Japón', flag_emoji: '🇯🇵', fifa_ranking: 17, confederation: 'AFC', group: 'F' },
  { id: 'SWE', name: 'Suecia', flag_emoji: '🇸🇪', fifa_ranking: 28, confederation: 'UEFA', group: 'F' },
  { id: 'TUN', name: 'Túnez', flag_emoji: '🇹🇳', fifa_ranking: 41, confederation: 'CAF', group: 'F' },
  // Grupo G
  { id: 'BEL', name: 'Bélgica', flag_emoji: '🇧🇪', fifa_ranking: 3, confederation: 'UEFA', group: 'G' },
  { id: 'EGY', name: 'Egipto', flag_emoji: '🇪🇬', fifa_ranking: 37, confederation: 'CAF', group: 'G' },
  { id: 'IRN', name: 'Irán', flag_emoji: '🇮🇷', fifa_ranking: 20, confederation: 'AFC', group: 'G' },
  { id: 'NZL', name: 'Nueva Zelanda', flag_emoji: '🇳🇿', fifa_ranking: 104, confederation: 'OFC', group: 'G' },
  // Grupo H
  { id: 'ESP', name: 'España', flag_emoji: '🇪🇸', fifa_ranking: 8, confederation: 'UEFA', group: 'H' },
  { id: 'CPV', name: 'Cabo Verde', flag_emoji: '🇨🇻', fifa_ranking: 65, confederation: 'CAF', group: 'H' },
  { id: 'KSA', name: 'Arabia Saudita', flag_emoji: '🇸🇦', fifa_ranking: 53, confederation: 'AFC', group: 'H' },
  { id: 'URU', name: 'Uruguay', flag_emoji: '🇺🇾', fifa_ranking: 14, confederation: 'CONMEBOL', group: 'H' },
  // Grupo I
  { id: 'FRA', name: 'Francia', flag_emoji: '🇫🇷', fifa_ranking: 2, confederation: 'UEFA', group: 'I' },
  { id: 'SEN', name: 'Senegal', flag_emoji: '🇸🇳', fifa_ranking: 18, confederation: 'CAF', group: 'I' },
  { id: 'NOR', name: 'Noruega', flag_emoji: '🇳🇴', fifa_ranking: 47, confederation: 'UEFA', group: 'I' },
  { id: 'IRQ', name: 'Iraq', flag_emoji: '🇮🇶', fifa_ranking: 58, confederation: 'AFC', group: 'I' },
  // Grupo J
  { id: 'ARG', name: 'Argentina', flag_emoji: '🇦🇷', fifa_ranking: 1, confederation: 'CONMEBOL', group: 'J' },
  { id: 'ALG', name: 'Argelia', flag_emoji: '🇩🇿', fifa_ranking: 43, confederation: 'CAF', group: 'J' },
  { id: 'AUT', name: 'Austria', flag_emoji: '🇦🇹', fifa_ranking: 25, confederation: 'UEFA', group: 'J' },
  { id: 'JOR', name: 'Jordania', flag_emoji: '🇯🇴', fifa_ranking: 71, confederation: 'AFC', group: 'J' },
  // Grupo K
  { id: 'POR', name: 'Portugal', flag_emoji: '🇵🇹', fifa_ranking: 6, confederation: 'UEFA', group: 'K' },
  { id: 'COD', name: 'DR Congo', flag_emoji: '🇨🇩', fifa_ranking: 63, confederation: 'CAF', group: 'K' },
  { id: 'UZB', name: 'Uzbekistán', flag_emoji: '🇺🇿', fifa_ranking: 64, confederation: 'AFC', group: 'K' },
  { id: 'COL', name: 'Colombia', flag_emoji: '🇨🇴', fifa_ranking: 12, confederation: 'CONMEBOL', group: 'K' },
  // Grupo L
  { id: 'ENG', name: 'Inglaterra', flag_emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', fifa_ranking: 4, confederation: 'UEFA', group: 'L' },
  { id: 'CRO', name: 'Croacia', flag_emoji: '🇭🇷', fifa_ranking: 10, confederation: 'UEFA', group: 'L' },
  { id: 'GHA', name: 'Ghana', flag_emoji: '🇬🇭', fifa_ranking: 68, confederation: 'CAF', group: 'L' },
  { id: 'PAN', name: 'Panamá', flag_emoji: '🇵🇦', fifa_ranking: 45, confederation: 'CONCACAF', group: 'L' },
];

const groupVenues: { city: string; venue: string }[][] = [
  // Grupo A (gIdx = 0)
  [
    { city: 'Ciudad de México', venue: 'Estadio Azteca' },
    { city: 'Guadalajara', venue: 'Estadio Akron' },
    { city: 'Guadalajara', venue: 'Estadio Akron' },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Ciudad de México', venue: 'Estadio Azteca' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' }
  ],
  // Grupo B (gIdx = 1)
  [
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Seattle', venue: 'Lumen Field' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Toronto', venue: 'BMO Field' }
  ],
  // Grupo C (gIdx = 2)
  [
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { city: 'Monterrey', venue: 'Estadio BBVA' },
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Dallas', venue: 'AT&T Stadium' }
  ],
  // Grupo D (gIdx = 3)
  [
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Seattle', venue: 'Lumen Field' }
  ],
  // Grupo E (gIdx = 4)
  [
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Monterrey', venue: 'Estadio BBVA' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' }
  ],
  // Grupo F (gIdx = 5)
  [
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Monterrey', venue: 'Estadio BBVA' },
    { city: 'Miami', venue: 'Hard Rock Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'Seattle', venue: 'Lumen Field' }
  ],
  // Grupo G (gIdx = 6)
  [
    { city: 'Seattle', venue: 'Lumen Field' },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' }
  ],
  // Grupo H (gIdx = 7)
  [
    { city: 'Miami', venue: 'Hard Rock Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Kansas City', venue: 'Arrowhead Stadium' }
  ],
  // Grupo I (gIdx = 8)
  [
    { city: 'New York/NJ', venue: 'MetLife Stadium' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' }
  ],
  // Grupo J (gIdx = 9)
  [
    { city: 'San Francisco', venue: "Levi's Stadium" },
    { city: 'Los Angeles', venue: 'SoFi Stadium' },
    { city: 'Seattle', venue: 'Lumen Field' },
    { city: 'Vancouver', venue: 'BC Place' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' }
  ],
  // Grupo K (gIdx = 10)
  [
    { city: 'Houston', venue: 'NRG Stadium' },
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Toronto', venue: 'BMO Field' },
    { city: 'Kansas City', venue: 'Arrowhead Stadium' },
    { city: 'Miami', venue: 'Hard Rock Stadium' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' }
  ],
  // Grupo L (gIdx = 11)
  [
    { city: 'Dallas', venue: 'AT&T Stadium' },
    { city: 'Toronto', venue: 'BMO Field' },
    { city: 'Atlanta', venue: 'Mercedes-Benz Stadium' },
    { city: 'Boston', venue: 'Gillette Stadium' },
    { city: 'Philadelphia', venue: 'Lincoln Financial Field' },
    { city: 'New York/NJ', venue: 'MetLife Stadium' }
  ]
];

async function seed() {
  console.log('Iniciando carga de datos de semilla en Supabase...');

  // 1. Limpiar datos existentes en cascada (Desactivado para prevenir borrados en cascada de predicciones de usuarios)
  console.log('Limpiando tablas (desactivado para conservar predicciones existentes)...');
  // const { error: deleteMatchesError } = await supabase.from('matches').delete().neq('id', 0);
  // if (deleteMatchesError) console.error('Aviso al limpiar matches:', deleteMatchesError.message);

  // const { error: deleteTeamsError } = await supabase.from('teams').delete().neq('id', 'NONE');
  // if (deleteTeamsError) console.error('Aviso al limpiar teams:', deleteTeamsError.message);

  // 2. Inserción no destructiva de equipos
  console.log(`Upserteando ${teamsSeed.length} equipos...`);
  const teamsData = teamsSeed.map(({ id, name, flag_emoji, fifa_ranking, confederation }) => ({
    id, name, flag_emoji, fifa_ranking, confederation
  }));

  const { error: insertTeamsError } = await supabase.from('teams').upsert(teamsData, { onConflict: 'id' });
  if (insertTeamsError) {
    console.error('Error al insertar equipos:', insertTeamsError.message);
    process.exit(1);
  }
  console.log('Equipos insertados con éxito.');

  // 3. Generar fixture de Fase de Grupos (72 partidos, 11 jun al 27 jun 2026)
  console.log('Generando fixture de fase de grupos...');
  const matchesToInsert: any[] = [];
  let matchIdCounter = 1;

  // Estructura de partidos para un grupo de 4 equipos (equipos [0, 1, 2, 3])
  // Cada partido debe tener una fecha coherente.
  // Vamos a agrupar los partidos en rondas:
  // Ronda 1: G1 (Eq0 vs Eq1), G2 (Eq2 vs Eq3) -> Jugado en la primera ventana (Junio 11-16)
  // Ronda 2: G3 (Eq0 vs Eq2), G4 (Eq1 vs Eq3) -> Jugado en la segunda ventana (Junio 17-21)
  // Ronda 3: G5 (Eq3 vs Eq0), G6 (Eq1 vs Eq2) -> Jugados simultáneamente en la tercera ventana (Junio 22-27)

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  // Fechas y sedes de la fase de grupos en UTC
  // Ronda 1: Partidos distribuidos del 11 al 16 de Junio (6 días, 2 partidos por grupo)
  // Ronda 2: Partidos distribuidos del 17 al 21 de Junio (5 días)
  // Ronda 3 (simultáneos): Partidos distribuidos del 22 al 27 de Junio (6 días)

  // Asignar fechas secuenciales pero realistas
  for (let gIdx = 0; gIdx < groups.length; gIdx++) {
    const groupName = groups[gIdx];
    const groupTeams = teamsSeed.filter(t => t.group === groupName);

    if (groupTeams.length !== 4) {
      console.error(`Error: El grupo ${groupName} no tiene 4 equipos.`);
      continue;
    }

    // Definición de las 3 rondas del grupo
    const groupMatchups = [
      // Ronda 1
      { home: groupTeams[0].id, away: groupTeams[1].id, round: 1 },
      { home: groupTeams[2].id, away: groupTeams[3].id, round: 1 },
      // Ronda 2
      { home: groupTeams[0].id, away: groupTeams[2].id, round: 2 },
      { home: groupTeams[1].id, away: groupTeams[3].id, round: 2 },
      // Ronda 3 (simultáneos)
      { home: groupTeams[3].id, away: groupTeams[0].id, round: 3 },
      { home: groupTeams[1].id, away: groupTeams[2].id, round: 3 },
    ];

    for (let mIdx = 0; mIdx < groupMatchups.length; mIdx++) {
      const matchup = groupMatchups[mIdx];
      const matchId = matchIdCounter++;

      // Calcular fecha y hora ficticia realista del partido en UTC
      let matchDate: Date;
      let venueObj = groupVenues[gIdx][mIdx];

      if (matchup.round === 1) {
        // Ronda 1: Match 1 is June 11 at 19:00 UTC (2:00 PM Bogota); Match 2 is June 12 at 02:00 UTC (9:00 PM Bogota)
        const dayOffset = Math.floor(gIdx / 2); // 0 a 5
        const day = 11 + dayOffset;
        if (mIdx % 2 === 0) {
          const dateStr = `2026-06-${String(day).padStart(2, '0')}T19:00:00Z`;
          matchDate = new Date(dateStr);
        } else {
          const dateStr = `2026-06-${String(day + 1).padStart(2, '0')}T02:00:00Z`;
          matchDate = new Date(dateStr);
        }
      } else if (matchup.round === 2) {
        // Ronda 2: Match 1 is June 17 at 22:00 UTC (5:00 PM Bogota); Match 2 is June 18 at 01:00 UTC (8:00 PM Bogota)
        const dayOffset = Math.floor(gIdx / 2.5); // 0 a 4
        const day = 17 + dayOffset;
        if (mIdx % 2 === 0) {
          const dateStr = `2026-06-${String(day).padStart(2, '0')}T22:00:00Z`;
          matchDate = new Date(dateStr);
        } else {
          const dateStr = `2026-06-${String(day + 1).padStart(2, '0')}T01:00:00Z`;
          matchDate = new Date(dateStr);
        }
      } else {
        // Ronda 3 (Simultáneos): Ambos partidos son el 22 de Junio en adelante a las 19:00 UTC (2:00 PM Bogota)
        const dayOffset = Math.floor(gIdx / 2); // 0 a 5
        const day = 22 + dayOffset;
        const dateStr = `2026-06-${String(day).padStart(2, '0')}T19:00:00Z`;
        matchDate = new Date(dateStr);
      }

      // Tiempo de bloqueo para predicciones en vivo (1 hora antes del pitazo inicial)
      const lockTime = new Date(matchDate.getTime() - 60 * 60 * 1000);

      matchesToInsert.push({
        id: matchId,
        phase: 'group',
        home_team_id: matchup.home,
        away_team_id: matchup.away,
        match_date: matchDate.toISOString(),
        venue: venueObj.venue,
        city: venueObj.city,
        status: 'scheduled',
        lock_time_part2: lockTime.toISOString(),
        external_match_id: `WC26_G_${groupName}_${matchId}`
      });
    }
  }

  // Ordenar los partidos por ID para mantener consistencia
  matchesToInsert.sort((a, b) => a.id - b.id);

  console.log(`Upserteando ${matchesToInsert.length} partidos de la fase de grupos...`);
  const { error: insertMatchesError } = await supabase.from('matches').upsert(matchesToInsert, { onConflict: 'id' });
  if (insertMatchesError) {
    console.error('Error al insertar partidos:', insertMatchesError.message);
    process.exit(1);
  }

  console.log('¡Fixture de la fase de grupos sembrado con éxito!');
  console.log('--- Proceso de Semilla Terminado ---');
}

seed();
