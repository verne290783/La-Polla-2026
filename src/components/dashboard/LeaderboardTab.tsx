'use client';

import { useState, useEffect } from 'react';
import { 
  getGlobalLeaderboard, 
  getUserPools, 
  getPoolMembersRanking,
  getChampionPrediction,
  getP2Predictions,
  getTeams,
  getMatches
} from '@/lib/db-helpers';
import { LOCK_PART1_DATE } from '@/lib/fifa/state';
import TeamFlag from '@/components/common/TeamFlag';

interface LeaderboardTabProps {
  currentUserId: string;
}

export default function LeaderboardTab({ currentUserId }: LeaderboardTabProps) {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'pool'>('global');
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');

  // Modal States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalP1Prediction, setModalP1Prediction] = useState<any | null>(null);
  const [modalP2Predictions, setModalP2Predictions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [userHasNoPools, setUserHasNoPools] = useState<boolean>(false);

  // Scroll lock when modal is open
  useEffect(() => {
    if (selectedUser) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedUser]);

  // Escape key listener to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedUser(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle open modal and determine poolId
  const handleUserClick = async (targetUser: any) => {
    setSelectedUser(targetUser);
    setModalLoading(true);
    setUserHasNoPools(false);
    try {
      let poolId = '';
      if (leaderboardType === 'pool') {
        poolId = selectedPoolId;
      } else {
        // leaderboardType === 'global'
        const targetUserPools = await getUserPools(targetUser.id);
        if (targetUserPools && targetUserPools.length > 0) {
          const currentUserPoolIds = pools.map(p => p.id);
          const sharedPool = targetUserPools.find(tp => currentUserPoolIds.includes(tp.id));
          if (sharedPool) {
            poolId = sharedPool.id;
          } else {
            poolId = targetUserPools[0].id;
          }
        }
      }

      if (!poolId) {
        setUserHasNoPools(true);
        setModalP1Prediction(null);
        setModalP2Predictions([]);
        
        // Still load teams and matches lazily if not already loaded
        const promises: Promise<any>[] = [];
        if (teams.length === 0) promises.push(getTeams().then(setTeams));
        if (matches.length === 0) promises.push(getMatches().then(setMatches));
        if (promises.length > 0) {
          await Promise.all(promises);
        }
        return;
      }

      // Fetch predictions for the target user in the resolved poolId
      const [p1Pred, p2Preds, loadedTeams, loadedMatches] = await Promise.all([
        getChampionPrediction(targetUser.id, poolId),
        getP2Predictions(targetUser.id, poolId),
        teams.length === 0 ? getTeams() : Promise.resolve(teams),
        matches.length === 0 ? getMatches() : Promise.resolve(matches)
      ]);

      setModalP1Prediction(p1Pred);
      setModalP2Predictions(p2Preds || []);
      if (teams.length === 0) setTeams(loadedTeams);
      if (matches.length === 0) setMatches(loadedMatches);
    } catch (err) {
      console.error('Error loading user predictions modal:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // 1. Cargar grupos del usuario
  useEffect(() => {
    async function loadPools() {
      try {
        const userPools = await getUserPools(currentUserId);
        setPools(userPools);
        if (userPools.length > 0) {
          setSelectedPoolId(userPools[0].id);
        }
      } catch (err) {
        console.error('Error al cargar pools:', err);
      }
    }
    loadPools();
  }, [currentUserId]);

  // 2. Cargar rankings según la selección
  useEffect(() => {
    async function loadRankings() {
      try {
        setLoading(true);
        let rawRankings: any[] = [];
        
        if (leaderboardType === 'global') {
          rawRankings = await getGlobalLeaderboard();
        } else if (leaderboardType === 'pool') {
          if (!selectedPoolId) {
            setRanking([]);
            setLoading(false);
            return;
          }
          const poolRankings = await getPoolMembersRanking(selectedPoolId);
          rawRankings = poolRankings.map(item => ({
            id: item.userId,
            display_name: item.displayName,
            avatar_url: item.avatarUrl,
            part1_points: item.part1Points,
            part2_points: item.part2Points,
            total_points: item.totalPoints,
          }));
        }

        // Calcular posiciones con empates compartiendo el mismo ranking
        let currentRank = 1;
        const computedRanking = rawRankings.map((item, index) => {
          if (index > 0 && item.total_points < rawRankings[index - 1].total_points) {
            currentRank = index + 1;
          }
          return {
            ...item,
            rank: currentRank,
          };
        });

        setRanking(computedRanking);
      } catch (err) {
        console.error('Error al cargar rankings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadRankings();
  }, [leaderboardType, selectedPoolId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-neutral-400 text-sm">Cargando tabla de posiciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">
            {leaderboardType === 'global' ? 'Leaderboard Global' : 'Leaderboard del Grupo'}
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            {leaderboardType === 'global'
              ? 'Tabla de posiciones mundial. Compites contra todos los participantes del portal.'
              : 'Tabla de posiciones interna. Compites contra los miembros de tu grupo.'}
          </p>
        </div>

        {/* Controles del Leaderboard */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex p-1 rounded-xl bg-neutral-900 border border-neutral-800">
            <button
              onClick={() => setLeaderboardType('global')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 ${
                leaderboardType === 'global'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Global
            </button>
            <button
              onClick={() => setLeaderboardType('pool')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition duration-200 ${
                leaderboardType === 'pool'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Mi Grupo
            </button>
          </div>

          {leaderboardType === 'pool' && pools.length > 0 && (
            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 text-xs text-white font-bold rounded-xl px-3 py-2 focus:outline-none cursor-pointer"
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-950">
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {leaderboardType === 'pool' && pools.length === 0 ? (
        <div className="max-w-md mx-auto p-8 text-center glass-card border border-amber-500/20 rounded-2xl shadow-xl space-y-4 my-8">
          <span className="text-5xl block">⚠️</span>
          <h3 className="text-lg font-bold text-white">No perteneces a ningún grupo</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Para ver el ranking de tu grupo, debes unirte a uno o crear uno desde la pestaña de &quot;Grupos&quot;.
          </p>
        </div>
      ) : (
        /* Tabla */
        <div className="overflow-hidden rounded-2xl glass-card border border-neutral-800/60 shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-900 bg-neutral-950/40 text-xs font-semibold text-neutral-400 uppercase">
                  <th className="px-6 py-4 text-center w-16">Pos</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4 text-center">Parte 1 (Gran Polla)</th>
                  <th className="px-6 py-4 text-center">Parte 2 (En Vivo)</th>
                  <th className="px-6 py-4 text-right pr-8">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/60 text-sm">
                {ranking.map((row) => {
                  const isCurrentUser = row.id === currentUserId;
                  return (
                    <tr 
                      key={row.id} 
                      className={`transition duration-150 ${
                        isCurrentUser 
                          ? 'bg-emerald-950/20 border-y border-emerald-500/30 text-emerald-100 font-semibold' 
                          : 'hover:bg-neutral-900/20 text-neutral-300'
                      }`}
                    >
                      {/* Posición */}
                      <td className="px-6 py-4 text-center font-bold">
                        {row.rank === 1 && <span className="text-xl">🥇</span>}
                        {row.rank === 2 && <span className="text-xl">🥈</span>}
                        {row.rank === 3 && <span className="text-xl">🥉</span>}
                        {row.rank > 3 && `#${row.rank}`}
                      </td>

                      {/* Usuario */}
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-900/40 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400 overflow-hidden shadow-inner">
                          {row.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.avatar_url} alt={row.display_name} className="w-full h-full object-cover" />
                          ) : (
                            row.display_name?.charAt(0).toUpperCase() || 'P'
                          )}
                        </div>
                        <div className="flex items-center min-w-0">
                          <button
                            onClick={() => handleUserClick(row)}
                            className="font-semibold text-left truncate max-w-[150px] md:max-w-none hover:text-emerald-400 hover:underline cursor-pointer focus:outline-none transition duration-150"
                          >
                            {row.display_name || row.email}
                          </button>
                          {isCurrentUser && (
                            <span className="ml-2 shrink-0 text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase">
                              Tú
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Puntos P1 */}
                      <td className="px-6 py-4 text-center text-neutral-400 font-medium">
                        {row.part1_points} pts
                      </td>

                      {/* Puntos P2 */}
                      <td className="px-6 py-4 text-center text-neutral-400 font-medium">
                        {row.part2_points} pts
                      </td>

                      {/* Total */}
                      <td className="px-6 py-4 text-right pr-8 font-black text-white text-base">
                        {row.total_points} <span className="text-[10px] text-neutral-400 font-medium">pts</span>
                      </td>
                    </tr>
                  );
                })}

                {ranking.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                      No hay registros en esta tabla de posiciones.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Predictions Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn" onClick={() => setSelectedUser(null)}>
          {/* Modal Container */}
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col transition-all duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Top accent gradient bar */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-amber-500 rounded-t-2xl absolute top-0 left-0 w-full" />

            {/* Close button (X) */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white focus:outline-none text-lg p-1.5 rounded-lg hover:bg-neutral-800 transition"
              aria-label="Cerrar modal"
            >
              ✕
            </button>

            {/* Content Container */}
            <div className="overflow-y-auto pr-1 flex-1 space-y-6 mt-4">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-neutral-400 text-sm">Cargando predicciones...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div>
                    <h3 className="text-xl font-black text-white">
                      Predicciones de {selectedUser.display_name || selectedUser.email}
                    </h3>
                    <p className="text-neutral-400 text-xs mt-1">
                      Visualiza el pronóstico de este usuario para la Parte 1 y Parte 2.
                    </p>
                  </div>

                  {userHasNoPools ? (
                    <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-xl text-center space-y-2">
                      <span className="text-3xl block">⚠️</span>
                      <p className="text-sm font-bold text-white">Este usuario no pertenece a ningún grupo</p>
                      <p className="text-xs text-neutral-400">
                        Las predicciones se realizan dentro del contexto de un grupo. Como este usuario no pertenece a ninguno, no hay pronósticos registrados.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Section 1: Podio (Parte 1) */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                          🏆 Podio Pronosticado (Parte 1)
                        </h4>
                        
                        {new Date().getTime() < LOCK_PART1_DATE.getTime() ? (
                          <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                            🔒 Podio oculto hasta el cierre de predicciones de la Parte 1
                          </div>
                        ) : !modalP1Prediction || (!modalP1Prediction.champion_team_id && !modalP1Prediction.runner_up_team_id && !modalP1Prediction.third_place_team_id) ? (
                          <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                            ⚠️ Sin predicciones registradas
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Campeón */}
                            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex items-center gap-3">
                              <span className="text-2xl">🥇</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Campeón</p>
                                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                  <TeamFlag teamId={modalP1Prediction.champion_team_id} className="w-5 h-3.5 shrink-0" />
                                  <span className="text-xs font-bold text-white truncate">
                                    {teams.find(t => t.id === modalP1Prediction.champion_team_id)?.name || modalP1Prediction.champion_team_id || 'Por definir'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Subcampeón */}
                            <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center gap-3">
                              <span className="text-2xl text-neutral-400">🥈</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Subcampeón</p>
                                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                  <TeamFlag teamId={modalP1Prediction.runner_up_team_id} className="w-5 h-3.5 shrink-0" />
                                  <span className="text-xs font-bold text-white truncate">
                                    {teams.find(t => t.id === modalP1Prediction.runner_up_team_id)?.name || modalP1Prediction.runner_up_team_id || 'Por definir'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Tercero */}
                            <div className="p-3 bg-neutral-950/60 border border-neutral-800 rounded-xl flex items-center gap-3">
                              <span className="text-2xl text-amber-700">🥉</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Tercer puesto</p>
                                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                  <TeamFlag teamId={modalP1Prediction.third_place_team_id} className="w-5 h-3.5 shrink-0" />
                                  <span className="text-xs font-bold text-white truncate">
                                    {teams.find(t => t.id === modalP1Prediction.third_place_team_id)?.name || modalP1Prediction.third_place_team_id || 'Por definir'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Section 2: Partidos (Parte 2) */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                          ⚽ Partidos Pronosticados (Parte 2)
                        </h4>

                        {matches.length === 0 ? (
                          <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                            Cargando partidos...
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {matches.map(match => {
                              const isLocked = new Date().getTime() >= new Date(match.lock_time_part2).getTime();
                              const pred = modalP2Predictions.find(p => p.match_id === match.id);
                              const homeTeam = teams.find(t => t.id === match.home_team_id);
                              const awayTeam = teams.find(t => t.id === match.away_team_id);

                              return (
                                <div key={match.id} className="p-3 bg-neutral-950/40 border border-neutral-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                  {/* Match & Teams */}
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <span className="text-neutral-500 font-mono text-[10px] w-6 shrink-0">#{match.id}</span>
                                    <div className="flex items-center gap-2 justify-end text-right flex-1 min-w-0">
                                      <span className="truncate text-white font-bold">{homeTeam?.name || match.home_team_id}</span>
                                      <TeamFlag teamId={match.home_team_id} className="w-5 h-3.5 shrink-0" />
                                    </div>
                                    <span className="text-neutral-500 font-semibold shrink-0">vs</span>
                                    <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                                      <TeamFlag teamId={match.away_team_id} className="w-5 h-3.5 shrink-0" />
                                      <span className="truncate text-white font-bold">{awayTeam?.name || match.away_team_id}</span>
                                    </div>
                                  </div>

                                  {/* Prediction and Score details */}
                                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                    {/* Predicción */}
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px]">
                                      <span className="text-neutral-400">Pred: </span>
                                      {!isLocked ? (
                                        <span className="text-neutral-500 font-medium">🔒 Oculto</span>
                                      ) : pred ? (
                                        <span className="text-emerald-400 font-extrabold">
                                          {pred.predicted_home_score} - {pred.predicted_away_score}
                                        </span>
                                      ) : (
                                        <span className="text-neutral-500 font-medium">Sin pronóstico</span>
                                      )}
                                    </div>

                                    {/* Resultado real */}
                                    {(match.status === 'live' || match.status === 'finished') && (
                                      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px]">
                                        <span className="text-neutral-400">Real: </span>
                                        <span className="text-white font-extrabold">
                                          {match.home_score} - {match.away_score}
                                        </span>
                                        {match.status === 'live' && (
                                          <span className="ml-1 text-[9px] bg-red-600 text-white font-bold px-1 rounded animate-pulse">
                                            VIVO
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* Puntos Ganados */}
                                    {isLocked && pred && (
                                      <div className="text-[11px] font-bold text-amber-500 shrink-0">
                                        {pred.points_earned !== null ? `+${pred.points_earned} pts` : '0 pts'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
