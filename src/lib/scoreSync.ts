import { createClient } from '@supabase/supabase-js';

// Usamos el cliente service role para poder saltarnos las RLS y actualizar los partidos reales
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function syncRealScores() {
  const apiKey = process.env.FOOTBALL_API_KEY;
  if (!apiKey) {
    throw new Error('FOOTBALL_API_KEY no está configurada en las variables de entorno.');
  }

  // Realizar la petición a football-data.org
  // Copa del Mundo: código 'WC'
  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: {
      'X-Auth-Token': apiKey
    },
    next: { revalidate: 0 } // Desactivar caché de Next.js
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error de API football-data.org: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  const apiMatches = data.matches || [];

  let updatedCount = 0;
  const errors: string[] = [];

  for (const apiMatch of apiMatches) {
    const homeTla = apiMatch.homeTeam?.tla;
    const awayTla = apiMatch.awayTeam?.tla;
    const status = apiMatch.status; // SCHEDULED, LIVE, IN_PLAY, PAUSED, FINISHED
    const score = apiMatch.score;

    if (!homeTla || !awayTla) continue;

    // Solo nos interesan partidos que están en juego o finalizados para actualizar el marcador
    const isLive = status === 'LIVE' || status === 'IN_PLAY' || status === 'PAUSED';
    const isFinished = status === 'FINISHED';

    if (!isLive && !isFinished) continue;

    const homeScore = score?.fullTime?.home;
    const awayScore = score?.fullTime?.away;

    if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
      continue;
    }

    try {
      // 1. Intentar buscar por equipos TLA en la fase de grupos o eliminatorias
      // En la fase de grupos cada pareja juega solo una vez, por lo que es único.
      // En eliminatorias también podemos buscar por equipos si ya están cargados.
      const { data: dbMatches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('home_team_id', homeTla)
        .eq('away_team_id', awayTla);

      if (fetchError) throw fetchError;

      if (dbMatches && dbMatches.length > 0) {
        // Encontrar el partido más idóneo (normalmente solo hay 1)
        const dbMatch = dbMatches[0];

        // Mapeo de estado
        const newStatus = isFinished ? 'finished' : 'live';

        // Calcular ganador si es knockout
        let winnerId: string | null = null;
        if (dbMatch.phase !== 'group') {
          if (homeScore > awayScore) {
            winnerId = homeTla;
          } else if (awayScore > homeScore) {
            winnerId = awayTla;
          } else {
            // Empate en penales/prórroga
            if (score.winner === 'HOME_TEAM') {
              winnerId = homeTla;
            } else if (score.winner === 'AWAY_TEAM') {
              winnerId = awayTla;
            }
          }
        }

        // Actualizar base de datos
        const { error: updateError } = await supabase
          .from('matches')
          .update({
            home_score: homeScore,
            away_score: awayScore,
            status: newStatus,
            winner_team_id: winnerId
          })
          .eq('id', dbMatch.id);

        if (updateError) throw updateError;
        updatedCount++;
      }
    } catch (err: any) {
      console.error(`Error sincronizando partido ${homeTla} vs ${awayTla}:`, err.message);
      errors.push(`${homeTla} vs ${awayTla}: ${err.message}`);
    }
  }

  return {
    success: true,
    updatedCount,
    errors
  };
}
