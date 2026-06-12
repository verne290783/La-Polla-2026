import { createClient } from '@supabase/supabase-js';

// Usamos el cliente service role para poder saltarnos las RLS y actualizar los partidos reales
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NAME_TO_ID: Record<string, string> = {
  'mexico': 'MEX',
  'south africa': 'RSA',
  'south korea': 'KOR',
  'czech republic': 'CZE',
  'chequia': 'CZE',
  'czechia': 'CZE',
  'canada': 'CAN',
  'switzerland': 'SUI',
  'qatar': 'QAT',
  'bosnia and herzegovina': 'BIH',
  'brazil': 'BRA',
  'morocco': 'MAR',
  'haiti': 'HAI',
  'scotland': 'SCO',
  'united states': 'USA',
  'usa': 'USA',
  'paraguay': 'PAR',
  'australia': 'AUS',
  'türkiye': 'TUR',
  'turkey': 'TUR',
  'germany': 'GER',
  'curacao': 'CUW',
  'curaçao': 'CUW',
  'ivory coast': 'CIV',
  'ecuador': 'ECU',
  'netherlands': 'NED',
  'japan': 'JPN',
  'sweden': 'SWE',
  'tunisia': 'TUN',
  'belgium': 'BEL',
  'egypt': 'EGY',
  'iran': 'IRN',
  'new zealand': 'NZL',
  'spain': 'ESP',
  'cape verde': 'CPV',
  'saudi arabia': 'KSA',
  'uruguay': 'URU',
  'france': 'FRA',
  'senegal': 'SEN',
  'norway': 'NOR',
  'iraq': 'IRQ',
  'argentina': 'ARG',
  'algeria': 'ALG',
  'austria': 'AUT',
  'jordan': 'JOR',
  'portugal': 'POR',
  'democratic republic of the congo': 'COD',
  'dr congo': 'COD',
  'congo dr': 'COD',
  'uzbekistan': 'UZB',
  'colombia': 'COL',
  'england': 'ENG',
  'croatia': 'CRO',
  'ghana': 'GHA',
  'panama': 'PAN'
};

const mapNameToId = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  return NAME_TO_ID[key] || null;
};

const mapApiTlaToDbTla = (tla: string | null | undefined): string | null => {
  if (!tla) return null;
  if (tla === 'URY') return 'URU';
  return tla;
};

