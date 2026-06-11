import { createClient } from '@supabase/supabase-js';

// Usamos el cliente service role para poder saltarnos las RLS y actualizar los partidos reales
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const mapApiTlaToDbTla = (tla: string | null | undefined): string | null => {
  if (!tla) return null;
  if (tla === 'URY') return 'URU';
  return tla;
};

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
    const homeTla = mapApiTlaToDbTla(apiMatch.homeTeam?.tla);
    const awayTla = mapApiTlaToDbTla(apiMatch.awayTeam?.tla);
    const status = apiMatch.status; // TIMED, SCHEDULED, LIVE, IN_PLAY, PAUSED, FINISHED
    const score = apiMatch.score;

    try {
      // Buscar partido por external_match_id en nuestra BD
      const { data: dbMatches, error: fetchError } = await supabase
        .from('matches')
        .select('*')
        .eq('external_match_id', apiMatch.id.toString());

      if (fetchError) throw fetchError;

      if (dbMatches && dbMatches.length > 0) {
        const dbMatch = dbMatches[0];

        // Determinar si hay cambios en los equipos
        const teamChanged = dbMatch.home_team_id !== homeTla || dbMatch.away_team_id !== awayTla;

        // Determinar si hay cambios en el marcador/estado
        const isLive = status === 'LIVE' || status === 'IN_PLAY' || status === 'PAUSED';
        const isFinished = status === 'FINISHED';
        const newStatus = isFinished ? 'finished' : isLive ? 'live' : 'scheduled';
        const statusChanged = dbMatch.status !== newStatus;

        const homeScore = score?.fullTime?.home;
        const awayScore = score?.fullTime?.away;
        const scoreChanged = dbMatch.home_score !== homeScore || dbMatch.away_score !== awayScore;

        // Si hay algún cambio, actualizar
        if (teamChanged || statusChanged || scoreChanged) {
          // Calcular ganador si es knockout y finalizó
          let winnerId: string | null = null;
          if (dbMatch.phase !== 'group' && isFinished && homeScore !== null && awayScore !== null) {
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

          const updatePayload: any = {
            home_team_id: homeTla,
            away_team_id: awayTla,
            status: newStatus,
            winner_team_id: winnerId
          };

          if (homeScore !== null && homeScore !== undefined) {
            updatePayload.home_score = homeScore;
          }
          if (awayScore !== null && awayScore !== undefined) {
            updatePayload.away_score = awayScore;
          }

          console.log('Update Payload for match', dbMatch.id, ':', JSON.stringify(updatePayload));
          const { error: updateError } = await supabase
            .from('matches')
            .update(updatePayload)
            .eq('id', dbMatch.id);

          if (updateError) throw updateError;
          updatedCount++;
        }
      }
    } catch (err: any) {
      console.error(`Error sincronizando partido API ID ${apiMatch.id}:`, err.message);
      errors.push(`API ID ${apiMatch.id}: ${err.message}`);
    }
  }

  return {
    success: true,
    updatedCount,
    errors
  };
}
