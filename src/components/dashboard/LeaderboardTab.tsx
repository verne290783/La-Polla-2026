'use client';

import { useState, useEffect } from 'react';
import { getGlobalLeaderboard, getUserPools, getPoolMembersRanking } from '@/lib/db-helpers';

interface LeaderboardTabProps {
  currentUserId: string;
}

export default function LeaderboardTab({ currentUserId }: LeaderboardTabProps) {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'pool'>('global');
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');

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
                        <span className="truncate max-w-[150px] md:max-w-none">
                          {row.display_name || row.email}
                          {isCurrentUser && <span className="ml-2 text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase">Tú</span>}
                        </span>
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
    </div>
  );
}
