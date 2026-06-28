export interface Match {
  id: number;
  phase: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  home_score_90: number | null;
  away_score_90: number | null;
  winner_team_id: string | null;
  status: string;
  match_date: string;
  lock_time_part2: string;
}

export interface P2Prediction {
  match_id: number;
  predicted_home_score: number;
  predicted_away_score: number;
  predicted_winner_team_id: string | null;
  points_earned: number | null;
  user_id: string;
  pool_id: string;
}

export interface RecentFormItem {
  outcome: 'exact' | 'winner' | 'failed' | 'missed';
  matchId: number;
  homeTeamId: string;
  awayTeamId: string;
  realHomeScore: number | null;
  realAwayScore: number | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  pointsEarned: number | null;
}

export interface UserStats {
  totalRealized: number;
  exactCount: number;
  winnerCount: number;
  failedCount: number;
  effectiveness: number;
  activeStreak: number;
  maxStreak: number;
  recentForm: RecentFormItem[];
}

export interface MemberStreak {
  userId: string;
  displayName: string;
  avatarUrl: string;
  activeStreak: number;
  maxStreak: number;
}

export interface GroupStatsResult {
  poolId: string;
  poolName: string;
  averageEffectiveness: number;
  favoriteChampionName: string;
  favoriteChampionId: string | null;
  bestActiveStreak: number;
  bestActiveStreakMemberName: string;
  memberStreaks: MemberStreak[];
}

/**
 * Calculates user prediction stats precisely, avoiding bugs, comparing them to real matches.
 */