export async function syncRealScores() {
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (apiKey && apiKey.trim() !== '') {
    try {
      console.log('Attempting score sync from api.football-data.org...');
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 0 }
      });

      if (res.status !== 200) {
        const errText = await res.text();
        throw new Error(`api.football-data.org fetch failed with status ${res.status}: ${errText}`);
      }

      const data: any = await res.json();
      const apiMatches = data.matches || [];
      if (apiMatches.length === 0) {
        throw new Error('No matches returned from api.football-data.org');
      }

      // Fetch db matches
      const { data: dbMatches, error: dbError } = await supabase
        .from('matches')
        .select('*');

      if (dbError) {
        throw new Error(`Error al obtener partidos locales: ${dbError.message}`);
      }

      let updatedCount = 0;
      const errors: string[] = [];

      for (const apiMatch of apiMatches) {
        try {
          if (!apiMatch.id) continue;
          const apiMatchIdStr = apiMatch.id.toString();
          
          // Match database matches where external_match_id === apiMatch.id.toString()
          const dbMatch = dbMatches.find(m => m.external_match_id === apiMatchIdStr);
          if (!dbMatch) continue;

          // Match status: 'FINISHED' -> 'finished', 'IN_PLAY'/'PAUSED'/'LIVE' -> 'live', else 'scheduled'
          const apiStatus = apiMatch.status;
          let newStatus = 'scheduled';
          if (apiStatus === 'FINISHED') {
            newStatus = 'finished';
          } else if (apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED' || apiStatus === 'LIVE') {
            newStatus = 'live';
          }

          // Scores: update home_score and away_score if status is 'finished' or 'live'
          const isFinished = newStatus === 'finished';
          const isLive = newStatus === 'live';
          
          const homeScore = (isFinished || isLive) &&
                            apiMatch.score?.fullTime?.home !== undefined &&
                            apiMatch.score?.fullTime?.home !== null
                              ? Number(apiMatch.score.fullTime.home)
                              : null;
          const awayScore = (isFinished || isLive) &&
                            apiMatch.score?.fullTime?.away !== undefined &&
                            apiMatch.score?.fullTime?.away !== null
                              ? Number(apiMatch.score.fullTime.away)
                              : null;

          // Map home and away team IDs for knockouts if defined
          const homeTla = mapApiTlaToDbTla(apiMatch.homeTeam?.tla);
          const awayTla = mapApiTlaToDbTla(apiMatch.awayTeam?.tla);

          // Winner calculation for knockout phase
          let winnerId: string | null = null;
          if (dbMatch.phase !== 'group' && isFinished) {
            const apiWinner = apiMatch.score?.winner; // 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
            if (apiWinner === 'HOME_TEAM') {
              winnerId = homeTla || dbMatch.home_team_id;
            } else if (apiWinner === 'AWAY_TEAM') {
              winnerId = awayTla || dbMatch.away_team_id;
            }
          }

          // Check if updates are needed
          let teamChanged = false;
          if (dbMatch.phase !== 'group') {
            if (homeTla && dbMatch.home_team_id !== homeTla) teamChanged = true;
            if (awayTla && dbMatch.away_team_id !== awayTla) teamChanged = true;
          }

          const statusChanged = dbMatch.status !== newStatus;
          const scoreChanged = (homeScore !== null && dbMatch.home_score !== homeScore) ||
                               (awayScore !== null && dbMatch.away_score !== awayScore);
          const winnerChanged = dbMatch.winner_team_id !== winnerId;

          if (teamChanged || statusChanged || scoreChanged || winnerChanged) {
            const updatePayload: any = {
              status: newStatus,
              winner_team_id: winnerId
            };
            if (dbMatch.phase !== 'group') {
              if (homeTla) updatePayload.home_team_id = homeTla;
              if (awayTla) updatePayload.away_team_id = awayTla;
            }
            if (homeScore !== null) updatePayload.home_score = homeScore;
            if (awayScore !== null) updatePayload.away_score = awayScore;

            console.log(`Updating match local ID ${dbMatch.id}:`, JSON.stringify(updatePayload));
            const { error: updateError } = await supabase
              .from('matches')
              .update(updatePayload)
              .eq('id', dbMatch.id);

            if (updateError) throw updateError;
            updatedCount++;
          }
        } catch (err: any) {
          console.error(`Error updating match API ID ${apiMatch.id}:`, err.message);
          errors.push(`API ID ${apiMatch.id}: ${err.message}`);
        }
      }

      return {
        success: true,
        source: 'football-data.org' as const,
        updatedCount,
        errors
      };
    } catch (apiError: any) {
      console.warn('api.football-data.org sync failed, falling back to worldcup26.ir. Error:', apiError.message || apiError);
    }
  } else {
    console.log('No or empty FOOTBALL_API_KEY configured. Falling back to worldcup26.ir.');
  }

  // Fallback to worldcup26.ir (existing code logic)
  try {
    console.log('Attempting score sync from worldcup26.ir...');
    const res = await fetch('https://worldcup26.ir/get/games', {
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error de API worldcup26.ir: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    const apiMatches = data.games || [];

    const { data: dbMatches, error: dbError } = await supabase
      .from('matches')
      .select('*');

    if (dbError) {
      throw new Error(`Error al obtener partidos locales: ${dbError.message}`);
    }

    let updatedCount = 0;
    const errors: string[] = [];

    for (const apiMatch of apiMatches) {
      const apiMatchId = parseInt(apiMatch.id);
      const homeTla = mapNameToId(apiMatch.home_team_name_en);
      const awayTla = mapNameToId(apiMatch.away_team_name_en);
      
      const isFinished = apiMatch.finished === 'TRUE';
      const isLive = apiMatch.time_elapsed && apiMatch.time_elapsed !== 'notstarted' && apiMatch.time_elapsed !== 'finished';
      const newStatus = isFinished ? 'finished' : isLive ? 'live' : 'scheduled';

      const homeScore = (newStatus === 'finished' || newStatus === 'live') ? parseInt(apiMatch.home_score) : null;
      const awayScore = (newStatus === 'finished' || newStatus === 'live') ? parseInt(apiMatch.away_score) : null;

      try {
        let dbMatch: any = null;

        if (apiMatch.type === 'group') {
          if (homeTla && awayTla) {
            dbMatch = dbMatches.find(m =>
              m.phase === 'group' &&
              ((m.home_team_id === homeTla && m.away_team_id === awayTla) ||
               (m.home_team_id === awayTla && m.away_team_id === homeTla))
            );
          }
        } else {
          dbMatch = dbMatches.find(m => m.id === apiMatchId);
        }

        if (dbMatch) {
          const teamChanged = dbMatch.home_team_id !== homeTla || dbMatch.away_team_id !== awayTla;
          const statusChanged = dbMatch.status !== newStatus;
          const scoreChanged = dbMatch.home_score !== homeScore || dbMatch.away_score !== awayScore;

          if (teamChanged || statusChanged || scoreChanged) {
            let winnerId: string | null = null;
            if (dbMatch.phase !== 'group' && isFinished && homeScore !== null && awayScore !== null) {
              if (homeScore > awayScore) {
                winnerId = homeTla;
              } else if (awayScore > homeScore) {
                winnerId = awayTla;
              } else {
                const homeName = apiMatch.home_team_name_en;
                const awayName = apiMatch.away_team_name_en;

                const advancedHome = apiMatches.some((laterMatch: any) =>
                  parseInt(laterMatch.id) > apiMatchId &&
                  (laterMatch.home_team_name_en === homeName || laterMatch.away_team_name_en === homeName)
                );
                const advancedAway = apiMatches.some((laterMatch: any) =>
                  parseInt(laterMatch.id) > apiMatchId &&
                  (laterMatch.home_team_name_en === awayName || laterMatch.away_team_name_en === awayName)
                );

                if (advancedHome && !advancedAway) {
                  winnerId = homeTla;
                } else if (advancedAway && !advancedHome) {
                  winnerId = awayTla;
                }
              }
            }

            const updatePayload: any = {
              status: newStatus,
              winner_team_id: winnerId
            };

            if (homeTla) updatePayload.home_team_id = homeTla;
            if (awayTla) updatePayload.away_team_id = awayTla;

            if (homeScore !== null) updatePayload.home_score = homeScore;
            if (awayScore !== null) updatePayload.away_score = awayScore;

            console.log(`Actualizando partido local ID ${dbMatch.id}:`, JSON.stringify(updatePayload));
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
      source: 'worldcup26.ir' as const,
      updatedCount,
      errors
    };
  } catch (fallbackErr: any) {
    console.error('Fallback score sync failed:', fallbackErr.message || fallbackErr);
    throw new Error(`Both sync APIs failed. Primary failed or bypassed. Fallback error: ${fallbackErr.message || fallbackErr}`);
  }
}
