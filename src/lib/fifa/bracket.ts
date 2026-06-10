export interface Team {
  id: string;
  name: string;
  flag_emoji: string;
  fifa_ranking: number;
  confederation: string;
}

export interface TeamStanding {
  team: Team;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface MatchPrediction {
  homeScore: number;
  awayScore: number;
  winnerId?: string; // Para definir empates en eliminatorias
}

// 1. Calcular Tabla de Posiciones por Grupo
export function calculateGroupStandings(
  teams: Team[],
  groupTeamsMap: Record<string, string[]>, // 'A' -> ['MEX', 'RSA', ...]
  predictions: Record<number, MatchPrediction>, // matchId -> predicción
  groupMatches: any[] // Lista de partidos de fase de grupos
): Record<string, TeamStanding[]> {
  const standings: Record<string, TeamStanding[]> = {};

  // Inicializar tabla para cada grupo
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  for (const group of groups) {
    const teamIdsInGroup = groupTeamsMap[group] || [];
    standings[group] = teamIdsInGroup.map(tId => {
      const teamObj = teams.find(t => t.id === tId)!;
      return {
        team: teamObj,
        group,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    });
  }

  // Procesar cada partido de fase de grupos y sus predicciones
  for (const match of groupMatches) {
    const pred = predictions[match.id];
    if (!pred) continue; // Si no hay predicción, no se procesa

    const homeTeamId = match.home_team_id;
    const awayTeamId = match.away_team_id;

    // Encontrar el grupo
    const groupName = match.external_match_id.split('_')[2]; // ej: WC26_G_A_1 -> 'A'
    const groupTable = standings[groupName];
    if (!groupTable) continue;

    const homeStanding = groupTable.find(s => s.team.id === homeTeamId);
    const awayStanding = groupTable.find(s => s.team.id === awayTeamId);

    if (homeStanding && awayStanding) {
      homeStanding.played += 1;
      awayStanding.played += 1;

      homeStanding.goalsFor += pred.homeScore;
      homeStanding.goalsAgainst += pred.awayScore;
      awayStanding.goalsFor += pred.awayScore;
      awayStanding.goalsAgainst += pred.homeScore;

      if (pred.homeScore > pred.awayScore) {
        homeStanding.won += 1;
        homeStanding.points += 3;
        awayStanding.lost += 1;
      } else if (pred.homeScore < pred.awayScore) {
        awayStanding.won += 1;
        awayStanding.points += 3;
        homeStanding.lost += 1;
      } else {
        homeStanding.drawn += 1;
        homeStanding.points += 1;
        awayStanding.drawn += 1;
        awayStanding.points += 1;
      }

      homeStanding.goalDifference = homeStanding.goalsFor - homeStanding.goalsAgainst;
      awayStanding.goalDifference = awayStanding.goalsFor - awayStanding.goalsAgainst;
    }
  }

  // Ordenar la tabla de cada grupo aplicando las reglas FIFA
  for (const group of groups) {
    standings[group].sort((a, b) => {
      // 1. Puntos
      if (b.points !== a.points) return b.points - a.points;
      // 2. Diferencia de Goles
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      // 3. Goles Anotados
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

      // 4. Desempate definitivo: Mejor Ranking FIFA (como acordamos en el Grill-Me)
      return a.team.fifa_ranking - b.team.fifa_ranking;
    });
  }

  return standings;
}

// 2. Obtener los 8 Mejores Terceros
export function getBestThirdPlacedTeams(
  groupStandings: Record<string, TeamStanding[]>
): TeamStanding[] {
  const thirds: TeamStanding[] = [];

  // Extraer el tercer lugar de cada grupo
  for (const group of Object.keys(groupStandings)) {
    const table = groupStandings[group];
    if (table && table.length >= 3) {
      thirds.push(table[2]); // Índice 2 es el 3º puesto
    }
  }

  // Ordenar los terceros lugares
  thirds.sort((a, b) => {
    // 1. Puntos
    if (b.points !== a.points) return b.points - a.points;
    // 2. Diferencia de goles
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    // 3. Goles anotados
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    // 4. Mejor Ranking FIFA
    return a.team.fifa_ranking - b.team.fifa_ranking;
  });

  // Devolver el Top 8
  return thirds.slice(0, 8);
}

// Grupos permitidos para cada ganador según Anexo C de la FIFA
const allowedThirdsForWinners: Record<string, string[]> = {
  '1A': ['C', 'E', 'F', 'H', 'I'],
  '1E': ['A', 'B', 'C', 'D', 'F'],
  '1B': ['E', 'F', 'G', 'I', 'J'],
  '1G': ['A', 'E', 'H', 'I', 'J'],
  '1D': ['B', 'E', 'F', 'I', 'J'],
  '1I': ['C', 'D', 'F', 'G', 'H'],
  '1K': ['D', 'E', 'I', 'J', 'L'],
  '1L': ['E', 'H', 'I', 'J', 'K'],
};

// 3. Algoritmo de Emparejamiento Bipartito Determinista (Anexo C)
export function matchThirdsToWinners(
  qualifiedThirdGroups: string[] // ej: ['A', 'B', 'C', 'E', 'G', 'H', 'I', 'K']
): Record<string, string> | null {
  const winners = ['1A', '1E', '1B', '1G', '1D', '1I', '1K', '1L'];
  
  return backtrackMatching(winners, qualifiedThirdGroups, {});
}

function backtrackMatching(
  winnersLeft: string[],
  thirdsLeft: string[],
  currentMatching: Record<string, string>
): Record<string, string> | null {
  if (winnersLeft.length === 0) {
    return currentMatching;
  }

  const winner = winnersLeft[0];
  const allowedGroups = allowedThirdsForWinners[winner] || [];

  // Filtrar de los terceros calificados cuáles son permitidos para este ganador
  // IMPORTANTE: Ordenar alfabéticamente para asegurar que sea 100% determinista y estable
  const availableThirds = thirdsLeft.filter(g => allowedGroups.includes(g)).sort();

  for (const group of availableThirds) {
    const nextWinners = winnersLeft.slice(1);
    const nextThirds = thirdsLeft.filter(g => g !== group);
    
    const result = backtrackMatching(nextWinners, nextThirds, {
      ...currentMatching,
      [winner]: group,
    });

    if (result) return result;
  }

  return null;
}

// 4. Generar partidos de la Ronda de 32 (M73 a M88)
export interface KnockoutMatch {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  winnerId?: string;
}

export function generateRoundOf32(
  groupStandings: Record<string, TeamStanding[]>,
  bestThirds: TeamStanding[]
): KnockoutMatch[] {
  const bestThirdGroups = bestThirds.map(t => t.group);
  const matching = matchThirdsToWinners(bestThirdGroups);

  const getTeam = (source: string): Team => {
    // Ejemplos de source:
    // '1A' -> 1er puesto del Grupo A
    // '2C' -> 2do puesto del Grupo C
    // '3_1A' -> 3er puesto asignado a 1A según matching
    if (source.startsWith('3_')) {
      const winnerKey = source.split('_')[1]; // ej: '1A'
      const matchedGroup = matching ? matching[winnerKey] : null;
      if (matchedGroup && groupStandings[matchedGroup] && groupStandings[matchedGroup][2]) {
        return groupStandings[matchedGroup][2].team; // Tercer lugar
      }
      // Fallback si no hay matching válido
      return { id: 'TBD_3', name: '3º Grupo?', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' };
    }

    const pos = parseInt(source[0], 10); // 1 o 2
    const group = source[1]; // A a L
    const groupList = groupStandings[group];
    if (groupList && groupList[pos - 1]) {
      return groupList[pos - 1].team;
    }
    return {
      id: `TBD_${pos}${group}`,
      name: `${pos}º Grupo ${group}`,
      flag_emoji: '🏳️',
      fifa_ranking: 999,
      confederation: ''
    };
  };

  // Definición oficial de cruces FIFA 2026 corregida
  const roundOf32Plan = [
    { id: 73, home: '2A', away: '2B' },
    { id: 74, home: '1E', away: '3_1E' },
    { id: 75, home: '1F', away: '2C' },
    { id: 76, home: '1C', away: '2F' },
    { id: 77, home: '1A', away: '3_1A' },
    { id: 78, home: '1I', away: '3_1I' },
    { id: 79, home: '1B', away: '3_1B' },
    { id: 80, home: '1G', away: '3_1G' },
    { id: 81, home: '1D', away: '3_1D' },
    { id: 82, home: '1H', away: '2J' },
    { id: 83, home: '2K', away: '2L' },
    { id: 84, home: '1J', away: '2H' },
    { id: 85, home: '1K', away: '3_1K' },
    { id: 86, home: '1L', away: '3_1L' },
    { id: 87, home: '2E', away: '2I' },
    { id: 88, home: '2D', away: '2G' },
  ];

  return roundOf32Plan.map(match => ({
    id: match.id,
    homeTeam: getTeam(match.home),
    awayTeam: getTeam(match.away),
  }));
}

// 5. Simular rondas posteriores de eliminatorias (R16, QF, SF, Final, 3er)
export function simulateNextRounds(
  r32Matches: KnockoutMatch[],
  predictions: Record<string, MatchPrediction> // 'R32_M73', 'R16_M89', etc.
): {
  r16: KnockoutMatch[];
  qf: KnockoutMatch[];
  sf: KnockoutMatch[];
  thirdPlace: KnockoutMatch;
  finalMatch: KnockoutMatch;
} {
  const getWinner = (match: KnockoutMatch, predKey: string): Team => {
    const pred = predictions[predKey];
    if (!pred) return { id: `TBD_${match.id}`, name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' };

    if (pred.homeScore > pred.awayScore) return match.homeTeam;
    if (pred.homeScore < pred.awayScore) return match.awayTeam;
    
    // En caso de empate, usar el ganador manual (penales/prórroga)
    if (pred.winnerId === match.awayTeam.id) return match.awayTeam;
    return match.homeTeam;
  };

  const getLoser = (match: KnockoutMatch, predKey: string): Team => {
    const winner = getWinner(match, predKey);
    return winner.id === match.homeTeam.id ? match.awayTeam : match.homeTeam;
  };

  // --- Ronda de 16 ---
  const r16Plan = [
    { id: 89, homeMatchId: 74, awayMatchId: 77 },
    { id: 90, homeMatchId: 73, awayMatchId: 75 },
    { id: 91, homeMatchId: 76, awayMatchId: 78 },
    { id: 92, homeMatchId: 79, awayMatchId: 80 },
    { id: 93, homeMatchId: 83, awayMatchId: 84 },
    { id: 94, homeMatchId: 81, awayMatchId: 82 },
    { id: 95, homeMatchId: 86, awayMatchId: 88 },
    { id: 96, homeMatchId: 85, awayMatchId: 87 },
  ];

  const r16: KnockoutMatch[] = r16Plan.map(p => {
    const homeMatch = r32Matches.find(m => m.id === p.homeMatchId);
    const awayMatch = r32Matches.find(m => m.id === p.awayMatchId);
    return {
      id: p.id,
      homeTeam: homeMatch ? getWinner(homeMatch, `P1_R32_M${p.homeMatchId}`) : { id: `TBD_M${p.homeMatchId}`, name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
      awayTeam: awayMatch ? getWinner(awayMatch, `P1_R32_M${p.awayMatchId}`) : { id: `TBD_M${p.awayMatchId}`, name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
    };
  });

  // --- Cuartos de Final ---
  const qfPlan = [
    { id: 97, homeMatchId: 89, awayMatchId: 90 },
    { id: 98, homeMatchId: 91, awayMatchId: 92 },
    { id: 99, homeMatchId: 93, awayMatchId: 94 },
    { id: 100, homeMatchId: 95, awayMatchId: 96 },
  ];

  const qf: KnockoutMatch[] = qfPlan.map(p => {
    const homeMatch = r16.find(m => m.id === p.homeMatchId);
    const awayMatch = r16.find(m => m.id === p.awayMatchId);
    return {
      id: p.id,
      homeTeam: homeMatch ? getWinner(homeMatch, `P1_R16_M${p.homeMatchId}`) : { id: `TBD_M${p.homeMatchId}`, name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
      awayTeam: awayMatch ? getWinner(awayMatch, `P1_R16_M${p.awayMatchId}`) : { id: `TBD_M${p.awayMatchId}`, name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
    };
  });

  // --- Semifinales ---
  const sfPlan = [
    { id: 101, homeMatchId: 97, awayMatchId: 98 },
    { id: 102, homeMatchId: 99, awayMatchId: 100 },
  ];

  const sf: KnockoutMatch[] = sfPlan.map(p => {
    const homeMatch = qf.find(m => m.id === p.homeMatchId);
    const awayMatch = qf.find(m => m.id === p.awayMatchId);
    return {
      id: p.id,
      homeTeam: homeMatch ? getWinner(homeMatch, `P1_QF_M${p.homeMatchId}`) : { id: `TBD_M${p.homeMatchId}`, name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
      awayTeam: awayMatch ? getWinner(awayMatch, `P1_QF_M${p.awayMatchId}`) : { id: `TBD_M${p.awayMatchId}`, name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
    };
  });

  // --- Tercer Puesto y Final ---
  const sf1 = sf.find(m => m.id === 101);
  const sf2 = sf.find(m => m.id === 102);

  const thirdPlace: KnockoutMatch = {
    id: 103,
    homeTeam: sf1 ? getLoser(sf1, 'P1_SF_M101') : { id: 'TBD_SF1', name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
    awayTeam: sf2 ? getLoser(sf2, 'P1_SF_M102') : { id: 'TBD_SF2', name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
  };

  const finalMatch: KnockoutMatch = {
    id: 104,
    homeTeam: sf1 ? getWinner(sf1, 'P1_SF_M101') : { id: 'TBD_SF1', name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
    awayTeam: sf2 ? getWinner(sf2, 'P1_SF_M102') : { id: 'TBD_SF2', name: 'Por definir', flag_emoji: '🏳️', fifa_ranking: 999, confederation: '' },
  };

  return { r16, qf, sf, thirdPlace, finalMatch };
}
