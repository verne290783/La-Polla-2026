import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// 1. Obtener perfil de usuario
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

// 2. Obtener lista de equipos
export async function getTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .order('name');
  if (error) throw error;
  return data;
}

// 3. Obtener lista de partidos reales
export async function getMatches() {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('match_date', { ascending: true });
  if (error) throw error;
  return data;
}

// 4. Obtener predicciones de la Parte 1
export async function getP1Predictions(userId: string, poolId: string) {
  const { data, error } = await supabase
    .from('full_tournament_predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('pool_id', poolId);
  if (error) throw error;
  return data;
}

export async function getChampionPrediction(userId: string, poolId: string) {
  const { data, error } = await supabase
    .from('champion_predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('pool_id', poolId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Helper to sanitize team IDs
function sanitizeTeamId(id: string | null | undefined): string | null {
  if (!id || id.trim() === '' || id.startsWith('TBD_')) {
    return null;
  }
  return id;
}

// 5. Guardar predicciones de la Parte 1
export async function saveP1Predictions(
  userId: string,
  poolId: string,
  predictions: {
    prediction_key: string;
    predicted_home_score: number;
    predicted_away_score: number;
    predicted_winner_team_id?: string | null;
    phase: string;
    predicted_home_team_id: string;
    predicted_away_team_id: string;
  }[],
  champion: {
    champion_team_id: string;
    runner_up_team_id: string;
    third_place_team_id: string;
  },
  isLocked: boolean = false
) {
  // Guardar en bloque las predicciones del bracket completo
  const formattedPreds = predictions.map(p => ({
    user_id: userId,
    pool_id: poolId,
    prediction_key: p.prediction_key,
    predicted_home_score: p.predicted_home_score,
    predicted_away_score: p.predicted_away_score,
    predicted_winner_team_id: sanitizeTeamId(p.predicted_winner_team_id),
    phase: p.phase,
    predicted_home_team_id: sanitizeTeamId(p.predicted_home_team_id),
    predicted_away_team_id: sanitizeTeamId(p.predicted_away_team_id)
  }));

  // Upsert de las predicciones
  const { error: predsError } = await supabase
    .from('full_tournament_predictions')
    .upsert(formattedPreds, { onConflict: 'user_id,pool_id,prediction_key' });

  if (predsError) throw predsError;

  // Upsert del campeón/sub/tercero
  const { error: champError } = await supabase
    .from('champion_predictions')
    .upsert({
      user_id: userId,
      pool_id: poolId,
      champion_team_id: sanitizeTeamId(champion.champion_team_id),
      runner_up_team_id: sanitizeTeamId(champion.runner_up_team_id),
      third_place_team_id: sanitizeTeamId(champion.third_place_team_id),
      is_locked: isLocked
    }, { onConflict: 'user_id,pool_id' });

  if (champError) throw champError;
  return true;
}

// 6. Obtener predicciones de la Parte 2
export async function getP2Predictions(userId: string, poolId: string) {
  const { data, error } = await supabase
    .from('phase_predictions')
    .select('*')
    .eq('user_id', userId)
    .eq('pool_id', poolId);
  if (error) throw error;
  return data;
}

// 7. Guardar predicción individual de la Parte 2 (En vivo)
export async function saveP2Prediction(
  userId: string,
  poolId: string,
  matchId: number,
  homeScore: number,
  awayScore: number,
  winnerId?: string | null
) {
  const { data, error } = await supabase
    .from('phase_predictions')
    .upsert({
      user_id: userId,
      pool_id: poolId,
      match_id: matchId,
      predicted_home_score: homeScore,
      predicted_away_score: awayScore,
      predicted_winner_team_id: winnerId || null,
      created_at: new Date().toISOString()
    }, { onConflict: 'user_id,pool_id,match_id' })
    .select();

  if (error) throw error;
  return data;
}

// 8. Obtener grupos a los que pertenece el usuario
export async function getUserPools(userId: string) {
  // Obtener los ids de los pools en los que está
  const { data: members, error: memError } = await supabase
    .from('pool_members')
    .select('pool_id')
    .eq('user_id', userId);

  if (memError) throw memError;
  if (!members || members.length === 0) return [];

  const poolIds = members.map(m => m.pool_id);

  // Obtener los detalles de los pools
  const { data: pools, error: poolError } = await supabase
    .from('pools')
    .select('*')
    .in('id', poolIds);

  if (poolError) throw poolError;
  return pools;
}

// 9. Obtener miembros y puntajes de un grupo específico
export async function getPoolMembersRanking(poolId: string) {
  const { data, error } = await supabase
    .from('pool_members')
    .select('user_id, joined_at, part1_points, part2_points, total_points, profiles(display_name, avatar_url)')
    .eq('pool_id', poolId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const ranking = data.map(m => {
    const profile = m.profiles as any;
    return {
      userId: m.user_id,
      joinedAt: m.joined_at,
      displayName: profile?.display_name || 'Desconocido',
      avatarUrl: profile?.avatar_url || '',
      part1Points: m.part1_points || 0,
      part2Points: m.part2_points || 0,
      totalPoints: m.total_points || 0,
    };
  });

  ranking.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return a.displayName.localeCompare(b.displayName);
  });

  return ranking;
}

// 10. Obtener Leaderboard General (Global)
export async function getGlobalLeaderboard() {
  const { data, error } = await supabase
    .from('global_leaderboard_view')
    .select('id, display_name, avatar_url, part1_points, part2_points, total_points, pool_name, pool_id, email')
    .order('total_points', { ascending: false })
    .order('display_name', { ascending: true })
    .limit(100); // Top 100 global

  if (error) throw error;
  return data;
}



// 13. Actualizar Resultado de un Partido (Solo Admin)
export async function updateMatchResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  status: 'scheduled' | 'live' | 'finished',
  winnerTeamId?: string | null
) {
  const { data, error } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status,
      winner_team_id: winnerTeamId || null,
    })
    .eq('id', matchId)
    .select();

  if (error) throw error;
  return data;
}

// 14. Obtener información de un miembro en un grupo específico (puntos por grupo)
export async function getPoolMemberInfo(userId: string, poolId: string) {
  const { data, error } = await supabase
    .from('pool_members')
    .select('*')
    .eq('user_id', userId)
    .eq('pool_id', poolId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
