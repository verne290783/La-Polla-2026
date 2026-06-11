'use client';

import { useState, useEffect } from 'react';
import { getProfile, getUserPools, getPoolMembersRanking, getMatches, getTeams } from '@/lib/db-helpers';
import { getTournamentState } from '@/lib/fifa/state';
import TeamFlag from '@/components/common/TeamFlag';

interface HomeTabProps {
  userId: string;
  onNavigateToTab: (tab: string) => void;
}

export default function HomeTab({ userId, onNavigateToTab }: HomeTabProps) {
  const [profile, setProfile] = useState<any>(null);
  const [pools, setPools] = useState<any[]>([]);
  const [primaryPoolRank, setPrimaryPoolRank] = useState<{ rank: number; total: number } | null>(null);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [teamsFlags, setTeamsFlags] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // 1. Cargar Perfil
        const prof = await getProfile(userId);
        setProfile(prof);

        // Cargar Equipos para Banderas
        const teamsList = await getTeams();
        const flagsMap: Record<string, string> = {};
        teamsList.forEach(t => {
          flagsMap[t.id] = t.flag_emoji;
        });
        setTeamsFlags(flagsMap);

        // 2. Cargar Partidos Activos (Filtro por fecha real o estado = 'live')
        const allMatches = await getMatches();
        const vTime = new Date().getTime();

        const oneDayMs = 24 * 60 * 60 * 1000;

        const active = allMatches.filter(m => {
          // Un partido es activo si su estado es 'live' o si se juega en el "mismo día" (con margen de 24h)
          const mTime = new Date(m.match_date).getTime();
          const isSameDay = Math.abs(mTime - vTime) < oneDayMs;
          return m.status === 'live' || (isSameDay && m.status === 'scheduled') || (isSameDay && m.status === 'finished');
        });

        // Limitar a máximo 5 partidos ordenados
        setActiveMatches(active.slice(0, 5));

        // 3. Cargar Grupos y Ranking Primario
        const userPools = await getUserPools(userId);
        setPools(userPools);

        if (userPools.length > 0) {
          const firstPool = userPools[0];
          const ranking = await getPoolMembersRanking(firstPool.id);
          const myPos = ranking.findIndex(r => r.userId === userId);
          if (myPos !== -1) {
            setPrimaryPoolRank({
              rank: myPos + 1,
              total: ranking.length
            });
          }
        }
      } catch (err) {
        console.error('Error al cargar datos del Dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-neutral-400 text-sm">Cargando tu resumen...</p>
      </div>
    );
  }

  const tState = getTournamentState(new Date().toISOString());

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Cabecera y Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">
            ¡Hola, <span className="gold-gradient-text">{profile?.display_name || 'Pollero'}</span>!
          </h2>
          <p className="text-neutral-400 text-sm mt-1">
            Fase del Mundial: {
              tState === 'pre_tournament' ? 'Pre-Torneo (Predicciones Parte 1 abiertas)' :
              tState === 'group_stage' ? 'Fase de Grupos en Juego' :
              tState === 'knockouts' ? 'Fases Eliminatorias (Polla en Vivo activa)' : 'Mundial Finalizado'
            }
          </p>
        </div>
      </div>

      {/* 2. Tarjetas de Puntaje */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Tarjeta 1: Total */}
        <div className="relative p-6 rounded-2xl glass-card border-amber-500/20 overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Puntaje Total</p>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-white">{profile?.total_points || 0}</span>
            <span className="text-xs text-neutral-400">pts</span>
          </div>
          <p className="text-xs text-neutral-500 mt-4">Suma de la Parte 1 + Parte 2</p>
        </div>

        {/* Tarjeta 2: Detalle */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Desglose de Puntos</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Parte 1 (Gran Polla):</span>
                <span className="font-bold text-white">{profile?.part1_points || 0} pts</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-neutral-400">Parte 2 (En Vivo):</span>
                <span className="font-bold text-white">{profile?.part2_points || 0} pts</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-emerald-500 h-full rounded-full"
              style={{ 
                width: profile?.total_points > 0 
                  ? `${((profile.part1_points) / profile.total_points) * 100}%` 
                  : '50%' 
              }}
            />
          </div>
        </div>

        {/* Tarjeta 3: Posición */}
        <div className="p-6 rounded-2xl glass-card flex flex-col justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Mi Grupo Principal</p>
            {pools.length > 0 ? (
              <>
                <h4 className="text-lg font-bold text-white truncate mb-1">{pools[0].name}</h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black text-white">#{primaryPoolRank?.rank || 1}</span>
                  <span className="text-xs text-neutral-400">de {primaryPoolRank?.total || 1} jugadores</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-neutral-500 mt-2">No perteneces a ningún grupo.</p>
            )}
          </div>
          {pools.length > 0 ? (
            <button
              onClick={() => onNavigateToTab('grupos')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 mt-4 flex items-center gap-1 transition"
            >
              Ver tabla del grupo →
            </button>
          ) : (
            <button
              onClick={() => onNavigateToTab('grupos')}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition mt-4 self-start"
            >
              Unirme a un grupo
            </button>
          )}
        </div>

      </div>

      {/* 3. Sección de Partidos del Día */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">Partidos Activos / Recientes</h3>
          <button 
            onClick={() => onNavigateToTab('fixture')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition"
          >
            Ver fixture completo →
          </button>
        </div>

        {activeMatches.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {activeMatches.map((match) => {
              const mDate = new Date(match.match_date);
              const isLocked = new Date().getTime() >= new Date(match.lock_time_part2).getTime();
              const isLive = match.status === 'live';
              const isFinished = match.status === 'finished';

              return (
                <div 
                  key={match.id}
                  className="p-5 rounded-2xl glass-card border border-neutral-800/40 hover:border-emerald-500/20 transition flex flex-col justify-between shadow-md"
                >
                  <div className="flex justify-between items-center text-xs mb-3">
                    <span className="text-neutral-500 uppercase tracking-wider font-semibold">
                      Partido #{match.id}
                    </span>
                    {isLive && (
                      <span className="px-2 py-0.5 rounded-full bg-red-950/80 border border-red-500/30 text-red-400 font-bold animate-pulse">
                        EN VIVO
                      </span>
                    )}
                    {isFinished && (
                      <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-neutral-400 border border-neutral-800">
                        FINALIZADO
                      </span>
                    )}
                    {!isLive && !isFinished && (
                      <span className="text-neutral-400">
                        {mDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} — {mDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                      </span>
                    )}
                  </div>

                  {/* Marcador */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    {/* Home */}
                    <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                      <span className="text-2xl font-bold text-white truncate">
                        {match.home_team_id}
                      </span>
                      <span className="text-3xl flex-shrink-0 flex items-center justify-center">
                        <TeamFlag teamId={match.home_team_id} fallbackEmoji={teamsFlags[match.home_team_id] || '🏳️'} className="w-8 h-6" />
                      </span>
                    </div>
                    
                    {/* Scores reales */}
                    <div className="flex-shrink-0 flex items-center justify-center font-black text-2xl text-white">
                      {isFinished || isLive ? `${match.home_score} - ${match.away_score}` : 'vs'}
                    </div>

                    {/* Away */}
                    <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                      <span className="text-3xl flex-shrink-0 flex items-center justify-center">
                        <TeamFlag teamId={match.away_team_id} fallbackEmoji={teamsFlags[match.away_team_id] || '🏳️'} className="w-8 h-6" />
                      </span>
                      <span className="text-2xl font-bold text-white truncate">
                        {match.away_team_id}
                      </span>
                    </div>
                  </div>

                  {/* Estado / Botón de acción */}
                  <div className="flex justify-between items-center border-t border-neutral-900/60 pt-3 mt-2 text-xs">
                    <span className="text-neutral-500">
                      Cierre predicción: {new Date(match.lock_time_part2).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} — {new Date(match.lock_time_part2).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                    </span>
                    {!isLocked ? (
                      <button
                        onClick={() => onNavigateToTab('fixture')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 border border-emerald-500/20 text-emerald-400 font-semibold transition"
                      >
                        Pronosticar
                      </button>
                    ) : (
                      <span className="text-neutral-400 italic">
                        🔒 Predicción bloqueada
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl glass-card text-center border border-neutral-900 shadow-inner">
            <span className="text-4xl mb-2 block">📅</span>
            <h4 className="text-sm font-semibold text-neutral-300">Sin partidos activos para hoy</h4>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-1">
              No hay partidos del mundial programados para el día de hoy.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
