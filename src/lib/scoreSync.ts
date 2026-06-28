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

  let primaryMatches: any[] = [];
  let primarySuccess = false;

  // 1. Fetch from primary API (api.football-data.org)
  if (apiKey && apiKey.trim() !== '') {
    try {
      console.log('Attempting score sync from api.football-data.org...');
      const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
        headers: { 'X-Auth-Token': apiKey },
        next: { revalidate: 0 }
      });

      if (res.status === 200) {
        const data = await res.json();
        primaryMatches = data.matches || [];
        if (primaryMatches.length > 0) {
          primarySuccess = true;
          console.log(`Successfully fetched ${primaryMatches.length} matches from api.football-data.org`);
        }
      } else {
        const errText = await res.text();
        console.warn(`api.football-data.org fetch failed with status ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      console.warn(`api.football-data.org sync failed with error: ${err.message}`);
    }
  } else {
    console.log('No or empty FOOTBALL_API_KEY configured. Skipping primary API fetch.');
  }

  // 2. Fetch from backup API (worldcup26.ir)
  let backupMatches: any[] = [];
  let backupSuccess = false;
  try {
    console.log('Attempting score sync from worldcup26.ir...');
    const res = await fetch('https://worldcup26.ir/get/games', {
      next: { revalidate: 0 }
    });

    if (res.ok) {
      const data = await res.json();
      backupMatches = data.games || [];
      if (backupMatches.length > 0) {
        backupSuccess = true;
        console.log(`Successfully fetched ${backupMatches.length} matches from worldcup26.ir`);
      }
    } else {
      const errText = await res.text();
      console.warn(`worldcup26.ir fetch failed with status ${res.status}: ${errText}`);
    }
  } catch (err: any) {
    console.warn(`worldcup26.ir sync failed with error: ${err.message}`);
  }

  // If both failed, throw error
  if (!primarySuccess && !backupSuccess) {
    throw new Error('Both sync APIs failed or returned no matches.');
  }

  // 3. Fetch local matches from DB
  const { data: dbMatches, error: dbError } = await supabase
    .from('matches')
    .select('*');

  if (dbError) {
    throw new Error(`Error al obtener partidos locales: ${dbError.message}`);
  }

  let updatedCount = 0;
  const errors: string[] = [];

  // Helpers to parse scores and statuses
  const parsePrimaryMatch = (pm: any) => {
    const apiStatus = pm.status;
    let status = 'scheduled';
    if (apiStatus === 'FINISHED') {
      status = 'finished';
    } else if (apiStatus === 'IN_PLAY' || apiStatus === 'PAUSED' || apiStatus === 'LIVE') {
      status = 'live';
    }

    const isFinished = status === 'finished';
    const isLive = status === 'live';

    const homeScore = (isFinished || isLive) &&
                      pm.score?.fullTime?.home !== undefined &&
                      pm.score?.fullTime?.home !== null
                        ? Number(pm.score.fullTime.home)
                        : null;
    const awayScore = (isFinished || isLive) &&
                      pm.score?.fullTime?.away !== undefined &&
                      pm.score?.fullTime?.away !== null
                        ? Number(pm.score.fullTime.away)
                        : null;

    const hasRegularTime = (isFinished || isLive) &&
                           pm.score?.regularTime?.home !== undefined &&
                           pm.score?.regularTime?.home !== null;
    const homeScore90 = hasRegularTime
                        ? Number(pm.score.regularTime.home)
                        : homeScore;
    const awayScore90 = hasRegularTime
                        ? Number(pm.score.regularTime.away)
                        : awayScore;

    return { status, homeScore, awayScore, homeScore90, awayScore90 };
  };

  const parseBackupMatch = (bm: any) => {
    const isFinished = bm.finished === 'TRUE';
    const isLive = bm.time_elapsed && bm.time_elapsed !== 'notstarted' && bm.time_elapsed !== 'finished';
    const status = isFinished ? 'finished' : isLive ? 'live' : 'scheduled';

    const homeScore = (status === 'finished' || status === 'live') && bm.home_score !== undefined && bm.home_score !== null ? parseInt(bm.home_score) : null;
    const awayScore = (status === 'finished' || status === 'live') && bm.away_score !== undefined && bm.away_score !== null ? parseInt(bm.away_score) : null;

    return { status, homeScore, awayScore, homeScore90: homeScore, awayScore90: awayScore };
  };

  // 4. Merge and update
  for (const dbMatch of dbMatches) {
    try {
      if (dbMatch.is_manual_override) {
        console.log(`Skipping match local ID ${dbMatch.id} because it has is_manual_override = true`);
        continue;
      }

      // Find match in primary matches
      const pm = primarySuccess
        ? primaryMatches.find((m: any) => m.id?.toString() === dbMatch.external_match_id)
        : null;

      // Find match in backup matches
      let bm = null;
      if (backupSuccess) {
        if (dbMatch.phase === 'group') {
          bm = backupMatches.find((m: any) => {
            if (m.type !== 'group') return false;
            const homeTla = mapNameToId(m.home_team_name_en);
            const awayTla = mapNameToId(m.away_team_name_en);
            return homeTla && awayTla && (
              (homeTla === dbMatch.home_team_id && awayTla === dbMatch.away_team_id) ||
              (homeTla === dbMatch.away_team_id && awayTla === dbMatch.home_team_id)
            );
          });
        } else {
          bm = backupMatches.find((m: any) => m.type !== 'group' && parseInt(m.id) === dbMatch.id);
        }
      }

      // Determine Teams (Only if knockout phase)
      let homeTeamId = dbMatch.home_team_id;
      let awayTeamId = dbMatch.away_team_id;

      if (dbMatch.phase !== 'group') {
        const pmHomeTla = pm ? mapApiTlaToDbTla(pm.homeTeam?.tla) : null;
        const pmAwayTla = pm ? mapApiTlaToDbTla(pm.awayTeam?.tla) : null;
        const bmHomeTla = bm ? mapNameToId(bm.home_team_name_en) : null;
        const bmAwayTla = bm ? mapNameToId(bm.away_team_name_en) : null;

        // Home Team resolution
        if (pmHomeTla) {
          homeTeamId = pmHomeTla;
        } else if (bmHomeTla) {
          homeTeamId = bmHomeTla;
        } else {
          // Both null/TBD. Only set to null if not previously resolved.
          if (dbMatch.home_team_id === null) {
            homeTeamId = null;
          }
        }

        // Away Team resolution
        if (pmAwayTla) {
          awayTeamId = pmAwayTla;
        } else if (bmAwayTla) {
          awayTeamId = bmAwayTla;
        } else {
          // Both null/TBD. Only set to null if not previously resolved.
          if (dbMatch.away_team_id === null) {
            awayTeamId = null;
          }
        }
      }

      // Determine Status & Goals (Prioritize primary)
      let status = 'scheduled';
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      let homeScore90: number | null = null;
      let awayScore90: number | null = null;

      if (pm) {
        const parsed = parsePrimaryMatch(pm);
        status = parsed.status;
        homeScore = parsed.homeScore;
        awayScore = parsed.awayScore;
        homeScore90 = parsed.homeScore90;
        awayScore90 = parsed.awayScore90;
      } else if (bm) {
        const parsed = parseBackupMatch(bm);
        status = parsed.status;

        // Swapping scores if backup match team assignments are reversed (group or knockout stage matches)
        const bmHomeTla = mapNameToId(bm.home_team_name_en);
        const bmAwayTla = mapNameToId(bm.away_team_name_en);
        const isReversed = bmHomeTla && bmAwayTla && bmHomeTla === awayTeamId && bmAwayTla === homeTeamId;

        if (isReversed) {
          homeScore = parsed.awayScore;
          awayScore = parsed.homeScore;
          homeScore90 = parsed.awayScore90;
          awayScore90 = parsed.homeScore90;
        } else {
          homeScore = parsed.homeScore;
          awayScore = parsed.awayScore;
          homeScore90 = parsed.homeScore90;
          awayScore90 = parsed.awayScore90;
        }
      } else {
        // No API has this match, skip
        continue;
      }

      // Determine Winner (Only if knockout phase and status is finished)
      let winnerTeamId: string | null = null;
      if (dbMatch.phase !== 'group' && status === 'finished') {
        // Prioritize primary winner
        if (pm) {
          const pmWinner = pm.score?.winner; // 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null
          if (pmWinner === 'HOME_TEAM') {
            winnerTeamId = homeTeamId;
          } else if (pmWinner === 'AWAY_TEAM') {
            winnerTeamId = awayTeamId;
          }
        }

        // Fallback to backup winner calculation
        if (!winnerTeamId && bm && homeScore !== null && awayScore !== null) {
          if (homeScore > awayScore) {
            winnerTeamId = homeTeamId;
          } else if (awayScore > homeScore) {
            winnerTeamId = awayTeamId;
          } else {
            // Draw in backup, look at who advanced in later matches
            const homeTla = homeTeamId;
            const awayTla = awayTeamId;

            let advancedHome = false;
            let advancedAway = false;

            if (dbMatch.id === 101 || dbMatch.id === 102) {
              // For semi-finals (101 & 102), the winner goes to the Final (104) while the loser goes to 3rd Place (103).
              // We must ONLY check the Final (104) to avoid marking both winner and loser as advanced.
              const finalMatch = backupMatches.find((m: any) => parseInt(m.id) === 104);
              if (finalMatch) {
                const finalHomeTla = mapNameToId(finalMatch.home_team_name_en);
                const finalAwayTla = mapNameToId(finalMatch.away_team_name_en);
                advancedHome = !!(homeTla && (finalHomeTla === homeTla || finalAwayTla === homeTla));
                advancedAway = !!(awayTla && (finalHomeTla === awayTla || finalAwayTla === awayTla));
              }
            } else if (dbMatch.id === 103 || dbMatch.id === 104) {
              // For Final (104) and 3rd Place Match (103), they are the last matches.
              // Cannot determine winner automatically from backup API if it ended in a draw.
              console.warn(
                `Match ${dbMatch.id} (${dbMatch.phase}) ended in a draw in backup API. ` +
                `Cannot determine winner automatically from backup API. Admin manual override required.`
              );
              winnerTeamId = dbMatch.winner_team_id;
            } else {
              // General case (R32, R16, QF): the winner plays in any future match (ID > dbMatch.id)
              advancedHome = backupMatches.some((laterMatch: any) => {
                if (parseInt(laterMatch.id) <= dbMatch.id) return false;
                const lmHomeTla = mapNameToId(laterMatch.home_team_name_en);
                const lmAwayTla = mapNameToId(laterMatch.away_team_name_en);
                return !!(homeTla && (lmHomeTla === homeTla || lmAwayTla === homeTla));
              });
              advancedAway = backupMatches.some((laterMatch: any) => {
                if (parseInt(laterMatch.id) <= dbMatch.id) return false;
                const lmHomeTla = mapNameToId(laterMatch.home_team_name_en);
                const lmAwayTla = mapNameToId(laterMatch.away_team_name_en);
                return !!(awayTla && (lmHomeTla === awayTla || lmAwayTla === awayTla));
              });
            }

            if (advancedHome && !advancedAway) {
              winnerTeamId = homeTeamId;
            } else if (advancedAway && !advancedHome) {
              winnerTeamId = awayTeamId;
            }
          }
        }
      }

      // Check if any fields changed
      const statusChanged = dbMatch.status !== status;
      const scoreChanged = dbMatch.home_score !== homeScore ||
                           dbMatch.away_score !== awayScore ||
                           dbMatch.home_score_90 !== homeScore90 ||
                           dbMatch.away_score_90 !== awayScore90;
      const teamChanged = dbMatch.home_team_id !== homeTeamId || dbMatch.away_team_id !== awayTeamId;
      const winnerChanged = dbMatch.winner_team_id !== winnerTeamId;

      if (statusChanged || scoreChanged || teamChanged || winnerChanged) {
        const updatePayload: any = {
          status,
          home_score: homeScore,
          away_score: awayScore,
          home_score_90: homeScore90,
          away_score_90: awayScore90,
          winner_team_id: winnerTeamId
        };

        if (dbMatch.phase !== 'group') {
          updatePayload.home_team_id = homeTeamId;
          updatePayload.away_team_id = awayTeamId;
        }

        console.log(`Updating match local ID ${dbMatch.id}:`, JSON.stringify(updatePayload));
        const { error: updateError } = await supabase
          .from('matches')
          .update(updatePayload)
          .eq('id', dbMatch.id);

        if (updateError) throw updateError;
        updatedCount++;
      }
    } catch (err: any) {
      console.error(`Error updating match local ID ${dbMatch.id}:`, err.message);
      errors.push(`Local ID ${dbMatch.id}: ${err.message}`);
    }
  }

  return {
    success: true,
    source: (primarySuccess && backupSuccess) ? ('merged' as const) : (primarySuccess ? ('football-data.org' as const) : ('worldcup26.ir' as const)),
    updatedCount,
    errors
  };
}