export function calculateUserStats(p2Predictions: P2Prediction[], matches: Match[]): UserStats {
  let totalRealized = 0;
  let exactCount = 0;
  let winnerCount = 0;
  let failedCount = 0;

  // Sort matches chronologically
  const sortedMatches = [...matches].sort(
    (a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
  );

  const evaluatedMatches = sortedMatches.filter(m => m.status === 'finished' || m.status === 'live');
  const history: boolean[] = [];

  evaluatedMatches.forEach(match => {
    const pred = p2Predictions.find(p => p.match_id === match.id);
    if (!pred) {
      history.push(false);
      return;
    }

    totalRealized++;

    const isGroup = match.phase === 'group';
    let realHome = match.home_score ?? 0;
    let realAway = match.away_score ?? 0;

    // Extra time in knockouts (compare 120min score if they drew at 90)
    if (
      !isGroup &&
      match.home_score_90 !== null &&
      match.away_score_90 !== null &&
      match.home_score_90 === match.away_score_90
    ) {
      realHome = match.home_score ?? 0;
      realAway = match.away_score ?? 0;
    } else {
      realHome = match.home_score_90 ?? match.home_score ?? 0;
      realAway = match.away_score_90 ?? match.away_score ?? 0;
    }

    const predHome = pred.predicted_home_score;
    const predAway = pred.predicted_away_score;

    // 1. Check exact score
    const isExact = (predHome === realHome && predAway === realAway);

    // 2. Check winner/draw
    let isCorrectWinnerOrDraw = false;
    if (isGroup) {
      if (realHome > realAway) {
        isCorrectWinnerOrDraw = (predHome > predAway);
      } else if (realHome < realAway) {
        isCorrectWinnerOrDraw = (predHome < predAway);
      } else {
        isCorrectWinnerOrDraw = (predHome === predAway);
      }
    } else {
      const realWinnerDefinitive = match.winner_team_id;
      let predWinnerDefinitive = pred.predicted_winner_team_id;
      if (predHome > predAway) {
        predWinnerDefinitive = match.home_team_id;
      } else if (predHome < predAway) {
        predWinnerDefinitive = match.away_team_id;
      }
      isCorrectWinnerOrDraw = (realWinnerDefinitive !== null && realWinnerDefinitive === predWinnerDefinitive);
    }

    if (isExact) {
      exactCount++;
      history.push(true);
    } else if (isCorrectWinnerOrDraw) {
      winnerCount++;
      history.push(true);
    } else {
      failedCount++;
      history.push(false);
    }
  });

  // Calculate Max Streak and Active Streak
  let tempStreak = 0;
  let maxStreak = 0;
  for (let i = 0; i < history.length; i++) {
    if (history[i]) {
      tempStreak++;
      if (tempStreak > maxStreak) {
        maxStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  let activeStreak = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]) {
      activeStreak++;
    } else {
      break;
    }
  }

  const effectiveness = totalRealized > 0 ? Math.round(((exactCount + winnerCount) / totalRealized) * 100) : 0;

  // Recent form
  const recentForm: RecentFormItem[] = [];
  const last5Matches = evaluatedMatches.slice(-5);
  
  last5Matches.forEach(match => {
    const pred = p2Predictions.find(p => p.match_id === match.id);
    if (!pred) {
      recentForm.push({
        outcome: 'missed',
        matchId: match.id,
        homeTeamId: match.home_team_id,
        awayTeamId: match.away_team_id,
        realHomeScore: match.home_score,
        realAwayScore: match.away_score,
        predictedHomeScore: null,
        predictedAwayScore: null,
        pointsEarned: null
      });
      return;
    }

    const isGroup = match.phase === 'group';
    let realHome = match.home_score ?? 0;
    let realAway = match.away_score ?? 0;

    if (
      !isGroup &&
      match.home_score_90 !== null &&
      match.away_score_90 !== null &&
      match.home_score_90 === match.away_score_90
    ) {
      realHome = match.home_score ?? 0;
      realAway = match.away_score ?? 0;
    } else {
      realHome = match.home_score_90 ?? match.home_score ?? 0;
      realAway = match.away_score_90 ?? match.away_score ?? 0;
    }

    const predHome = pred.predicted_home_score;
    const predAway = pred.predicted_away_score;

    const isExact = (predHome === realHome && predAway === realAway);

    let isCorrectWinnerOrDraw = false;
    if (isGroup) {
      if (realHome > realAway) {
        isCorrectWinnerOrDraw = (predHome > predAway);
      } else if (realHome < realAway) {
        isCorrectWinnerOrDraw = (predHome < predAway);
      } else {
        isCorrectWinnerOrDraw = (predHome === predAway);
      }
    } else {
      const realWinnerDefinitive = match.winner_team_id;
      let predWinnerDefinitive = pred.predicted_winner_team_id;
      if (predHome > predAway) {
        predWinnerDefinitive = match.home_team_id;
      } else if (predHome < predAway) {
        predWinnerDefinitive = match.away_team_id;
      }
      isCorrectWinnerOrDraw = (realWinnerDefinitive !== null && realWinnerDefinitive === predWinnerDefinitive);
    }

    let outcome: 'exact' | 'winner' | 'failed' = 'failed';
    if (isExact) {
      outcome = 'exact';
    } else if (isCorrectWinnerOrDraw) {
      outcome = 'winner';
    }

    recentForm.push({
      outcome,
      matchId: match.id,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      realHomeScore: realHome,
      realAwayScore: realAway,
      predictedHomeScore: predHome,
      predictedAwayScore: predAway,
      pointsEarned: pred.points_earned
    });
  });

  return {
    totalRealized,
    exactCount,
    winnerCount,
    failedCount,
    effectiveness,
    activeStreak,
    maxStreak,
    recentForm
  };
}

/**
 * Calculates aggregate stats for a pool
 */
export function calculateGroupStats(
  poolId: string,
  poolName: string,
  members: any[], // from getPoolMembersRanking
  p2Predictions: P2Prediction[],
  championPredictions: any[],
  matches: Match[],
  teams: any[]
): GroupStatsResult {
  const memberStreaks: MemberStreak[] = [];
  let totalEffectivenessSum = 0;
  let evaluatedMembersCount = 0;

  members.forEach(member => {
    const memberPreds = p2Predictions.filter(p => p.user_id === member.userId);
    const stats = calculateUserStats(memberPreds, matches);

    memberStreaks.push({
      userId: member.userId,
      displayName: member.displayName,
      avatarUrl: member.avatarUrl,
      activeStreak: stats.activeStreak,
      maxStreak: stats.maxStreak
    });

    if (stats.totalRealized > 0) {
      totalEffectivenessSum += stats.effectiveness;
      evaluatedMembersCount++;
    }
  });

  // Sort by active streak descending, then max streak, then display name
  memberStreaks.sort((a, b) => {
    if (b.activeStreak !== a.activeStreak) return b.activeStreak - a.activeStreak;
    if (b.maxStreak !== a.maxStreak) return b.maxStreak - a.maxStreak;
    return a.displayName.localeCompare(b.displayName);
  });

  const averageEffectiveness = evaluatedMembersCount > 0 ? Math.round(totalEffectivenessSum / evaluatedMembersCount) : 0;

  // Favorite champion counts
  const champCounts: Record<string, number> = {};
  championPredictions.forEach(cp => {
    if (cp.champion_team_id) {
      champCounts[cp.champion_team_id] = (champCounts[cp.champion_team_id] || 0) + 1;
    }
  });

  let favoriteChampionId: string | null = null;
  let maxCount = 0;
  Object.entries(champCounts).forEach(([teamId, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteChampionId = teamId;
    }
  });

  const favoriteChampionName = favoriteChampionId
    ? (teams.find(t => t.id === favoriteChampionId)?.name || favoriteChampionId)
    : 'Ninguno';

  const bestActiveStreak = memberStreaks.length > 0 ? memberStreaks[0].activeStreak : 0;
  const bestActiveStreakMemberName = memberStreaks.length > 0 ? memberStreaks[0].displayName : 'Nadie';

  return {
    poolId,
    poolName,
    averageEffectiveness,
    favoriteChampionId,
    favoriteChampionName,
    bestActiveStreak,
    bestActiveStreakMemberName,
    memberStreaks
  };
}
