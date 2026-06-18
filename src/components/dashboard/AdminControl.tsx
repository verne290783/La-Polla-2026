'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TEAM_TO_GROUP } from '@/lib/fifa/bracket';
import TeamFlag from '@/components/common/TeamFlag';

interface MatchRowProps {
  match: any;
  teams: any[];
  onSave: (matchId: number, data: any) => Promise<void>;
}

function MatchRow({ match, teams, onSave }: MatchRowProps) {
  const [homeScore, setHomeScore] = useState<string>(
    match.home_score_90 !== null && match.home_score_90 !== undefined
      ? match.home_score_90.toString()
      : (match.home_score !== null ? match.home_score.toString() : '')
  );
  const [awayScore, setAwayScore] = useState<string>(
    match.away_score_90 !== null && match.away_score_90 !== undefined
      ? match.away_score_90.toString()
      : (match.away_score !== null ? match.away_score.toString() : '')
  );
  const [homeScoreEt, setHomeScoreEt] = useState<string>(match.home_score !== null ? match.home_score.toString() : '');
  const [awayScoreEt, setAwayScoreEt] = useState<string>(match.away_score !== null ? match.away_score.toString() : '');
  const [status, setStatus] = useState<'scheduled' | 'live' | 'finished'>(match.status);
  const [winnerTeamId, setWinnerTeamId] = useState<string | null>(match.winner_team_id);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const homeTeam = teams.find(t => t.id === match.home_team_id);
  const awayTeam = teams.find(t => t.id === match.away_team_id);

  const isKnockout = match.phase !== 'group';

  // React to parent data changes (e.g. after real API sync)
  useEffect(() => {
    const hs90 = match.home_score_90 !== null && match.home_score_90 !== undefined
      ? match.home_score_90.toString()
      : (match.home_score !== null ? match.home_score.toString() : '');
    const as90 = match.away_score_90 !== null && match.away_score_90 !== undefined
      ? match.away_score_90.toString()
      : (match.away_score !== null ? match.away_score.toString() : '');
    setHomeScore(hs90);
    setAwayScore(as90);
    setHomeScoreEt(match.home_score !== null ? match.home_score.toString() : '');
    setAwayScoreEt(match.away_score !== null ? match.away_score.toString() : '');
    setStatus(match.status);
    setWinnerTeamId(match.winner_team_id);
  }, [match]);

  const handleSaveClick = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const parsedHome = homeScore.trim() === '' ? null : parseInt(homeScore, 10);
      const parsedAway = awayScore.trim() === '' ? null : parseInt(awayScore, 10);

      if (homeScore.trim() !== '' && isNaN(parsedHome as number)) {
        throw new Error('Marcador local inválido');
      }
      if (awayScore.trim() !== '' && isNaN(parsedAway as number)) {
        throw new Error('Marcador visitante inválido');
      }

      const parsedHomeEt = homeScoreEt.trim() === '' ? null : parseInt(homeScoreEt, 10);
      const parsedAwayEt = awayScoreEt.trim() === '' ? null : parseInt(awayScoreEt, 10);

      if (homeScoreEt.trim() !== '' && isNaN(parsedHomeEt as number)) {
        throw new Error('Marcador prórroga local inválido');
      }
      if (awayScoreEt.trim() !== '' && isNaN(parsedAwayEt as number)) {
        throw new Error('Marcador prórroga visitante inválido');
      }

      const isDraw90 = isKnockout && parsedHome !== null && parsedAway !== null && parsedHome === parsedAway;

      await onSave(match.id, {
        home_score_90: parsedHome,
        away_score_90: parsedAway,
        home_score: isDraw90 && parsedHomeEt !== null ? parsedHomeEt : parsedHome,
        away_score: isDraw90 && parsedAwayEt !== null ? parsedAwayEt : parsedAway,
        status,
        winner_team_id: isKnockout ? winnerTeamId : null
      });

      setMessage({ type: 'success', text: 'Partido guardado' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  };

  const phaseNames: Record<string, string> = {
    group: 'Grupo',
    r32: 'Ronda de 32',
    r16: 'Octavos de Final',
    qf: 'Cuartos de Final',
    sf: 'Semifinales',
    '3rd': 'Tercer Puesto',
    final: 'Final'
  };

  const getMatchGroup = (m: any) => {
    if (m.phase !== 'group') return null;
    return TEAM_TO_GROUP[m.home_team_id] || TEAM_TO_GROUP[m.away_team_id] || null;
  };

  const groupLetter = getMatchGroup(match);

  const showExtraTime = isKnockout && homeScore.trim() !== '' && awayScore.trim() !== '' && parseInt(homeScore, 10) === parseInt(awayScore, 10);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Información del Partido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">
            Part. #{match.id}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded">
            {phaseNames[match.phase] || match.phase} {groupLetter ? `Grupo ${groupLetter}` : ''}
          </span>
          <span className="text-xs text-neutral-500">
            {new Date(match.match_date).toLocaleDateString()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-white">
            {homeTeam ? (
              <>
                <TeamFlag teamId={homeTeam.id} fallbackEmoji={homeTeam.flag_emoji} className="w-5 h-3.5" />
                <span className="truncate max-w-[100px] sm:max-w-none">{homeTeam.name}</span>
              </>
            ) : (
              <span className="text-neutral-500">{match.home_team_id || 'Por definir'}</span>
            )}
          </div>
          <span className="text-neutral-600 text-xs font-black">VS</span>
          <div className="flex items-center gap-2 font-semibold text-white">
            {awayTeam ? (
              <>
                <TeamFlag teamId={awayTeam.id} fallbackEmoji={awayTeam.flag_emoji} className="w-5 h-3.5" />
                <span className="truncate max-w-[100px] sm:max-w-none">{awayTeam.name}</span>
              </>
            ) : (
              <span className="text-neutral-500">{match.away_team_id || 'Por definir'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Editor de Marcadores, Estado y Ganador */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Marcadores */}
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            placeholder="-"
            className="w-12 h-9 bg-neutral-950 border border-neutral-800 rounded-lg text-center text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
          />
          <span className="text-neutral-600 font-bold">-</span>
          <input
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            placeholder="-"
            className="w-12 h-9 bg-neutral-950 border border-neutral-800 rounded-lg text-center text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {showExtraTime && (
          <div className="flex items-center gap-2 border-l border-neutral-800 pl-4">
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Prórroga (120m):</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={homeScoreEt}
                onChange={(e) => setHomeScoreEt(e.target.value)}
                placeholder="-"
                className="w-12 h-9 bg-neutral-950 border border-neutral-800 rounded-lg text-center text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-neutral-600 font-bold">-</span>
              <input
                type="number"
                value={awayScoreEt}
                onChange={(e) => setAwayScoreEt(e.target.value)}
                placeholder="-"
                className="w-12 h-9 bg-neutral-950 border border-neutral-800 rounded-lg text-center text-white font-mono font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Estado */}
        <div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="h-9 px-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-semibold focus:border-emerald-500 focus:outline-none"
          >
            <option value="scheduled">Programado</option>
            <option value="live">En vivo</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>

        {/* Ganador (Sólo Eliminatorias) */}
        {isKnockout && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-neutral-500 uppercase font-bold">Ganador:</span>
            <select
              value={winnerTeamId || ''}
              onChange={(e) => setWinnerTeamId(e.target.value || null)}
              className="h-9 px-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-semibold focus:border-emerald-500 focus:outline-none max-w-[120px]"
            >
              <option value="">Ninguno / Empate</option>
              {match.home_team_id && <option value={match.home_team_id}>{match.home_team_id}</option>}
              {match.away_team_id && <option value={match.away_team_id}>{match.away_team_id}</option>}
            </select>
          </div>
        )}

        {/* Botón Guardar y Estado */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="px-4 h-9 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-3 h-3 border border-t-transparent border-white rounded-full animate-spin" />
            ) : null}
            Guardar
          </button>
          
          {message && (
            <span className={`text-xs font-bold ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminControl() {
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'partidos' | 'usuarios' | 'sistema'>('partidos');

  // Carga e inicialización
  const [loading, setLoading] = useState(true);
  const [timeOffset, setTimeOffset] = useState<number>(0);

  // Datos de Partidos
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [matchSearch, setMatchSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<'all' | 'group' | 'knockout'>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Datos de Usuarios
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Estados de Operación de Sistema
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [recalcSuccess, setRecalcSuccess] = useState<string | null>(null);

  // Estados de restablecimiento de contraseña
  const [resettingUser, setResettingUser] = useState<any | null>(null);
  const [tempPassword, setTempPassword] = useState<string>('');
  const [resetLoading, setResetLoading] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Polla-${randomPart}`;
  };

  const handleConfirmResetPassword = async () => {
    if (!resettingUser || tempPassword.length < 6) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: resettingUser.id,
          newPassword: tempPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña.');
      }

      setResetMessage({ type: 'success', text: 'Contraseña restablecida correctamente.' });
      setTimeout(() => {
        setResettingUser(null);
      }, 2000);
    } catch (err: any) {
      setResetMessage({ type: 'error', text: err.message });
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    async function checkAdminAndLoad() {
      try {
        setLoading(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          setIsAdmin(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        const userIsAdmin = profile?.email === 'ehdiazs@gmail.com' || profile?.is_admin === true;
        setIsAdmin(userIsAdmin);

        if (userIsAdmin) {
          // Fetch app time
          const { data: appTime } = await supabase.rpc('get_app_time');
          let offset = 0;
          if (appTime) {
            offset = new Date(appTime).getTime() - Date.now();
          }
          setTimeOffset(offset);

          // Cargar datos iniciales
          await Promise.all([loadMatchesAndTeams(), loadUsers()]);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }
    checkAdminAndLoad();
  }, []);

  const loadMatchesAndTeams = async () => {
    const [matchesRes, teamsRes] = await Promise.all([
      supabase.from('matches').select('*').order('id', { ascending: true }),
      supabase.from('teams').select('*').order('name')
    ]);

    if (matchesRes.data) setMatches(matchesRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('total_points', { ascending: false });
    if (data) setUsers(data);
  };

  const handleSaveMatch = async (matchId: number, data: any) => {
    const { error } = await supabase
      .from('matches')
      .update({
        home_score: data.home_score,
        away_score: data.away_score,
        home_score_90: data.home_score_90,
        away_score_90: data.away_score_90,
        status: data.status,
        winner_team_id: data.winner_team_id
      })
      .eq('id', matchId);

    if (error) throw error;

    // Actualizar estado local
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, ...data } : m));
  };

  const handleUnlockUser = async (userId: string) => {
    const { error } = await supabase.rpc('admin_unlock_user_p1', { p_user_id: userId });
    if (error) {
      alert('Error al desbloquear: ' + error.message);
    } else {
      await loadUsers();
    }
  };

  const handleLockUser = async (userId: string) => {
    const { error } = await supabase.rpc('admin_lock_user_p1', { p_user_id: userId });
    if (error) {
      alert('Error al bloquear: ' + error.message);
    } else {
      await loadUsers();
    }
  };

  const handleSyncScores = async () => {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      setSyncResult(data);
      // Recargar partidos
      await loadMatchesAndTeams();
    } catch (err: any) {
      setSyncResult({ success: false, error: err.message || 'Error al conectar con el servidor.' });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleRecalculatePoints = async () => {
    setRecalcLoading(true);
    setRecalcSuccess(null);
    try {
      const { error } = await supabase.rpc('recalculate_all_points');
      if (error) throw error;
      setRecalcSuccess('Puntos recalculados exitosamente para todos los usuarios.');
      // Recargar usuarios
      await loadUsers();
    } catch (err: any) {
      alert('Error al recalcular puntos: ' + err.message);
    } finally {
      setRecalcLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-neutral-400 text-sm">Validando credenciales de administrador...</p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="p-8 bg-red-950/20 border border-red-900/40 rounded-2xl text-center">
        <span className="text-3xl mb-2 block">🚫</span>
        <h2 className="text-lg font-bold text-red-500 mb-1">Acceso Denegado</h2>
        <p className="text-neutral-400 text-xs">Esta sección está restringida exclusivamente para administradores del sistema.</p>
      </div>
    );
  }

  // Filtrado de Partidos
  const getMatchGroup = (m: any) => {
    if (m.phase !== 'group') return null;
    return TEAM_TO_GROUP[m.home_team_id] || TEAM_TO_GROUP[m.away_team_id] || null;
  };

  const filteredMatches = matches.filter(m => {
    // 1. Búsqueda por query
    const homeTeam = teams.find(t => t.id === m.home_team_id);
    const awayTeam = teams.find(t => t.id === m.away_team_id);
    const homeName = homeTeam?.name || m.home_team_id || '';
    const awayName = awayTeam?.name || m.away_team_id || '';
    const venue = m.venue || '';
    const city = m.city || '';
    const matchesSearch = 
      homeName.toLowerCase().includes(matchSearch.toLowerCase()) ||
      awayName.toLowerCase().includes(matchSearch.toLowerCase()) ||
      venue.toLowerCase().includes(matchSearch.toLowerCase()) ||
      city.toLowerCase().includes(matchSearch.toLowerCase()) ||
      m.id.toString() === matchSearch;

    // 2. Filtro de fase
    let matchesPhase = true;
    if (phaseFilter === 'group') {
      matchesPhase = m.phase === 'group';
    } else if (phaseFilter === 'knockout') {
      matchesPhase = m.phase !== 'group';
    }

    // 3. Filtro de grupo
    let matchesGroup = true;
    if (groupFilter !== 'all') {
      const group = getMatchGroup(m);
      matchesGroup = group === groupFilter;
    }

    return matchesSearch && matchesPhase && matchesGroup;
  });

  // Filtrado de Usuarios
  const filteredUsers = users.filter(u => {
    const query = userSearch.toLowerCase();
    const name = (u.display_name || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const getUnlockStatus = (profile: any) => {
    if (!profile.p1_unlocked_until) return { label: 'Locked', isUnlocked: false };
    const dateLimit = new Date(profile.p1_unlocked_until).getTime();
    const isUnlocked = dateLimit > (Date.now() + timeOffset);
    return {
      label: isUnlocked 
        ? `Unlocked (Until ${new Date(profile.p1_unlocked_until).toLocaleString('es-CO', { timeZone: 'America/Bogota' })})` 
        : 'Locked',
      isUnlocked
    };
  };

  return (
    <div className="space-y-6">
      {/* Título de Cabecera */}
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-black text-white uppercase tracking-tight">
          Panel de Control <span className="gold-gradient-text">Admin</span>
        </h2>
        <p className="text-xs text-neutral-400">
          Gestiona el estado de los partidos, desbloqueos temporales de usuarios y configuraciones del sistema.
        </p>
      </div>

      {/* Tabs Internos */}
      <div className="flex border-b border-neutral-900 gap-2">
        {(['partidos', 'usuarios', 'sistema'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === tab
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {tab === 'partidos' ? 'Partidos' : tab === 'usuarios' ? 'Usuarios' : 'Sistema'}
          </button>
        ))}
      </div>

      {/* Contenido de Tabs */}
      <div className="mt-4">
        {/* TABS: PARTIDOS */}
        {activeTab === 'partidos' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-900/50 p-4 rounded-xl border border-neutral-900">
              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Buscar Partido</label>
                <input
                  type="text"
                  placeholder="Equipo, ciudad, estadio o ID..."
                  value={matchSearch}
                  onChange={(e) => setMatchSearch(e.target.value)}
                  className="w-full h-9 px-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Filtro de Fase</label>
                <select
                  value={phaseFilter}
                  onChange={(e) => {
                    setPhaseFilter(e.target.value as any);
                    if (e.target.value === 'knockout') setGroupFilter('all');
                  }}
                  className="w-full h-9 px-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-semibold focus:border-emerald-500 focus:outline-none"
                >
                  <option value="all">Todas las fases</option>
                  <option value="group">Fase de Grupos</option>
                  <option value="knockout">Fase Eliminatoria</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Filtro de Grupo</label>
                <select
                  value={groupFilter}
                  disabled={phaseFilter === 'knockout'}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full h-9 px-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 font-semibold focus:border-emerald-500 focus:outline-none disabled:opacity-50"
                >
                  <option value="all">Todos los grupos</option>
                  {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                    <option key={g} value={g}>Grupo {g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Nota Informativa */}
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 flex items-start gap-2.5">
              <span className="text-base leading-none">💡</span>
              <p>
                <strong>Nota:</strong> Los triggers en la base de datos recalculan automáticamente los puntos de las predicciones de los usuarios cada vez que un partido se marca como <strong>Finalizado (&quot;finished&quot;)</strong> o cuando se actualiza el marcador de un partido ya finalizado.
              </p>
            </div>

            {/* Lista de Partidos */}
            <div className="space-y-3">
              {filteredMatches.length > 0 ? (
                filteredMatches.map(m => (
                  <MatchRow key={m.id} match={m} teams={teams} onSave={handleSaveMatch} />
                ))
              ) : (
                <div className="text-center py-10 text-neutral-500 text-xs">
                  No se encontraron partidos para los filtros seleccionados.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TABS: USUARIOS */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            {/* Buscador de usuarios */}
            <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-900 max-w-md">
              <label className="block text-[10px] uppercase font-bold text-neutral-400 mb-1.5">Buscar Usuario</label>
              <input
                type="text"
                placeholder="Nombre o correo electrónico..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full h-9 px-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Listado / Tabla */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 bg-neutral-950 text-neutral-400 uppercase tracking-wider font-bold text-[10px]">
                    <th className="p-3.5">Usuario</th>
                    <th className="p-3.5">Correo</th>
                    <th className="p-3.5 text-center">Puntos</th>
                    <th className="p-3.5">Estado Parte 1</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800 text-neutral-300">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(u => {
                      const { label, isUnlocked } = getUnlockStatus(u);
                      return (
                        <tr key={u.id} className="hover:bg-neutral-900/45">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/20 flex items-center justify-center font-bold text-[10px] text-emerald-400 overflow-hidden">
                              {u.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={u.avatar_url} alt={u.display_name} className="w-full h-full object-cover" />
                              ) : (
                                u.display_name?.charAt(0).toUpperCase() || 'P'
                              )}
                            </div>
                            <span>{u.display_name}</span>
                          </td>
                          <td className="p-3.5 text-neutral-400 font-mono">{u.email}</td>
                          <td className="p-3.5 text-center font-black text-amber-500 text-sm">{u.total_points}</td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                              isUnlocked
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/20'
                                : 'bg-neutral-950 text-neutral-500 border border-neutral-800'
                            }`}>
                              {label}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <button
                              onClick={() => handleUnlockUser(u.id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition"
                            >
                              Desbloquear 24h
                            </button>
                            <button
                              onClick={() => handleLockUser(u.id)}
                              className="px-2.5 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-400 rounded text-[10px] font-bold transition border border-red-900/40"
                            >
                              Bloquear
                            </button>
                            <button
                              onClick={() => {
                                setResettingUser(u);
                                setTempPassword(generateTempPassword());
                                setResetMessage(null);
                                setResetLoading(false);
                              }}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold transition"
                            >
                              Restablecer Contraseña
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-neutral-500">
                        No se encontraron usuarios.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABS: SISTEMA */}
        {activeTab === 'sistema' && (
          <div className="space-y-6 max-w-2xl">
            {/* Card Sincronización */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Sincronizar Marcadores Reales</h3>
                <p className="text-neutral-400 text-xs mt-1">
                  Consulta la API externa para obtener los marcadores y estados en tiempo real e impactar los partidos locales de la copa.
                </p>
              </div>

              <div>
                <button
                  onClick={handleSyncScores}
                  disabled={syncLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
                >
                  {syncLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  ) : null}
                  Sincronizar Marcadores Reales
                </button>
              </div>

              {/* Resultado Sincronización */}
              {syncResult && (
                <div className="bg-neutral-950 border border-neutral-850 rounded-lg p-4 font-mono text-xs space-y-2 max-h-60 overflow-y-auto">
                  <div className="font-bold text-white">
                    Resultado: {syncResult.success ? '🟢 Exitoso' : '🔴 Fallido'}
                  </div>
                  {syncResult.source && <div>Origen de datos: {syncResult.source}</div>}
                  {syncResult.updatedCount !== undefined && (
                    <div>Partidos actualizados localmente: {syncResult.updatedCount}</div>
                  )}
                  {syncResult.error && <div className="text-red-400">Error: {syncResult.error}</div>}
                  {syncResult.errors && syncResult.errors.length > 0 && (
                    <div className="text-yellow-400 space-y-1 mt-2">
                      <div className="font-bold">Advertencias/Errores por partido:</div>
                      {syncResult.errors.map((e: string, i: number) => (
                        <div key={i}>- {e}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Recálculo */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-bold text-white text-sm">Recalcular Todos los Puntos</h3>
                <p className="text-neutral-400 text-xs mt-1">
                  Ejecuta un recálculo masivo sobre todas las predicciones de los usuarios de todos los grupos basándose en el estado actual de los partidos. Úsalo si agregaste puntajes manualmente y deseas forzar la actualización de tablas.
                </p>
              </div>

              <div>
                <button
                  onClick={handleRecalculatePoints}
                  disabled={recalcLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-2"
                >
                  {recalcLoading ? (
                    <span className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  ) : null}
                  Recalcular Todos los Puntos
                </button>
              </div>

              {recalcSuccess && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 font-bold">
                  {recalcSuccess}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Restablecer Contraseña */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Restablecer Contraseña
              </h3>
              <button
                onClick={() => setResettingUser(null)}
                className="text-neutral-400 hover:text-white transition text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div>
              <p className="text-xs text-neutral-400">
                Estás restableciendo la contraseña del usuario{' '}
                <strong className="text-white">{resettingUser.display_name}</strong> ({resettingUser.email}).
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] uppercase font-bold text-neutral-400">
                Contraseña Temporal
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  className="flex-1 h-9 px-3 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(tempPassword);
                    alert('Copiado al portapapeles');
                  }}
                  className="px-3 h-9 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition flex items-center justify-center"
                >
                  Copiar
                </button>
              </div>
            </div>

            {resetMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-bold border ${
                  resetMessage.type === 'success'
                    ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-950/30 border-red-500/20 text-red-400'
                }`}
              >
                {resetMessage.text}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                disabled={resetLoading}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmResetPassword}
                disabled={resetLoading || tempPassword.length < 6}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-800 disabled:text-neutral-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                {resetLoading && (
                  <span className="w-3.5 h-3.5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                )}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
