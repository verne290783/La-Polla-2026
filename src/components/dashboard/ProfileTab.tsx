'use client';

import { useState, useEffect } from 'react';
import { getProfile, getChampionPrediction, getP2Predictions, getTeams, getUserPools, getPoolMemberInfo } from '@/lib/db-helpers';
import TeamFlag from '@/components/common/TeamFlag';

interface ProfileTabProps {
  userId: string;
}

export default function ProfileTab({ userId }: ProfileTabProps) {
  const [profile, setProfile] = useState<any>(null);
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [poolMemberInfo, setPoolMemberInfo] = useState<any>(null);
  const [championPred, setChampionPred] = useState<any>(null);
  const [p2Predictions, setP2Predictions] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPoolStats, setLoadingPoolStats] = useState(false);

  useEffect(() => {
    async function initProfile() {
      try {
        setLoading(true);
        const [prof, allTeams, userPools] = await Promise.all([
          getProfile(userId),
          getTeams(),
          getUserPools(userId)
        ]);

        setProfile(prof);
        setTeams(allTeams);
        setPools(userPools);

        if (userPools.length > 0) {
          setSelectedPoolId(userPools[0].id);
        }
      } catch (err) {
        console.error('Error al inicializar el perfil:', err);
      } finally {
        setLoading(false);
      }
    }

    initProfile();
  }, [userId]);

  useEffect(() => {
    async function loadPoolSpecificData() {
      if (!selectedPoolId) {
        setChampionPred(null);
        setP2Predictions([]);
        setPoolMemberInfo(null);
        return;
      }

      try {
        setLoadingPoolStats(true);
        const [champ, p2Preds, memberInfo] = await Promise.all([
          getChampionPrediction(userId, selectedPoolId),
          getP2Predictions(userId, selectedPoolId),
          getPoolMemberInfo(userId, selectedPoolId)
        ]);

        setChampionPred(champ);
        setP2Predictions(p2Preds || []);
        setPoolMemberInfo(memberInfo);
      } catch (err) {
        console.error('Error al cargar estadísticas específicas del grupo:', err);
      } finally {
        setLoadingPoolStats(false);
      }
    }

    loadPoolSpecificData();
  }, [userId, selectedPoolId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-neutral-400 text-sm">Cargando perfil...</p>
      </div>
    );
  }

  const getTeamEmojiAndName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) {
      return (
        <span className="inline-flex items-center gap-2">
          <span>🏳️</span>
          <span>Por definir</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2">
        <TeamFlag teamId={team.id} fallbackEmoji={team.flag_emoji} className="w-6 h-4" />
        <span>{team.name}</span>
      </span>
    );
  };

  // Estadísticas básicas
  const totalP2Made = p2Predictions.length;
  const exactScores = p2Predictions.filter(p => p.points_earned === 3).length; // 3 pts por marcador exacto
  const correctWinners = p2Predictions.filter(p => p.points_earned === 1).length; // 1 pt por resultado/ganador correcto (sin marcador exacto)
  const failedP2 = p2Predictions.filter(p => p.points_earned === 0).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      {/* Cabecera del Perfil */}
      <div className="p-6 md:p-8 rounded-2xl glass-card border border-neutral-800/60 shadow-lg flex flex-col md:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-emerald-950/60 border-2 border-emerald-500 flex items-center justify-center text-3xl font-black text-emerald-400 overflow-hidden shadow-inner">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
          ) : (
            profile?.display_name?.charAt(0).toUpperCase() || 'P'
          )}
        </div>
        
        <div className="text-center md:text-left flex-1 space-y-1">
          <h2 className="text-2xl font-black text-white">{profile?.display_name || 'Participante'}</h2>
          <p className="text-neutral-400 text-sm">{profile?.email}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Mundialista Activo</span>
          </div>
        </div>

        {/* Gran total a la derecha */}
        <div className="px-8 py-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center min-w-[145px] shrink-0">
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Puntaje Grupo</p>
          <p className="text-4xl font-black text-white mt-1">
            {selectedPoolId ? (poolMemberInfo?.total_points || 0) : 0}
          </p>
          <p className="text-[9px] text-neutral-400 font-bold mt-1 uppercase tracking-wider">
            {selectedPoolId ? 'En esta liga' : 'Sin grupo'}
          </p>
          <div className="border-t border-neutral-800/80 mt-2.5 pt-1.5 text-[10px] text-neutral-500 font-semibold">
            Global: <span className="text-emerald-400">{profile?.total_points || 0} pts</span>
          </div>
        </div>
      </div>

      {/* Selector de Grupo para Estadísticas */}
      {pools.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 rounded-2xl glass-card border border-neutral-800/60 shadow-lg gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-sm font-extrabold text-white">Grupo para Estadísticas</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Filtrar rendimiento y podio de la polla por grupo.</p>
            </div>
          </div>
          <select
            value={selectedPoolId}
            onChange={(e) => setSelectedPoolId(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold text-sm focus:outline-none focus:border-emerald-500/50 cursor-pointer min-w-[200px]"
          >
            {pools.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Grid de Secciones */}
      <div className={`grid md:grid-cols-2 gap-8 transition-opacity duration-300 ${loadingPoolStats ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Bloque 1: Predicción de Campeón / Podio (Parte 1) */}
        <div className="p-6 rounded-2xl glass-card border border-neutral-800/60 shadow-lg space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              🏆 Mi Podio Pronosticado
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Predicción pre-torneo del cuadro de honor (Parte 1).
            </p>
          </div>

          <div className="space-y-4">
            {/* Campeón */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🥇</span>
                <div>
                  <p className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">Campeón</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {championPred?.champion_team_id ? getTeamEmojiAndName(championPred.champion_team_id) : 'Pendiente de completar'}
                  </p>
                </div>
              </div>
              {championPred?.points_earned !== null && championPred?.champion_team_id && (
                <span className="text-xs font-bold text-amber-400">
                  +{championPred?.champion_team_id && championPred?.points_earned ? '10' : '0'} pts
                </span>
              )}
            </div>

            {/* Subcampeón */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-neutral-400">🥈</span>
                <div>
                  <p className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">Subcampeón</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {championPred?.runner_up_team_id ? getTeamEmojiAndName(championPred.runner_up_team_id) : 'Pendiente de completar'}
                  </p>
                </div>
              </div>
              {championPred?.points_earned !== null && championPred?.runner_up_team_id && (
                <span className="text-xs font-bold text-neutral-400">
                  +{championPred?.points_earned && championPred?.points_earned >= 5 ? '5' : '0'} pts
                </span>
              )}
            </div>

            {/* Tercer Puesto */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl text-amber-700">🥉</span>
                <div>
                  <p className="text-[9px] text-amber-700 font-bold uppercase tracking-wider">Tercer Puesto</p>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {championPred?.third_place_team_id ? getTeamEmojiAndName(championPred.third_place_team_id) : 'Pendiente de completar'}
                  </p>
                </div>
              </div>
              {championPred?.points_earned !== null && championPred?.third_place_team_id && (
                <span className="text-xs font-bold text-neutral-400">
                  +{championPred?.points_earned && (championPred?.points_earned === 3 || championPred?.points_earned === 13 || championPred?.points_earned === 18) ? '3' : '0'} pts
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bloque 2: Estadísticas de Pronósticos En Vivo (Parte 2) */}
        <div className="p-6 rounded-2xl glass-card border border-neutral-800/60 shadow-lg space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              📊 Estadísticas en Vivo (Parte 2)
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Rendimiento en predicciones individuales de partidos en juego.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-center">
              <p className="text-2xl font-black text-white">{totalP2Made}</p>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Realizados</p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/10 text-center">
              <p className="text-2xl font-black text-emerald-400">{exactScores}</p>
              <p className="text-[9px] text-emerald-500/80 font-bold uppercase tracking-wider mt-1">Marcador Exacto (3 pts)</p>
            </div>
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-center">
              <p className="text-2xl font-black text-neutral-300">{correctWinners}</p>
              <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mt-1">Ganador Correcto (1 pt)</p>
            </div>
            <div className="p-4 rounded-xl bg-red-950/10 border border-red-500/10 text-center">
              <p className="text-2xl font-black text-red-400/80">{failedP2}</p>
              <p className="text-[9px] text-red-500/50 font-bold uppercase tracking-wider mt-1">Sin Puntos (0 pts)</p>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center text-xs text-neutral-400 mb-1">
              <span>Efectividad de aciertos:</span>
              <span className="font-bold text-white">
                {totalP2Made > 0 ? `${Math.round(((exactScores + correctWinners) / totalP2Made) * 100)}%` : '0%'}
              </span>
            </div>
            <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all"
                style={{ 
                  width: totalP2Made > 0 
                    ? `${((exactScores + correctWinners) / totalP2Made) * 100}%` 
                    : '0%' 
                }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
