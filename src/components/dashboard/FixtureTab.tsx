'use client';

import { useState, useEffect } from 'react';
import { 
  getMatches, 
  getTeams, 
  getP1Predictions, 
  getChampionPrediction, 
  saveP1Predictions, 
  getP2Predictions, 
  saveP2Prediction,
  getUserPools
} from '@/lib/db-helpers';
import { LOCK_PART1_DATE } from '@/lib/fifa/state';
import TeamFlag from '@/components/common/TeamFlag';
import { 
  calculateGroupStandings, 
  getBestThirdPlacedTeams, 
  generateRoundOf32, 
  simulateNextRounds,
  TEAM_TO_GROUP
} from '@/lib/fifa/bracket';

interface FixtureTabProps {
  userId: string;
}

export default function FixtureTab({ userId }: FixtureTabProps) {
  const [subTab, setSubTab] = useState<'part1' | 'part2'>('part1');
  
  // Data loading
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamsFlags, setTeamsFlags] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pools, setPools] = useState<any[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>('');

  // Parte 1 Wizard State
  const [wizardStep, setWizardStep] = useState(1); // 1: Grupos, 2: Tablas/3ros, 3: R32, 4: R16, 5: QF, 6: SF/Final, 7: Podio
  const [p1GroupPreds, setP1GroupPreds] = useState<Record<number, { homeScore: number | ''; awayScore: number | '' }>>({});
  const [p1KoPreds, setP1KoPreds] = useState<Record<string, { homeScore: number | ''; awayScore: number | ''; winnerId?: string }>>({});
  const [p1Locked, setP1Locked] = useState(false);
  const [activeGroupWizard, setActiveGroupWizard] = useState<'A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L'>('A');

  // Parte 2 Live Predictions Feed State
  const [p2Preds, setP2Preds] = useState<Record<number, { homeScore: number | ''; awayScore: number | '' }>>({});
  const [submittingMatchId, setSubmittingMatchId] = useState<number | null>(null);

  // Countdown timer for P2
  const [timeRemaining, setTimeRemaining] = useState<Record<number, string>>({});

  // 1. Cargar grupos del usuario
  useEffect(() => {
    async function loadPools() {
      try {
        setLoading(true);
        const userPools = await getUserPools(userId);
        setPools(userPools);
        if (userPools.length > 0) {
          setSelectedPoolId(userPools[0].id);
        } else {
          setSelectedPoolId('');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error al cargar grupos:', err);
        setLoading(false);
      }
    }
    loadPools();
  }, [userId]);

  // 2. Cargar datos cuando cambia el grupo seleccionado
  useEffect(() => {
    if (selectedPoolId) {
      loadData(selectedPoolId);
    }
  }, [userId, selectedPoolId]);

  // Timer interval for lock counts in P2 (usando hora real)
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining: Record<number, string> = {};
      const vTime = new Date().getTime();
      
      matches.forEach(m => {
        const lockTime = new Date(m.lock_time_part2).getTime();
        const diff = lockTime - vTime;
        if (diff <= 0) {
          remaining[m.id] = '🔒 BLOQUEADO';
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          remaining[m.id] = `⏳ ${hours}h ${mins}m ${secs}s`;
        }
      });
      setTimeRemaining(remaining);
    }, 1000);

    return () => clearInterval(interval);
  }, [matches]);

  async function loadData(poolId: string) {
    try {
      setLoading(true);

      const [allMatches, allTeams, p1PredsList, p1Champ, p2PredsList] = await Promise.all([
        getMatches(),
        getTeams(),
        getP1Predictions(userId, poolId),
        getChampionPrediction(userId, poolId),
        getP2Predictions(userId, poolId)
      ]);

      setMatches(allMatches);
      setTeams(allTeams);

      const flagsMap: Record<string, string> = {};
      allTeams.forEach(t => {
        flagsMap[t.id] = t.flag_emoji;
      });
      setTeamsFlags(flagsMap);

      // --- Cargar Parte 1 ---
      // Si el mundial ya empezó de forma real o ya existe una predicción del campeón, bloquear
      const isPastP1Limit = new Date().getTime() >= LOCK_PART1_DATE.getTime();
      const hasLockedP1 = p1Champ !== null && p1Champ.is_locked === true;
      setP1Locked(isPastP1Limit || hasLockedP1);

      // Inicializar predicciones P1 del usuario si existen
      const groupPredsLocal: Record<number, { homeScore: number | ''; awayScore: number | '' }> = {};
      const koPredsLocal: Record<string, { homeScore: number | ''; awayScore: number | ''; winnerId?: string }> = {};

      p1PredsList.forEach(p => {
        if (p.phase === 'group') {
          // Extraer ID de partido real del key si se puede
          const matchIdStr = p.prediction_key.replace('G_', '');
          const matchId = parseInt(matchIdStr, 10);
          if (!isNaN(matchId)) {
            groupPredsLocal[matchId] = {
              homeScore: p.predicted_home_score,
              awayScore: p.predicted_away_score
            };
          }
        } else {
          koPredsLocal[p.prediction_key] = {
            homeScore: p.predicted_home_score,
            awayScore: p.predicted_away_score,
            winnerId: p.predicted_winner_team_id
          };
        }
      });

      setP1GroupPreds(groupPredsLocal);
      setP1KoPreds(koPredsLocal);

      // --- Cargar Parte 2 ---
      const p2PredsLocal: Record<number, { homeScore: number | ''; awayScore: number | '' }> = {};
      p2PredsList.forEach(p => {
        p2PredsLocal[p.match_id] = {
          homeScore: p.predicted_home_score,
          awayScore: p.predicted_away_score
        };
      });
      setP2Preds(p2PredsLocal);

    } catch (err) {
      console.error('Error al cargar fixture:', err);
    } finally {
      setLoading(false);
    }
  }

  // Lógica del Wizard de la Parte 1
  const groupMatches = matches.filter(m => m.phase === 'group');

  // Mapa de selecciones por grupo
  const groupTeamsMap: Record<string, string[]> = {};
  matches.forEach(m => {
    if (m.phase === 'group') {
      const gName = TEAM_TO_GROUP[m.home_team_id] || TEAM_TO_GROUP[m.away_team_id];
      if (gName) {
        if (!groupTeamsMap[gName]) groupTeamsMap[gName] = [];
        if (!groupTeamsMap[gName].includes(m.home_team_id)) groupTeamsMap[gName].push(m.home_team_id);
        if (!groupTeamsMap[gName].includes(m.away_team_id)) groupTeamsMap[gName].push(m.away_team_id);
      }
    }
  });

  // Derived sanitized prediction states mapping any "" value to 0
  const sanitizedGroupPreds: Record<number, { homeScore: number; awayScore: number }> = Object.fromEntries(
    Object.entries(p1GroupPreds).map(([key, pred]) => [
      Number(key),
      {
        homeScore: pred.homeScore === '' ? 0 : pred.homeScore,
        awayScore: pred.awayScore === '' ? 0 : pred.awayScore
      }
    ])
  );

  const sanitizedKoPreds: Record<string, { homeScore: number; awayScore: number; winnerId?: string }> = Object.fromEntries(
    Object.entries(p1KoPreds).map(([key, pred]) => [
      key,
      {
        homeScore: pred.homeScore === '' ? 0 : pred.homeScore,
        awayScore: pred.awayScore === '' ? 0 : pred.awayScore,
        winnerId: pred.winnerId
      }
    ])
  );

  // Calcular tabla de posiciones en base a las predicciones locales del usuario
  const groupStandings = calculateGroupStandings(
    teams,
    groupTeamsMap,
    sanitizedGroupPreds,
    groupMatches
  );

  const bestThirds = getBestThirdPlacedTeams(groupStandings);

  // Ronda de 32 dinámica
  const r32Matches = generateRoundOf32(groupStandings, bestThirds);

  // Simular rondas posteriores
  const { r16, qf, sf, thirdPlace, finalMatch } = simulateNextRounds(r32Matches, sanitizedKoPreds);

  // Handlers para inputs de Parte 1
  const handleP1GroupScoreChange = (matchId: number, side: 'home' | 'away', val: string) => {
    if (p1Locked) return;
    const num = val === '' ? '' : Math.max(0, parseInt(val, 10));
    if (num !== '' && isNaN(num)) return;
    setP1GroupPreds(prev => {
      const current = prev[matchId] || { homeScore: 0, awayScore: 0 };
      return {
        ...prev,
        [matchId]: {
          ...current,
          [side === 'home' ? 'homeScore' : 'awayScore']: num
        }
      };
    });
  };

  const handleP1GroupBlur = (matchId: number, side: 'home' | 'away') => {
    setP1GroupPreds(prev => {
      const current = prev[matchId];
      if (current && current[side === 'home' ? 'homeScore' : 'awayScore'] === '') {
        return {
          ...prev,
          [matchId]: {
            ...current,
            [side === 'home' ? 'homeScore' : 'awayScore']: 0
          }
        };
      }
      return prev;
    });
  };

  const handleP1KoScoreChange = (predKey: string, side: 'home' | 'away', val: string) => {
    if (p1Locked) return;
    const num = val === '' ? '' : Math.max(0, parseInt(val, 10));
    if (num !== '' && isNaN(num)) return;
    setP1KoPreds(prev => {
      const current = prev[predKey] || { homeScore: 0, awayScore: 0 };
      const updated = {
        ...current,
        [side === 'home' ? 'homeScore' : 'awayScore']: num
      };

      // Limpiar ganador manual si se rompe el empate
      const homeVal = side === 'home' ? num : current.homeScore;
      const awayVal = side === 'away' ? num : current.awayScore;
      const homeSanitized = homeVal === '' ? 0 : homeVal;
      const awaySanitized = awayVal === '' ? 0 : awayVal;

      if (homeSanitized !== awaySanitized) {
        delete updated.winnerId;
      }

      return {
        ...prev,
        [predKey]: updated
      };
    });
  };

  const handleP1KoBlur = (predKey: string, side: 'home' | 'away') => {
    setP1KoPreds(prev => {
      const current = prev[predKey];
      if (current && current[side === 'home' ? 'homeScore' : 'awayScore'] === '') {
        return {
          ...prev,
          [predKey]: {
            ...current,
            [side === 'home' ? 'homeScore' : 'awayScore']: 0
          }
        };
      }
      return prev;
    });
  };

  const handleP1KoWinnerChange = (predKey: string, winnerId: string) => {
    if (p1Locked) return;
    setP1KoPreds(prev => ({
      ...prev,
      [predKey]: {
        ...(prev[predKey] || { homeScore: 0, awayScore: 0 }),
        winnerId
      }
    }));
  };

  // Guardar predicción de la Parte 1
  const handleSubmitPart1 = async () => {
    if (p1Locked) return;
    
    // Validar podio
    const finalWinner = sanitizedKoPreds['P1_SF_M104']?.homeScore > sanitizedKoPreds['P1_SF_M104']?.awayScore 
      ? finalMatch.homeTeam.id 
      : sanitizedKoPreds['P1_SF_M104']?.homeScore < sanitizedKoPreds['P1_SF_M104']?.awayScore 
        ? finalMatch.awayTeam.id 
        : sanitizedKoPreds['P1_SF_M104']?.winnerId;

    const finalLoser = finalWinner === finalMatch.homeTeam.id ? finalMatch.awayTeam.id : finalMatch.homeTeam.id;

    const thirdWinner = sanitizedKoPreds['P1_SF_M103']?.homeScore > sanitizedKoPreds['P1_SF_M103']?.awayScore 
      ? thirdPlace.homeTeam.id 
      : sanitizedKoPreds['P1_SF_M103']?.homeScore < sanitizedKoPreds['P1_SF_M103']?.awayScore 
        ? thirdPlace.awayTeam.id 
        : sanitizedKoPreds['P1_SF_M103']?.winnerId;

    if (!finalWinner || !thirdWinner) {
      alert('Por favor completa las predicciones de la final y tercer puesto, indicando quién avanza en caso de empate.');
      return;
    }

    const champion = {
      champion_team_id: finalWinner,
      runner_up_team_id: finalLoser,
      third_place_team_id: thirdWinner
    };

    setSaving(true);
    try {
      // Formatear predicciones para guardar en DB
      const formattedPredictions: any[] = [];
      
      // 1. Grupos
      Object.entries(sanitizedGroupPreds).forEach(([matchId, pred]) => {
        formattedPredictions.push({
          prediction_key: `G_${matchId}`,
          predicted_home_score: pred.homeScore ?? 0,
          predicted_away_score: pred.awayScore ?? 0,
          phase: 'group',
          predicted_home_team_id: groupMatches.find(m => m.id === Number(matchId))?.home_team_id || '',
          predicted_away_team_id: groupMatches.find(m => m.id === Number(matchId))?.away_team_id || ''
        });
      });

      // 2. R32
      r32Matches.forEach(m => {
        const pred = sanitizedKoPreds[`P1_R32_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_R32_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'r32',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 3. R16
      r16.forEach(m => {
        const pred = sanitizedKoPreds[`P1_R16_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_R16_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'r16',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 4. QF
      qf.forEach(m => {
        const pred = sanitizedKoPreds[`P1_QF_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_QF_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'qf',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 5. SF
      sf.forEach(m => {
        const pred = sanitizedKoPreds[`P1_SF_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_SF_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'sf',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 6. 3rd
      const tPred = sanitizedKoPreds[`P1_SF_M103`] || { homeScore: 0, awayScore: 0 };
      formattedPredictions.push({
        prediction_key: `P1_SF_M103`,
        predicted_home_score: tPred.homeScore,
        predicted_away_score: tPred.awayScore,
        predicted_winner_team_id: thirdWinner,
        phase: '3rd',
        predicted_home_team_id: thirdPlace.homeTeam.id,
        predicted_away_team_id: thirdPlace.awayTeam.id
      });

      // 7. Final
      const fPred = sanitizedKoPreds[`P1_SF_M104`] || { homeScore: 0, awayScore: 0 };
      formattedPredictions.push({
        prediction_key: `P1_SF_M104`,
        predicted_home_score: fPred.homeScore,
        predicted_away_score: fPred.awayScore,
        predicted_winner_team_id: finalWinner,
        phase: 'final',
        predicted_home_team_id: finalMatch.homeTeam.id,
        predicted_away_team_id: finalMatch.awayTeam.id
      });

      await saveP1Predictions(userId, selectedPoolId, formattedPredictions, champion, true);
      setP1Locked(true);
      alert('¡Tu predicción completa del mundial ha sido bloqueada y guardada con éxito! Mucha suerte.');
      loadData(selectedPoolId);
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar predicciones: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraftPart1 = async () => {
    if (p1Locked) return;

    const finalWinner = sanitizedKoPreds['P1_SF_M104']?.homeScore > sanitizedKoPreds['P1_SF_M104']?.awayScore 
      ? finalMatch.homeTeam.id 
      : sanitizedKoPreds['P1_SF_M104']?.homeScore < sanitizedKoPreds['P1_SF_M104']?.awayScore 
        ? finalMatch.awayTeam.id 
        : sanitizedKoPreds['P1_SF_M104']?.winnerId || '';

    const finalLoser = finalWinner ? (finalWinner === finalMatch.homeTeam.id ? finalMatch.awayTeam.id : finalMatch.homeTeam.id) : '';

    const thirdWinner = sanitizedKoPreds['P1_SF_M103']?.homeScore > sanitizedKoPreds['P1_SF_M103']?.awayScore 
      ? thirdPlace.homeTeam.id 
      : sanitizedKoPreds['P1_SF_M103']?.homeScore < sanitizedKoPreds['P1_SF_M103']?.awayScore 
        ? thirdPlace.awayTeam.id 
        : sanitizedKoPreds['P1_SF_M103']?.winnerId || '';

    const champion = {
      champion_team_id: finalWinner,
      runner_up_team_id: finalLoser,
      third_place_team_id: thirdWinner
    };

    setSaving(true);
    try {
      const formattedPredictions: any[] = [];
      
      // 1. Grupos
      Object.entries(sanitizedGroupPreds).forEach(([matchId, pred]) => {
        formattedPredictions.push({
          prediction_key: `G_${matchId}`,
          predicted_home_score: pred.homeScore ?? 0,
          predicted_away_score: pred.awayScore ?? 0,
          phase: 'group',
          predicted_home_team_id: groupMatches.find(m => m.id === Number(matchId))?.home_team_id || '',
          predicted_away_team_id: groupMatches.find(m => m.id === Number(matchId))?.away_team_id || ''
        });
      });

      // 2. R32
      r32Matches.forEach(m => {
        const pred = sanitizedKoPreds[`P1_R32_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_R32_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'r32',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 3. R16
      r16.forEach(m => {
        const pred = sanitizedKoPreds[`P1_R16_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_R16_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'r16',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 4. QF
      qf.forEach(m => {
        const pred = sanitizedKoPreds[`P1_QF_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_QF_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'qf',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 5. SF
      sf.forEach(m => {
        const pred = sanitizedKoPreds[`P1_SF_M${m.id}`] || { homeScore: 0, awayScore: 0 };
        formattedPredictions.push({
          prediction_key: `P1_SF_M${m.id}`,
          predicted_home_score: pred.homeScore,
          predicted_away_score: pred.awayScore,
          predicted_winner_team_id: pred.winnerId || (pred.homeScore > pred.awayScore ? m.homeTeam.id : pred.awayScore > pred.homeScore ? m.awayTeam.id : null),
          phase: 'sf',
          predicted_home_team_id: m.homeTeam.id,
          predicted_away_team_id: m.awayTeam.id
        });
      });

      // 6. 3rd
      const tPred = sanitizedKoPreds[`P1_SF_M103`] || { homeScore: 0, awayScore: 0 };
      formattedPredictions.push({
        prediction_key: `P1_SF_M103`,
        predicted_home_score: tPred.homeScore,
        predicted_away_score: tPred.awayScore,
        predicted_winner_team_id: thirdWinner || null,
        phase: '3rd',
        predicted_home_team_id: thirdPlace?.homeTeam?.id || '',
        predicted_away_team_id: thirdPlace?.awayTeam?.id || ''
      });

      // 7. Final
      const fPred = sanitizedKoPreds[`P1_SF_M104`] || { homeScore: 0, awayScore: 0 };
      formattedPredictions.push({
        prediction_key: `P1_SF_M104`,
        predicted_home_score: fPred.homeScore,
        predicted_away_score: fPred.awayScore,
        predicted_winner_team_id: finalWinner || null,
        phase: 'final',
        predicted_home_team_id: finalMatch?.homeTeam?.id || '',
        predicted_away_team_id: finalMatch?.awayTeam?.id || ''
      });

      await saveP1Predictions(userId, selectedPoolId, formattedPredictions, champion, false);
      alert('¡Tu borrador de la Parte 1 ha sido guardado con éxito!');
      loadData(selectedPoolId);
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar borrador: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Handlers para Parte 2 (En vivo)
  const handleP2ScoreChange = (matchId: number, side: 'home' | 'away', val: string) => {
    const num = val === '' ? '' : Math.max(0, parseInt(val, 10));
    if (num !== '' && isNaN(num)) return;
    setP2Preds(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { homeScore: 0, awayScore: 0 }),
        [side === 'home' ? 'homeScore' : 'awayScore']: num
      }
    }));
  };

  const handleP2Blur = (matchId: number, side: 'home' | 'away') => {
    setP2Preds(prev => {
      const current = prev[matchId];
      if (current && current[side === 'home' ? 'homeScore' : 'awayScore'] === '') {
        return {
          ...prev,
          [matchId]: {
            ...current,
            [side === 'home' ? 'homeScore' : 'awayScore']: 0
          }
        };
      }
      return prev;
    });
  };

  const handleP2Save = async (matchId: number) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    // Verificar si ya está bloqueado
    const isLocked = new Date().getTime() >= new Date(match.lock_time_part2).getTime();
    if (isLocked) {
      alert('Este partido está bloqueado para predicciones.');
      return;
    }

    const pred = p2Preds[matchId] || { homeScore: 0, awayScore: 0 };
    const homeSanitized = pred.homeScore === '' ? 0 : pred.homeScore;
    const awaySanitized = pred.awayScore === '' ? 0 : pred.awayScore;

    setSubmittingMatchId(matchId);
    try {
      let winner: string | null = null;
      if (match.phase !== 'group') {
        if (homeSanitized > awaySanitized) {
          winner = match.home_team_id;
        } else if (awaySanitized > homeSanitized) {
          winner = match.away_team_id;
        } else {
          // En caso de empate en knockout real, por defecto asignar home_team, el usuario puede ajustarlo
          winner = match.home_team_id;
        }
      }

      await saveP2Prediction(userId, selectedPoolId, matchId, homeSanitized, awaySanitized, winner);
      alert('Predicción guardada.');
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSubmittingMatchId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-neutral-400 text-sm">Cargando fixture...</p>
      </div>
    );
  }

  const groupsList: ('A'|'B'|'C'|'D'|'E'|'F'|'G'|'H'|'I'|'J'|'K'|'L')[] = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  if (!loading && pools.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 text-center glass-card border border-amber-500/20 rounded-2xl shadow-xl space-y-4 my-8">
        <span className="text-5xl block">⚠️</span>
        <h3 className="text-lg font-bold text-white">Necesitas unirte a un Grupo</h3>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Para realizar predicciones en La Polla, debes pertenecer al menos a un grupo. 
          Crea un grupo o únete a uno existente desde la pestaña de &quot;Grupos&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de Grupo / Pool (si hay múltiples grupos) */}
      {pools.length > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 shadow-md">
            <span className="text-xs font-semibold text-neutral-400">Grupo Activo:</span>
            <select
              value={selectedPoolId}
              onChange={(e) => setSelectedPoolId(e.target.value)}
              className="bg-transparent text-xs text-emerald-400 font-bold focus:outline-none cursor-pointer"
            >
              {pools.map((p) => (
                <option key={p.id} value={p.id} className="bg-neutral-950 text-white">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 1. Selector de Sub-tab */}
      <div className="flex p-1 rounded-xl bg-neutral-900 border border-neutral-800 max-w-md mx-auto">
        <button
          onClick={() => setSubTab('part1')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition duration-200 ${
            subTab === 'part1' 
              ? 'bg-emerald-600 text-white shadow' 
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Parte 1: La Gran Polla
        </button>
        <button
          onClick={() => setSubTab('part2')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition duration-200 ${
            subTab === 'part2' 
              ? 'bg-emerald-600 text-white shadow' 
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Parte 2: En Vivo
        </button>
      </div>

      {subTab === 'part1' ? (
        /* --- PARTE 1 WIZARD --- */
        <div className="space-y-6 animate-fadeIn">
          {/* Header de la Parte 1 */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl glass-card border border-neutral-800/60 shadow gap-4">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                🏆 La Gran Polla
              </h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-xl">
                Pronostica el mundial completo de principio a fin antes de que empiece el primer partido. 
                Suma puntos por cada acierto en la fase final de acuerdo a tus equipos simulados.
              </p>
              <div className="mt-3 text-xs flex flex-wrap items-center gap-1.5">
                <span className="text-neutral-400 font-semibold">Mis Grupos:</span>
                {pools && pools.length > 0 ? (
                  pools.map((p) => (
                    <span key={p.id} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500 italic text-[10.5px]">No perteneces a ningún grupo aún.</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              {p1Locked ? (
                <span className="px-3.5 py-1.5 rounded-xl bg-red-950/60 border border-red-500/30 text-red-400 text-xs font-extrabold flex items-center gap-1.5">
                  🔒 PREDICCIÓN BLOQUEADA
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold flex items-center gap-1.5">
                  🔓 PREDICCIÓN ABIERTA
                </span>
              )}
              <span className="text-[10px] text-neutral-500 mt-1.5">Límite: 11 de Junio, 1:00 PM (Hora de Bogotá)</span>
            </div>
          </div>

          {/* Selector de Pasos del Wizard */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {[
              { step: 1, label: '1. Grupos' },
              { step: 2, label: '2. Tablas' },
              { step: 3, label: '3. Dieciseisavos' },
              { step: 4, label: '4. Octavos' },
              { step: 5, label: '5. Cuartos' },
              { step: 6, label: '6. Semis / Final' },
              { step: 7, label: '7. Podio' }
            ].map((s) => (
              <button
                key={s.step}
                onClick={() => setWizardStep(s.step)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition ${
                  wizardStep === s.step
                    ? 'bg-amber-500 border-amber-500/30 text-neutral-950 font-bold'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* CONTENIDO DEL PASO DEL WIZARD */}

          {/* Paso 1: Grupos */}
          {wizardStep === 1 && (
            <div className="space-y-6">
              {/* Selector de Grupo */}
              <div className="flex gap-1.5 overflow-x-auto pb-2 no-scrollbar">
                {groupsList.map(g => (
                  <button
                    key={g}
                    onClick={() => setActiveGroupWizard(g)}
                    className={`w-10 h-10 rounded-xl font-black text-sm border flex items-center justify-center transition shrink-0 ${
                      activeGroupWizard === g
                        ? 'bg-emerald-600 border-emerald-500/35 text-white'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Fixture de Partidos del Grupo Seleccionado */}
              <div className="grid gap-4 md:grid-cols-2">
                {groupMatches
                  .filter(m => (TEAM_TO_GROUP[m.home_team_id] || TEAM_TO_GROUP[m.away_team_id]) === activeGroupWizard)
                  .map(match => {
                    const pred = p1GroupPreds[match.id] || { homeScore: 0, awayScore: 0 };
                    return (
                      <div key={match.id} className="p-4 rounded-xl glass-card border border-neutral-800/40 flex flex-col justify-between">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-2.5">Partido #{match.id}</span>
                        <div className="flex items-center justify-between gap-3">
                          {/* Home */}
                          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                            <span className="font-bold text-xs truncate">{match.home_team_id}</span>
                            <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                              <TeamFlag teamId={match.home_team_id} fallbackEmoji={teamsFlags[match.home_team_id] || '🏳️'} />
                            </span>
                          </div>
                          
                          {/* Score Inputs */}
                          <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                            <input
                              type="number"
                              min={0}
                              value={pred.homeScore ?? 0}
                              onChange={(e) => handleP1GroupScoreChange(match.id, 'home', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleP1GroupBlur(match.id, 'home')}
                              disabled={p1Locked}
                              className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                            />
                            <span className="text-neutral-500 text-xs font-semibold">-</span>
                            <input
                              type="number"
                              min={0}
                              value={pred.awayScore ?? 0}
                              onChange={(e) => handleP1GroupScoreChange(match.id, 'away', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleP1GroupBlur(match.id, 'away')}
                              disabled={p1Locked}
                              className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>

                          {/* Away */}
                          <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                            <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                              <TeamFlag teamId={match.away_team_id} fallbackEmoji={teamsFlags[match.away_team_id] || '🏳️'} />
                            </span>
                            <span className="font-bold text-xs truncate">{match.away_team_id}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Paso 2: Tablas e Hilos de mejores terceros */}
          {wizardStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Tablas de Posiciones Calculadas</h3>
              <div className="grid gap-6 md:grid-cols-3">
                {Object.entries(groupStandings).map(([group, table]) => (
                  <div key={group} className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/60">
                    <h4 className="text-xs font-black text-white uppercase mb-3">Grupo {group}</h4>
                    <div className="space-y-1.5 text-xs">
                      {table.map((row, rIdx) => (
                        <div 
                          key={row.team.id} 
                          className={`flex items-center justify-between p-1.5 rounded ${
                            rIdx === 0 ? 'bg-emerald-950/20 text-emerald-400 font-bold border-l-2 border-emerald-500' :
                            rIdx === 1 ? 'bg-emerald-950/10 text-emerald-300 font-semibold border-l-2 border-emerald-600/40' :
                            rIdx === 2 ? 'bg-amber-950/10 text-amber-300 border-l-2 border-amber-600/40' :
                            'text-neutral-500'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9px] w-3">{rIdx + 1}</span>
                            <TeamFlag teamId={row.team.id} fallbackEmoji={row.team.flag_emoji} className="w-5 h-3.5" />
                            <span className="truncate w-14 font-bold">{row.team.id}</span>
                          </div>
                          <div className="flex gap-3 text-[10px]">
                            <span>{row.points} <span className="text-[8px] text-neutral-500">pts</span></span>
                            <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference} <span className="text-[8px] text-neutral-500">DG</span></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mejores Terceros */}
              <div className="p-5 rounded-2xl glass-card border border-neutral-800 max-w-xl mx-auto space-y-4">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider text-center">Clasificación de Terceros (FIFA Anexo C)</h3>
                <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
                  Clasifican los 8 mejores terceros a la Ronda de 32 según puntos, diferencia de goles y ranking FIFA.
                </p>
                <div className="space-y-1.5 text-xs">
                  {bestThirds.map((row, index) => {
                    const isQualified = index < 8;
                    return (
                      <div 
                        key={row.team.id}
                        className={`flex justify-between items-center p-2 rounded-lg ${
                          isQualified 
                            ? 'bg-emerald-950/20 border border-emerald-500/20 text-emerald-300' 
                            : 'bg-neutral-900 border border-neutral-800 text-neutral-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold">#{index + 1}</span>
                          <TeamFlag teamId={row.team.id} fallbackEmoji={row.team.flag_emoji} className="w-6 h-4" />
                          <span className="font-bold">{row.team.name}</span>
                          <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-mono">Grupo {row.group}</span>
                        </div>
                        <div className="flex gap-4">
                          <span>{row.points} pts</span>
                          <span>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference} DG</span>
                          <span className="text-neutral-400">{isQualified ? '🟢 Clasifica' : '🔴 Eliminado'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Paso 3: Ronda de 32 (Knockout) */}
          {wizardStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Ronda de 32</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {r32Matches.map((m) => {
                  const predKey = `P1_R32_M${m.id}`;
                  const pred = p1KoPreds[predKey] || { homeScore: 0, awayScore: 0 };
                  const isDraw = pred.homeScore === pred.awayScore;
                  
                  return (
                    <div key={m.id} className="p-4 rounded-xl glass-card border border-neutral-800/40 space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
                        <span>Partido #{m.id}</span>
                      </div>
                      
                      <div className="flex items-center justify-between gap-3">
                        {/* Home */}
                        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                          <span className="font-bold text-xs truncate">{m.homeTeam.name}</span>
                          <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                            <TeamFlag teamId={m.homeTeam.id} fallbackEmoji={m.homeTeam.flag_emoji} />
                          </span>
                        </div>
                        
                        {/* Score inputs */}
                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                          <input
                            type="number"
                            min={0}
                            value={pred.homeScore ?? 0}
                            onChange={(e) => handleP1KoScoreChange(predKey, 'home', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleP1KoBlur(predKey, 'home')}
                            disabled={p1Locked}
                            className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          />
                          <span className="text-neutral-500 text-xs font-semibold">-</span>
                          <input
                            type="number"
                            min={0}
                            value={pred.awayScore ?? 0}
                            onChange={(e) => handleP1KoScoreChange(predKey, 'away', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleP1KoBlur(predKey, 'away')}
                            disabled={p1Locked}
                            className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        {/* Away */}
                        <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                          <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                            <TeamFlag teamId={m.awayTeam.id} fallbackEmoji={m.awayTeam.flag_emoji} />
                          </span>
                          <span className="font-bold text-xs truncate">{m.awayTeam.name}</span>
                        </div>
                      </div>

                      {/* Selector de ganador manual en caso de empate */}
                      {isDraw && (
                        <div className="flex flex-col items-center gap-1.5 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px]">
                          <span className="text-amber-500 font-bold uppercase">Empate — ¿Quién avanza por penales?</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleP1KoWinnerChange(predKey, m.homeTeam.id)}
                              className={`px-3 py-1 rounded font-bold transition ${
                                pred.winnerId === m.homeTeam.id 
                                  ? 'bg-amber-500 text-neutral-950' 
                                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {m.homeTeam.id}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleP1KoWinnerChange(predKey, m.awayTeam.id)}
                              className={`px-3 py-1 rounded font-bold transition ${
                                pred.winnerId === m.awayTeam.id 
                                  ? 'bg-amber-500 text-neutral-950' 
                                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {m.awayTeam.id}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paso 4: Octavos (R16) */}
          {wizardStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Octavos de Final</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {r16.map((m) => {
                  const predKey = `P1_R16_M${m.id}`;
                  const pred = p1KoPreds[predKey] || { homeScore: 0, awayScore: 0 };
                  const isDraw = pred.homeScore === pred.awayScore;
                  
                  return (
                    <div key={m.id} className="p-4 rounded-xl glass-card border border-neutral-800/40 space-y-3">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Partido #{m.id}</span>
                      <div className="flex items-center justify-between gap-3">
                        {/* Home */}
                        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                          <span className="font-bold text-xs truncate">{m.homeTeam.name}</span>
                          <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                            <TeamFlag teamId={m.homeTeam.id} fallbackEmoji={m.homeTeam.flag_emoji} />
                          </span>
                        </div>
                        
                        {/* Score inputs */}
                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                          <input
                            type="number"
                            min={0}
                            value={pred.homeScore ?? 0}
                            onChange={(e) => handleP1KoScoreChange(predKey, 'home', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleP1KoBlur(predKey, 'home')}
                            disabled={p1Locked}
                            className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          />
                          <span className="text-neutral-500 text-xs font-semibold">-</span>
                          <input
                            type="number"
                            min={0}
                            value={pred.awayScore ?? 0}
                            onChange={(e) => handleP1KoScoreChange(predKey, 'away', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleP1KoBlur(predKey, 'away')}
                            disabled={p1Locked}
                            className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        {/* Away */}
                        <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                          <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                            <TeamFlag teamId={m.awayTeam.id} fallbackEmoji={m.awayTeam.flag_emoji} />
                          </span>
                          <span className="font-bold text-xs truncate">{m.awayTeam.name}</span>
                        </div>
                      </div>

                      {isDraw && (
                        <div className="flex flex-col items-center gap-1.5 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px]">
                          <span className="text-amber-500 font-bold uppercase">Empate — ¿Quién avanza por penales?</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleP1KoWinnerChange(predKey, m.homeTeam.id)}
                              className={`px-3 py-1 rounded font-bold transition ${
                                pred.winnerId === m.homeTeam.id 
                                  ? 'bg-amber-500 text-neutral-950' 
                                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {m.homeTeam.id}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleP1KoWinnerChange(predKey, m.awayTeam.id)}
                              className={`px-3 py-1 rounded font-bold transition ${
                                pred.winnerId === m.awayTeam.id 
                                  ? 'bg-amber-500 text-neutral-950' 
                                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {m.awayTeam.id}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paso 5: Cuartos (QF) */}
          {wizardStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Cuartos de Final</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {qf.map((m) => {
                  const predKey = `P1_QF_M${m.id}`;
                  const pred = p1KoPreds[predKey] || { homeScore: 0, awayScore: 0 };
                  const isDraw = pred.homeScore === pred.awayScore;
                  
                  return (
                    <div key={m.id} className="p-4 rounded-xl glass-card border border-neutral-800/40 space-y-3">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Partido #{m.id}</span>
                      <div className="flex items-center justify-between gap-3">
                        {/* Home */}
                        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                          <span className="font-bold text-xs truncate">{m.homeTeam.name}</span>
                          <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                            <TeamFlag teamId={m.homeTeam.id} fallbackEmoji={m.homeTeam.flag_emoji} />
                          </span>
                        </div>
                        
                        {/* Score inputs */}
                        <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                          <input
                            type="number"
                            min={0}
                            value={pred.homeScore ?? 0}
                            onChange={(e) => handleP1KoScoreChange(predKey, 'home', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleP1KoBlur(predKey, 'home')}
                            disabled={p1Locked}
                            className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          />
                          <span className="text-neutral-500 text-xs font-semibold">-</span>
                          <input
                            type="number"
                            min={0}
                            value={pred.awayScore ?? 0}
                            onChange={(e) => handleP1KoScoreChange(predKey, 'away', e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handleP1KoBlur(predKey, 'away')}
                            disabled={p1Locked}
                            className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        {/* Away */}
                        <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                          <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                            <TeamFlag teamId={m.awayTeam.id} fallbackEmoji={m.awayTeam.flag_emoji} />
                          </span>
                          <span className="font-bold text-xs truncate">{m.awayTeam.name}</span>
                        </div>
                      </div>

                      {isDraw && (
                        <div className="flex flex-col items-center gap-1.5 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px]">
                          <span className="text-amber-500 font-bold uppercase">Empate — ¿Quién avanza por penales?</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleP1KoWinnerChange(predKey, m.homeTeam.id)}
                              className={`px-3 py-1 rounded font-bold transition ${
                                pred.winnerId === m.homeTeam.id 
                                  ? 'bg-amber-500 text-neutral-950' 
                                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {m.homeTeam.id}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleP1KoWinnerChange(predKey, m.awayTeam.id)}
                              className={`px-3 py-1 rounded font-bold transition ${
                                pred.winnerId === m.awayTeam.id 
                                  ? 'bg-amber-500 text-neutral-950' 
                                  : 'bg-neutral-800 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {m.awayTeam.id}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paso 6: Semis, Tercero y Final */}
          {wizardStep === 6 && (
            <div className="space-y-8">
              {/* Semifinales */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Semifinales</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {sf.map((m) => {
                    const predKey = `P1_SF_M${m.id}`;
                    const pred = p1KoPreds[predKey] || { homeScore: 0, awayScore: 0 };
                    const isDraw = pred.homeScore === pred.awayScore;
                    
                    return (
                      <div key={m.id} className="p-4 rounded-xl glass-card border border-neutral-800/40 space-y-3">
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Partido #{m.id}</span>
                        <div className="flex items-center justify-between gap-3">
                          {/* Home */}
                          <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                            <span className="font-bold text-xs truncate">{m.homeTeam.name}</span>
                            <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                              <TeamFlag teamId={m.homeTeam.id} fallbackEmoji={m.homeTeam.flag_emoji} />
                            </span>
                          </div>
                          
                          {/* Score inputs */}
                          <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                            <input
                              type="number"
                              min={0}
                              value={pred.homeScore ?? 0}
                              onChange={(e) => handleP1KoScoreChange(predKey, 'home', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleP1KoBlur(predKey, 'home')}
                              disabled={p1Locked}
                              className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                            />
                            <span className="text-neutral-500 text-xs font-semibold">-</span>
                            <input
                              type="number"
                              min={0}
                              value={pred.awayScore ?? 0}
                              onChange={(e) => handleP1KoScoreChange(predKey, 'away', e.target.value)}
                              onFocus={(e) => e.target.select()}
                              onBlur={() => handleP1KoBlur(predKey, 'away')}
                              disabled={p1Locked}
                              className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>

                          {/* Away */}
                          <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                            <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                              <TeamFlag teamId={m.awayTeam.id} fallbackEmoji={m.awayTeam.flag_emoji} />
                            </span>
                            <span className="font-bold text-xs truncate">{m.awayTeam.name}</span>
                          </div>
                        </div>

                        {isDraw && (
                          <div className="flex flex-col items-center gap-1.5 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px]">
                            <span className="text-amber-500 font-bold uppercase">Empate — ¿Quién avanza por penales?</span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleP1KoWinnerChange(predKey, m.homeTeam.id)}
                                className={`px-3 py-1 rounded font-bold transition ${
                                  pred.winnerId === m.homeTeam.id 
                                    ? 'bg-amber-500 text-neutral-950' 
                                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                              >
                                {m.homeTeam.id}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleP1KoWinnerChange(predKey, m.awayTeam.id)}
                                className={`px-3 py-1 rounded font-bold transition ${
                                  pred.winnerId === m.awayTeam.id 
                                    ? 'bg-amber-500 text-neutral-950' 
                                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                                }`}
                              >
                                {m.awayTeam.id}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tercer Lugar y Gran Final */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Tercer Lugar */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider">Partido por el Tercer Puesto</h3>
                  <div className="p-4 rounded-xl glass-card border border-neutral-800/40 space-y-3">
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Partido #103</span>
                    <div className="flex items-center justify-between gap-3">
                      {/* Home */}
                      <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                        <span className="font-bold text-xs truncate">{thirdPlace.homeTeam.name}</span>
                        <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                          <TeamFlag teamId={thirdPlace.homeTeam.id} fallbackEmoji={thirdPlace.homeTeam.flag_emoji} />
                        </span>
                      </div>
                      
                      {/* Score inputs */}
                      <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                        <input
                          type="number"
                          min={0}
                          value={p1KoPreds['P1_SF_M103']?.homeScore ?? 0}
                          onChange={(e) => handleP1KoScoreChange('P1_SF_M103', 'home', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleP1KoBlur('P1_SF_M103', 'home')}
                          disabled={p1Locked}
                          className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                        <span className="text-neutral-500 text-xs font-semibold">-</span>
                        <input
                          type="number"
                          min={0}
                          value={p1KoPreds['P1_SF_M103']?.awayScore ?? 0}
                          onChange={(e) => handleP1KoScoreChange('P1_SF_M103', 'away', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleP1KoBlur('P1_SF_M103', 'away')}
                          disabled={p1Locked}
                          className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      {/* Away */}
                      <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                          <TeamFlag teamId={thirdPlace.awayTeam.id} fallbackEmoji={thirdPlace.awayTeam.flag_emoji} />
                        </span>
                        <span className="font-bold text-xs truncate">{thirdPlace.awayTeam.name}</span>
                      </div>
                    </div>

                    {(p1KoPreds['P1_SF_M103']?.homeScore ?? 0) === (p1KoPreds['P1_SF_M103']?.awayScore ?? 0) && (
                      <div className="flex flex-col items-center gap-1.5 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px]">
                        <span className="text-amber-500 font-bold uppercase">Empate — ¿Quién gana el 3er Lugar?</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleP1KoWinnerChange('P1_SF_M103', thirdPlace.homeTeam.id)}
                            className={`px-3 py-1 rounded font-bold transition ${
                              p1KoPreds['P1_SF_M103']?.winnerId === thirdPlace.homeTeam.id 
                                ? 'bg-amber-500 text-neutral-950' 
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {thirdPlace.homeTeam.id}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleP1KoWinnerChange('P1_SF_M103', thirdPlace.awayTeam.id)}
                            className={`px-3 py-1 rounded font-bold transition ${
                              p1KoPreds['P1_SF_M103']?.winnerId === thirdPlace.awayTeam.id 
                                ? 'bg-amber-500 text-neutral-950' 
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {thirdPlace.awayTeam.id}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Gran Final */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">La Gran Final</h3>
                  <div className="p-4 rounded-xl glass-card border border-amber-500/20 space-y-3 shadow-amber-500/5">
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Partido #104</span>
                    <div className="flex items-center justify-between gap-3">
                      {/* Home */}
                      <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                        <span className="font-bold text-xs truncate">{finalMatch.homeTeam.name}</span>
                        <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                          <TeamFlag teamId={finalMatch.homeTeam.id} fallbackEmoji={finalMatch.homeTeam.flag_emoji} />
                        </span>
                      </div>
                      
                      {/* Score inputs */}
                      <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                        <input
                          type="number"
                          min={0}
                          value={p1KoPreds['P1_SF_M104']?.homeScore ?? 0}
                          onChange={(e) => handleP1KoScoreChange('P1_SF_M104', 'home', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleP1KoBlur('P1_SF_M104', 'home')}
                          disabled={p1Locked}
                          className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                        <span className="text-neutral-500 text-xs font-semibold">-</span>
                        <input
                          type="number"
                          min={0}
                          value={p1KoPreds['P1_SF_M104']?.awayScore ?? 0}
                          onChange={(e) => handleP1KoScoreChange('P1_SF_M104', 'away', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => handleP1KoBlur('P1_SF_M104', 'away')}
                          disabled={p1Locked}
                          className="w-12 h-12 sm:w-10 sm:h-10 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-sm text-white focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      {/* Away */}
                      <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                          <TeamFlag teamId={finalMatch.awayTeam.id} fallbackEmoji={finalMatch.awayTeam.flag_emoji} />
                        </span>
                        <span className="font-bold text-xs truncate">{finalMatch.awayTeam.name}</span>
                      </div>
                    </div>

                    {(p1KoPreds['P1_SF_M104']?.homeScore ?? 0) === (p1KoPreds['P1_SF_M104']?.awayScore ?? 0) && (
                      <div className="flex flex-col items-center gap-1.5 p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-[10px]">
                        <span className="text-amber-500 font-bold uppercase">Empate — ¿Quién sale Campeón?</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleP1KoWinnerChange('P1_SF_M104', finalMatch.homeTeam.id)}
                            className={`px-3 py-1 rounded font-bold transition ${
                              p1KoPreds['P1_SF_M104']?.winnerId === finalMatch.homeTeam.id 
                                ? 'bg-amber-500 text-neutral-950' 
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {finalMatch.homeTeam.id}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleP1KoWinnerChange('P1_SF_M104', finalMatch.awayTeam.id)}
                            className={`px-3 py-1 rounded font-bold transition ${
                              p1KoPreds['P1_SF_M104']?.winnerId === finalMatch.awayTeam.id 
                                ? 'bg-amber-500 text-neutral-950' 
                                : 'bg-neutral-800 text-neutral-400 hover:text-white'
                            }`}
                          >
                            {finalMatch.awayTeam.id}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 7: Podio final y Submit */}
          {wizardStep === 7 && (
            <div className="max-w-md mx-auto p-6 rounded-2xl glass-card border border-amber-500/20 space-y-6 shadow-xl text-center">
              <div>
                <span className="text-4xl block mb-2">🏆</span>
                <h3 className="text-xl font-bold text-white">Podio del Mundial</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Confirma a tus ganadores antes de enviar. Una vez guardado, no se puede modificar.
                </p>
              </div>

              {/* Computar Podio actual en base a los inputs del paso 6 */}
              {(() => {
                const finalHomeScore = sanitizedKoPreds['P1_SF_M104']?.homeScore ?? 0;
                const finalAwayScore = sanitizedKoPreds['P1_SF_M104']?.awayScore ?? 0;
                const finalWinner = finalHomeScore > finalAwayScore 
                  ? finalMatch.homeTeam 
                  : finalAwayScore > finalHomeScore 
                    ? finalMatch.awayTeam 
                    : teams.find(t => t.id === sanitizedKoPreds['P1_SF_M104']?.winnerId) || null;

                const finalLoser = finalWinner?.id === finalMatch.homeTeam.id 
                  ? finalMatch.awayTeam 
                  : finalWinner?.id === finalMatch.awayTeam.id 
                    ? finalMatch.homeTeam 
                    : null;

                const thirdHomeScore = sanitizedKoPreds['P1_SF_M103']?.homeScore ?? 0;
                const thirdAwayScore = sanitizedKoPreds['P1_SF_M103']?.awayScore ?? 0;
                const thirdWinner = thirdHomeScore > thirdAwayScore 
                  ? thirdPlace.homeTeam 
                  : thirdAwayScore > thirdHomeScore 
                    ? thirdPlace.awayTeam 
                    : teams.find(t => t.id === sanitizedKoPreds['P1_SF_M103']?.winnerId) || null;

                return (
                  <div className="space-y-4 text-left">
                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-300">🥇 Campeón:</span>
                      <span className="font-bold text-amber-400">
                        {finalWinner ? (
                          <span className="inline-flex items-center gap-2">
                            <TeamFlag teamId={finalWinner.id} fallbackEmoji={finalWinner.flag_emoji} className="w-6 h-4" />
                            <span>{finalWinner.name}</span>
                          </span>
                        ) : 'Por definir'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-300">🥈 Subcampeón:</span>
                      <span className="font-bold text-white">
                        {finalLoser ? (
                          <span className="inline-flex items-center gap-2">
                            <TeamFlag teamId={finalLoser.id} fallbackEmoji={finalLoser.flag_emoji} className="w-6 h-4" />
                            <span>{finalLoser.name}</span>
                          </span>
                        ) : 'Por definir'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between">
                      <span className="text-sm font-semibold text-neutral-300">🥉 Tercero:</span>
                      <span className="font-bold text-amber-700">
                        {thirdWinner ? (
                          <span className="inline-flex items-center gap-2">
                            <TeamFlag teamId={thirdWinner.id} fallbackEmoji={thirdWinner.flag_emoji} className="w-6 h-4" />
                            <span>{thirdWinner.name}</span>
                          </span>
                        ) : 'Por definir'}
                      </span>
                    </div>

                    {/* Botón de Enviar */}
                    {!p1Locked ? (
                      <button
                        onClick={handleSubmitPart1}
                        disabled={saving || !finalWinner || !thirdWinner}
                        className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition duration-300 shadow-lg mt-6 disabled:opacity-50"
                      >
                        {saving ? 'Guardando...' : 'Guardar y Bloquear Predicción'}
                      </button>
                    ) : (
                      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-500 font-semibold text-center text-xs mt-6">
                        🔒 La predicción ha sido guardada/bloqueada
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {wizardStep >= 1 && wizardStep <= 6 && (
            <div className="flex justify-end pt-4 border-t border-neutral-900">
              <button
                type="button"
                onClick={handleSaveDraftPart1}
                disabled={saving || p1Locked}
                className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-emerald-400 hover:text-emerald-300 font-bold border border-neutral-800 transition duration-300 disabled:opacity-50 shadow-md flex items-center gap-2"
              >
                <span>💾</span> {p1Locked ? 'Predicción Bloqueada' : (saving ? 'Guardando...' : 'Guardar Borrador')}
              </button>
            </div>
          )}

        </div>
      ) : (
        /* --- PARTE 2 LIVE MATCHES FEED --- */
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 rounded-2xl glass-card border border-neutral-800/60 shadow gap-4">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                ⚽ La Polla en Vivo (Fase a Fase)
              </h2>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed max-w-xl">
                Pronostica partido a partido del fixture real. Cada partido se bloquea individualmente **1 hora antes de su inicio**. 
                Obtén 3 puntos por marcador exacto, 1 punto por acertar el ganador/empate.
              </p>
              <div className="mt-3 text-xs flex flex-wrap items-center gap-1.5">
                <span className="text-neutral-400 font-semibold">Mis Grupos:</span>
                {pools && pools.length > 0 ? (
                  pools.map((p) => (
                    <span key={p.id} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                      {p.name}
                    </span>
                  ))
                ) : (
                  <span className="text-neutral-500 italic text-[10.5px]">No perteneces a ningún grupo aún.</span>
                )}
              </div>
            </div>
          </div>

          {/* Listado de partidos reales agrupados por Fase */}
          {(() => {
            // Clasificar por fases
            const phases = [
              { key: 'group', label: 'Fase de Grupos' },
              { key: 'r32', label: 'Ronda de 32' },
              { key: 'r16', label: 'Octavos de Final' },
              { key: 'qf', label: 'Cuartos de Final' },
              { key: 'sf', label: 'Semifinales' },
              { key: '3rd', label: 'Tercer Puesto' },
              { key: 'final', label: 'Gran Final' }
            ];

            return (
              <div className="space-y-8">
                {phases.map(phase => {
                  const phaseMatches = matches.filter(m => m.phase === phase.key);
                  if (phaseMatches.length === 0) return null;

                  return (
                    <div key={phase.key} className="space-y-4">
                      <h3 className="text-base font-extrabold text-amber-500 uppercase tracking-wider border-b border-neutral-900 pb-2">
                        {phase.label}
                      </h3>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        {phaseMatches.map(match => {
                          const mDate = new Date(match.match_date);
                          const pred = p2Preds[match.id] || { homeScore: 0, awayScore: 0 };
                          const isLocked = new Date().getTime() >= new Date(match.lock_time_part2).getTime();
                          const isLive = match.status === 'live';
                          const isFinished = match.status === 'finished';
                          const timerText = timeRemaining[match.id] || '';

                          return (
                            <div 
                              key={match.id}
                              className={`p-5 rounded-2xl border transition duration-300 flex flex-col justify-between shadow ${
                                isFinished 
                                  ? 'bg-neutral-950/20 border-neutral-900 text-neutral-400' 
                                  : 'glass-card border-neutral-800/40 hover:border-emerald-500/20'
                              }`}
                            >
                              {/* Header del Partido */}
                              <div className="flex justify-between items-center text-[10px] font-bold tracking-wider mb-4 uppercase">
                                <span className="text-neutral-500">
                                  Match #{match.id} — {match.city}
                                </span>
                                <div className="flex items-center gap-2">
                                  {isLive && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-400 animate-pulse">
                                      EN VIVO
                                    </span>
                                  )}
                                  {isFinished && (
                                    <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                                      FINALIZADO
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded-full border text-[9px] ${
                                    isLocked 
                                      ? 'bg-neutral-900 border-neutral-800 text-neutral-500' 
                                      : 'bg-emerald-950/40 border-emerald-500/20 text-emerald-400'
                                  }`}>
                                    {timerText}
                                  </span>
                                </div>
                              </div>
                              {/* Marcador Real (si está finalizado o en vivo) */}
                              {(isFinished || isLive) && (
                                <div className="mb-4 p-3 bg-neutral-900/50 border border-neutral-900 rounded-xl text-center">
                                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider mb-1">Marcador Real</p>
                                  <div className="flex justify-center items-center gap-3">
                                    <span className="text-xs font-black text-white">{match.home_team_id || 'Por definir'}</span>
                                    <span className="text-lg font-black text-emerald-400">{match.home_score} - {match.away_score}</span>
                                    <span className="text-xs font-black text-white">{match.away_team_id || 'Por definir'}</span>
                                  </div>
                                </div>
                              )}

                              {/* Input de Predicción */}
                              <div className="flex items-center justify-between gap-3">
                                {/* Home */}
                                <div className="flex-1 flex items-center justify-end gap-2 sm:gap-3 min-w-0">
                                  <span className="font-bold text-xs truncate">
                                    {match.home_team_id || 'Por definir'}
                                  </span>
                                  <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                                    <TeamFlag teamId={match.home_team_id} fallbackEmoji={teamsFlags[match.home_team_id] || '🏳️'} />
                                  </span>
                                </div>

                                {/* Score Inputs */}
                                <div className="flex-shrink-0 flex items-center gap-1 sm:gap-1.5 justify-center">
                                  <input
                                    type="number"
                                    min={0}
                                    value={pred.homeScore ?? 0}
                                    onChange={(e) => handleP2ScoreChange(match.id, 'home', e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={() => handleP2Blur(match.id, 'home')}
                                    disabled={isLocked || !match.home_team_id || !match.away_team_id}
                                    className="w-11 h-11 sm:w-9 sm:h-9 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                                  />
                                  <span className="text-neutral-500 text-xs">-</span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={pred.awayScore ?? 0}
                                    onChange={(e) => handleP2ScoreChange(match.id, 'away', e.target.value)}
                                    onFocus={(e) => e.target.select()}
                                    onBlur={() => handleP2Blur(match.id, 'away')}
                                    disabled={isLocked || !match.home_team_id || !match.away_team_id}
                                    className="w-11 h-11 sm:w-9 sm:h-9 bg-neutral-900 border border-neutral-800 rounded-lg text-center font-black text-base sm:text-xs text-white focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                                  />
                                </div>

                                {/* Away */}
                                <div className="flex-1 flex items-center justify-start gap-2 sm:gap-3 min-w-0">
                                  <span className="text-2xl flex-shrink-0 flex items-center justify-center">
                                    <TeamFlag teamId={match.away_team_id} fallbackEmoji={teamsFlags[match.away_team_id] || '🏳️'} />
                                  </span>
                                  <span className="font-bold text-xs truncate">
                                    {match.away_team_id || 'Por definir'}
                                  </span>
                                </div>
                              </div>

                              {/* Footer Card */}
                              <div className="flex justify-between items-center border-t border-neutral-900/60 pt-3.5 mt-4 text-[10px] text-neutral-500">
                                <span className="truncate max-w-[180px] sm:max-w-none">
                                  Kickoff: {mDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })} — {mDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                                </span>
                                
                                {(isFinished || isLive) && (
                                  <span className="px-2 py-1 rounded-md bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-extrabold text-[10.5px] shadow-sm animate-fadeIn">
                                    Real: {match.home_score} - {match.away_score}
                                  </span>
                                )}

                                {!isLocked && match.home_team_id && match.away_team_id ? (
                                  <button
                                    onClick={() => handleP2Save(match.id)}
                                    disabled={submittingMatchId === match.id}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shrink-0"
                                  >
                                    {submittingMatchId === match.id ? '...' : 'Guardar'}
                                  </button>
                                ) : !match.home_team_id || !match.away_team_id ? (
                                  <span className="text-[10px] text-neutral-500 italic shrink-0">
                                    Por definir
                                  </span>
                                ) : (
                                  <span className="italic shrink-0 text-neutral-500">
                                    🔒 Bloqueado
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
