'use client';

import { useState, useEffect } from 'react';
import { 
  getGlobalLeaderboard, 
  getUserPools, 
  getPoolMembersRanking,
  getChampionPrediction,
  getP1Predictions,
  getP2Predictions,
  getTeams,
  getMatches
} from '@/lib/db-helpers';
import { LOCK_PART1_DATE } from '@/lib/fifa/state';
import TeamFlag from '@/components/common/TeamFlag';
import { calculateUserStats, calculateUserPart1Stats, calculateConsolidatedStats } from '@/lib/stats-helpers';

interface LeaderboardTabProps {
  currentUserId: string;
}

const getUserP1LockDate = (uid: string) => {
  void uid;
  return LOCK_PART1_DATE;
};

export default function LeaderboardTab({ currentUserId }: LeaderboardTabProps) {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'pool'>('global');
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');

  // Modal States
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'stats' | 'predictions'>('stats');
  const [modalP1Prediction, setModalP1Prediction] = useState<any | null>(null);
  const [modalP1Predictions, setModalP1Predictions] = useState<any[]>([]);
  const [modalP2Predictions, setModalP2Predictions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [userHasNoPools, setUserHasNoPools] = useState<boolean>(false);
  const [modalStatsTab, setModalStatsTab] = useState<'p1' | 'p2' | 'consolidated'>('p1');

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
  const handleUserClick = async (targetUser: any, defaultTab: 'stats' | 'predictions' = 'stats') => {
    setSelectedUser(targetUser);
    setModalTab(defaultTab);
    setModalStatsTab('p1');
    setModalLoading(true);
    setUserHasNoPools(false);
    try {
      let poolId = '';
      if (leaderboardType === 'pool') {
        poolId = selectedPoolId;
      } else {
        // leaderboardType === 'global'
        if (targetUser.pool_id) {
          poolId = targetUser.pool_id;
        } else {
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
      }

      if (!poolId) {
        setUserHasNoPools(true);
        setModalP1Prediction(null);
        setModalP1Predictions([]);
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
      const [p1Pred, p1MatchesPreds, p2Preds, loadedTeams, loadedMatches] = await Promise.all([
        getChampionPrediction(targetUser.id, poolId),
        getP1Predictions(targetUser.id, poolId),
        getP2Predictions(targetUser.id, poolId),
        teams.length === 0 ? getTeams() : Promise.resolve(teams),
        matches.length === 0 ? getMatches() : Promise.resolve(matches)
      ]);

      const phaseOrder: Record<string, number> = {
        group: 1,
        r32: 2,
        r16: 3,
        qf: 4,
        sf: 5,
        '3rd': 6,
        final: 7
      };
      
      const sortedP1Preds = (p1MatchesPreds || []).sort((a: any, b: any) => {
        const orderA = phaseOrder[a.phase] || 99;
        const orderB = phaseOrder[b.phase] || 99;
        if (orderA !== orderB) return orderA - orderB;
        
        if (a.phase === 'group' && b.phase === 'group') {
          const idA = parseInt(a.prediction_key.replace('G_', ''), 10) || 0;
          const idB = parseInt(b.prediction_key.replace('G_', ''), 10) || 0;
          return idA - idB;
        }
        
        return a.prediction_key.localeCompare(b.prediction_key);
      });

      setModalP1Prediction(p1Pred);
      setModalP1Predictions(sortedP1Preds);
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
                        <button
                          onClick={() => handleUserClick(row, 'stats')}
                          className="w-8 h-8 rounded-full bg-emerald-900/40 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400 overflow-hidden shadow-inner hover:border-emerald-400 hover:scale-105 transition duration-150 cursor-pointer focus:outline-none"
                          title="Ver estadísticas"
                        >
                          {row.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.avatar_url} alt={row.display_name} className="w-full h-full object-cover" />
                          ) : (
                            row.display_name?.charAt(0).toUpperCase() || 'P'
                          )}
                        </button>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center min-w-0">
                            <button
                              onClick={() => handleUserClick(row, 'predictions')}
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
                          {leaderboardType === 'global' && row.pool_name && (
                            <span className="text-[10px] text-neutral-500 font-medium truncate mt-0.5 max-w-[200px]" title={row.pool_name}>
                              🏆 Grupo: <span className="text-neutral-400 font-semibold">{row.pool_name}</span>
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
                  <p className="text-neutral-400 text-sm">Cargando datos...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black text-white">
                        {selectedUser.display_name || selectedUser.email}
                      </h3>
                      <p className="text-neutral-400 text-xs mt-1">
                        Puntaje en esta liga: <span className="text-emerald-400 font-bold">{selectedUser.total_points || 0} pts</span> | Ranking: <span className="text-amber-500 font-bold">#{selectedUser.rank}</span>
                      </p>
                    </div>
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
                      {/* Tabs Bar */}
                      <div className="flex border-b border-neutral-800">
                        <button
                          onClick={() => setModalTab('stats')}
                          className={`px-4 py-2 text-xs font-bold transition duration-150 border-b-2 -mb-[2px] ${
                            modalTab === 'stats'
                              ? 'border-emerald-500 text-emerald-400'
                              : 'border-transparent text-neutral-400 hover:text-white'
                          }`}
                        >
                          Estadísticas
                        </button>
                        <button
                          onClick={() => setModalTab('predictions')}
                          className={`px-4 py-2 text-xs font-bold transition duration-150 border-b-2 -mb-[2px] ${
                            modalTab === 'predictions'
                              ? 'border-emerald-500 text-emerald-400'
                              : 'border-transparent text-neutral-400 hover:text-white'
                          }`}
                        >
                          Predicciones Detalladas
                        </button>
                      </div>

                      {modalTab === 'stats' ? (
                        <div className="space-y-6">
                          {/* Sub-tabs inside stats modal */}
                          <div className="flex border-b border-neutral-850 gap-2 mb-4">
                            <button
                              onClick={() => setModalStatsTab('p1')}
                              className={`flex-1 pb-2 text-[11px] font-bold transition-colors border-b-2 ${
                                modalStatsTab === 'p1'
                                  ? 'text-emerald-400 border-emerald-500'
                                  : 'text-neutral-400 border-transparent hover:text-white'
                              }`}
                            >
                              Parte 1 (Gran Polla)
                            </button>
                            <button
                              onClick={() => setModalStatsTab('p2')}
                              className={`flex-1 pb-2 text-[11px] font-bold transition-colors border-b-2 ${
                                modalStatsTab === 'p2'
                                  ? 'text-emerald-400 border-emerald-500'
                                  : 'text-neutral-400 border-transparent hover:text-white'
                              }`}
                            >
                              Parte 2 (En Vivo)
                            </button>
                            <button
                              onClick={() => setModalStatsTab('consolidated')}
                              className={`flex-1 pb-2 text-[11px] font-bold transition-colors border-b-2 ${
                                modalStatsTab === 'consolidated'
                                  ? 'text-emerald-400 border-emerald-500'
                                  : 'text-neutral-400 border-transparent hover:text-white'
                              }`}
                            >
                              Consolidado
                            </button>
                          </div>

                          {/* 1. Visualizations: Radial Gauge and Donut Chart */}
                          {(() => {
                            const p1Stats = calculateUserPart1Stats(modalP1Predictions, matches);
                            const p2Stats = calculateUserStats(modalP2Predictions, matches);
                            const consolidatedStats = calculateConsolidatedStats(p1Stats, p2Stats);

                            const userStats = modalStatsTab === 'p1'
                              ? p1Stats
                              : modalStatsTab === 'p2'
                                ? p2Stats
                                : consolidatedStats;

                            const radiusRadial = 28;
                            const circRadial = 2 * Math.PI * radiusRadial;
                            const offsetRadial = circRadial - (circRadial * userStats.effectiveness) / 100;

                            const totalP2 = userStats.totalRealized || 1;
                            const radiusDonut = 24;
                            const circDonut = 2 * Math.PI * radiusDonut;
                            const exactLen = (userStats.exactCount / totalP2) * circDonut;
                            const winnerLen = (userStats.winnerCount / totalP2) * circDonut;
                            const failedLen = (userStats.failedCount / totalP2) * circDonut;

                            return (
                              <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  {/* Radial Gauge Card */}
                                  <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/60 flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Efectividad General</h4>
                                      <p className="text-[10px] text-neutral-500">Porcentaje de pronósticos acertados (marcador exacto + ganador correcto).</p>
                                    </div>
                                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                      <svg className="w-20 h-20 transform -rotate-90">
                                        <circle cx="40" cy="40" r={radiusRadial} className="stroke-neutral-900 fill-none" strokeWidth="4.5" />
                                        <circle
                                          cx="40"
                                          cy="40"
                                          r={radiusRadial}
                                          className="stroke-emerald-500 fill-none transition-all duration-1000"
                                          strokeWidth="4.5"
                                          strokeDasharray={circRadial}
                                          strokeDashoffset={offsetRadial}
                                          strokeLinecap="round"
                                        />
                                      </svg>
                                      <div className="absolute flex flex-col items-center justify-center">
                                        <span className="text-base font-black text-white">{userStats.effectiveness}%</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Donut Chart Card */}
                                  <div className="p-4 rounded-xl bg-neutral-950/40 border border-neutral-800/60 flex items-center justify-between gap-4">
                                    <div className="space-y-1">
                                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Desglose de Pronósticos</h4>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[9px] text-neutral-400 font-semibold">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Exacto: {userStats.exactCount}</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Ganador: {userStats.winnerCount}</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Fallado: {userStats.failedCount}</span>
                                      </div>
                                    </div>
                                    <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                                      <svg className="w-20 h-20 transform -rotate-90">
                                        <circle cx="40" cy="40" r={radiusDonut} className="stroke-neutral-900 fill-none" strokeWidth="5.5" />
                                        {userStats.exactCount > 0 && (
                                          <circle
                                            cx="40"
                                            cy="40"
                                            r={radiusDonut}
                                            className="stroke-emerald-500 fill-none"
                                            strokeWidth="5.5"
                                            strokeDasharray={`${exactLen} ${circDonut - exactLen}`}
                                            strokeDashoffset="0"
                                          />
                                        )}
                                        {userStats.winnerCount > 0 && (
                                          <circle
                                            cx="40"
                                            cy="40"
                                            r={radiusDonut}
                                            className="stroke-sky-500 fill-none"
                                            strokeWidth="5.5"
                                            strokeDasharray={`${winnerLen} ${circDonut - winnerLen}`}
                                            strokeDashoffset={-exactLen}
                                          />
                                        )}
                                        {userStats.failedCount > 0 && (
                                          <circle
                                            cx="40"
                                            cy="40"
                                            r={radiusDonut}
                                            className="stroke-red-500 fill-none"
                                            strokeWidth="5.5"
                                            strokeDasharray={`${failedLen} ${circDonut - failedLen}`}
                                            strokeDashoffset={-(exactLen + winnerLen)}
                                          />
                                        )}
                                      </svg>
                                      <div className="absolute flex flex-col items-center justify-center">
                                        <span className="text-sm font-black text-white">{userStats.totalRealized}</span>
                                        <span className="text-[7px] text-neutral-500 font-bold uppercase">Total</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. Metrics Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                  <div className="p-3 rounded-xl bg-neutral-950/20 border border-neutral-800 text-center">
                                    <p className="text-xl font-black text-white">{userStats.totalRealized}</p>
                                    <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Realizados</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-emerald-950/10 border border-emerald-500/10 text-center">
                                    <p className="text-xl font-black text-emerald-400">{userStats.exactCount}</p>
                                    <p className="text-[8px] text-emerald-500/80 font-bold uppercase tracking-wider mt-1">Marcador Exacto</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-sky-950/10 border border-sky-500/10 text-center">
                                    <p className="text-xl font-black text-sky-400">{userStats.winnerCount}</p>
                                    <p className="text-[8px] text-sky-500/80 font-bold uppercase tracking-wider mt-1">Ganador Correcto</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-neutral-950/20 border border-neutral-800 text-center">
                                    <p className="text-xl font-black text-neutral-300">{userStats.winnerGoalsMatched || 0}</p>
                                    <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Goles del Ganador Acertados</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-neutral-950/20 border border-neutral-800 text-center">
                                    <p className="text-xl font-black text-neutral-300">{userStats.loserGoalsMatched || 0}</p>
                                    <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Goles del Perdedor Acertados</p>
                                  </div>
                                  <div className="p-3 rounded-xl bg-red-950/10 border border-red-500/10 text-center">
                                    <p className="text-xl font-black text-red-400/80">{userStats.failedCount}</p>
                                    <p className="text-[8px] text-red-500/60 font-bold uppercase tracking-wider mt-1">Sin Puntos</p>
                                  </div>
                                </div>

                                {/* 3. Recent Form Streak */}
                                <div className="flex flex-col sm:flex-row items-center gap-3 bg-neutral-950/30 border border-neutral-800/80 rounded-xl p-4 justify-between">
                                  <div className="flex items-center gap-1.5 justify-center flex-wrap">
                                    <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider mr-2">Forma Reciente:</span>
                                    {userStats.recentForm.length === 0 ? (
                                      <span className="text-xs text-neutral-500 italic">Sin partidos evaluados</span>
                                    ) : (
                                      userStats.recentForm.map((item, idx) => {
                                        const { outcome, homeTeamId, awayTeamId, realHomeScore, realAwayScore, predictedHomeScore, predictedAwayScore, pointsEarned } = item;
                                        let bgClass = 'bg-neutral-800 border-neutral-700 text-neutral-400';
                                        let label = 'X';
                                        let title = 'Sin predicción';
                                        let tooltipDetail = '';
                                        
                                        if (outcome === 'exact') {
                                          bgClass = 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400 font-black';
                                          label = 'E';
                                          title = 'Marcador Exacto';
                                          tooltipDetail = `+${pointsEarned !== null ? pointsEarned : 6} pts (Marcador Exacto)`;
                                        } else if (outcome === 'winner') {
                                          bgClass = 'bg-sky-950/80 border-sky-500/30 text-sky-400 font-black';
                                          label = 'G';
                                          title = 'Ganador Correcto';
                                          tooltipDetail = `+${pointsEarned !== null ? pointsEarned : 3} pts (Ganador Correcto)`;
                                        } else if (outcome === 'failed') {
                                          bgClass = 'bg-red-950/80 border-red-500/30 text-red-400 font-bold';
                                          label = 'F';
                                          title = 'Sin Puntos';
                                          tooltipDetail = '0 pts (Predicción fallida)';
                                        } else if (outcome === 'missed') {
                                          bgClass = 'bg-neutral-900 border-neutral-800 text-neutral-500';
                                          label = '-';
                                          title = 'No Pronosticado';
                                          tooltipDetail = 'Sin pronóstico registrado';
                                        }

                                        const homeTeamName = teams.find(t => t.id === homeTeamId)?.name || homeTeamId;
                                        const awayTeamName = teams.find(t => t.id === awayTeamId)?.name || awayTeamId;
                                        
                                        const matchObj = matches.find(m => m.id === item.matchId);
                                        const isKnockout = matchObj ? matchObj.phase !== 'group' : false;
                                        const wentToExtraTimeOrPenalties = matchObj
                                          ? isKnockout &&
                                            matchObj.home_score_90 !== null &&
                                            matchObj.away_score_90 !== null &&
                                            matchObj.home_score_90 === matchObj.away_score_90
                                          : false;

                                        let scoreLabel = '';
                                        if (wentToExtraTimeOrPenalties && matchObj) {
                                          if (matchObj.home_score !== matchObj.away_score) {
                                            scoreLabel = `${matchObj.home_score_90}-${matchObj.away_score_90} (T.E. ${matchObj.home_score}-${matchObj.away_score})`;
                                          } else {
                                            scoreLabel = `${matchObj.home_score_90}-${matchObj.away_score_90} ${matchObj.winner_team_id ? `(${matchObj.winner_team_id} pen.)` : '(pen.)'}`;
                                          }
                                        } else {
                                          scoreLabel = `${realHomeScore !== null ? realHomeScore : ''} - ${realAwayScore !== null ? realAwayScore : ''}`;
                                        }

                                        const matchLabel = `${homeTeamName} ${scoreLabel} ${awayTeamName}`;

                                        const p2Pred = modalP2Predictions.find(p => p.match_id === item.matchId);
                                        const p1Pred = modalP1Predictions.find(p =>
                                          p.prediction_key === `G_${item.matchId}` ||
                                          p.prediction_key.endsWith(`_M${item.matchId}`)
                                        );
                                        const predWinnerId = p2Pred?.predicted_winner_team_id || p1Pred?.predicted_winner_team_id;

                                        let predLabel = 'Sin predicción';
                                        if (predictedHomeScore !== null && predictedAwayScore !== null) {
                                          predLabel = `Pred: ${predictedHomeScore} - ${predictedAwayScore}`;
                                          if (isKnockout && predictedHomeScore === predictedAwayScore && predWinnerId) {
                                            predLabel += ` (Gana: ${predWinnerId} pen.)`;
                                          }
                                        }

                                        return (
                                          <div key={idx} className="relative group flex items-center justify-center">
                                            <div
                                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border shadow-inner ${bgClass} transition-all hover:scale-110 cursor-pointer`}
                                            >
                                              {label}
                                            </div>

                                            {/* Custom Tailwind Tooltip */}
                                            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50 transition-all duration-150">
                                              <div className="bg-neutral-950 border border-neutral-800 text-white rounded-xl shadow-2xl p-2.5 min-w-[180px] text-center space-y-1">
                                                <p className="text-[9px] text-neutral-400 font-extrabold uppercase tracking-wider">{title}</p>
                                                <div className="border-b border-neutral-900 my-1" />
                                                <p className="text-[11px] font-black text-white leading-tight">{matchLabel}</p>
                                                <p className="text-[10px] text-neutral-400 font-semibold">{predLabel}</p>
                                                <p className="text-[10px] text-emerald-400 font-extrabold mt-0.5">{tooltipDetail}</p>
                                              </div>
                                              <div className="w-2.5 h-2.5 bg-neutral-950 border-r border-b border-neutral-800 transform rotate-45 -mt-1.5" />
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                  <div className="text-xs font-bold text-neutral-400 shrink-0">
                                    Racha Activa: <span className="text-emerald-400 font-black">{userStats.activeStreak}🔥</span> | Máxima: <span className="text-amber-500 font-black">{userStats.maxStreak}👑</span>
                                  </div>
                                </div>

                                {/* 4. Podio Pronosticado */}
                                <div className="space-y-3 border-t border-neutral-800/60 pt-4">
                                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                                    🏆 Podio Pronosticado (Parte 1)
                                  </h4>
                                  
                                  {new Date().getTime() < getUserP1LockDate(selectedUser.id).getTime() ? (
                                    <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                                      🔒 Podio oculto hasta el cierre de predicciones de la Parte 1
                                    </div>
                                  ) : !modalP1Prediction || (!modalP1Prediction.champion_team_id && !modalP1Prediction.runner_up_team_id && !modalP1Prediction.third_place_team_id) ? (
                                    <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl text-center text-xs text-neutral-400">
                                      ⚠️ Sin predicciones registradas
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Section 1: Podio (Parte 1) */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                              🏆 Podio Pronosticado (Parte 1)
                            </h4>
                            
                            {new Date().getTime() < getUserP1LockDate(selectedUser.id).getTime() ? (
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
                                <div className="p-3 bg-neutral-950/60 border border-neutral-800/60 rounded-xl flex items-center gap-3">
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

                          {/* Section 1.5: Partidos Pronosticados (Parte 1) */}
                          {new Date().getTime() >= getUserP1LockDate(selectedUser.id).getTime() && modalP1Predictions.length > 0 && (
                            <div className="space-y-3 pt-2">
                              <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                                ⚽ Partidos Pronosticados (Parte 1)
                              </h4>
                              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                {modalP1Predictions.map(pred => {
                                  const isGroup = pred.phase === 'group';
                                  const matchIdStr = isGroup ? pred.prediction_key.replace('G_', '') : '';
                                  const matchId = isGroup ? parseInt(matchIdStr, 10) : null;

                                  const homeTeamId = pred.predicted_home_team_id;
                                  const awayTeamId = pred.predicted_away_team_id;
                                  const homeTeamObj = teams.find(t => t.id === homeTeamId);
                                  const awayTeamObj = teams.find(t => t.id === awayTeamId);

                                  const phaseLabels: Record<string, string> = {
                                    group: 'Grupo',
                                    r32: 'Dieciseisavos',
                                    r16: 'Octavos',
                                    qf: 'Cuartos',
                                    sf: 'Semifinal',
                                    '3rd': '3er Puesto',
                                    final: 'Final'
                                  };
                                  const phaseLabel = phaseLabels[pred.phase] || pred.phase;

                                  return (
                                    <div key={pred.prediction_key} className="p-3 bg-neutral-950/40 border border-neutral-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                      {/* Match & Teams */}
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <span className="text-neutral-500 font-mono text-[9px] w-20 shrink-0 uppercase tracking-wider">{phaseLabel} {isGroup && matchId ? `#${matchId}` : ''}</span>
                                        <div className="flex items-center gap-2 justify-end text-right flex-1 min-w-0">
                                          <span className="truncate text-white font-bold">{homeTeamObj?.name || homeTeamId}</span>
                                          <TeamFlag teamId={homeTeamId} className="w-5 h-3.5 shrink-0" />
                                        </div>
                                        <span className="text-neutral-500 font-semibold shrink-0">vs</span>
                                        <div className="flex items-center gap-2 text-left flex-1 min-w-0">
                                          <TeamFlag teamId={awayTeamId} className="w-5 h-3.5 shrink-0" />
                                          <span className="truncate text-white font-bold">{awayTeamObj?.name || awayTeamId}</span>
                                        </div>
                                      </div>

                                      {/* Prediction and Score details */}
                                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                                        {/* Predicción */}
                                        <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px]">
                                          <span className="text-neutral-400">Pred: </span>
                                          <span className="text-emerald-400 font-extrabold">
                                            {pred.predicted_home_score} - {pred.predicted_away_score}
                                          </span>
                                          {pred.predicted_winner_team_id && (
                                            <span className="ml-1 text-[9px] bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-bold px-1 rounded">
                                              Gana: {pred.predicted_winner_team_id}
                                              {pred.phase !== 'group' && pred.predicted_home_score === pred.predicted_away_score ? ' pen.' : ''}
                                            </span>
                                          )}
                                        </div>

                                        {/* Puntos Ganados */}
                                        {pred.points_earned !== null && pred.points_earned !== undefined && (
                                          <div className="text-[11px] font-bold text-amber-500 shrink-0">
                                            {`+${pred.points_earned} pts`}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

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
                                            <>
                                              <span className="text-emerald-400 font-extrabold">
                                                {pred.predicted_home_score} - {pred.predicted_away_score}
                                              </span>
                                              {match.phase !== 'group' && pred.predicted_home_score === pred.predicted_away_score && pred.predicted_winner_team_id && (
                                                <span className="ml-1 text-[9px] bg-emerald-950 border border-emerald-500/20 text-emerald-400 font-bold px-1 rounded">
                                                  Gana: {pred.predicted_winner_team_id} pen.
                                                </span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-neutral-500 font-medium">Sin pronóstico</span>
                                          )}
                                        </div>

                                        {/* Resultado real */}
                                        {(match.status === 'live' || match.status === 'finished') && (
                                          <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1 text-[11px] flex flex-wrap items-center gap-1.5">
                                            <span className="text-neutral-400">Real: </span>
                                            {(() => {
                                              const isKnockout = match.phase !== 'group';
                                              const wentToExtraTimeOrPenalties =
                                                isKnockout &&
                                                match.home_score_90 !== null &&
                                                match.away_score_90 !== null &&
                                                match.home_score_90 === match.away_score_90;

                                              if (wentToExtraTimeOrPenalties) {
                                                if (match.home_score !== match.away_score) {
                                                  return (
                                                    <span className="text-white font-extrabold flex items-center gap-1">
                                                      <span>{match.home_score_90} - {match.away_score_90}</span>
                                                      <span className="text-[9px] bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 font-bold px-1 py-0.5 rounded whitespace-nowrap">
                                                        T.E. {match.home_score}-{match.away_score}
                                                      </span>
                                                    </span>
                                                  );
                                                } else {
                                                  return (
                                                    <span className="text-white font-extrabold flex items-center gap-1">
                                                      <span>{match.home_score_90} - {match.away_score_90}</span>
                                                      {match.winner_team_id && (
                                                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold px-1 py-0.5 rounded whitespace-nowrap">
                                                          {match.winner_team_id} pen.
                                                        </span>
                                                      )}
                                                    </span>
                                                  );
                                                }
                                              }

                                              return (
                                                <span className="text-white font-extrabold">
                                                  {match.home_score} - {match.away_score}
                                                </span>
                                              );
                                            })()}
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
                        </div>
                      )}
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
