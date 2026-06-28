import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Helper for Supabase pagination
async function fetchAllFromTable(tableName: string) {
  let allData: any[] = [];
  let from = 0;
  let to = 999;
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(from, to);

    if (error) {
      throw new Error(`Error fetching from ${tableName}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      finished = true;
    } else {
      allData = allData.concat(data);
      if (data.length < 1000) {
        finished = true;
      } else {
        from += 1000;
        to += 1000;
      }
    }
  }
  return allData;
}

function getMatchIdFromPredictionKey(key: string): number | null {
  if (key.startsWith('G_')) {
    return parseInt(key.replace('G_', ''), 10);
  }
  if (key.startsWith('P1_R32_M')) {
    return parseInt(key.replace('P1_R32_M', ''), 10);
  }
  if (key.startsWith('P1_R16_M')) {
    return parseInt(key.replace('P1_R16_M', ''), 10);
  }
  if (key.startsWith('P1_QF_M')) {
    return parseInt(key.replace('P1_QF_M', ''), 10);
  }
  if (key.startsWith('P1_SF_M')) {
    return parseInt(key.replace('P1_SF_M', ''), 10);
  }
  if (key.startsWith('M')) {
    return parseInt(key.replace('M', ''), 10);
  }
  return null;
}

function calculateMatchPoints(match: any, prediction: any, isLate: boolean, isPart1: boolean): number | null {
  if (match.status === 'scheduled') {
    return null;
  }

  if (isLate) {
    return 0;
  }

  if (isPart1) {
    const matchesActualAndPredicted = 
      (prediction.predicted_home_team_id === match.home_team_id && prediction.predicted_away_team_id === match.away_team_id) ||
      (prediction.predicted_home_team_id === match.away_team_id && prediction.predicted_away_team_id === match.home_team_id);
    
    if (!matchesActualAndPredicted) {
      return 0;
    }
  }

  const v_ah = match.home_score;
  const v_aa = match.away_score;
  const v_is_group = match.phase === 'group';

  // Adjust actual scores for prediction comparison based on extra time rule
  let compare_ah = v_ah;
  let compare_aa = v_aa;
  if (!v_is_group && match.home_score_90 !== null && match.away_score_90 !== null && match.home_score_90 === match.away_score_90) {
    compare_ah = match.home_score;
    compare_aa = match.away_score;
  } else {
    compare_ah = match.home_score_90 !== null ? match.home_score_90 : match.home_score;
    compare_aa = match.away_score_90 !== null ? match.away_score_90 : match.away_score;
  }

  // Determinar ganador y perdedor real
  let v_aw: string | null = null;
  let v_al: string | null = null;
  if (v_ah > v_aa) {
    v_aw = match.home_team_id;
    v_al = match.away_team_id;
  } else if (v_ah < v_aa) {
    v_aw = match.away_team_id;
    v_al = match.home_team_id;
  } else {
    v_aw = match.winner_team_id;
    if (v_aw === match.home_team_id) {
      v_al = match.away_team_id;
    } else if (v_aw === match.away_team_id) {
      v_al = match.home_team_id;
    } else {
      v_aw = null;
      v_al = null;
    }
  }

  // Prediction scores
  let v_ph = prediction.predicted_home_score;
  let v_pa = prediction.predicted_away_score;

  // Flip if predicted home is actual away (Part 1 bracket simulation matches)
  if (isPart1 && prediction.predicted_home_team_id === match.away_team_id) {
    v_ph = prediction.predicted_away_score;
    v_pa = prediction.predicted_home_score;
  }

  // Determinar ganador previsto
  let v_pw: string | null = null;
  if (v_ph > v_pa) {
    v_pw = match.home_team_id;
  } else if (v_ph < v_pa) {
    v_pw = match.away_team_id;
  } else {
    v_pw = prediction.predicted_winner_team_id;
  }

  let v_pts = 0;

  if (v_is_group) {
    if (compare_ah === compare_aa) {
      if (v_ph === v_pa) {
        v_pts = 1;
        if (v_ph === compare_ah) v_pts += 1;
        if (v_pa === compare_aa) v_pts += 1;
      }
    } else {
      if (v_pw === v_aw) {
        v_pts = 1;
        if ((v_aw === match.home_team_id && v_ph === compare_ah) || (v_aw === match.away_team_id && v_pa === compare_aa)) {
          v_pts += 3;
        }
        if ((v_al === match.home_team_id && v_ph === compare_ah) || (v_al === match.away_team_id && v_pa === compare_aa)) {
          v_pts += 2;
        }
      } else {
        if ((v_aw === match.home_team_id && v_ph === compare_ah) || (v_aw === match.away_team_id && v_pa === compare_aa)) {
          v_pts += 3;
        }
        if ((v_al === match.home_team_id && v_ph === compare_ah) || (v_al === match.away_team_id && v_pa === compare_aa)) {
          v_pts += 2;
        }
      }
    }
  } else {
    // Knockout
    if (v_pw === v_aw) {
      v_pts = 1;
    }
    if ((v_aw === match.home_team_id && v_ph === compare_ah) || (v_aw === match.away_team_id && v_pa === compare_aa)) {
      v_pts += 3;
    }
    if ((v_al === match.home_team_id && v_ph === compare_ah) || (v_al === match.away_team_id && v_pa === compare_aa)) {
      v_pts += 2;
    }
  }

  return v_pts;
}

interface AuditPrediction {
  userId: string;
  poolId: string;
  keyOrMatchId: string;
  type: 'phase' | 'full_tournament' | 'champion';
  updatedAt: string;
  lockTime: string;
  isLate: boolean;
  dbPoints: number | null;
  auditedPoints: number | null;
  details: string;
}

async function main() {
  console.log('Fetching all database tables...');
  const profiles = await fetchAllFromTable('profiles');
  const pools = await fetchAllFromTable('pools');
  const poolMembers = await fetchAllFromTable('pool_members');
  const matches = await fetchAllFromTable('matches');
  const phasePredictions = await fetchAllFromTable('phase_predictions');
  const fullTournamentPredictions = await fetchAllFromTable('full_tournament_predictions');
  const championPredictions = await fetchAllFromTable('champion_predictions');

  console.log(`Loaded:
  - ${profiles.length} profiles
  - ${pools.length} pools
  - ${poolMembers.length} pool members
  - ${matches.length} matches
  - ${phasePredictions.length} phase predictions
  - ${fullTournamentPredictions.length} full tournament predictions
  - ${championPredictions.length} champion predictions`);

  const profileMap = new Map<string, any>();
  for (const p of profiles) {
    profileMap.set(p.id, p);
  }

  const poolMap = new Map<string, any>();
  for (const pl of pools) {
    poolMap.set(pl.id, pl);
  }

  const matchMap = new Map<number, any>();
  for (const m of matches) {
    matchMap.set(m.id, m);
  }

  const auditedPredictions: AuditPrediction[] = [];
  let totalLateSubmissions = 0;
  let totalPointsDiscrepancies = 0;

  // 1. Audit Phase Predictions (Part 2)
  for (const pred of phasePredictions) {
    const match = matchMap.get(pred.match_id);
    if (!match) continue;

    const lockTimeStr = match.lock_time_part2;
    const updatedAtStr = pred.updated_at;
    const isLate = new Date(updatedAtStr).getTime() >= new Date(lockTimeStr).getTime();
    
    const dbPoints = pred.points_earned;
    const auditedPoints = calculateMatchPoints(match, pred, isLate, false);

    if (isLate) totalLateSubmissions++;
    if (dbPoints !== auditedPoints) totalPointsDiscrepancies++;

    auditedPredictions.push({
      userId: pred.user_id,
      poolId: pred.pool_id,
      keyOrMatchId: `Match #${pred.match_id}`,
      type: 'phase',
      updatedAt: updatedAtStr,
      lockTime: lockTimeStr,
      isLate,
      dbPoints,
      auditedPoints,
      details: `${pred.predicted_home_score}-${pred.predicted_away_score} (real: ${match.home_score}-${match.away_score})`
    });
  }

  // 2. Audit Full Tournament Predictions (Part 1)
  for (const pred of fullTournamentPredictions) {
    const matchId = getMatchIdFromPredictionKey(pred.prediction_key);
    if (!matchId) continue;
    const match = matchMap.get(matchId);
    if (!match) continue;

    const lockTimeStr = match.lock_time_part2;
    const updatedAtStr = pred.updated_at;
    const isLate = new Date(updatedAtStr).getTime() >= new Date(lockTimeStr).getTime();

    const dbPoints = pred.points_earned;
    const auditedPoints = calculateMatchPoints(match, pred, isLate, true);

    if (isLate) totalLateSubmissions++;
    if (dbPoints !== auditedPoints) totalPointsDiscrepancies++;

    auditedPredictions.push({
      userId: pred.user_id,
      poolId: pred.pool_id,
      keyOrMatchId: pred.prediction_key,
      type: 'full_tournament',
      updatedAt: updatedAtStr,
      lockTime: lockTimeStr,
      isLate,
      dbPoints,
      auditedPoints,
      details: `Key: ${pred.prediction_key} | Match: #${matchId} | ${pred.predicted_home_team_id} (${pred.predicted_home_score}) vs ${pred.predicted_away_team_id} (${pred.predicted_away_score})`
    });
  }

  // 3. Audit Champion Predictions
  const finalMatch = matchMap.get(104);
  const thirdMatch = matchMap.get(103);

  for (const pred of championPredictions) {
    const profile = profileMap.get(pred.user_id);
    const updatedAtStr = pred.updated_at;
    const baseLockTimeStr = '2026-06-11T20:00:00Z';
    
    let isLate = new Date(updatedAtStr).getTime() >= new Date(baseLockTimeStr).getTime();
    if (isLate && profile?.p1_unlocked_until) {
      if (new Date(updatedAtStr).getTime() <= new Date(profile.p1_unlocked_until).getTime()) {
        isLate = false;
      }
    }

    let auditedPoints: number | null = null;
    if (finalMatch && finalMatch.status !== 'scheduled') {
      auditedPoints = 0;
      if (!isLate) {
        const v_aw = finalMatch.winner_team_id;
        const v_al = v_aw === finalMatch.home_team_id ? finalMatch.away_team_id : finalMatch.home_team_id;
        
        if (pred.champion_team_id === v_aw) {
          auditedPoints += 5;
        }
        if (pred.runner_up_team_id === v_al) {
          auditedPoints += 3;
        }
        if (thirdMatch && thirdMatch.status === 'finished') {
          if (pred.third_place_team_id === thirdMatch.winner_team_id) {
            auditedPoints += 2;
          }
        }
      }
    }

    const dbPoints = pred.points_earned;

    if (isLate) totalLateSubmissions++;
    if (dbPoints !== auditedPoints) totalPointsDiscrepancies++;

    auditedPredictions.push({
      userId: pred.user_id,
      poolId: pred.pool_id,
      keyOrMatchId: 'Champion',
      type: 'champion',
      updatedAt: updatedAtStr,
      lockTime: baseLockTimeStr + (profile?.p1_unlocked_until ? ` (Unlocked until ${profile.p1_unlocked_until})` : ''),
      isLate,
      dbPoints,
      auditedPoints,
      details: `Champ: ${pred.champion_team_id}, Runner-up: ${pred.runner_up_team_id}, 3rd: ${pred.third_place_team_id}`
    });
  }

  console.log(`Audited ${auditedPredictions.length} predictions.
  - Late submissions: ${totalLateSubmissions}
  - Points discrepancies: ${totalPointsDiscrepancies}`);

  // Calculate points for pool members
  // We want to calculate:
  // - Audited part1_points: sum of auditedPoints of type 'full_tournament' + auditedPoints of type 'champion'
  // - Audited part2_points: sum of auditedPoints of type 'phase'
  // - Audited total_points: audited part1_points + audited part2_points
  const poolMembersAudited = poolMembers.map(member => {
    const userPreds = auditedPredictions.filter(p => p.userId === member.user_id && p.poolId === member.pool_id);
    
    // Part 1 points
    const p1MatchPoints = userPreds
      .filter(p => p.type === 'full_tournament')
      .reduce((sum, p) => sum + (p.auditedPoints || 0), 0);
    const champPoints = userPreds
      .filter(p => p.type === 'champion')
      .reduce((sum, p) => sum + (p.auditedPoints || 0), 0);
    const auditedPart1 = p1MatchPoints + champPoints;

    // Part 2 points
    const auditedPart2 = userPreds
      .filter(p => p.type === 'phase')
      .reduce((sum, p) => sum + (p.auditedPoints || 0), 0);

    const auditedTotal = auditedPart1 + auditedPart2;

    const profile = profileMap.get(member.user_id);
    const pool = poolMap.get(member.pool_id);

    return {
      userId: member.user_id,
      poolId: member.pool_id,
      poolName: pool?.name || 'Unknown',
      displayName: profile?.display_name || 'Desconocido',
      email: profile?.email || '',
      joinedAt: member.joined_at,
      dbPart1: member.part1_points || 0,
      dbPart2: member.part2_points || 0,
      dbTotal: member.total_points || 0,
      auditedPart1,
      auditedPart2,
      auditedTotal,
      hasDiscrepancy: (member.part1_points !== auditedPart1) || 
                      (member.part2_points !== auditedPart2) || 
                      (member.total_points !== auditedTotal)
    };
  });

  // Target users breakdown
  const targetEmails = [
    'ehdiazs@gmail.com',
    'galeonba@gmail.com',
    'vitto.ricardo@gmail.com',
    'jafranconi@yahoo.es',
    'anglamartinez03@gmail.com',
    'aldair45117345@gmail.com'
  ];

  // Write Executive Summary and details
  let md = `# Reporte de Auditoría Forense - Plataforma La Polla Mundial 2026\n\n`;
  
  md += `## 1. Executive Summary\n\n`;
  
  // Integrity Assessment based on total discrepancies
  const hasDBIssues = totalLateSubmissions > 0 || totalPointsDiscrepancies > 0;
  md += `### Integridad de la Base de Datos\n`;
  if (hasDBIssues) {
    md += `⚠️ **ALERTA**: Se han detectado discrepancias y envíos tardíos que comprometen la integridad del estado actual de la base de datos. Se requiere corregir los puntajes afectados.\n\n`;
  } else {
    md += `✅ **CONFIRMADA**: Los puntajes calculados y los almacenados coinciden plenamente. No se han detectado inconsistencias en la base de datos.\n\n`;
  }

  md += `- **Total de Usuarios Auditados**: ${profiles.length}\n`;
  md += `- **Total de Predicciones Tardías Encontradas**: ${totalLateSubmissions}\n`;
  md += `- **Discrepancia General de Puntos**: ${totalPointsDiscrepancies} predicciones con puntaje incorrecto en la base de datos.\n\n`;

  md += `## 2. User Breakdown\n\n`;
  md += `Análisis detallado para los usuarios clave seleccionados:\n\n`;

  for (const email of targetEmails) {
    const profile = profiles.find(p => p.email === email);
    if (!profile) {
      md += `### Usuario: ${email} (No encontrado en la base de datos)\n\n`;
      continue;
    }

    const memberRows = poolMembersAudited.filter(m => m.userId === profile.id);
    const userPredictions = auditedPredictions.filter(p => p.userId === profile.id);
    const latePredictions = userPredictions.filter(p => p.isLate);

    md += `### Usuario: ${profile.display_name} (${profile.email})\n`;
    md += `- **ID de Usuario**: \`${profile.id}\`\n`;
    md += `- **Grupos Asociados y Puntajes**:\n`;
    for (const m of memberRows) {
      md += `  - **Grupo**: ${m.poolName} (\`${m.poolId}\`)\n`;
      md += `    - *Puntaje DB*: P1: ${m.dbPart1} | P2: ${m.dbPart2} | Total: ${m.dbTotal}\n`;
      md += `    - *Puntaje Auditado*: P1: ${m.auditedPart1} | P2: ${m.auditedPart2} | Total: ${m.auditedTotal}\n`;
      if (m.hasDiscrepancy) {
        md += `    - ❌ **Discrepancia Detectada** en este grupo.\n`;
      } else {
        md += `    - ✅ Puntaje correcto en este grupo.\n`;
      }
    }
    
    md += `- **Total de Predicciones Tardías**: ${latePredictions.length}\n`;
    if (latePredictions.length > 0) {
      md += `- **Detalle de Predicciones Tardías**:\n\n`;
      md += `| Tipo | Identificador | Hora Predicción (updated_at) | Hora Bloqueo (lock_time) | Puntos DB | Puntos Auditados |\n`;
      md += `| --- | --- | --- | --- | --- | --- |\n`;
      for (const lp of latePredictions) {
        md += `| ${lp.type} | ${lp.keyOrMatchId} | \`${lp.updatedAt}\` | \`${lp.lockTime}\` | ${lp.dbPoints} | ${lp.auditedPoints} |\n`;
      }
      md += `\n`;
    } else {
      md += `- *No se detectaron predicciones tardías para este usuario.*\n\n`;
    }
  }

  md += `## 3. Group Breakdown\n\n`;
  md += `Comparación de posiciones calculadas por la auditoría frente a lo almacenado en \`pool_members\` para cada grupo:\n\n`;

  const poolIds = Array.from(new Set(poolMembersAudited.map(m => m.poolId)));
  for (const poolId of poolIds) {
    const pool = poolMap.get(poolId);
    const membersInPool = poolMembersAudited.filter(m => m.poolId === poolId);

    // Stored rankings
    const dbRanking = [...membersInPool].sort((a, b) => {
      if (b.dbTotal !== a.dbTotal) return b.dbTotal - a.dbTotal;
      return a.displayName.localeCompare(b.displayName);
    });

    // Audited rankings
    const auditedRanking = [...membersInPool].sort((a, b) => {
      if (b.auditedTotal !== a.auditedTotal) return b.auditedTotal - a.auditedTotal;
      return a.displayName.localeCompare(b.displayName);
    });

    md += `### Grupo: ${pool?.name || 'Unknown'} (\`${poolId}\`)\n\n`;
    md += `#### Tabla de Posiciones Almacenada (DB) frente a Auditoría:\n\n`;
    md += `| Posición DB | Miembro | Puntos DB (P1/P2/T) | Posición Auditada | Puntos Auditados (P1/P2/T) | Discrepancia? |\n`;
    md += `| --- | --- | --- | --- | --- | --- |\n`;

    // Map members to their rankings
    let dbRank = 1;
    const dbRankedList = dbRanking.map((m, idx) => {
      if (idx > 0 && m.dbTotal < dbRanking[idx - 1].dbTotal) {
        dbRank = idx + 1;
      }
      return { ...m, rank: dbRank };
    });

    let auditedRank = 1;
    const auditedRankedList = auditedRanking.map((m, idx) => {
      if (idx > 0 && m.auditedTotal < auditedRanking[idx - 1].auditedTotal) {
        auditedRank = idx + 1;
      }
      return { ...m, rank: auditedRank };
    });

    // Build comparison rows using audited order
    for (const audM of auditedRankedList) {
      const dbM = dbRankedList.find(x => x.userId === audM.userId)!;
      const statusSymbol = audM.hasDiscrepancy ? '❌ Sí' : '✅ No';
      
      md += `| ${dbM.rank} | ${audM.displayName} | ${dbM.dbTotal} (${dbM.dbPart1}/${dbM.dbPart2}/${dbM.dbTotal}) | ${audM.rank} | ${audM.auditedTotal} (${audM.auditedPart1}/${audM.auditedPart2}/${audM.auditedTotal}) | ${statusSymbol} |\n`;
    }
    md += `\n`;
  }

  // Save report to forensic_audit_report.md in the project root
  const outputPath = path.resolve(process.cwd(), 'forensic_audit_report.md');
  fs.writeFileSync(outputPath, md, 'utf-8');
  console.log(`Forensic audit report written to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error during forensic audit:', err);
  process.exit(1);
});
