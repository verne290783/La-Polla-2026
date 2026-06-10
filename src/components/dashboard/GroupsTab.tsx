'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserPools, getPoolMembersRanking } from '@/lib/db-helpers';

interface GroupsTabProps {
  userId: string;
}

export default function GroupsTab({ userId }: GroupsTabProps) {
  const supabase = createClient();
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');
  const [membersRanking, setMembersRanking] = useState<any[]>([]);
  const [loadingPools, setLoadingPools] = useState(true);
  const [loadingRankings, setLoadingRankings] = useState(false);

  // Join/Create forms
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadPools();
  }, [userId]);

  useEffect(() => {
    if (selectedPoolId) {
      loadRankings(selectedPoolId);

      // Suscripción Realtime a cambios en perfiles o miembros para actualizar leaderboard al instante
      const channel = supabase
        .channel(`pool-ranking-${selectedPoolId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          () => {
            loadRankings(selectedPoolId);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pool_members', filter: `pool_id=eq.${selectedPoolId}` },
          () => {
            loadRankings(selectedPoolId);
            loadPools(); // Puede que se haya unido alguien más
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setMembersRanking([]);
    }
  }, [selectedPoolId]);

  async function loadPools() {
    try {
      setLoadingPools(true);
      const userPools = await getUserPools(userId);
      setPools(userPools);
      if (userPools.length > 0 && !selectedPoolId) {
        setSelectedPoolId(userPools[0].id);
      }
    } catch (err) {
      console.error('Error al cargar grupos:', err);
    } finally {
      setLoadingPools(false);
    }
  }

  async function loadRankings(poolId: string) {
    try {
      setLoadingRankings(true);
      const ranking = await getPoolMembersRanking(poolId);
      
      // Calcular posiciones con empates compartiendo el mismo ranking
      let currentRank = 1;
      const computedRanking = ranking.map((item, index) => {
        if (index > 0 && item.totalPoints < ranking[index - 1].totalPoints) {
          currentRank = index + 1;
        }
        return {
          ...item,
          rank: currentRank,
        };
      });

      setMembersRanking(computedRanking);
    } catch (err) {
      console.error('Error al cargar rankings del grupo:', err);
    } finally {
      setLoadingRankings(false);
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setFormLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // 1. Crear el grupo
      const { data: pool, error: poolError } = await supabase
        .from('pools')
        .insert({
          name: groupName.trim(),
          invite_code: code,
          created_by: userId,
        })
        .select()
        .single();

      if (poolError) throw poolError;

      // 2. Unirse
      const { error: memberError } = await supabase
        .from('pool_members')
        .insert({
          pool_id: pool.id,
          user_id: userId,
        });

      if (memberError) throw memberError;

      setSuccessMsg(`¡Grupo "${pool.name}" creado con código ${code}!`);
      setGroupName('');
      
      // Recargar grupos y seleccionar el nuevo
      const updatedPools = await getUserPools(userId);
      setPools(updatedPools);
      setSelectedPoolId(pool.id);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al crear el grupo.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setFormLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const codeFormatted = inviteCode.trim().toUpperCase();

      const { data: pool, error: fetchError } = await supabase
        .from('pools')
        .select('id, name')
        .eq('invite_code', codeFormatted)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!pool) throw new Error('El código ingresado no existe.');

      const { error: joinError } = await supabase
        .from('pool_members')
        .insert({
          pool_id: pool.id,
          user_id: userId,
        });

      if (joinError) {
        if (joinError.code === '23505') throw new Error('Ya perteneces a este grupo.');
        throw joinError;
      }

      setSuccessMsg(`¡Te has unido con éxito a "${pool.name}"!`);
      setInviteCode('');

      // Recargar grupos y seleccionar el unido
      const updatedPools = await getUserPools(userId);
      setPools(updatedPools);
      setSelectedPoolId(pool.id);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al unirse al grupo.');
    } finally {
      setFormLoading(false);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('Código copiado al portapapeles. ¡Compártelo con tus amigos!');
  };

  const handleDeleteGroup = async () => {
    if (!selectedPoolId) return;
    const confirmed = window.confirm('¿Estás seguro de que deseas borrar este grupo? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      setFormLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const { error } = await supabase
        .from('pools')
        .delete()
        .eq('id', selectedPoolId);

      if (error) throw error;

      setSuccessMsg('Grupo borrado con éxito.');

      const remainingPools = pools.filter(p => p.id !== selectedPoolId);
      setPools(remainingPools);
      if (remainingPools.length > 0) {
        setSelectedPoolId(remainingPools[0].id);
      } else {
        setSelectedPoolId('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error al borrar el grupo.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loadingPools) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-neutral-400 text-sm">Cargando tus grupos...</p>
      </div>
    );
  }

  const selectedPool = pools.find(p => p.id === selectedPoolId);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cabecera y Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Mis Grupos</h2>
          <p className="text-neutral-400 text-sm mt-1">
            Compite con amigos y ve los puntajes específicos de cada liga.
          </p>
        </div>

        {pools.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-neutral-400 font-semibold whitespace-nowrap">Grupo Activo:</label>
            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-white font-bold text-sm focus:outline-none focus:border-emerald-500/50"
            >
              {pools.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedPool ? (
        <div className="grid md:grid-cols-3 gap-8">
          {/* Columna Principal: Leaderboard del Grupo (2/3 de pantalla) */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/10">
              <div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Código de Invitación</p>
                <p className="text-xl font-mono font-bold text-white tracking-wider mt-0.5">{selectedPool.invite_code}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyInviteCode(selectedPool.invite_code)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
                >
                  Copiar Código
                </button>
                {selectedPool.created_by === userId && (
                  <button
                    onClick={handleDeleteGroup}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition"
                  >
                    Borrar Grupo
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl glass-card border border-neutral-800/60 shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-900 bg-neutral-950/40 text-xs font-semibold text-neutral-400 uppercase">
                      <th className="px-5 py-3 text-center w-12">Pos</th>
                      <th className="px-5 py-3">Jugador</th>
                      <th className="px-5 py-3 text-center">P1 (Gran Polla)</th>
                      <th className="px-5 py-3 text-center">P2 (En Vivo)</th>
                      <th className="px-5 py-3 text-right pr-6">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900/60 text-sm">
                    {loadingRankings && membersRanking.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-10 text-center">
                          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <span className="text-xs text-neutral-500">Actualizando posiciones...</span>
                        </td>
                      </tr>
                    ) : (
                      membersRanking.map((row) => {
                        const isSelf = row.userId === userId;
                        return (
                          <tr 
                            key={row.userId} 
                            className={`transition duration-150 ${
                              isSelf 
                                ? 'bg-emerald-950/20 border-y border-emerald-500/30 text-emerald-100 font-semibold' 
                                : 'hover:bg-neutral-900/20 text-neutral-300'
                            }`}
                          >
                            <td className="px-5 py-3 text-center font-bold text-xs">
                              {row.rank === 1 && <span className="text-base">🥇</span>}
                              {row.rank === 2 && <span className="text-base">🥈</span>}
                              {row.rank === 3 && <span className="text-base">🥉</span>}
                              {row.rank > 3 && `#${row.rank}`}
                            </td>
                            <td className="px-5 py-3 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-900/40 border border-emerald-500/20 flex items-center justify-center font-bold text-xs text-emerald-400 overflow-hidden shadow-inner">
                                {row.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={row.avatarUrl} alt={row.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  row.displayName?.charAt(0).toUpperCase() || 'P'
                                )}
                              </div>
                              <span className="truncate max-w-[120px] md:max-w-none">
                                {row.displayName}
                                {isSelf && <span className="ml-1.5 text-[8px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full uppercase">Tú</span>}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center text-xs text-neutral-400 font-medium">
                              {row.part1Points} pts
                            </td>
                            <td className="px-5 py-3 text-center text-xs text-neutral-400 font-medium">
                              {row.part2Points} pts
                            </td>
                            <td className="px-5 py-3 text-right pr-6 font-black text-white">
                              {row.totalPoints} <span className="text-[9px] text-neutral-400 font-medium">pts</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Columna Lateral: Crear / Unirse a más grupos (1/3 de pantalla) */}
          <div className="space-y-6">
            {/* Notificaciones */}
            {errorMsg && (
              <div className="p-3 text-xs text-red-200 bg-red-950/60 border border-red-500/20 rounded-xl text-center">
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-xs text-emerald-200 bg-emerald-950/60 border border-emerald-500/20 rounded-xl text-center">
                🎉 {successMsg}
              </div>
            )}

            {/* Crear */}
            <div className="p-6 rounded-2xl glass-card border border-neutral-800/60 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                ➕ Crear Nuevo Grupo
              </h3>
              <form onSubmit={handleCreateGroup} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre del grupo"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={formLoading}
                  maxLength={30}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-emerald-500/50 transition"
                />
                <button
                  type="submit"
                  disabled={formLoading || !groupName.trim()}
                  className="w-full py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
                >
                  {formLoading ? 'Cargando...' : 'Crear'}
                </button>
              </form>
            </div>

            {/* Unirse */}
            <div className="p-6 rounded-2xl glass-card border border-neutral-800/60 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                🔑 Unirse con Código
              </h3>
              <form onSubmit={handleJoinGroup} className="space-y-3">
                <input
                  type="text"
                  placeholder="Código de 6 letras"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  disabled={formLoading}
                  maxLength={6}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-500/50 transition font-mono uppercase tracking-widest text-center"
                />
                <button
                  type="submit"
                  disabled={formLoading || inviteCode.trim().length !== 6}
                  className="w-full py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 transition disabled:opacity-50"
                >
                  {formLoading ? 'Cargando...' : 'Unirse'}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto space-y-6">
          {errorMsg && (
            <div className="p-3 text-xs text-red-200 bg-red-950/60 border border-red-500/20 rounded-xl text-center">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 text-xs text-emerald-200 bg-emerald-950/60 border border-emerald-500/20 rounded-xl text-center">
              🎉 {successMsg}
            </div>
          )}

          {/* Crear */}
          <div className="p-6 rounded-2xl glass-card border border-neutral-800/60 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              ➕ Crear Nuevo Grupo
            </h3>
            <form onSubmit={handleCreateGroup} className="space-y-3">
              <input
                type="text"
                placeholder="Nombre del grupo"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={formLoading}
                maxLength={30}
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-emerald-500/50 transition"
              />
              <button
                type="submit"
                disabled={formLoading || !groupName.trim()}
                className="w-full py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition disabled:opacity-50"
              >
                {formLoading ? 'Cargando...' : 'Crear'}
              </button>
            </form>
          </div>

          {/* Unirse */}
          <div className="p-6 rounded-2xl glass-card border border-neutral-800/60 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              🔑 Unirse con Código
            </h3>
            <form onSubmit={handleJoinGroup} className="space-y-3">
              <input
                type="text"
                placeholder="Código de 6 letras"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={formLoading}
                maxLength={6}
                required
                className="w-full px-3 py-2 rounded-xl bg-neutral-900/60 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-500/50 transition font-mono uppercase tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={formLoading || inviteCode.trim().length !== 6}
                className="w-full py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 transition disabled:opacity-50"
              >
                {formLoading ? 'Cargando...' : 'Unirse'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
